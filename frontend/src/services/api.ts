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

// İstek çıkmadan önce Token ekle
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('@auth_token');
    if (token && config.headers) {
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
      // Todo: Token süresi doldu, hesaptan otomatik çıkış işlemi (AuthContext'ten emit vs ile)
      console.log('Unauthorized! Token expired or invalid.');
    }
    return Promise.reject(error);
  }
);

export default api;
