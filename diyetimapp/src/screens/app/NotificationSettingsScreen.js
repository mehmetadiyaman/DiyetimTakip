import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Platform } from 'react-native';
import { Card, Title, Paragraph, Switch, Divider, Button, Dialog, Portal, TextInput, List, IconButton } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useFeedback } from '../../contexts/FeedbackContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as notificationService from '../../utils/notificationService';
import theme from '../../themes/theme';

const NotificationSettingsScreen = ({ navigation }) => {
  const { token, user } = useAuth();
  const { showSuccess, showError } = useFeedback();
  
  // Bildirim izinleri
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Bildirim ayarları
  const [appointmentReminders, setAppointmentReminders] = useState(true);
  const [mealReminders, setMealReminders] = useState(true);
  const [waterReminders, setWaterReminders] = useState(true);
  
  // Öğün hatırlatıcı zamanları
  const [mealTimes, setMealTimes] = useState({
    breakfast: '08:00',
    lunch: '13:00',
    dinner: '19:00',
    snack: '16:00',
  });
  
  // Su hatırlatıcı ayarları
  const [waterInterval, setWaterInterval] = useState(120); // 120 dakika = 2 saat
  
  // Dialog durumları
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState(null);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [waterIntervalDialogVisible, setWaterIntervalDialogVisible] = useState(false);
  
  useEffect(() => {
    checkNotificationPermissions();
    loadSettings();
  }, []);
  
  const checkNotificationPermissions = async () => {
    try {
      // Expo-notifications izinlerini kontrol et
      const token = await notificationService.registerForPushNotificationsAsync();
      setNotificationsEnabled(!!token);
    } catch (error) {
      console.error('Bildirim izinleri kontrol edilirken hata:', error);
    }
  };
  
  const loadSettings = async () => {
    try {
      // Bildirim ayarlarını yükle
      const settings = JSON.parse(await AsyncStorage.getItem('notificationSettings') || '{}');
      
      if (settings.appointmentReminders !== undefined) {
        setAppointmentReminders(settings.appointmentReminders);
      }
      
      if (settings.mealReminders !== undefined) {
        setMealReminders(settings.mealReminders);
      }
      
      if (settings.waterReminders !== undefined) {
        setWaterReminders(settings.waterReminders);
      }
      
      if (settings.mealTimes) {
        setMealTimes(settings.mealTimes);
      }
      
      if (settings.waterInterval) {
        setWaterInterval(settings.waterInterval);
      }
    } catch (error) {
      console.error('Ayarlar yüklenirken hata:', error);
    }
  };
  
  const saveSettings = async () => {
    try {
      const settings = {
        appointmentReminders,
        mealReminders,
        waterReminders,
        mealTimes,
        waterInterval,
      };
      
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(settings));
      showSuccess('Bildirim ayarları kaydedildi');
      
      // Meal reminders güncelle
      if (mealReminders) {
        for (const [mealType, time] of Object.entries(mealTimes)) {
          await notificationService.scheduleMealReminder(mealType, time);
        }
      } else {
        // Meal reminders'ı iptal et
        for (const mealType of Object.keys(mealTimes)) {
          await notificationService.cancelMealReminder(mealType);
        }
      }
      
      // Su hatırlatıcılarını güncelle
      if (waterReminders) {
        await notificationService.scheduleWaterReminder(waterInterval);
      } else {
        await notificationService.cancelAllWaterReminders();
      }
    } catch (error) {
      console.error('Ayarlar kaydedilirken hata:', error);
      showError('Ayarlar kaydedilirken bir hata oluştu');
    }
  };
  
  const requestNotificationPermissions = async () => {
    try {
      const token = await notificationService.registerForPushNotificationsAsync();
      if (token) {
        setNotificationsEnabled(true);
        await notificationService.savePushToken(token, user?.id);
        showSuccess('Bildirim izinleri alındı');
      } else {
        showError('Bildirim izinleri alınamadı. Lütfen cihaz ayarlarınızı kontrol edin.');
      }
    } catch (error) {
      console.error('Bildirim izinleri istenirken hata:', error);
      showError('Bildirim izinleri alınamadı');
    }
  };
  
  const showTimePicker = (mealType) => {
    setSelectedMealType(mealType);
    
    // Seçili zamanı ayarla
    const [hours, minutes] = mealTimes[mealType].split(':').map(Number);
    const time = new Date();
    time.setHours(hours, minutes, 0, 0);
    setSelectedTime(time);
    
    setTimePickerVisible(true);
  };
  
  const hideTimePicker = () => {
    setTimePickerVisible(false);
  };
  
  const handleTimeChange = (event, time) => {
    if (Platform.OS === 'android') {
      hideTimePicker();
    }
    
    if (event.type === 'dismissed') {
      return;
    }
    
    if (time) {
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      
      setMealTimes(prev => ({
        ...prev,
        [selectedMealType]: timeString,
      }));
      
      setSelectedTime(time);
    }
  };
  
  const getMealTypeName = (type) => {
    switch (type) {
      case 'breakfast':
        return 'Kahvaltı';
      case 'lunch':
        return 'Öğle Yemeği';
      case 'dinner':
        return 'Akşam Yemeği';
      case 'snack':
        return 'Ara Öğün';
      default:
        return 'Öğün';
    }
  };
  
  const handleUpdateWaterInterval = () => {
    setWaterIntervalDialogVisible(false);
  };
  
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Bildirim İzinleri</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.permissionContainer}>
            <View>
              <Text style={styles.settingLabel}>Bildirimler</Text>
              <Text style={styles.settingDescription}>
                {notificationsEnabled 
                  ? 'Bildirimlere izin verildi' 
                  : 'Bildirimlere izin verilmedi'}
              </Text>
            </View>
            
            {!notificationsEnabled && (
              <Button 
                mode="contained" 
                onPress={requestNotificationPermissions}
              >
                İzin Ver
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title>Bildirim Ayarları</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Randevu Hatırlatıcıları</Text>
              <Text style={styles.settingDescription}>
                Yaklaşan randevularınız için bildirimleri alın
              </Text>
            </View>
            <Switch
              value={appointmentReminders}
              onValueChange={setAppointmentReminders}
              color={theme.palette.primary.main}
            />
          </View>
          
          <Divider style={styles.itemDivider} />
          
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Öğün Hatırlatıcıları</Text>
              <Text style={styles.settingDescription}>
                Yemek saatleriniz için bildirimleri alın
              </Text>
            </View>
            <Switch
              value={mealReminders}
              onValueChange={setMealReminders}
              color={theme.palette.primary.main}
            />
          </View>
          
          {mealReminders && (
            <View style={styles.subSettingsContainer}>
              {Object.keys(mealTimes).map(mealType => (
                <TouchableOpacity
                  key={mealType}
                  style={styles.timeSettingRow}
                  onPress={() => showTimePicker(mealType)}
                >
                  <Text>{getMealTypeName(mealType)}</Text>
                  <View style={styles.timeDisplay}>
                    <Text style={styles.timeText}>{mealTimes[mealType]}</Text>
                    <IconButton
                      icon="clock-outline"
                      size={20}
                      onPress={() => showTimePicker(mealType)}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          <Divider style={styles.itemDivider} />
          
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Su Hatırlatıcıları</Text>
              <Text style={styles.settingDescription}>
                Düzenli su içmeniz için bildirimleri alın
              </Text>
            </View>
            <Switch
              value={waterReminders}
              onValueChange={setWaterReminders}
              color={theme.palette.primary.main}
            />
          </View>
          
          {waterReminders && (
            <View style={styles.subSettingsContainer}>
              <TouchableOpacity
                style={styles.timeSettingRow}
                onPress={() => setWaterIntervalDialogVisible(true)}
              >
                <Text>Hatırlatma Sıklığı</Text>
                <View style={styles.timeDisplay}>
                  <Text style={styles.timeText}>
                    {waterInterval >= 60 
                      ? `${Math.floor(waterInterval / 60)} saat ${waterInterval % 60 > 0 ? `${waterInterval % 60} dk` : ''}`
                      : `${waterInterval} dakika`}
                  </Text>
                  <IconButton
                    icon="pencil"
                    size={20}
                    onPress={() => setWaterIntervalDialogVisible(true)}
                  />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </Card.Content>
      </Card>
      
      <Button
        mode="contained"
        onPress={saveSettings}
        style={styles.saveButton}
      >
        Ayarları Kaydet
      </Button>
      
      {/* Zaman Seçici Dialog */}
      {timePickerVisible && (
        <Portal>
          <Dialog visible={timePickerVisible} onDismiss={hideTimePicker}>
            <Dialog.Title>{getMealTypeName(selectedMealType)} Hatırlatıcı Zamanı</Dialog.Title>
            <Dialog.Content>
              <DateTimePicker
                value={selectedTime}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
              />
            </Dialog.Content>
            {Platform.OS === 'ios' && (
              <Dialog.Actions>
                <Button onPress={hideTimePicker}>Tamam</Button>
              </Dialog.Actions>
            )}
          </Dialog>
        </Portal>
      )}
      
      {/* Su Hatırlatıcı Aralığı Dialog */}
      <Portal>
        <Dialog 
          visible={waterIntervalDialogVisible} 
          onDismiss={() => setWaterIntervalDialogVisible(false)}
        >
          <Dialog.Title>Su Hatırlatma Sıklığı</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>Hatırlatma aralığını seçin (dakika)</Text>
            <View style={styles.intervalOptions}>
              {[30, 60, 90, 120, 180, 240].map(interval => (
                <TouchableOpacity
                  key={interval}
                  style={[
                    styles.intervalOption,
                    waterInterval === interval && styles.selectedIntervalOption
                  ]}
                  onPress={() => setWaterInterval(interval)}
                >
                  <Text style={waterInterval === interval ? styles.selectedIntervalText : {}}>
                    {interval >= 60 
                      ? `${Math.floor(interval / 60)} saat ${interval % 60 > 0 ? `${interval % 60} dk` : ''}`
                      : `${interval} dk`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setWaterIntervalDialogVisible(false)}>Tamam</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.palette.background.default,
  },
  card: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
    backgroundColor: theme.palette.background.paper,
  },
  divider: {
    marginVertical: 16,
  },
  itemDivider: {
    marginVertical: 12,
  },
  permissionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 14,
    color: theme.palette.text.secondary,
    marginTop: 4,
  },
  subSettingsContainer: {
    marginLeft: 16,
    marginTop: 8,
    marginBottom: 8,
    borderLeftWidth: 1,
    borderLeftColor: theme.palette.grey[300],
    paddingLeft: 16,
  },
  timeSettingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    margin: 16,
    marginTop: 8,
    backgroundColor: theme.palette.primary.main,
  },
  dialogText: {
    marginBottom: 16,
  },
  intervalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  intervalOption: {
    width: '48%',
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.palette.grey[300],
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedIntervalOption: {
    backgroundColor: theme.palette.primary.main,
    borderColor: theme.palette.primary.main,
  },
  selectedIntervalText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default NotificationSettingsScreen; 