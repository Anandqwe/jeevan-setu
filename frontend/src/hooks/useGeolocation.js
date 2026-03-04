import { useState, useEffect } from 'react';
import { MUMBAI_DEFAULT_LAT, MUMBAI_DEFAULT_LNG } from '../utils/constants';

/**
 * Seeded locations for demo accounts.
 * Maps user email → { latitude, longitude }.
 * No browser geolocation is used — all positions come from seed data.
 */
const SEEDED_LOCATIONS = {
  // Patients
  'patient.01@jeevan-setu.com': { latitude: 19.1255, longitude: 72.8362 },
  'patient.02@jeevan-setu.com': { latitude: 19.0236, longitude: 72.8427 },
  'patient.03@jeevan-setu.com': { latitude: 18.9067, longitude: 72.8147 },
  // EMS / Ambulances
  'ems.01@jeevan-setu.com': { latitude: 19.1136, longitude: 72.8697 },
  'ems.02@jeevan-setu.com': { latitude: 19.0590, longitude: 72.8497 },
  'ems.03@jeevan-setu.com': { latitude: 19.0190, longitude: 72.8432 },
  'ems.04@jeevan-setu.com': { latitude: 19.1176, longitude: 72.9060 },
  'ems.05@jeevan-setu.com': { latitude: 19.0726, longitude: 72.8793 },
  'ems.06@jeevan-setu.com': { latitude: 18.9980, longitude: 72.8311 },
  'ems.07@jeevan-setu.com': { latitude: 19.2307, longitude: 72.8567 },
  'ems.08@jeevan-setu.com': { latitude: 19.2183, longitude: 72.9781 },
  'ems.09@jeevan-setu.com': { latitude: 19.1663, longitude: 72.8494 },
  'ems.10@jeevan-setu.com': { latitude: 19.1860, longitude: 72.8486 },
  'ems.11@jeevan-setu.com': { latitude: 19.0522, longitude: 72.9005 },
  'ems.12@jeevan-setu.com': { latitude: 19.1070, longitude: 72.8567 },
  // Hospitals
  'hospital.andheri@jeevan-setu.com': { latitude: 19.1197, longitude: 72.8464 },
  'hospital.bandra@jeevan-setu.com': { latitude: 19.0544, longitude: 72.8406 },
  'hospital.dadar@jeevan-setu.com': { latitude: 19.0178, longitude: 72.8478 },
  'hospital.powai@jeevan-setu.com': { latitude: 19.1176, longitude: 72.9060 },
  'hospital.kurla@jeevan-setu.com': { latitude: 19.0726, longitude: 72.8793 },
  'hospital.lowerparel@jeevan-setu.com': { latitude: 18.9980, longitude: 72.8311 },
  'hospital.borivali@jeevan-setu.com': { latitude: 19.2307, longitude: 72.8567 },
  'hospital.thane@jeevan-setu.com': { latitude: 19.2183, longitude: 72.9781 },
  // Admin
  'admin@jeevan-setu.com': { latitude: MUMBAI_DEFAULT_LAT, longitude: MUMBAI_DEFAULT_LNG },
};

const useGeolocation = () => {
  const [position, setPosition] = useState({
    latitude: MUMBAI_DEFAULT_LAT,
    longitude: MUMBAI_DEFAULT_LNG,
  });
  const [usingFallback, setUsingFallback] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Read user email from session and look up seeded location
    try {
      const userStr = sessionStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const seeded = SEEDED_LOCATIONS[user.email];
        if (seeded) {
          setPosition(seeded);
          setUsingFallback(false);
          setLoading(false);
          return;
        }
      }
    } catch {
      // ignore parse errors
    }
    // Fallback to Mumbai center
    setPosition({ latitude: MUMBAI_DEFAULT_LAT, longitude: MUMBAI_DEFAULT_LNG });
    setUsingFallback(true);
    setLoading(false);
  }, []);

  return {
    position,
    usingFallback,
    loading,
    error: null,
    refresh: () => {}, // no-op — locations are static
  };
};

export default useGeolocation;
