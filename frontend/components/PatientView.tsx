import React, { useState, useEffect } from 'react';
import { AlertTriangle, Phone, X, MapPin, User, Navigation, ShieldAlert, Timer, Lock, ArrowRight, HeartPulse, Settings, UserCircle } from 'lucide-react';
import { SimulationStatus } from '../types';
import { auth, googleProvider } from '../services/firebaseConfig';
import { signInWithPopup } from 'firebase/auth';
import { authAPI, patientAPI } from '../services/api';
import { ProfileForm } from './ProfileForm';

interface PatientViewProps {
  status: SimulationStatus;
  onSOS: () => void;
  onCancel: () => void;
  driverInfo?: { name: string; vehicle: string; eta: string } | null;
}

// Internal state for the countdown phase only
type InternalPhase = 'idle' | 'counting';

export const PatientView: React.FC<PatientViewProps> = ({ status, onSOS, onCancel, driverInfo }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [internalPhase, setInternalPhase] = useState<InternalPhase>('idle');
  const [countdown, setCountdown] = useState(3);
  const [cancelSlide, setCancelSlide] = useState(0);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name?: string; email?: string } | null>(null);
  
  // Form States
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: ''
  });
  const [error, setError] = useState('');

  // Check for existing auth on mount
  useEffect(() => {
    const token = localStorage.getItem('jeevan_setu_token');
    const user = localStorage.getItem('jeevan_setu_user');
    if (token && user) {
      setIsLoggedIn(true);
      setCurrentUser(JSON.parse(user));
      checkProfileStatus();
    }
  }, []);

  // Check if profile is complete
  const checkProfileStatus = async () => {
    try {
      const response = await patientAPI.getProfile();
      if (response.exists && response.profile?.emergencyReady) {
        setProfileComplete(true);
      } else {
        setProfileComplete(false);
      }
    } catch (err) {
      console.error('Failed to check profile:', err);
      setProfileComplete(false);
    }
  };

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.type === 'tel' ? 'phone' : e.target.type === 'password' ? 'password' : 'name']: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await authAPI.login({ phone: formData.phone, password: formData.password });
      if (response.success) {
        setIsLoggedIn(true);
        setCurrentUser(response.user || null);
        checkProfileStatus();
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to connect to server');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await authAPI.register(formData);
      if (response.success) {
        setIsLoggedIn(true);
        setCurrentUser(response.user || null);
        // New users need to complete profile
        setShowProfileForm(true);
      } else {
        setError(response.message || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to connect to server');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Send to backend to create/update user in MongoDB
      const response = await authAPI.googleLogin({
        name: user.displayName,
        email: user.email,
        googleId: user.uid,
        photoUrl: user.photoURL
      });
      
      if (response.success) {
        setIsLoggedIn(true);
        setCurrentUser(response.user || null);
        checkProfileStatus();
      } else {
        setError('Google login failed on server');
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        // User cancelled the login, no need to show an error
        return;
      }
      setError(error.message || 'Google login failed');
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setProfileComplete(false);
  };

  const handleProfileComplete = () => {
    setShowProfileForm(false);
    setProfileComplete(true);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        
        <div className="w-full max-w-md bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-tr from-red-500 to-red-600 p-4 rounded-2xl shadow-lg shadow-red-200 mb-4 transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <HeartPulse className="text-white w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tight">Jeevan Setu</h1>
            <p className="text-gray-500 font-medium mt-1">Emergency Response System</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm text-center font-medium">
              {error}
            </div>
          )}

          {isRegistering ? (
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Full Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="John Doe"
                    className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Phone Number</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input 
                    type="tel" 
                    placeholder="+91 98765 43210"
                    className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transform transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
              >
                <span>Create Account</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Phone Number</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input 
                    type="tel" 
                    placeholder="+91 98765 43210"
                    className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-indigo-600 font-semibold hover:text-indigo-700">Forgot Password?</a>
              </div>

              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transform transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
              >
                <span>Secure Login</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <button 
              onClick={handleGoogleLogin}
              className="mt-6 w-full bg-white border border-gray-200 text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-3 shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Google</span>
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              {isRegistering ? "Already have an account? " : "Don't have an account? "}
              <button 
                onClick={() => setIsRegistering(!isRegistering)} 
                className="text-indigo-600 font-bold hover:underline focus:outline-none"
              >
                {isRegistering ? "Login Now" : "Register Now"}
              </button>
            </p>
          </div>
        </div>
        
        <div className="mt-8 text-center z-10">
          <p className="text-xs text-gray-400 font-medium">
            By continuing, you agree to our Terms & Privacy Policy
          </p>
        </div>
      </div>
    );
  }

  // Determine what to show based on internal phase + global status
  const showIdle = status === 'idle' && internalPhase === 'idle';
  const showCounting = internalPhase === 'counting' && status === 'idle';
  const showSearching = status === 'searching' || status === 'request_pending';
  const showFound = status === 'accepted';

  return (
    <div className="min-h-[100dvh] bg-gray-50 relative overflow-hidden flex flex-col">
      {/* Profile Form Modal */}
      {showProfileForm && (
        <ProfileForm
          onComplete={handleProfileComplete}
          onClose={() => setShowProfileForm(false)}
          userEmail={currentUser?.email}
          userName={currentUser?.name}
        />
      )}

      {/* Header */}
      <div className="bg-white p-4 shadow-sm z-10 flex justify-between items-center sticky top-0">
        <div className="flex items-center gap-2">
          <div className="bg-red-100 p-2 rounded-lg text-red-600">
            <ShieldAlert size={20} />
          </div>
          <span className="font-bold text-gray-800">Jeevan Setu</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Profile Status Badge */}
          {profileComplete ? (
            <div className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Emergency Ready
            </div>
          ) : (
            <button
              onClick={() => setShowProfileForm(true)}
              className="text-xs font-medium bg-orange-100 text-orange-700 px-2 py-1 rounded-full flex items-center gap-1 hover:bg-orange-200 transition-colors"
            >
              <Settings size={12} />
              Setup Profile
            </button>
          )}
          <button 
            onClick={() => setShowProfileForm(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Edit Profile"
          >
            <UserCircle size={20} className="text-gray-600" />
          </button>
          <button 
            onClick={handleLogout}
            className="text-xs font-medium text-gray-500 hover:text-red-600"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 pb-24 md:pb-32 relative">

        {/* --- STATUS: IDLE --- */}
        {showIdle && (
          <div className="w-full max-w-sm flex flex-col items-center animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Emergency Help</h2>
            <p className="text-gray-500 mb-8 sm:mb-12 text-center text-sm sm:text-base">
              Press the button below to immediately request an ambulance.
            </p>

            {/* Profile Warning */}
            {!profileComplete && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl w-full">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-yellow-600 mt-0.5 shrink-0" size={18} />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Profile Incomplete</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Complete your medical profile for faster emergency response.
                    </p>
                    <button
                      onClick={() => setShowProfileForm(true)}
                      className="mt-2 text-xs font-semibold text-yellow-700 hover:text-yellow-900 underline"
                    >
                      Complete Profile Now →
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                    <h2 className="text-2xl font-bold text-gray-900">{driverInfo?.name || 'Rajesh Kumar'}</h2>
                    <p className="text-gray-500 text-sm">Paramedic Driver • 4.9 ★</p>
                  </div>
                  <div className="bg-gray-100 p-3 rounded-full">
                    <User size={32} className="text-gray-600" />
                  </div>
                </div>

                <div className="flex gap-4 mb-6">
                  <div className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                    <div className="text-xs text-gray-400 uppercase font-bold mb-1">Vehicle</div>
                    <div className="font-mono font-semibold text-gray-800">{driverInfo?.vehicle || 'MH-04-1234'}</div>
                  </div>
                  <div className="flex-1 bg-red-50 p-3 rounded-xl border border-red-100 text-center">
                    <div className="text-xs text-red-400 uppercase font-bold mb-1">ETA</div>
                    <div className="font-mono font-bold text-red-600 text-lg">{driverInfo?.eta || '5 mins'}</div>
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