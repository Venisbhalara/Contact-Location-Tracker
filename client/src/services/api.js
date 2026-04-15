import axios from 'axios';

const API = axios.create({
  // In production (Vercel), VITE_API_URL points to the Render backend URL.
  // In local dev, falls back to '/api' so Vite's proxy still handles all devices.
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const registerUser   = (data)  => API.post('/auth/register', data);
export const loginUser      = (data)  => API.post('/auth/login', data);
export const googleLogin    = (data)  => API.post('/auth/google', data);
export const getMe          = ()      => API.get('/auth/me');
// Users / Profile
export const getUserProfile = () => API.get('/users/profile');
export const updateUserProfile = (data) => API.put('/users/profile', data);
export const updateUserPassword = (data) => API.put('/users/update-password', data);
export const deleteUserAccount = (data) => API.delete('/users/delete-account', { data });


// Tracking
export const createTracking       = (data)   => API.post('/tracking/create', data);
export const getTrackingByToken   = (token)  => API.get(`/tracking/${token}`);
export const updateLocation       = (data)   => API.post('/tracking/update-location', data);
export const getUserTrackings     = (params) => API.get('/tracking', { params });
export const deleteTracking       = (id)     => API.delete(`/tracking/${id}`);

// Admin
export const getAdminDashboard   = () => API.get('/admin/dashboard');
export const getAdminUsers       = () => API.get('/admin/users');
export const updateAdminUserRole = (id, data) => API.put(`/admin/users/${id}/role`, data);
export const updateAdminUserAccess = (id, data) => API.put(`/admin/users/${id}/access`, data);
export const deleteAdminUser     = (id) => API.delete(`/admin/users/${id}`);
export const getAdminAccessRequests = () => API.get('/admin/access-requests');
export const updateAdminAccessRequest = (id, data) => API.put(`/admin/access-requests/${id}`, data);
export const getAdminTrackingSessions = () => API.get('/admin/tracking-sessions');
export const deleteAdminTrackingSession = (id) => API.delete(`/admin/tracking-sessions/${id}`);
export const getAdminUserCredentials = (data) => API.post('/admin/user-credentials', data);

// Access
export const requestAccess = (data) => API.post('/access/request', data);
export const getAccessStatus = () => API.get('/access/status');

export default API;
