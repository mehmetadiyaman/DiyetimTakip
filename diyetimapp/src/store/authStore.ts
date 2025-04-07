import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthResponse } from '../types';
import { authAPI } from '../api/authAPI';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: false,
  error: null,
  isInitialized: false,

  // Giriş işlemi
  login: async (credentials: LoginCredentials) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authAPI.login(credentials);
      
      // Token ve kullanıcı bilgisini kaydet
      await AsyncStorage.setItem('@auth_token', response.token);
      
      set({
        token: response.token,
        user: response.user,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Giriş yapılırken bir hata oluştu.',
      });
      throw error;
    }
  },

  // Kayıt işlemi
  register: async (data: RegisterData) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authAPI.register(data);
      
      // Token ve kullanıcı bilgisini kaydet
      await AsyncStorage.setItem('@auth_token', response.token);
      
      set({
        token: response.token,
        user: response.user,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Kayıt olurken bir hata oluştu.',
      });
      throw error;
    }
  },

  // Çıkış işlemi
  logout: async () => {
    try {
      set({ isLoading: true });
      
      // Token'ı kaldır
      await AsyncStorage.removeItem('@auth_token');
      
      set({
        token: null,
        user: null,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: 'Çıkış yapılırken bir hata oluştu.',
      });
    }
  },

  // Uygulama başlangıcında token kontrolü
  initialize: async () => {
    try {
      set({ isLoading: true });
      
      // AsyncStorage'den token'ı oku
      const token = await AsyncStorage.getItem('@auth_token');
      
      if (token) {
        try {
          // Token doğrulama
          const response = await authAPI.verifyToken();
          
          set({
            token,
            user: response.user,
            isLoading: false,
            isInitialized: true,
          });
        } catch (error) {
          // Token geçersiz, çıkış yap
          await AsyncStorage.removeItem('@auth_token');
          set({
            token: null,
            user: null,
            isLoading: false,
            isInitialized: true,
          });
        }
      } else {
        set({
          isLoading: false,
          isInitialized: true,
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        isInitialized: true,
        error: 'Oturum durumu kontrol edilirken bir hata oluştu.',
      });
    }
  },

  // Hata mesajını temizle
  clearError: () => set({ error: null }),
})); 