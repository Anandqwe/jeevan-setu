import React from 'react';
import { ViewState } from '../types';
import { ShieldAlert, User, Ambulance, Building2, AlertTriangle, Activity } from 'lucide-react';

interface LandingViewProps {
  onNavigate: (view: ViewState) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onNavigate }) => {
  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] w-full bg-white">
      {/* Left Side: Branding */}
      <div className="w-full md:w-1/2 bg-gradient-to-br from-red-600 to-orange-600 flex flex-col justify-center items-center text-white p-10 relative overflow-hidden min-h-[40vh] md:min-h-auto">
        {/* Decorative background elements */}
        <div className="absolute top-10 left-10 opacity-10">
          <Activity size={200} />
        </div>
        <div className="absolute bottom-10 right-10 opacity-10">
          <ShieldAlert size={150} />
        </div>

        <div className="z-10 text-center">
          <div className="bg-white/20 p-6 rounded-full inline-block mb-6 backdrop-blur-sm shadow-xl border border-white/30">
            <ShieldAlert size={64} className="text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 tracking-tight">Jeevan Setu</h1>
          <p className="text-lg sm:text-xl md:text-2xl font-light opacity-90 max-w-md mx-auto">
            AI-Powered Emergency Response
          </p>
          <div className="mt-8 flex gap-2 justify-center opacity-75 text-xs sm:text-sm uppercase tracking-widest">
            <span>Detect</span> • <span>Connect</span> • <span>Save</span>
          </div>
        </div>
      </div>

      {/* Right Side: Actions */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-6 md:p-12 bg-gray-50 flex-1">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          
          <div className="text-center md:text-left">
             <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome</h2>
             <p className="text-gray-500 mt-2 text-sm sm:text-base">Select your role or report an emergency immediately.</p>
          </div>

          {/* Primary Action: Report Accident */}
          <button 
            onClick={() => onNavigate('bystander')}
            className="group w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white p-5 sm:p-6 rounded-2xl shadow-lg hover:shadow-red-500/30 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-4 border-2 border-red-500 touch-manipulation"
          >
            <div className="bg-white/20 p-2 rounded-full group-hover:animate-pulse shrink-0">
                <AlertTriangle size={28} className="sm:w-8 sm:h-8" />
            </div>
            <div className="text-left">
                <div className="text-xl sm:text-2xl font-bold leading-none">REPORT ACCIDENT</div>
                <div className="text-red-100 text-xs sm:text-sm mt-1 font-medium">Bystander / Witness Report</div>
            </div>
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs sm:text-sm font-medium uppercase">Or Login As</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          {/* Role Selection Grid */}
          <div className="grid grid-cols-1 gap-4">
            
            <button 
              onClick={() => onNavigate('patient')}
              className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-orange-500 transition-all duration-200 flex items-center gap-4 group touch-manipulation"
            >
              <div className="bg-orange-100 p-3 rounded-full text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                <User size={24} />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">Patient</div>
                <div className="text-sm text-gray-500">Access health records & help</div>
              </div>
            </button>

            <button 
              onClick={() => onNavigate('driver')}
              className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-500 transition-all duration-200 flex items-center gap-4 group touch-manipulation"
            >
              <div className="bg-blue-100 p-3 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Ambulance size={24} />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">Ambulance Driver</div>
                <div className="text-sm text-gray-500">View and respond to alerts</div>
              </div>
            </button>

            <button 
              onClick={() => onNavigate('hospital')}
              className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-500 transition-all duration-200 flex items-center gap-4 group touch-manipulation"
            >
              <div className="bg-emerald-100 p-3 rounded-full text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Building2 size={24} />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">Hospital Admin</div>
                <div className="text-sm text-gray-500">Manage admissions & resources</div>
              </div>
            </button>

          </div>
        </div>
        
        <div className="mt-8 sm:mt-10 text-[10px] sm:text-xs text-gray-400">
            Jeevan Setu v1.0 • Prototype
        </div>
      </div>
    </div>
  );
};