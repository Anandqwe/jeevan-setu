import client from './client';

export const getHospitals = async () => {
  const response = await client.get('/api/hospitals');
  return response.data;
};

export const getHospital = async (id) => {
  const response = await client.get(`/api/hospitals/${id}`);
  return response.data;
};

export const updateHospitalBeds = async (id, available_icu_beds) => {
  const response = await client.put(`/api/hospitals/${id}/beds`, { available_icu_beds });
  return response.data;
};

// Admin endpoints
export const overrideAmbulance = async (incident_id, new_ambulance_id) => {
  const response = await client.post('/api/admin/override/ambulance', { incident_id, new_ambulance_id });
  return response.data;
};

export const overrideHospital = async (incident_id, new_hospital_id) => {
  const response = await client.post('/api/admin/override/hospital', { incident_id, new_hospital_id });
  return response.data;
};

export const forceCloseIncident = async (incident_id) => {
  const response = await client.patch(`/api/admin/incidents/${incident_id}/close`);
  return response.data;
};

export const getAnalytics = async () => {
  const response = await client.get('/api/admin/analytics');
  return response.data;
};
