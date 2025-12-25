/**
 * API Service Layer
 * Centralized Axios configuration and API calls for the application
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Create Axios instance with default configuration
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
let authToken: string | null = null;

/**
 * Set authentication token for API requests
 */
export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('jeevan_setu_token', token);
  } else {
    localStorage.removeItem('jeevan_setu_token');
  }
};

/**
 * Get stored authentication token
 */
export const getAuthToken = (): string | null => {
  if (authToken) return authToken;
  return localStorage.getItem('jeevan_setu_token');
};

/**
 * Clear authentication data
 */
export const clearAuth = () => {
  authToken = null;
  localStorage.removeItem('jeevan_setu_token');
  localStorage.removeItem('jeevan_setu_user');
};

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle common errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth and redirect to login
      clearAuth();
      // Dispatch custom event for auth expiry
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(error);
  }
);

// ============ AUTH API ============

export interface LoginData {
  phone: string;
  password: string;
}

export interface RegisterData {
  name: string;
  phone: string;
  password: string;
}

export interface GoogleLoginData {
  name: string | null;
  email: string | null;
  googleId: string;
  photoUrl: string | null;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    role: string;
  };
  message?: string;
}

export const authAPI = {
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    if (response.data.token) {
      setAuthToken(response.data.token);
      localStorage.setItem('jeevan_setu_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    if (response.data.token) {
      setAuthToken(response.data.token);
      localStorage.setItem('jeevan_setu_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  googleLogin: async (data: GoogleLoginData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/google', data);
    if (response.data.token) {
      setAuthToken(response.data.token);
      localStorage.setItem('jeevan_setu_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout: () => {
    clearAuth();
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('jeevan_setu_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated: () => {
    return !!getAuthToken();
  },
};

// ============ PATIENT PROFILE API ============

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface MedicalInfo {
  diabetes: boolean;
  bloodPressure: boolean;
  heartCondition: boolean;
  kidneyCondition: boolean;
  allergies: string;
  regularMedications: string;
  disabilities: string;
  insuranceAvailable: boolean;
  insuranceCardUrl: string;
  medicalReportUrl: string;
  medicalReportMetadata: string;
}

export interface ConsentSettings {
  allowLocation: boolean;
  allowSMS: boolean;
  allowFamilyNotification: boolean;
  allowMedicalShareInEmergency: boolean;
  consentAccepted: boolean;
  consentAcceptedAt?: Date;
}

export interface PatientProfile {
  _id?: string;
  userId?: string;
  fullName: string;
  age: number;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  address: string;
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';
  phoneNumber: string;
  email: string;
  emergencyContacts: EmergencyContact[];
  medicalInfo: MedicalInfo;
  preferredHospitals: string[] | Hospital[];
  additionalHospitals?: string[] | Hospital[];
  consentSettings: ConsentSettings;
  currentStep: number;
  emergencyReady: boolean;
  profileCompleted: boolean;
}

export interface ProfileResponse {
  success: boolean;
  exists?: boolean;
  profile?: PatientProfile | null;
  message?: string;
  errors?: string[];
}

export const patientAPI = {
  /**
   * Get patient profile
   */
  getProfile: async (): Promise<ProfileResponse> => {
    const response = await api.get<ProfileResponse>('/patient/profile');
    return response.data;
  },

  /**
   * Create new patient profile
   */
  createProfile: async (data: Partial<PatientProfile>): Promise<ProfileResponse> => {
    const response = await api.post<ProfileResponse>('/patient/profile', data);
    return response.data;
  },

  /**
   * Update entire patient profile
   */
  updateProfile: async (data: Partial<PatientProfile>): Promise<ProfileResponse> => {
    const response = await api.put<ProfileResponse>('/patient/profile', data);
    return response.data;
  },

  /**
   * Update medical information only
   */
  updateMedicalInfo: async (data: Partial<MedicalInfo>): Promise<ProfileResponse> => {
    const response = await api.patch<ProfileResponse>('/patient/profile/medical', data);
    return response.data;
  },

  /**
   * Update hospital preferences
   */
  updatePreferences: async (data: {
    preferredHospitals?: string[];
    additionalHospitals?: string[];
    consentSettings?: Partial<ConsentSettings>;
  }): Promise<ProfileResponse> => {
    const response = await api.patch<ProfileResponse>('/patient/profile/preferences', data);
    return response.data;
  },

  /**
   * Save step data (auto-save)
   */
  saveStep: async (stepNumber: number, data: Partial<PatientProfile>): Promise<ProfileResponse> => {
    const response = await api.patch<ProfileResponse>(`/patient/profile/step/${stepNumber}`, data);
    return response.data;
  },

  /**
   * Activate emergency profile (final submit)
   */
  activateProfile: async (): Promise<ProfileResponse> => {
    const response = await api.post<ProfileResponse>('/patient/profile/activate');
    return response.data;
  },
};

// ============ HOSPITAL API ============

export interface Hospital {
  _id: string;
  name: string;
  address: string;
  city: string;
  state?: string;
  phone: string;
  email?: string;
  availableBeds?: number;
  availableIcuBeds?: number;
  hasICU?: boolean;
  hasEmergency?: boolean;
  hasTraumaCenter?: boolean;
  hasCardiacCare?: boolean;
}

export interface HospitalListResponse {
  success: boolean;
  count: number;
  hospitals: Hospital[];
}

export const hospitalAPI = {
  /**
   * Get all hospitals with optional filters
   */
  getHospitals: async (params?: {
    city?: string;
    hasICU?: boolean;
    hasEmergency?: boolean;
    search?: string;
  }): Promise<HospitalListResponse> => {
    const response = await api.get<HospitalListResponse>('/hospitals', { params });
    return response.data;
  },

  /**
   * Get hospital by ID
   */
  getHospitalById: async (id: string): Promise<{ success: boolean; hospital: Hospital }> => {
    const response = await api.get(`/hospitals/${id}`);
    return response.data;
  },

  /**
   * Get nearby hospitals
   */
  getNearbyHospitals: async (lat: number, lng: number, maxDistance?: number): Promise<HospitalListResponse> => {
    const response = await api.get<HospitalListResponse>('/hospitals/nearby', {
      params: { lat, lng, maxDistance },
    });
    return response.data;
  },

  /**
   * Seed hospitals (development only)
   */
  seedHospitals: async (): Promise<{ success: boolean; message: string; count?: number }> => {
    const response = await api.post('/hospitals/seed');
    return response.data;
  },
};

// Export default API instance for custom calls
export default api;
