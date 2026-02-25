import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://10.0.2.2:5000/api'; // Android emulator → localhost
// For iOS simulator use: 'http://localhost:5000/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const register = (name, email, password) =>
  api.post('/auth/register', { name, email, password });

export const login = (email, password) =>
  api.post('/auth/login', { email, password });

// Users
export const getUsers = () => api.get('/users');
export const getUserById = id => api.get(`/users/${id}`);

export default api;
