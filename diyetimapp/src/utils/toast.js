import { Platform, ToastAndroid } from 'react-native';

// Haptics paketini koşullu olarak yüklemeyi deneyelim
let Haptics;
try {
  Haptics = require('expo-haptics');
} catch (error) {
  console.log('Expo Haptics paketi yüklenemedi:', error);
}

/**
 * Toast mesajları göstermek için basit bir yardımcı fonksiyon
 * Not: iOS'ta Toast mesajları bulunmaz, iOS için bir alternatif gerekebilir
 * @param {string} message - Gösterilecek mesaj
 * @param {string} duration - Mesajın gösterilme süresi ('short' veya 'long')
 * @param {boolean} haptic - Haptic geri bildirim verilip verilmeyeceği (titreşim)
 * @param {string} hapticType - Haptic geri bildirim tipi ('success', 'warning', 'error')
 */
export const showToast = (
  message, 
  duration = 'short', 
  haptic = false, 
  hapticType = 'success'
) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(
      message, 
      duration === 'short' ? ToastAndroid.SHORT : ToastAndroid.LONG
    );
  } else {
    // iOS için bir alternatif geliştirilebilir
    console.log('Toast message (iOS):', message);
  }

  // Haptic geri bildirim
  if (haptic && Platform.OS !== 'web' && Haptics) {
    try {
      switch (hapticType) {
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        default:
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      console.log('Haptic feedback error:', error);
    }
  }
};

// Özel kullanım fonksiyonları
export const showSuccessToast = (message, duration = 'short') => {
  showToast(message, duration, true, 'success');
};

export const showErrorToast = (message, duration = 'long') => {
  showToast(message, duration, true, 'error');
};

export const showWarningToast = (message, duration = 'short') => {
  showToast(message, duration, true, 'warning');
};

export const showInfoToast = (message, duration = 'short') => {
  showToast(message, duration, false);
};

export default {
  showToast,
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showInfoToast
}; 