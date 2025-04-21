import { z } from "zod";

// Ortak mongo id tipi - tüm formlarda tutarlı _id kullanımı için
export const mongoIdSchema = z.string().min(1, "ID geçerli değil");

// MongoDB modellerine uyumlu validasyon şemaları
export const userSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
  profilePicture: z.string().optional(),
  bio: z.string().optional(),
  phone: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  password: z.string().min(1, "Şifre gereklidir")
});

export const clientSchema = z.object({
  _id: z.string().optional(),
  userId: z.string(),
  name: z.string().min(3, 'İsim en az 3 karakter olmalıdır'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.enum(['male', 'female']).optional(),
  height: z.coerce.number().optional(),
  startingWeight: z.coerce.number().optional(),
  targetWeight: z.coerce.number().optional(),
  activityLevel: z.string().optional(),
  medicalHistory: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  createdAt: z.date().optional(),
  notes: z.string().optional(),
  profilePicture: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export type Client = z.infer<typeof clientSchema>;

export const measurementSchema = z.object({
  clientId: mongoIdSchema,
  weight: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  neck: z.coerce.number().optional(),
  arm: z.coerce.number().optional(),
  chest: z.coerce.number().optional(),
  waist: z.coerce.number().optional(),
  abdomen: z.coerce.number().optional(),
  hip: z.coerce.number().optional(),
  thigh: z.coerce.number().optional(),
  calf: z.coerce.number().optional(),
  notes: z.string().optional(),
  date: z.string().default(() => new Date().toISOString()).transform(val => new Date(val)),
  images: z.array(z.string()).optional(),
  bodyFatPercentage: z.number().optional()
});

// Besin öğesi tipi
export const foodItemSchema = z.object({
  name: z.string().default(""),
  amount: z.string().default(""),
  calories: z.number().nonnegative("Kalori değeri negatif olamaz").default(0),
});

// Öğün tipi
export const mealSchema = z.object({
  name: z.string(),
  foods: z.array(foodItemSchema),
});

export const dietPlanSchema = z.object({
  clientId: mongoIdSchema,
  title: z.string().min(2, "Başlık en az 2 karakter olmalıdır"),
  content: z.string().default(""),
  description: z.string().optional().nullable().default(""),
  startDate: z.string().transform(val => new Date(val)),
  endDate: z.string().optional().nullable().transform(val => val ? new Date(val) : undefined),
  status: z.string().default("active"),
  attachments: z.array(z.string()).optional(),
  // Diyet planı detayları
  dailyCalories: z.number().nonnegative().default(0),
  macroProtein: z.number().nonnegative().default(0),
  macroCarbs: z.number().nonnegative().default(0),
  macroFat: z.number().nonnegative().default(0),
  meals: z.array(mealSchema).optional()
});

export const appointmentSchema = z.object({
  clientId: mongoIdSchema,
  date: z.string().transform(val => new Date(val)),
  duration: z.coerce.number().min(5, "Süre en az 5 dakika olmalıdır"),
  status: z.string().default("scheduled"),
  notes: z.string().optional(),
  type: z.enum(["online", "in-person"]).optional()
});

export const activitySchema = z.object({
  userId: mongoIdSchema,
  type: z.string(),
  description: z.string()
});

// Interface tanımlamaları - Client tarafında kullanım için
export interface User {
  _id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  profilePicture?: string;
  bio?: string;
  phone?: string;
}

export interface Measurement {
  _id: string;
  clientId: string;
  date: string;
  weight?: number;
  height?: number;
  neck?: number;
  arm?: number;
  chest?: number;
  waist?: number;
  abdomen?: number;
  hip?: number;
  thigh?: number;
  calf?: number;
  notes?: string;
  images?: string[];
  bodyFatPercentage?: number;
}

export interface FoodItem {
  name: string;
  amount: string;
  calories?: number;
}

export interface Meal {
  name: string;
  foods: FoodItem[];
}

export interface DietPlan {
  _id: string;
  clientId: string;
  title: string;
  startDate: Date;
  endDate?: Date;
  content: string;
  status: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  attachments?: string[];
  dailyCalories?: number;
  macroProtein?: number;
  macroCarbs?: number;
  macroFat?: number;
  meals?: Meal[];
  description?: string;
}

export interface Appointment {
  _id: string;
  clientId: string;
  userId: string;
  date: Date;
  duration: number;
  status: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  type?: string;
}

export interface Activity {
  _id: string;
  userId: string;
  type: string;
  description: string;
  createdAt: Date;
}
