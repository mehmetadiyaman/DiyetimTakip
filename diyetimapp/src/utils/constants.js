// Uygulama sabitleri
export const APP_NAME = 'Dietçim';
export const APP_VERSION = '1.0.0';

/**
 * API zamanaşımı değeri (milisaniye cinsinden)
 * Uzak sunucu yanıt vermezse ne kadar bekleyeceğimizi belirtir
 */
export const API_TIMEOUT = 30000; // 30 saniye

/**
 * Maksimum login deneme sayısı
 * Bu sayıdan sonra kullanıcıya farklı seçenekler sunulur
 */
export const MAX_LOGIN_ATTEMPTS = 3;

/**
 * API istekleri için kullanılacak yeniden deneme sayısı
 * Ağ hataları veya sunucu yanıt vermediğinde bu kadar kez tekrar dener
 */
export const API_RETRY_COUNT = 2;

/**
 * Desteklenen diller
 * Uygulamanın desteklediği dil kodları
 */
export const SUPPORTED_LANGUAGES = ['tr', 'en'];

/**
 * Varsayılan dil kodu
 */
export const DEFAULT_LANGUAGE = 'tr';

/**
 * Uygulama durumu 
 * Uygulama içindeki farklı güncellemeler için kullanılan sabitler
 */
export const APP_STATUS = {
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
  MAINTENANCE: 'maintenance'
};

/**
 * Yetki Seviyeleri
 * Kullanıcıların sistemdeki yetki seviyeleri
 */
export const AUTH_LEVELS = {
  ADMIN: 'admin',
  DIETITIAN: 'dietitian',
  CLIENT: 'client',
  GUEST: 'guest'
};

/**
 * LocalStorage anahtarları
 * AsyncStorage'de kullanılan anahtar isimleri
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'token',
  USER_DATA: 'user',
  SETTINGS: 'settings',
  LANGUAGE: 'language',
  NOTIFICATIONS: 'notificationSettings',
  LAST_SYNC: 'lastSync',
  THEME: 'theme'
};

/**
 * Tema ayarları
 */
export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

/**
 * API endpoint'leri
 * Not: Genellikle API endpoint'lerini bir constants modülünde saklamak yerine bir API servisi içinde tanımlamak daha iyidir
 */
export const API_ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  PROFILE: '/auth/profile',
  CLIENTS: '/clients',
  DIET_PLANS: '/diet-plans',
  MEASUREMENTS: '/measurements',
  FOOD_ITEMS: '/foods',
  RECIPES: '/recipes',
  APPOINTMENTS: '/appointments',
  EXERCISE: '/exercises',
  NOTIFICATIONS: '/notifications'
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
  MAX_LOGIN_ATTEMPTS,
  API_RETRY_COUNT,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  APP_STATUS,
  AUTH_LEVELS,
  STORAGE_KEYS,
  THEME_MODES,
  API_ENDPOINTS,
  VALIDATION_MESSAGES,
  GENDER_OPTIONS,
  ACTIVITY_LEVELS,
  APPOINTMENT_STATUS,
  APPOINTMENT_TYPES,
  ANIMATION_CONFIG,
}; 