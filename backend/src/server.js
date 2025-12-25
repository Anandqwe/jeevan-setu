const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');

// Connect to Database
connectDB();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for file uploads

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/hospitals', hospitalRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"]
  }
});

// ============ IN-MEMORY STATE ============
// In production, this would be Redis or a database
const state = {
  drivers: new Map(),       // socketId -> { id, name, location, status: 'available'|'busy' }
  emergencies: new Map(),   // emergencyId -> { id, patientSocketId, location, severity, status, assignedDriver }
  hospitals: new Map()      // socketId -> { id, name, beds, icu }
};

// ============ SOCKET HANDLERS ============
io.on('connection', (socket) => {
  console.log(`[CONNECT] Client connected: ${socket.id}`);

  // ---------- DRIVER EVENTS ----------
  socket.on('driver:register', (data) => {
    const driver = {
      id: uuidv4(),
      socketId: socket.id,
      name: data.name || 'Unknown Driver',
      vehicle: data.vehicle || 'MH-XX-XXXX',
      location: data.location || { lat: 19.076, lng: 72.8777 }, // Default: Mumbai
      status: 'available'
    };
    state.drivers.set(socket.id, driver);
    console.log(`[DRIVER] Registered: ${driver.name} (${driver.vehicle})`);
    socket.emit('driver:registered', { success: true, driver });
  });

  socket.on('driver:update-location', (location) => {
    const driver = state.drivers.get(socket.id);
    if (driver) {
      driver.location = location;
      console.log(`[DRIVER] ${driver.name} location updated`);
    }
  });

  socket.on('driver:accept', (emergencyId) => {
    const driver = state.drivers.get(socket.id);
    const emergency = state.emergencies.get(emergencyId);

    if (driver && emergency && emergency.status === 'searching') {
      driver.status = 'busy';
      emergency.status = 'accepted';
      emergency.assignedDriver = driver;

      console.log(`[MATCH] Driver ${driver.name} accepted emergency ${emergencyId}`);

      // Notify the patient that help is on the way
      io.to(emergency.patientSocketId).emit('emergency:driver-assigned', {
        emergencyId,
        driver: {
          name: driver.name,
          vehicle: driver.vehicle,
          eta: '5 mins' // Calculate real ETA based on location
        }
      });

      // Confirm to driver
      socket.emit('driver:assignment-confirmed', { emergencyId, emergency });

      // Notify hospitals about incoming patient
      state.hospitals.forEach((hospital, hospitalSocketId) => {
        io.to(hospitalSocketId).emit('hospital:incoming-patient', {
          emergencyId,
          severity: emergency.severity,
          eta: '8 mins',
          driver: driver.vehicle
        });
      });
    }
  });

  socket.on('driver:reject', (emergencyId) => {
    const emergency = state.emergencies.get(emergencyId);
    if (emergency) {
      console.log(`[REJECT] Driver ${socket.id} rejected emergency ${emergencyId}`);
      // Try to find another driver
      broadcastToAvailableDrivers(emergency);
    }
  });

  // ---------- PATIENT EVENTS ----------
  socket.on('patient:sos', (data) => {
    const emergencyId = uuidv4();
    const emergency = {
      id: emergencyId,
      patientSocketId: socket.id,
      location: data.location || { lat: 19.076, lng: 72.8777, address: 'Unknown Location' },
      severity: data.severity || 'high',
      type: data.type || 'accident',
      status: 'searching',
      timestamp: Date.now(),
      assignedDriver: null
    };

    state.emergencies.set(emergencyId, emergency);
    console.log(`[SOS] New emergency created: ${emergencyId}`);

    // Acknowledge to patient
    socket.emit('emergency:created', { emergencyId, status: 'searching' });

    // Broadcast to available drivers
    broadcastToAvailableDrivers(emergency);
  });

  socket.on('patient:cancel', (emergencyId) => {
    const emergency = state.emergencies.get(emergencyId);
    if (emergency && emergency.patientSocketId === socket.id) {
      emergency.status = 'cancelled';
      console.log(`[CANCEL] Emergency ${emergencyId} cancelled by patient`);

      // Notify assigned driver if any
      if (emergency.assignedDriver) {
        const driverSocketId = emergency.assignedDriver.socketId;
        io.to(driverSocketId).emit('emergency:cancelled', { emergencyId });
        const driver = state.drivers.get(driverSocketId);
        if (driver) driver.status = 'available';
      }

      state.emergencies.delete(emergencyId);
    }
  });

  // ---------- HOSPITAL EVENTS ----------
  socket.on('hospital:register', (data) => {
    const hospital = {
      id: uuidv4(),
      socketId: socket.id,
      name: data.name || 'City Hospital',
      beds: data.beds || 10,
      icu: data.icu || 2,
      location: data.location || { lat: 19.08, lng: 72.88 }
    };
    state.hospitals.set(socket.id, hospital);
    console.log(`[HOSPITAL] Registered: ${hospital.name}`);
    socket.emit('hospital:registered', { success: true, hospital });
  });

  socket.on('hospital:update-beds', (data) => {
    const hospital = state.hospitals.get(socket.id);
    if (hospital) {
      hospital.beds = data.beds;
      hospital.icu = data.icu;
      console.log(`[HOSPITAL] ${hospital.name} updated: ${data.beds} beds, ${data.icu} ICU`);
    }
  });

  // ---------- DISCONNECT ----------
  socket.on('disconnect', () => {
    console.log(`[DISCONNECT] Client disconnected: ${socket.id}`);
    
    // Clean up driver
    if (state.drivers.has(socket.id)) {
      const driver = state.drivers.get(socket.id);
      console.log(`[DRIVER] ${driver.name} went offline`);
      state.drivers.delete(socket.id);
    }

    // Clean up hospital
    if (state.hospitals.has(socket.id)) {
      const hospital = state.hospitals.get(socket.id);
      console.log(`[HOSPITAL] ${hospital.name} went offline`);
      state.hospitals.delete(socket.id);
    }
  });
});

