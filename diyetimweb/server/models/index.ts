import mongoose, { Schema, Document } from 'mongoose';

// Kullanıcı (Diyetisyen) Modeli
export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  profilePicture?: string;
  bio?: string;
  phone?: string;
  telegramToken: string;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  profilePicture: { type: String },
  bio: { type: String },
  phone: { type: String },
  telegramToken: { type: String }
});

// Danışan Modeli
export interface IClient extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  height?: number;
  startingWeight?: number;
  targetWeight?: number;
  activityLevel?: string;
  medicalHistory?: string;
  dietaryRestrictions?: string;
  createdAt: Date;
  notes?: string;
  profilePicture?: string;
  status: string;
  telegramChatId?: string;
  referenceCode?: string;
}

const clientSchema = new Schema<IClient>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  birthDate: { type: String },
  gender: { type: String },
  height: { type: Number },
  startingWeight: { type: Number },
  targetWeight: { type: Number },
  activityLevel: { type: String },
  medicalHistory: { type: String },
  dietaryRestrictions: { type: String },
  createdAt: { type: Date, default: Date.now },
  notes: { type: String },
  profilePicture: { type: String },
  status: { type: String, default: 'active' },
  telegramChatId: { type: String },
  referenceCode: { type: String }
});

// Ölçüm Modeli
export interface IMeasurement extends Document {
  clientId: Schema.Types.ObjectId;
  date: Date;
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

const measurementSchema = new Schema<IMeasurement>({
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  date: { type: Date, default: Date.now },
  weight: { type: Number },
  height: { type: Number },
  neck: { type: Number },
  arm: { type: Number },
  chest: { type: Number },
  waist: { type: Number },
  abdomen: { type: Number },
  hip: { type: Number },
  thigh: { type: Number },
  calf: { type: Number },
  notes: { type: String },
  images: [{ type: String }],
  bodyFatPercentage: { type: Number }
});

// Diyet Planı Modeli
export interface IDietPlan extends Document {
  clientId: Schema.Types.ObjectId;
  title: string;
  startDate: Date;
  endDate?: Date;
  content: string;
  description?: string | null;
  status: string;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  attachments?: string[];
  dailyCalories?: number;
  macroProtein?: number;
  macroCarbs?: number;
  macroFat?: number;
  meals?: Array<{
    name: string;
    foods: Array<{
      name: string;
      amount: string;
      calories?: number;
    }>;
  }>;
}

const dietPlanSchema = new Schema<IDietPlan>({
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  title: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  content: { type: String, required: true },
  description: { type: String },
  status: { type: String, default: 'active' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  attachments: [{ type: String }],
  dailyCalories: { type: Number },
  macroProtein: { type: Number },
  macroCarbs: { type: Number },
  macroFat: { type: Number },
  meals: [{
    name: { type: String },
    foods: [{
      name: { type: String },
      amount: { type: String },
      calories: { type: Number }
    }]
  }]
});

// Randevu Modeli
export interface IAppointment extends Document {
  clientId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  date: Date;
  duration: number;
  status: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  type?: string; // "online" veya "in-person" değerlerini alabilir
}

const appointmentSchema = new Schema<IAppointment>({
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  duration: { type: Number, required: true },
  status: { type: String, default: 'scheduled' },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  type: { type: String, enum: ['online', 'in-person'], default: 'in-person' }
});

// Aktivite Modeli
export interface IActivity extends Document {
  userId: Schema.Types.ObjectId;
  type: string;
  description: string;
  createdAt: Date;
}

const activitySchema = new Schema<IActivity>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Modelleri oluştur
export const User = mongoose.model<IUser>('User', userSchema);
export const Client = mongoose.model<IClient>('Client', clientSchema);
export const Measurement = mongoose.model<IMeasurement>('Measurement', measurementSchema);
export const DietPlan = mongoose.model<IDietPlan>('DietPlan', dietPlanSchema);
export const Appointment = mongoose.model<IAppointment>('Appointment', appointmentSchema);
export const Activity = mongoose.model<IActivity>('Activity', activitySchema); 