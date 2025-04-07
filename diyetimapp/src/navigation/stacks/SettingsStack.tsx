import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SettingsStackParamList } from '../../types';

// Henüz ekran bileşenleri oluşturulmadı, ilerde eklenecek
// import SettingsScreen from '../../screens/settings/SettingsScreen';
// import ProfileScreen from '../../screens/settings/ProfileScreen';
// ...vb.

// Geçici olarak boş bileşenler
import { View, Text } from 'react-native';

const SettingsHomeScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Settings Home Screen</Text>
  </View>
);

const ProfileScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Profile Screen</Text>
  </View>
);

const EditProfileScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Edit Profile Screen</Text>
  </View>
);

const ChangePasswordScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Change Password Screen</Text>
  </View>
);

const Stack = createStackNavigator<SettingsStackParamList>();

const SettingsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="SettingsHome" 
        component={SettingsHomeScreen}
        options={{ title: 'Ayarlar' }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profil' }}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{ title: 'Profili Düzenle' }}
      />
      <Stack.Screen 
        name="ChangePassword" 
        component={ChangePasswordScreen}
        options={{ title: 'Şifre Değiştir' }}
      />
    </Stack.Navigator>
  );
};

export default SettingsStack; 