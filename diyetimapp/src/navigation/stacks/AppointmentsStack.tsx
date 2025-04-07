import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AppointmentsStackParamList } from '../../types';

// Henüz ekran bileşenleri oluşturulmadı, ilerde eklenecek
// import AppointmentsListScreen from '../../screens/appointments/AppointmentsListScreen';
// import AppointmentDetailsScreen from '../../screens/appointments/AppointmentDetailsScreen';
// ...vb.

// Geçici olarak boş bileşenler
import { View, Text } from 'react-native';

const AppointmentsListScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Appointments List Screen</Text>
  </View>
);

const AppointmentDetailsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Appointment Details Screen</Text>
  </View>
);

const AddAppointmentScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Add Appointment Screen</Text>
  </View>
);

const EditAppointmentScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Edit Appointment Screen</Text>
  </View>
);

const Stack = createStackNavigator<AppointmentsStackParamList>();

const AppointmentsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="AppointmentsList" 
        component={AppointmentsListScreen}
        options={{ title: 'Randevular' }}
      />
      <Stack.Screen 
        name="AppointmentDetails" 
        component={AppointmentDetailsScreen}
        options={{ title: 'Randevu Detayları' }}
      />
      <Stack.Screen 
        name="AddAppointment" 
        component={AddAppointmentScreen}
        options={{ title: 'Randevu Ekle' }}
      />
      <Stack.Screen 
        name="EditAppointment" 
        component={EditAppointmentScreen}
        options={{ title: 'Randevuyu Düzenle' }}
      />
    </Stack.Navigator>
  );
};

export default AppointmentsStack; 