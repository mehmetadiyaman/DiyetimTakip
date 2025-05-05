import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { post } from '../api/config';

// Notifications konfigürasyonu
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Bildirim izinleri
export const registerForPushNotificationsAsync = async () => {
  let token;
  
  // Fiziksel cihaz kontrolü
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    // İzin henüz alınmadıysa iste
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    // İzin alınamadıysa uyarı göster
    if (finalStatus !== 'granted') {
      console.log('Bildirim izni alınamadı!');
      return null;
    }
    
    // Push notification token al
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PROJECT_ID,
    })).data;
  } else {
    console.log('Fiziksel cihaz gereklidir!');
  }

  // Android için kanal oluştur
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
};

// Token'ı saklama
export const savePushToken = async (token, userId) => {
  try {
    if (token) {
      // Yerel depolamada sakla
      await AsyncStorage.setItem('pushToken', token);
      
      // API'ya token'ı kaydet
      if (userId) {
        await post('/notifications/register-token', { token, userId });
      }
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Push token kaydedilirken hata:', error);
    return false;
  }
};

// Yerel bildirim gönderme
export const scheduleLocalNotification = async ({
  title,
  body,
  data,
  trigger = null,
}) => {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
      },
      trigger: trigger || null, // null ise anında gönderilir
    });
    
    return notificationId;
  } catch (error) {
    console.error('Bildirim planlanırken hata:', error);
    return null;
  }
};

// Yaklaşan randevular için bildirim
export const scheduleAppointmentReminder = async (appointment, reminderMinutes = 60) => {
  try {
    const appointmentDate = new Date(appointment.date);
    const reminderDate = new Date(appointmentDate.getTime() - (reminderMinutes * 60 * 1000));
    
    // Geçmiş bir zaman ise bildirim gönderme
    if (reminderDate <= new Date()) {
      return null;
    }
    
    const notificationId = await scheduleLocalNotification({
      title: 'Randevu Hatırlatması',
      body: `${appointment.clientName} ile randevunuz ${reminderMinutes} dakika içinde başlayacak.`,
      data: { appointmentId: appointment._id },
      trigger: reminderDate,
    });
    
    // Randevu ID'si ile bildirim ID'sini ilişkilendir
    const reminders = JSON.parse(await AsyncStorage.getItem('appointmentReminders') || '{}');
    reminders[appointment._id] = notificationId;
    await AsyncStorage.setItem('appointmentReminders', JSON.stringify(reminders));
    
    return notificationId;
  } catch (error) {
    console.error('Randevu hatırlatıcısı planlanırken hata:', error);
    return null;
  }
};

// Randevu hatırlatıcısını iptal et
export const cancelAppointmentReminder = async (appointmentId) => {
  try {
    const reminders = JSON.parse(await AsyncStorage.getItem('appointmentReminders') || '{}');
    const notificationId = reminders[appointmentId];
    
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      delete reminders[appointmentId];
      await AsyncStorage.setItem('appointmentReminders', JSON.stringify(reminders));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Randevu hatırlatıcısı iptal edilirken hata:', error);
    return false;
  }
};

// Öğün hatırlatıcısı ayarla
export const scheduleMealReminder = async (mealType, time) => {
  try {
    // Saat ve dakikayı ayır
    const [hour, minute] = time.split(':').map(num => parseInt(num, 10));
    
    // Tetikleyiciyi oluştur (her gün belirtilen saatte)
    const trigger = {
      hour,
      minute,
      repeats: true,
    };
    
    // Öğün türüne göre mesaj
    let mealName;
    switch (mealType) {
      case 'breakfast':
        mealName = 'Kahvaltı';
        break;
      case 'lunch':
        mealName = 'Öğle Yemeği';
        break;
      case 'dinner':
        mealName = 'Akşam Yemeği';
        break;
      case 'snack':
        mealName = 'Ara Öğün';
        break;
      default:
        mealName = 'Öğün';
    }
    
    const notificationId = await scheduleLocalNotification({
      title: `${mealName} Zamanı`,
      body: `${mealName} zamanınız geldi! Beslenme planınızı takip etmeyi unutmayın.`,
      data: { mealType },
      trigger,
    });
    
    // Meal reminder ID'lerini sakla
    const mealReminders = JSON.parse(await AsyncStorage.getItem('mealReminders') || '{}');
    mealReminders[mealType] = notificationId;
    await AsyncStorage.setItem('mealReminders', JSON.stringify(mealReminders));
    
    return notificationId;
  } catch (error) {
    console.error('Öğün hatırlatıcısı planlanırken hata:', error);
    return null;
  }
};

// Öğün hatırlatıcısını iptal et
export const cancelMealReminder = async (mealType) => {
  try {
    const mealReminders = JSON.parse(await AsyncStorage.getItem('mealReminders') || '{}');
    const notificationId = mealReminders[mealType];
    
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      delete mealReminders[mealType];
      await AsyncStorage.setItem('mealReminders', JSON.stringify(mealReminders));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Öğün hatırlatıcısı iptal edilirken hata:', error);
    return false;
  }
};

// Su hatırlatıcısı ayarla
export const scheduleWaterReminder = async (interval = 120, startHour = 8, endHour = 22) => {
  try {
    // Önce varolan hatırlatıcıları temizle
    await cancelAllWaterReminders();
    
    const waterReminders = [];
    
    // Belirtilen aralıklarla hatırlatıcı oluştur
    for (let hour = startHour; hour <= endHour; hour += Math.floor(interval / 60)) {
      for (let minute = 0; minute < 60; minute += (interval % 60 || 60)) {
        if (hour === endHour && minute > 0) continue;
        
        const trigger = {
          hour,
          minute,
          repeats: true,
        };
        
        const notificationId = await scheduleLocalNotification({
          title: 'Su İçme Hatırlatıcısı',
          body: 'Su içmeyi unutmayın! Günlük hedefinize ulaşmak için düzenli su tüketimi önemlidir.',
          data: { type: 'water' },
          trigger,
        });
        
        waterReminders.push(notificationId);
      }
    }
    
    // Su hatırlatıcı ID'lerini sakla
    await AsyncStorage.setItem('waterReminders', JSON.stringify(waterReminders));
    
    return true;
  } catch (error) {
    console.error('Su hatırlatıcısı planlanırken hata:', error);
    return false;
  }
};

// Tüm su hatırlatıcılarını iptal et
export const cancelAllWaterReminders = async () => {
  try {
    const waterReminders = JSON.parse(await AsyncStorage.getItem('waterReminders') || '[]');
    
    for (const notificationId of waterReminders) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    }
    
    await AsyncStorage.setItem('waterReminders', JSON.stringify([]));
    return true;
  } catch (error) {
    console.error('Su hatırlatıcıları iptal edilirken hata:', error);
    return false;
  }
};

export default {
  registerForPushNotificationsAsync,
  savePushToken,
  scheduleLocalNotification,
  scheduleAppointmentReminder,
  cancelAppointmentReminder,
  scheduleMealReminder,
  cancelMealReminder,
  scheduleWaterReminder,
  cancelAllWaterReminders,
}; 