import React from 'react';
import { Ambulance, MapPin, Navigation, Phone, Shield, Clock } from 'lucide-react';
import { SimulationStatus } from '../types';

interface DriverViewProps {
  status: SimulationStatus;
  onAccept: () => void;
}

export const DriverView: React.FC<DriverViewProps> = ({ status, onAccept }) => {
  return (
    <div className="min-h-[100dvh] bg-gray-900 flex flex-col relative overflow-hidden">
      
      {/* Top Bar */}
      <div className="bg-gray-800 p-4 flex justify-between items-center border-b border-gray-700 z-10 sticky top-0">
        <div className="flex items-center gap-3">
           <div className="bg-blue-600 p-2 rounded-lg">
               <Ambulance size={20} className="text-white" />
           </div>
           <div>
               <h1 className="text-white font-bold text-sm">Unit: MH-04-1234</h1>
               <div className="flex items-center gap-2">
                   <span className={`w-2 h-2 rounded-full ${status === 'accepted' ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`}></span>
                   <span className="text-gray-400 text-xs">
                     {status === 'accepted' ? 'BUSY - ON MISSION' : 'ONLINE - AVAILABLE'}
                   </span>
               </div>
           </div>
        </div>
        <div className="bg-gray-700 p-2 rounded-full text-gray-400">
            <Shield size={20} />
        </div>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-4">
        
        {/* Map Background Simulation */}
        <div className="absolute inset-0 opacity-20">
            <div className="w-full h-full bg-[radial-gradient(#4b5563_1px,transparent_1px)] [background-size:20px_20px]"></div>
        </div>

        {status === 'accepted' ? (
             /* --- EN ROUTE VIEW --- */
            <div className="w-full max-w-md bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden animate-in fade-in duration-500 z-10">
                <div className="bg-yellow-500 p-3 flex justify-between items-center text-black font-bold">
                    <span className="flex items-center gap-2"><Navigation size={18} /> EN ROUTE TO PATIENT</span>
                    <span>ETA: 8 min</span>
                </div>
                
                <div className="p-6">
                    <div className="flex items-start gap-4 mb-6">
                         <div className="bg-gray-700 p-3 rounded-full">
                             <MapPin size={24} className="text-red-500" />
                         </div>
                         <div>
                             <h3 className="text-gray-200 font-bold text-lg">Emergency Location</h3>
                             <p className="text-gray-400 text-sm">Sector 42, Main Highway Junction</p>
                             <p className="text-gray-500 text-xs mt-1">Near City Hospital</p>
                         </div>
                    </div>

                    <div className="h-40 bg-gray-700 rounded-xl mb-4 relative overflow-hidden flex items-center justify-center border border-gray-600">
                         {/* Fake Route */}
                         <Navigation size={48} className="text-blue-400 animate-pulse" />
                         <span className="absolute bottom-2 text-xs text-gray-400">Navigating...</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-xl font-medium flex items-center justify-center gap-2 touch-manipulation">
                             <Phone size={18} /> Call Patient
                        </button>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-medium touch-manipulation">
                             Arrived
                        </button>
                    </div>
                </div>
            </div>
        ) : (
            /* --- IDLE / WAITING VIEW --- */
            <div className="text-center z-10">
                <div className="bg-gray-800/80 p-6 rounded-2xl border border-gray-700 backdrop-blur-sm">
                    <div className="bg-blue-900/30 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-400 relative">
                        <Ambulance size={48} />
                        <div className="absolute inset-0 border-2 border-blue-500/30 rounded-full animate-ping"></div>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Scanning Sector 4</h2>
                    <p className="text-gray-400 text-sm">Waiting for dispatch instructions...</p>
                </div>
            </div>
        )}
      </div>

      {/* --- INCOMING REQUEST MODAL --- */}
      {status === 'request_pending' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4 animate-in slide-in-from-bottom-20 duration-300">
            <div className="bg-gray-900 w-full max-w-md rounded-2xl border-2 border-red-500 shadow-2xl shadow-red-900/50 overflow-hidden mb-[env(safe-area-inset-bottom)]">
                <div className="bg-red-600 p-4 flex items-center justify-between animate-pulse">
                    <span className="text-white font-black text-lg tracking-wider flex items-center gap-2">
                        <Shield size={24} /> EMERGENCY ALERT
                    </span>
                    <span className="bg-white text-red-600 text-xs font-bold px-2 py-1 rounded">PRIORITY HIGH</span>
                </div>
                
                <div className="p-6">
                    <div className="flex gap-4 mb-6">
                        <div className="w-1/3">
                            <div className="h-full bg-gray-800 rounded-lg flex flex-col items-center justify-center text-gray-500 p-2">
                                <Clock size={24} className="mb-2 text-orange-500" />
                                <span className="text-2xl font-bold text-white">45s</span>
                                <span className="text-[10px] uppercase">To Respond</span>
                            </div>
                        </div>
                        <div className="w-2/3 space-y-3">
                            <div>
                                <div className="text-gray-500 text-xs uppercase">Incident Type</div>
                                <div className="text-white font-bold text-lg">Road Accident</div>
                            </div>
                            <div>
                                <div className="text-gray-500 text-xs uppercase">Distance</div>
                                <div className="text-white font-bold text-lg">2.4 km <span className="text-gray-500 text-sm font-normal">(4 mins)</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button 
                            onClick={onAccept}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-xl shadow-lg shadow-green-900/50 transform transition active:scale-95 flex items-center justify-center gap-2 touch-manipulation"
                        >
                            ACCEPT REQUEST
                        </button>
                        <button className="w-full bg-gray-800 hover:bg-gray-700 text-gray-400 py-3 rounded-xl font-medium text-sm touch-manipulation">
                            Reject (Reason Required)
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};