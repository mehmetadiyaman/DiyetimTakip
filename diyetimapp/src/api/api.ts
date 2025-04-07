import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Android Emülatör için Backend API URL'i
const API_URL = 'http://10.0.2.2:5000/api';

// Axios instance oluşturma
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Her isteğe token ekleme
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: 401 hatası için otomatik logout
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // 401 hatası durumunda
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Token silme (logout işlemi)
        await AsyncStorage.removeItem('@auth_token');
        // Burada logout fonksiyonu çağrılabilir, ancak bu şekilde doğrudan erişemiyoruz
        // Global bir event dispatch edilebilir veya zustand store burada import edilebilir
        
        // AuthStore'u doğrudan burada import etmek döngüsel bağımlılık oluşturabilir
        // Bu nedenle EventEmitter ya da benzeri bir yapı kullanılabilir
        // Şimdilik, hata mesajını döndürelim ve bunu kullanan bileşenlerde işleyelim
        return Promise.reject(error);
      } catch (e) {
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api; 