// Kullanıcı (Diyetisyen) Tip Tanımlaması
export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'dietician' | 'admin';
  avatar?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

// Kimlik Doğrulama Yanıtı
export interface AuthResponse {
  token: string;
  user: User;
}

// Danışan Tip Tanımlaması
export interface Client {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  gender: 'male' | 'female' | 'other';
  birthdate: string;
  height: number;
  dietician: string | User;
  avatar?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Ölçüm Tip Tanımlaması
export interface Measurement {
  _id: string;
  client: string | Client;
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
  createdAt: string;
  updatedAt: string;
}

// Diyet Planı Tip Tanımlaması
export interface DietPlan {
  _id: string;
  client: string | Client;
  startDate: string;
  endDate?: string;
  title: string;
  description?: string;
  dailyCalories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  meals: Meal[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Öğün Tip Tanımlaması
export interface Meal {
  _id?: string;
  name: string;
  time: string;
  foods: Food[];
}

// Yiyecek Tip Tanımlaması
export interface Food {
  _id?: string;
  name: string;
  quantity: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

// Randevu Tip Tanımlaması
export interface Appointment {
  _id: string;
  client: string | Client;
  date: string;
  time: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Navigasyon için Tip Tanımlamaları
export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type AppTabParamList = {
  Dashboard: undefined;
  Clients: undefined;
  Appointments: undefined;
  Settings: undefined;
};

export type ClientsStackParamList = {
  ClientsList: undefined;
  ClientDetails: { clientId: string };
  AddClient: undefined;
  EditClient: { clientId: string };
  ClientMeasurements: { clientId: string };
  AddMeasurement: { clientId: string };
  MeasurementDetails: { measurementId: string, clientId: string };
  ClientDietPlans: { clientId: string };
  AddDietPlan: { clientId: string };
  DietPlanDetails: { dietPlanId: string, clientId: string };
};

export type AppointmentsStackParamList = {
  AppointmentsList: undefined;
  AppointmentDetails: { appointmentId: string };
  AddAppointment: { clientId?: string };
  EditAppointment: { appointmentId: string };
};

export type DashboardStackParamList = {
  DashboardHome: undefined;
  Notifications: undefined;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  Profile: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
}; 