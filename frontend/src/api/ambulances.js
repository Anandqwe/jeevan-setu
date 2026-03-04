import client from './client';

export const getAmbulances = async () => {
  const response = await client.get('/api/ambulances');
  return response.data;
};

export const getAmbulance = async (id) => {
  const response = await client.get(`/api/ambulances/${id}`);
  return response.data;
};

export const updateAmbulanceLocation = async (id, latitude, longitude) => {
  const response = await client.put(`/api/ambulances/${id}/location`, { latitude, longitude });
  return response.data;
};

export const updateAmbulanceStatus = async (id, status) => {
  const response = await client.patch(`/api/ambulances/${id}/status`, { status });
  return response.data;
};
