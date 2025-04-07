import api from './api';
import { DietPlan, Meal } from '../types';

interface DietPlanData {
  client: string;
  startDate: string;
  endDate?: string;
  title: string;
  description?: string;
  dailyCalories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  meals: Meal[];
  active?: boolean;
}

// Diyet planı işlemleri için API fonksiyonları
export const dietPlansAPI = {
  // Tüm diyet planlarını getir
  getDietPlans: async (): Promise<DietPlan[]> => {
    const response = await api.get<DietPlan[]>('/diet-plans');
    return response.data;
  },

  // Belirli bir danışanın diyet planlarını getir
  getClientDietPlans: async (clientId: string): Promise<DietPlan[]> => {
    const response = await api.get<DietPlan[]>(`/diet-plans/client/${clientId}`);
    return response.data;
  },

  // Belirli bir diyet planını ID'ye göre getir
  getDietPlan: async (id: string): Promise<DietPlan> => {
    const response = await api.get<DietPlan>(`/diet-plans/${id}`);
    return response.data;
  },

  // Yeni diyet planı oluştur
  createDietPlan: async (data: DietPlanData): Promise<DietPlan> => {
    const response = await api.post<DietPlan>('/diet-plans', data);
    return response.data;
  },

  // Diyet planı bilgilerini güncelle
  updateDietPlan: async (id: string, data: Partial<DietPlanData>): Promise<DietPlan> => {
    const response = await api.put<DietPlan>(`/diet-plans/${id}`, data);
    return response.data;
  },

  // Diyet planını sil
  deleteDietPlan: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/diet-plans/${id}`);
    return response.data;
  },

  // Danışanın aktif diyet planını getir
  getActiveDietPlan: async (clientId: string): Promise<DietPlan> => {
    const response = await api.get<DietPlan>(`/diet-plans/client/${clientId}/active`);
    return response.data;
  },
}; 