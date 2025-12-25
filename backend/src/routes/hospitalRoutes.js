/**
 * Hospital Routes
 * Public routes for hospital listing, protected routes for updates
 */

const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  getHospitals,
  getHospitalById,
  getNearbyHospitals,
  updateBedAvailability,
  seedHospitals
} = require('../controllers/hospitalController');

// Public routes
router.get('/', getHospitals);                    // GET /api/hospitals
router.get('/nearby', getNearbyHospitals);        // GET /api/hospitals/nearby?lat=...&lng=...
router.get('/:id', getHospitalById);              // GET /api/hospitals/:id

// Development route to seed hospitals
router.post('/seed', seedHospitals);              // POST /api/hospitals/seed

// Protected routes (for hospital admins)
router.patch('/:id/beds', protect, updateBedAvailability);  // PATCH /api/hospitals/:id/beds

module.exports = router;
