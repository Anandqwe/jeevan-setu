import React, { useState, useEffect, useCallback } from 'react';
import { LandingView } from './components/LandingView';
import { PatientLoginWrapper } from './components/PatientLoginWrapper';
import { DriverView } from './components/DriverView';
import { HospitalView } from './components/HospitalView';
import { BystanderView } from './components/BystanderView';
import { ViewState, SimulationStatus } from './types';
import { Home, User, Ambulance, Building2, Eye, Wifi, WifiOff } from 'lucide-react';
import { socketService } from './services/socketService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [simStatus, setSimStatus] = useState<SimulationStatus>('idle');
  const [isConnected, setIsConnected] = useState(false);
  const [currentEmergencyId, setCurrentEmergencyId] = useState<string | null>(null);
  const [driverInfo, setDriverInfo] = useState<{ name: string; vehicle: string; eta: string } | null>(null);
  const [pendingRequest, setPendingRequest] = useState<any>(null);

  // Connect to WebSocket server on mount
  useEffect(() => {
    socketService.connect()
      .then(() => setIsConnected(true))
      .catch(() => setIsConnected(false));

    // Register as driver if default view is driver (mostly for dev)
    if (currentView === 'driver') {
      socketService.registerAsDriver({
        name: 'Rajesh Kumar',
        vehicle: 'MH-04-1234',
        location: { lat: 19.076, lng: 72.8777 }
      });
    }

    // Set up event listeners
    const unsubCreated = socketService.on('emergency:created', (data: { emergencyId: string }) => {
      console.log('[App] Emergency created:', data.emergencyId);
      setCurrentEmergencyId(data.emergencyId);
      setSimStatus('request_pending');
    });

    const unsubDriverAssigned = socketService.on('emergency:driver-assigned', (data: any) => {
      console.log('[App] Driver assigned:', data);
      setDriverInfo(data.driver);
      setSimStatus('accepted');
    });

    const unsubAssignmentConfirmed = socketService.on('driver:assignment-confirmed', (data: any) => {
      console.log('[App] Assignment confirmed:', data);
      setSimStatus('accepted');
    });

    const unsubNoDrivers = socketService.on('emergency:no-drivers', () => {
      console.log('[App] No drivers available');
      // Keep searching - in production, show a message
    });

    const unsubNewRequest = socketService.on('emergency:new-request', (data: any) => {
      console.log('[App] New emergency request for driver:', data);
      setPendingRequest(data);
      setSimStatus('request_pending');
    });

    const unsubCancelled = socketService.on('emergency:cancelled', () => {
      console.log('[App] Emergency cancelled');
      setPendingRequest(null);
      setSimStatus('idle');
    });

    return () => {
      unsubCreated();
      unsubDriverAssigned();
      unsubAssignmentConfirmed();
      unsubNoDrivers();
      unsubNewRequest();
      unsubCancelled();
      socketService.disconnect();
    };
  }, []);

  // UseEffect to register driver when switching views
  useEffect(() => {
    if (isConnected && currentView === 'driver') {
      socketService.registerAsDriver({
        name: 'Rajesh Kumar',
        vehicle: 'MH-04-1234',
        location: { lat: 19.076, lng: 72.8777 }
      });
    }
  }, [currentView, isConnected]);

  // Real SOS handler - sends to WebSocket server
  const handleSOS = useCallback(() => {
    setSimStatus('searching');

    // Get real location if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          socketService.sendSOS({
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              address: 'Current Location'
            },
            severity: 'high',
            type: 'accident'
          });
        },
        () => {
          // Fallback to default location
          socketService.sendSOS({
            severity: 'high',
            type: 'accident'
          });
        }
      );
    } else {
      socketService.sendSOS({
        severity: 'high',
        type: 'accident'
      });
    }
  }, []);

  const handleDriverAccept = useCallback(() => {
    if (pendingRequest?.emergencyId) {
      socketService.acceptEmergency(pendingRequest.emergencyId);
      setSimStatus('accepted');
    }
  }, [pendingRequest]);

  const handleCancel = useCallback(() => {
    if (currentEmergencyId) {
      socketService.cancelEmergency(currentEmergencyId);
    }
    setSimStatus('idle');
    setCurrentEmergencyId(null);
    setDriverInfo(null);
    setPendingRequest(null);
  }, [currentEmergencyId]);

  const handleBystanderReport = () => {
    setCurrentView('patient');
    handleSOS();
  };

  const renderView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingView onNavigate={setCurrentView} />;
      case 'patient':
        return <PatientLoginWrapper status={simStatus} onSOS={handleSOS} onCancel={handleCancel} driverInfo={driverInfo} />;
      case 'driver':
        return <DriverView status={simStatus} onAccept={handleDriverAccept} pendingRequest={pendingRequest} />;
      case 'hospital':
        return <HospitalView status={simStatus} />;
      case 'bystander':
        return <BystanderView onBack={() => setCurrentView('landing')} onReportSent={handleBystanderReport} />;
      default:
        return <LandingView onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="relative min-h-[100dvh] bg-gray-100 flex flex-col">
      {/* Main Content Area */}
      {/* pb-20 adds space for the mobile bottom nav including safe area */}
      <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 relative overflow-hidden">
        {renderView()}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16">
          <button
            onClick={() => setCurrentView('landing')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 touch-manipulation ${currentView === 'landing' ? 'text-red-600' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <Home size={20} />
            <span className="text-[10px] font-medium">Home</span>
          </button>

          <button
            onClick={() => setCurrentView('patient')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 touch-manipulation ${currentView === 'patient' ? 'text-orange-600 relative' : 'text-gray-400 hover:text-gray-600 relative'
              }`}
          >
            <User size={20} />
            <span className="text-[10px] font-medium">Patient</span>
            {simStatus !== 'idle' && (
              <span className="absolute top-2 right-6 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
            )}
          </button>

          <button
            onClick={() => setCurrentView('driver')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 touch-manipulation ${currentView === 'driver' ? 'text-blue-600 relative' : 'text-gray-400 hover:text-gray-600 relative'
              }`}
          >
            <Ambulance size={20} />
            <span className="text-[10px] font-medium">Driver</span>
            {simStatus === 'request_pending' && (
              <span className="absolute top-2 right-6 w-3 h-3 bg-red-600 border-2 border-white rounded-full"></span>
            )}
          </button>

          <button
            onClick={() => setCurrentView('hospital')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 touch-manipulation ${currentView === 'hospital' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <Building2 size={20} />
            <span className="text-[10px] font-medium">Hospital</span>
          </button>
        </div>
      </div>

      {/* Desktop Floating Navigation */}
      <div className="hidden md:flex fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white px-6 py-3 rounded-full shadow-xl border border-gray-200 z-50 gap-6">
        <button
          onClick={() => setCurrentView('landing')}
          className={`flex items-center gap-2 px-3 py-1 rounded-full transition-colors ${currentView === 'landing' ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-500 hover:bg-gray-50'
            }`}
        >
          <Home size={18} /> Home
        </button>
        <div className="w-px bg-gray-200 h-6 my-auto"></div>
        <button
          onClick={() => setCurrentView('patient')}
          className={`flex items-center gap-2 px-3 py-1 rounded-full transition-colors ${currentView === 'patient' ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-500 hover:bg-gray-50'
            }`}
        >
          <User size={18} /> Patient
          {simStatus !== 'idle' && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
        </button>
        <button
          onClick={() => setCurrentView('driver')}
          className={`flex items-center gap-2 px-3 py-1 rounded-full transition-colors ${currentView === 'driver' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-50'
            }`}
        >
          <Ambulance size={18} /> Driver
          {simStatus === 'request_pending' && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
        </button>
        <button
          onClick={() => setCurrentView('hospital')}
          className={`flex items-center gap-2 px-3 py-1 rounded-full transition-colors ${currentView === 'hospital' ? 'bg-emerald-50 text-emerald-600 font-medium' : 'text-gray-500 hover:bg-gray-50'
            }`}
        >
          <Building2 size={18} /> Hospital
        </button>
        <div className="w-px bg-gray-200 h-6 my-auto"></div>
        <button
          onClick={() => setCurrentView('bystander')}
          className={`flex items-center gap-2 px-3 py-1 rounded-full transition-colors ${currentView === 'bystander' ? 'bg-purple-50 text-purple-600 font-medium' : 'text-gray-500 hover:bg-gray-50'
            }`}
        >
          <Eye size={18} /> Vision
        </button>
      </div>
    </div>
  );
};

export default App;