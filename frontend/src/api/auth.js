import client from './client';

export const login = async (email, password) => {
  const response = await client.post('/api/auth/login', { email, password });
  return response.data;
};

export const register = async (name, email, password, role) => {
  const response = await client.post('/api/auth/register', { name, email, password, role });
  return response.data;
};

export const refreshToken = async (refresh_token) => {
  const response = await client.post('/api/auth/refresh', { refresh_token });
  return response.data;
};

export const getMe = async () => {
  const response = await client.get('/api/auth/me');
  return response.data;
};
