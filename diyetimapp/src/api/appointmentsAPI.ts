import api from './api';
import { Appointment } from '../types';

interface AppointmentData {
  client: string;
  date: string;
  time: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
}

// Randevu işlemleri için API fonksiyonları
export const appointmentsAPI = {
  // Tüm randevuları getir
  getAppointments: async (): Promise<Appointment[]> => {
    const response = await api.get<Appointment[]>('/appointments');
    return response.data;
  },

  // Belirli bir danışanın randevularını getir
  getClientAppointments: async (clientId: string): Promise<Appointment[]> => {
    const response = await api.get<Appointment[]>(`/appointments/client/${clientId}`);
    return response.data;
  },

  // Belirli bir randevuyu ID'ye göre getir
  getAppointment: async (id: string): Promise<Appointment> => {
    const response = await api.get<Appointment>(`/appointments/${id}`);
    return response.data;
  },

  // Yeni randevu oluştur
  createAppointment: async (data: AppointmentData): Promise<Appointment> => {
    const response = await api.post<Appointment>('/appointments', data);
    return response.data;
  },

  // Randevu bilgilerini güncelle
  updateAppointment: async (id: string, data: Partial<AppointmentData>): Promise<Appointment> => {
    const response = await api.put<Appointment>(`/appointments/${id}`, data);
    return response.data;
  },

  // Randevuyu sil
  deleteAppointment: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/appointments/${id}`);
    return response.data;
  },

  // Bugünkü randevuları getir
  getTodayAppointments: async (): Promise<Appointment[]> => {
    const response = await api.get<Appointment[]>('/appointments/today');
    return response.data;
  },

  // Gelecek randevuları getir
  getUpcomingAppointments: async (): Promise<Appointment[]> => {
    const response = await api.get<Appointment[]>('/appointments/upcoming');
    return response.data;
  },
}; 