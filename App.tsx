import React, { useState, useEffect } from 'react';
import { LandingView } from './components/LandingView';
import { PatientView } from './components/PatientView';
import { DriverView } from './components/DriverView';
import { HospitalView } from './components/HospitalView';
import { BystanderView } from './components/BystanderView';
import { ViewState, SimulationStatus } from './types';
import { Home, User, Ambulance, Building2, Eye } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [simStatus, setSimStatus] = useState<SimulationStatus>('idle');

  // Simulation Logic
  const handleSOS = () => {
    setSimStatus('searching');
    // Simulate network latency / AI matching
    setTimeout(() => {
      setSimStatus('request_pending');
    }, 4000);
  };

  const handleDriverAccept = () => {
    setSimStatus('accepted');
  };

  const handleCancel = () => {
    setSimStatus('idle');
  };

  const handleBystanderReport = () => {
    setCurrentView('patient');
    handleSOS();
  };

  const renderView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingView onNavigate={setCurrentView} />;
      case 'patient':
        return <PatientView status={simStatus} onSOS={handleSOS} onCancel={handleCancel} />;
      case 'driver':
        return <DriverView status={simStatus} onAccept={handleDriverAccept} />;
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
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 touch-manipulation ${
              currentView === 'landing' ? 'text-red-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Home size={20} />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          
          <button
            onClick={() => setCurrentView('patient')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 touch-manipulation ${
              currentView === 'patient' ? 'text-orange-600 relative' : 'text-gray-400 hover:text-gray-600 relative'
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
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 touch-manipulation ${
              currentView === 'driver' ? 'text-blue-600 relative' : 'text-gray-400 hover:text-gray-600 relative'
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
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 touch-manipulation ${
              currentView === 'hospital' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
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
            className={`flex items-center gap-2 px-3 py-1 rounded-full transition-colors ${
              currentView === 'landing' ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Home size={18} /> Home
          </button>
           <div className="w-px bg-gray-200 h-6 my-auto"></div>
           <button
            onClick={() => setCurrentView('patient')}
            className={`flex items-center gap-2 px-3 py-1 rounded-full transition-colors ${
              currentView === 'patient' ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <User size={18} /> Patient
            {simStatus !== 'idle' && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
          </button>
          <button
            onClick={() => setCurrentView('driver')}
            className={`flex items-center gap-2 px-3 py-1 rounded-full transition-colors ${
              currentView === 'driver' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Ambulance size={18} /> Driver
             {simStatus === 'request_pending' && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
          </button>
          <button
            onClick={() => setCurrentView('hospital')}
            className={`flex items-center gap-2 px-3 py-1 rounded-full transition-colors ${
              currentView === 'hospital' ? 'bg-emerald-50 text-emerald-600 font-medium' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Building2 size={18} /> Hospital
          </button>
          <div className="w-px bg-gray-200 h-6 my-auto"></div>
          <button
            onClick={() => setCurrentView('bystander')}
            className={`flex items-center gap-2 px-3 py-1 rounded-full transition-colors ${
              currentView === 'bystander' ? 'bg-purple-50 text-purple-600 font-medium' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Eye size={18} /> Vision
          </button>
       </div>
    </div>
  );
};

export default App;