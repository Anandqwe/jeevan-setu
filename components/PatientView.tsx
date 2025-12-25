import React, { useState, useEffect } from 'react';
import { AlertTriangle, Phone, X, MapPin, User, Navigation, ShieldAlert, Timer } from 'lucide-react';
import { SimulationStatus } from '../types';

interface PatientViewProps {
  status: SimulationStatus;
  onSOS: () => void;
  onCancel: () => void;
}

// Internal state for the countdown phase only
type InternalPhase = 'idle' | 'counting';

export const PatientView: React.FC<PatientViewProps> = ({ status, onSOS, onCancel }) => {
  const [internalPhase, setInternalPhase] = useState<InternalPhase>('idle');
  const [countdown, setCountdown] = useState(3);
  const [cancelSlide, setCancelSlide] = useState(0);

  // Sync internal phase if global status is reset
  useEffect(() => {
    if (status === 'idle') {
      setInternalPhase('idle');
      setCountdown(3);
      setCancelSlide(0);
    }
  }, [status]);

  // Countdown Logic
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (internalPhase === 'counting') {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      } else {
        // Countdown finished, trigger global SOS
        onSOS();
      }
    }
    return () => clearTimeout(timer);
  }, [internalPhase, countdown, onSOS]);

  const handleSOSClick = () => {
    setCountdown(3);
    setCancelSlide(0);
    setInternalPhase('counting');
  };

  const handleCancelSlide = () => {
    setInternalPhase('idle');
    setCountdown(3);
    setCancelSlide(0);
    onCancel();
  };

  const handleSlideChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setCancelSlide(val);
    if (val > 90) {
      handleCancelSlide();
    }
  };

  // Determine what to show based on internal phase + global status
  const showIdle = status === 'idle' && internalPhase === 'idle';
  const showCounting = internalPhase === 'counting' && status === 'idle';
  const showSearching = status === 'searching' || status === 'request_pending';
  const showFound = status === 'accepted';

  return (
    <div className="min-h-[100dvh] bg-gray-50 relative overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm z-10 flex justify-between items-center sticky top-0">
        <div className="flex items-center gap-2">
            <div className="bg-red-100 p-2 rounded-lg text-red-600">
                <ShieldAlert size={20} />
            </div>
            <span className="font-bold text-gray-800">Jeevan Setu</span>
        </div>
        <div className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">
            GPS Active
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        
        {/* --- STATUS: IDLE --- */}
        {showIdle && (
          <div className="w-full max-w-sm flex flex-col items-center animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Emergency Help</h2>
            <p className="text-gray-500 mb-8 sm:mb-12 text-center text-sm sm:text-base">
              Press the button below to immediately request an ambulance.
            </p>
            
            <button 
              onClick={handleSOSClick}
              className="relative group cursor-pointer touch-manipulation"
            >
              {/* Pulse Effects */}
              <div className="absolute inset-0 bg-red-500 rounded-full opacity-20 animate-[ping_2s_ease-in-out_infinite]"></div>
              <div className="absolute inset-4 bg-red-500 rounded-full opacity-40 animate-[ping_2s_ease-in-out_infinite_0.5s]"></div>
              
              {/* Main Button */}
              {/* Sizing: Smaller on mobile, Larger on Desktop */}
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex flex-col items-center justify-center shadow-xl shadow-red-500/40 border-8 border-red-100 transform transition-transform group-active:scale-95">
                <AlertTriangle className="text-white mb-2 drop-shadow-md w-16 h-16 sm:w-20 sm:h-20" />
                <span className="text-3xl sm:text-4xl font-black text-white tracking-widest drop-shadow-md">SOS</span>
                <span className="text-red-100 text-xs sm:text-sm mt-1 font-medium">TAP TO HELP</span>
              </div>
            </button>
            
            <div className="mt-8 sm:mt-12 p-4 bg-orange-50 rounded-xl border border-orange-100 max-w-xs w-full">
                <div className="flex items-start gap-3">
                    <Timer className="text-orange-500 mt-1 shrink-0" size={18} />
                    <p className="text-xs sm:text-sm text-orange-800">
                        AI will analyze your location and connect you to the nearest responder immediately.
                    </p>
                </div>
            </div>
          </div>
        )}

        {/* --- STATUS: COUNTING (Slide to Cancel) --- */}
        {showCounting && (
          <div className="w-full max-w-sm flex flex-col items-center z-20 animate-in zoom-in-95 duration-300">
             <div className="text-center mb-10">
                <div className="text-6xl sm:text-7xl font-black text-red-600 mb-2">{countdown}</div>
                <h3 className="text-xl font-bold text-gray-800">Sending Alert...</h3>
                <p className="text-gray-500">Notifying responders in your area</p>
             </div>

             {/* Slide to Cancel */}
             <div className="w-full relative h-16 bg-gray-200 rounded-full overflow-hidden shadow-inner flex items-center">
                 <div 
                    className="absolute left-0 top-0 bottom-0 bg-red-100 transition-all duration-75 ease-out flex items-center justify-end pr-4 border-r border-red-200"
                    style={{ width: `${Math.max(15, cancelSlide)}%` }}
                 >
                 </div>
                 
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <span className="text-gray-400 font-semibold uppercase tracking-widest text-sm">Slide to Cancel</span>
                 </div>

                 <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={cancelSlide}
                    onChange={handleSlideChange}
                    onMouseUp={() => setCancelSlide(0)}
                    onTouchEnd={() => setCancelSlide(0)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30 touch-manipulation"
                 />
                 
                 {/* Visual Thumb */}
                 <div 
                    className="absolute top-1 bottom-1 w-14 bg-white rounded-full shadow-md flex items-center justify-center pointer-events-none transition-all duration-75 ease-out"
                    style={{ left: `calc(${cancelSlide}% - ${cancelSlide * 0.5}px + 4px)` }}
                 >
                    <X size={24} className="text-red-500" />
                 </div>
             </div>
          </div>
        )}

        {/* --- STATUS: SEARCHING --- */}
        {showSearching && (
          <div className="w-full max-w-sm flex flex-col items-center animate-in fade-in duration-500">
             <div className="relative mb-8">
                 <div className="w-32 h-32 bg-orange-100 rounded-full flex items-center justify-center animate-pulse">
                     <Navigation size={48} className="text-orange-600" />
                 </div>
                 <div className="absolute inset-0 border-4 border-orange-400 rounded-full animate-[spin_3s_linear_infinite] border-t-transparent"></div>
             </div>
             <h3 className="text-xl font-bold text-gray-800 mb-2">Locating Ambulance</h3>
             <p className="text-gray-500 text-center">Checking nearby drivers and calculating fastest route...</p>
             {status === 'request_pending' && (
               <p className="text-sm text-orange-600 mt-4 font-medium animate-pulse">Contacting Drivers...</p>
             )}
          </div>
        )}

        {/* --- STATUS: FOUND --- */}
        {showFound && (
          <div className="w-full max-w-sm animate-in slide-in-from-bottom-10 duration-500">
             <div className="bg-green-50 border border-green-200 p-4 rounded-xl mb-6 flex items-center gap-3">
                 <div className="bg-green-500 text-white p-2 rounded-full">
                     <ShieldAlert size={20} />
                 </div>
                 <div>
                     <h3 className="font-bold text-green-800">Ambulance Found!</h3>
                     <p className="text-sm text-green-700">Help is on the way.</p>
                 </div>
             </div>

             <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                 {/* Map Placeholder */}
                 <div className="bg-gray-200 h-32 w-full flex items-center justify-center relative">
                     <MapPin size={32} className="text-red-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                     <span className="text-xs text-gray-500 absolute bottom-2 right-2">Map Data ©2024</span>
                 </div>

                 {/* Driver Info */}
                 <div className="p-6">
                     <div className="flex justify-between items-start mb-6">
                         <div>
                             <h2 className="text-2xl font-bold text-gray-900">Rajesh Kumar</h2>
                             <p className="text-gray-500 text-sm">Paramedic Driver • 4.9 ★</p>
                         </div>
                         <div className="bg-gray-100 p-3 rounded-full">
                             <User size={32} className="text-gray-600" />
                         </div>
                     </div>

                     <div className="flex gap-4 mb-6">
                         <div className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                             <div className="text-xs text-gray-400 uppercase font-bold mb-1">Vehicle</div>
                             <div className="font-mono font-semibold text-gray-800">MH-04-1234</div>
                         </div>
                         <div className="flex-1 bg-red-50 p-3 rounded-xl border border-red-100 text-center">
                             <div className="text-xs text-red-400 uppercase font-bold mb-1">ETA</div>
                             <div className="font-mono font-bold text-red-600 text-lg">5 mins</div>
                         </div>
                     </div>

                     <div className="flex gap-3">
                         <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-green-200">
                             <Phone size={20} /> Call Driver
                         </button>
                         <button 
                            onClick={onCancel}
                            className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200"
                         >
                             Cancel
                         </button>
                     </div>
                 </div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};