// ============ HELPER FUNCTIONS ============
function broadcastToAvailableDrivers(emergency) {
  let notified = 0;
  state.drivers.forEach((driver, socketId) => {
    if (driver.status === 'available') {
      io.to(socketId).emit('emergency:new-request', {
        emergencyId: emergency.id,
        location: emergency.location,
        severity: emergency.severity,
        type: emergency.type,
        distance: calculateDistance(driver.location, emergency.location)
      });
      notified++;
    }
  });
  console.log(`[BROADCAST] Notified ${notified} available drivers for emergency ${emergency.id}`);
  
  // If no drivers available, notify patient
  if (notified === 0) {
    io.to(emergency.patientSocketId).emit('emergency:no-drivers', { emergencyId: emergency.id });
  }
}

function calculateDistance(loc1, loc2) {
  // Haversine formula for distance in km
  const R = 6371;
  const dLat = deg2rad(loc2.lat - loc1.lat);
  const dLon = deg2rad(loc2.lng - loc1.lng);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(loc1.lat)) * Math.cos(deg2rad(loc2.lat)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return (R * c).toFixed(1) + ' km';
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// ============ REST ENDPOINTS (for debugging) ============
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/status', (req, res) => {
  res.json({
    drivers: Array.from(state.drivers.values()).map(d => ({ name: d.name, vehicle: d.vehicle, status: d.status })),
    emergencies: Array.from(state.emergencies.values()).map(e => ({ id: e.id, status: e.status, severity: e.severity })),
    hospitals: Array.from(state.hospitals.values()).map(h => ({ name: h.name, beds: h.beds, icu: h.icu }))
  });
});

// ============ START SERVER ============
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           🚑  JEEVAN SETU BACKEND SERVER  🚑                  ║
╠═══════════════════════════════════════════════════════════════╣
║   WebSocket Server  :  ws://localhost:${PORT}                    ║
║   REST API          :  http://localhost:${PORT}                  ║
║   Health Check      :  http://localhost:${PORT}/health           ║
║   Status Dashboard  :  http://localhost:${PORT}/status           ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});
