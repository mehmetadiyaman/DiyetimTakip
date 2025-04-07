import api from './api';
import { Measurement } from '../types';

interface MeasurementData {
  client: string;
  date: string;
  weight: number;
  bodyFat?: number;
  muscleMass?: number;
  bodyWater?: number;
  visceralFat?: number;
  hipCircumference?: number;
  waistCircumference?: number;
  chestCircumference?: number;
  armCircumference?: number;
  thighCircumference?: number;
  notes?: string;
}

// Ölçüm işlemleri için API fonksiyonları
export const measurementsAPI = {
  // Tüm ölçümleri getir
  getMeasurements: async (): Promise<Measurement[]> => {
    const response = await api.get<Measurement[]>('/measurements');
    return response.data;
  },

  // Belirli bir danışanın ölçümlerini getir
  getClientMeasurements: async (clientId: string): Promise<Measurement[]> => {
    const response = await api.get<Measurement[]>(`/measurements/client/${clientId}`);
    return response.data;
  },

  // Belirli bir ölçümü ID'ye göre getir
  getMeasurement: async (id: string): Promise<Measurement> => {
    const response = await api.get<Measurement>(`/measurements/${id}`);
    return response.data;
  },

  // Yeni ölçüm oluştur
  createMeasurement: async (data: MeasurementData): Promise<Measurement> => {
    const response = await api.post<Measurement>('/measurements', data);
    return response.data;
  },

  // Ölçüm bilgilerini güncelle
  updateMeasurement: async (id: string, data: Partial<MeasurementData>): Promise<Measurement> => {
    const response = await api.put<Measurement>(`/measurements/${id}`, data);
    return response.data;
  },

  // Ölçümü sil
  deleteMeasurement: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/measurements/${id}`);
    return response.data;
  },

  // Danışanın son ölçümünü getir
  getLastMeasurement: async (clientId: string): Promise<Measurement> => {
    const response = await api.get<Measurement>(`/measurements/client/${clientId}/last`);
    return response.data;
  },
}; 