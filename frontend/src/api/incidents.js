import client from './client';

export const createIncident = async (data) => {
  const response = await client.post('/api/incidents', data);
  return response.data;
};

export const getIncidents = async () => {
  const response = await client.get('/api/incidents');
  return response.data;
};

export const getIncident = async (id) => {
  const response = await client.get(`/api/incidents/${id}`);
  return response.data;
};

export const updateIncidentStatus = async (id, status) => {
  const response = await client.patch(`/api/incidents/${id}/status`, { status });
  return response.data;
};

export const getPatientIncidents = async () => {
  const response = await client.get('/api/patients/incidents');
  return response.data;
};

export const getActivePatientIncidents = async () => {
  const response = await client.get('/api/patients/incidents/active');
  return response.data;
};
