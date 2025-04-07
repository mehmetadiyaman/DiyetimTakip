import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../types';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Tab stack navigatorlar
import DashboardStack from './stacks/DashboardStack';
import ClientsStack from './stacks/ClientsStack';
import AppointmentsStack from './stacks/AppointmentsStack';
import SettingsStack from './stacks/SettingsStack';

const Tab = createBottomTabNavigator<AppTabParamList>();

const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2E7D32',
        tabBarInactiveTintColor: '#757575',
        tabBarStyle: {
          height: 60,
          paddingBottom: 10,
          paddingTop: 5,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="dashboard" color={color} size={size} />
          ),
          tabBarLabel: 'Ana Sayfa',
        }}
      />
      <Tab.Screen
        name="Clients"
        component={ClientsStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="people" color={color} size={size} />
          ),
          tabBarLabel: 'Danışanlar',
        }}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="event" color={color} size={size} />
          ),
          tabBarLabel: 'Randevular',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="settings" color={color} size={size} />
          ),
          tabBarLabel: 'Ayarlar',
        }}
      />
    </Tab.Navigator>
  );
};

export default AppNavigator; 