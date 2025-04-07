import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { DashboardStackParamList } from '../../types';

// Ekran bileşenleri
import DashboardScreen from '../../screens/dashboard/DashboardScreen';

// Geçici olarak boş bir bileşen
import { View, Text } from 'react-native';

const NotificationsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Notifications Screen</Text>
  </View>
);

const Stack = createStackNavigator<DashboardStackParamList>();

const DashboardStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="DashboardHome" 
        component={DashboardScreen}
        options={{ title: 'Ana Sayfa' }} 
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ title: 'Bildirimler' }}
      />
    </Stack.Navigator>
  );
};

export default DashboardStack; 