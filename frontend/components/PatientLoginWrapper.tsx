/**
 * Patient Login Wrapper
 * Handles authentication flow before showing emergency features
 */

import React, { useState } from 'react';
import { AlertCircle, Loader2, Eye, EyeOff, Mail, Lock, Phone, User as UserIcon } from 'lucide-react';
import axios from 'axios';
import { auth, googleProvider } from '../services/firebaseConfig';
import { signInWithPopup } from 'firebase/auth';
import { PatientView } from './PatientView';
import { ProfileForm } from './ProfileForm';
import { SimulationStatus } from '../types';

interface PatientLoginWrapperProps {
  status: SimulationStatus;
  onSOS: () => void;
  onCancel: () => void;
  driverInfo?: { name: string; vehicle: string; eta: string } | null;
}

interface LoginFormData {
  phone: string;
  password: string;
}

interface RegisterFormData {
  name: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone: string;
}

type AuthPhase = 'login' | 'register' | 'profile' | 'emergency';

const API_URL = 'http://localhost:4000/api';

export const PatientLoginWrapper: React.FC<PatientLoginWrapperProps> = ({
  status,
  onSOS,
  onCancel,
  driverInfo,
}) => {
  const [authPhase, setAuthPhase] = useState<AuthPhase>('login');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [loginForm, setLoginForm] = useState<LoginFormData>({
    phone: '',
    password: '',
  });

  // Register form state
  const [registerForm, setRegisterForm] = useState<RegisterFormData>({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        phone: loginForm.phone,
        password: loginForm.password,
      });

      if (response.data.success) {
        const { user, token } = response.data;
        setCurrentUser(user);
        setToken(token);
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', JSON.stringify(user));
        setAuthPhase('profile');
      } else {
        setError(response.data.message || 'Login failed');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        name: registerForm.name,
        phone: registerForm.phone,
        password: registerForm.password,
      });

      if (response.data.success) {
        const { user, token } = response.data;
        setCurrentUser(user);
        setToken(token);
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', JSON.stringify(user));
        setAuthPhase('profile');
      } else {
        setError(response.data.message || 'Registration failed');
      }
    } catch (err: any) {
      console.error('Register error:', err);
      setError(err.response?.data?.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google login
  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      const response = await axios.post(`${API_URL}/auth/google`, {
        name: firebaseUser.displayName,
        email: firebaseUser.email,
        googleId: firebaseUser.uid,
        photoUrl: firebaseUser.photoURL,
      });

      if (response.data.success) {
        const { user, token } = response.data;
        setCurrentUser(user);
        setToken(token);
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', JSON.stringify(user));
        setAuthPhase('profile');
      } else {
        setError('Google login failed on server');
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        return;
      }
      setError(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  // If authenticated and profile complete, show emergency interface
  if (authPhase === 'emergency' && currentUser) {
    return (
      <PatientView
        status={status}
        onSOS={onSOS}
        onCancel={onCancel}
        driverInfo={driverInfo}
      />
    );
  }

  // If in profile setup phase, show profile form
  if (authPhase === 'profile' && currentUser) {
    return (
      <ProfileForm
        onComplete={() => setAuthPhase('emergency')}
        onClose={() => {
          setAuthPhase('login');
          setCurrentUser(null);
          setToken(null);
          localStorage.removeItem('authToken');
          localStorage.removeItem('currentUser');
        }}
        userEmail={currentUser.email}
        userName={currentUser.name}
      />
    );
  }

  // Show login/register forms
  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="bg-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <AlertCircle className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Jeevan Setu</h1>
          <p className="text-gray-600 mt-2">AI-Powered Emergency Response</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Login Form */}
        {authPhase === 'login' && (
          <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Patient Login</h2>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="tel"
                  placeholder="Enter your phone number"
                  value={loginForm.phone}
                  onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center my-4">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-2 text-gray-500 text-sm">OR</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* Google Login */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M5.266 9.765A7.077 7.077 0 0 1 12 4.9a7.07 7.07 0 0 1 4.982 1.998 6.479 6.479 0 0 1 1.639 4.038h-6.117v3.07h9.256a8.25 8.25 0 0 1-2.191 5.602a7.055 7.055 0 0 1-5.23 2.049c-4.001 0-7.297-3.298-7.297-7.297 0-2.147.848-4.135 2.363-5.565Z"
                />
              </svg>
              Continue with Google
            </button>

            {/* Register Link */}
            <p className="text-center text-gray-600 text-sm mt-4">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setAuthPhase('register')}
                className="text-red-600 hover:text-red-700 font-semibold"
              >
                Register here
              </button>
            </p>
          </form>
        )}

        {/* Register Form */}
        {authPhase === 'register' && (
          <form onSubmit={handleRegister} className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Account</h2>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="tel"
                  placeholder="Enter your phone number"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Register Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>

            {/* Login Link */}
            <p className="text-center text-gray-600 text-sm mt-4">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setAuthPhase('login')}
                className="text-red-600 hover:text-red-700 font-semibold"
              >
                Login here
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default PatientLoginWrapper;
