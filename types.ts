export type ViewState = 'landing' | 'patient' | 'driver' | 'hospital' | 'bystander';
export type SimulationStatus = 'idle' | 'searching' | 'request_pending' | 'accepted';

export interface UserProfile {
  id: string;
  name: string;
  role: ViewState;
}

export interface EmergencyAlert {
  id: string;
  type: 'accident' | 'medical';
  severity: 'high' | 'medium' | 'low';
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  timestamp: number;
  status: 'pending' | 'accepted' | 'resolved';
}

export interface AnalysisResult {
  severity: 'High' | 'Medium' | 'Low';
  type: string;
  immediateAction: string;
}