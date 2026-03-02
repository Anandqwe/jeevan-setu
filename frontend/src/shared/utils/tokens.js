// Design tokens as JS constants for use in components
export const colors = {
  patient: { primary: '#ef4444', light: '#fca5a5', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)' },
  ems: { primary: '#3b82f6', light: '#93c5fd', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)' },
  hospital: { primary: '#10b981', light: '#6ee7b7', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)' },
  admin: { primary: '#8b5cf6', light: '#c4b5fd', bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.2)' },
};

export const roleAccent = (role) => colors[role] || colors.patient;

export const severity = {
  critical: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', label: 'Critical' },
  high: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.3)', label: 'High' },
  medium: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', label: 'Medium' },
  low: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', label: 'Low' },
};

export const status = {
  created: { color: '#3b82f6', label: 'Created' },
  assigned: { color: '#6366f1', label: 'Assigned' },
  en_route: { color: '#06b6d4', label: 'En Route' },
  on_scene: { color: '#8b5cf6', label: 'On Scene' },
  transporting: { color: '#f59e0b', label: 'Transporting' },
  completed: { color: '#10b981', label: 'Completed' },
  cancelled: { color: '#6b7280', label: 'Cancelled' },
  available: { color: '#10b981', label: 'Available' },
  busy: { color: '#f59e0b', label: 'Busy' },
  off_duty: { color: '#6b7280', label: 'Off Duty' },
  reported: { color: '#f59e0b', label: 'Reported' },
  dispatched: { color: '#3b82f6', label: 'Dispatched' },
  resolved: { color: '#10b981', label: 'Resolved' },
};
