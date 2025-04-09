export interface DashboardStats {
  activeClients: number;
  todayAppointments: number;
  activeDietPlans: number;
  telegramMessages: number;
  weightGoalAchieved?: number;
  dietCompliance?: number;
  exerciseCompliance?: number;
  waterIntakeTracking?: number;
}

export interface ProgressSummaryItem {
  label: string;
  current: number;
  total: number;
  color: string;
}

export interface ClientWithAppointments {
  _id: string;
  name: string;
  profilePicture?: string;
  email: string;
  phone?: string;
  appointment?: {
    _id: string;
    date: string;
    type: string;
  }
}

// MongoDB tiplerine uygun olarak diğer ortak tip tanımlamaları
export interface MongoBaseType {
  _id: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface MacroNutrients {
  protein: number;
  carbs: number;
  fat: number;
}
