import api from './api';
import { AuthResponse } from '../types';

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

interface ForgotPasswordData {
  email: string;
}

interface ResetPasswordData {
  token: string;
  password: string;
  passwordConfirmation: string;
}

// Kimlik doğrulama işlemleri için API fonksiyonları
export const authAPI = {
  // Giriş
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  // Kayıt
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  // Şifremi Unuttum
  forgotPassword: async (data: ForgotPasswordData): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/auth/forgot-password', data);
    return response.data;
  },

  // Şifre Sıfırlama
  resetPassword: async (data: ResetPasswordData): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/auth/reset-password', data);
    return response.data;
  },

  // Kimlik Doğrulama
  verifyToken: async (): Promise<AuthResponse> => {
    const response = await api.get<AuthResponse>('/auth/verify');
    return response.data;
  },
}; 