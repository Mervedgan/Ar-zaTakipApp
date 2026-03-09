import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Android emülatör'de çalışıyorsa bilgisayarın localhost'una '10.0.2.2' IP'si ile çıkılır.
// Gerçek Android cihazlarda bu kısmın SSL sertifikalı (HTTPS) bir sunucu veya ngrok olması gerekir.
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

let memoryToken: string | null = null;
export const setApiToken = (token: string | null) => {
  memoryToken = token;
};

// İstek çıkmadan önce Token ekle
api.interceptors.request.use(
  async (config) => {
    let token = memoryToken;
    if (!token) {
      token = await AsyncStorage.getItem('@auth_token');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Gelen yanıtta 401 varsa işlemi yakala
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log('Unauthorized! Token expired or invalid.');
      console.log('WWW-Authenticate:', error.response.headers['www-authenticate']);
    }
    return Promise.reject(error);
  }
);

export default api;
