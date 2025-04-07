import api from './api';
import { Client } from '../types';

interface ClientData {
  name: string;
  email: string;
  phone?: string;
  gender: 'male' | 'female' | 'other';
  birthdate: string;
  height: number;
  notes?: string;
  active?: boolean;
}

// Danışan işlemleri için API fonksiyonları
export const clientsAPI = {
  // Tüm danışanları getir
  getClients: async (): Promise<Client[]> => {
    const response = await api.get<Client[]>('/clients');
    return response.data;
  },

  // Belirli bir danışanı ID'ye göre getir
  getClient: async (id: string): Promise<Client> => {
    const response = await api.get<Client>(`/clients/${id}`);
    return response.data;
  },

  // Yeni danışan oluştur
  createClient: async (data: ClientData): Promise<Client> => {
    const response = await api.post<Client>('/clients', data);
    return response.data;
  },

  // Danışan bilgilerini güncelle
  updateClient: async (id: string, data: Partial<ClientData>): Promise<Client> => {
    const response = await api.put<Client>(`/clients/${id}`, data);
    return response.data;
  },

  // Danışan profil fotoğrafını güncelle
  updateClientAvatar: async (id: string, avatar: FormData): Promise<Client> => {
    const response = await api.post<Client>(`/clients/${id}/avatar`, avatar, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Danışanı sil (veya deaktif et)
  deleteClient: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/clients/${id}`);
    return response.data;
  },

  // Aktif danışanları getir
  getActiveClients: async (): Promise<Client[]> => {
    const response = await api.get<Client[]>('/clients/active');
    return response.data;
  },
}; 