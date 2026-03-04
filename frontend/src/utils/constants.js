// API URL and WebSocket URL constants
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

// Mumbai fallback coordinates
export const MUMBAI_DEFAULT_LAT = 19.0760;
export const MUMBAI_DEFAULT_LNG = 72.8777;
export const GEOLOCATION_TIMEOUT_MS = 10000;

// Incident statuses
export const INCIDENT_STATUSES = {
  REQUESTED: 'REQUESTED',
  AMBULANCE_ASSIGNED: 'AMBULANCE_ASSIGNED',
  EN_ROUTE_TO_PATIENT: 'EN_ROUTE_TO_PATIENT',
  PATIENT_PICKED_UP: 'PATIENT_PICKED_UP',
  EN_ROUTE_TO_HOSPITAL: 'EN_ROUTE_TO_HOSPITAL',
  ARRIVED_AT_HOSPITAL: 'ARRIVED_AT_HOSPITAL',
  TREATMENT_STARTED: 'TREATMENT_STARTED',
  COMPLETED: 'COMPLETED',
};

// Status labels for display
export const STATUS_LABELS = {
  REQUESTED: 'Requested',
  AMBULANCE_ASSIGNED: 'Ambulance Assigned',
  EN_ROUTE_TO_PATIENT: 'En Route to Patient',
  PATIENT_PICKED_UP: 'Patient Picked Up',
  EN_ROUTE_TO_HOSPITAL: 'En Route to Hospital',
  ARRIVED_AT_HOSPITAL: 'Arrived at Hospital',
  TREATMENT_STARTED: 'Treatment Started',
  COMPLETED: 'Completed',
};

// Status colors
export const STATUS_COLORS = {
  REQUESTED: '#f59e0b',
  AMBULANCE_ASSIGNED: '#3b82f6',
  EN_ROUTE_TO_PATIENT: '#8b5cf6',
  PATIENT_PICKED_UP: '#06b6d4',
  EN_ROUTE_TO_HOSPITAL: '#8b5cf6',
  ARRIVED_AT_HOSPITAL: '#10b981',
  TREATMENT_STARTED: '#059669',
  COMPLETED: '#6b7280',
};

// Severity levels
export const SEVERITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const SEVERITY_COLORS = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#dc2626',
};

// User roles
export const USER_ROLES = {
  PATIENT: 'PATIENT',
  EMS: 'EMS',
  HOSPITAL: 'HOSPITAL',
  ADMIN: 'ADMIN',
};
