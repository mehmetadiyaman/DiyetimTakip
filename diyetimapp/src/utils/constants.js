// Uygulama sabitleri
export const APP_NAME = 'Dietçim';
export const APP_VERSION = '1.0.0';

// API sabitleri
export const API_TIMEOUT = 15000; // 15 saniye

// LocalStorage anahtarları
export const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'user_data',
  THEME: 'app_theme',
  ONBOARDING_COMPLETED: 'onboarding_completed',
};

// Form validasyon mesajları
export const VALIDATION_MESSAGES = {
  REQUIRED: 'Bu alan gereklidir',
  INVALID_EMAIL: 'Geçerli bir e-posta adresi giriniz',
  INVALID_PASSWORD: 'Şifre en az 6 karakter olmalıdır',
  PASSWORDS_NOT_MATCH: 'Şifreler eşleşmiyor',
  INVALID_PHONE: 'Geçerli bir telefon numarası giriniz',
};

// Statik değerler
export const GENDER_OPTIONS = [
  { label: 'Kadın', value: 'female' },
  { label: 'Erkek', value: 'male' },
];

export const ACTIVITY_LEVELS = [
  { label: 'Hareketsiz', value: 'sedentary', description: 'Minimal fiziksel aktivite' },
  { label: 'Az Hareketli', value: 'light', description: 'Haftada 1-3 kez egzersiz' },
  { label: 'Orta Hareketli', value: 'moderate', description: 'Haftada 3-5 kez egzersiz' },
  { label: 'Çok Hareketli', value: 'active', description: 'Haftada 6-7 kez egzersiz' },
  { label: 'Ekstra Hareketli', value: 'very_active', description: 'Günde 2 kez egzersiz/fiziksel iş' },
];

export const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
};

export const APPOINTMENT_TYPES = [
  { label: 'Yüzyüze', value: 'in-person' },
  { label: 'Online', value: 'online' },
];

// Animasyon sabitleri
export const ANIMATION_CONFIG = {
  DURATION: {
    SHORT: 200,
    MEDIUM: 300,
    LONG: 500,
  },
};

export default {
  APP_NAME,
  APP_VERSION,
  API_TIMEOUT,
  STORAGE_KEYS,
  VALIDATION_MESSAGES,
  GENDER_OPTIONS,
  ACTIVITY_LEVELS,
  APPOINTMENT_STATUS,
  APPOINTMENT_TYPES,
  ANIMATION_CONFIG,
}; 