import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ClientsStackParamList } from '../../types';

// Henüz ekran bileşenleri oluşturulmadı, ilerde eklenecek
// import ClientsListScreen from '../../screens/clients/ClientsListScreen';
// import ClientDetailsScreen from '../../screens/clients/ClientDetailsScreen';
// import AddClientScreen from '../../screens/clients/AddClientScreen';
// ...vb.

// Geçici olarak boş bileşenler
import { View, Text } from 'react-native';

const ClientsListScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Clients List Screen</Text>
  </View>
);

const ClientDetailsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Client Details Screen</Text>
  </View>
);

const AddClientScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Add Client Screen</Text>
  </View>
);

const EditClientScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Edit Client Screen</Text>
  </View>
);

const ClientMeasurementsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Client Measurements Screen</Text>
  </View>
);

const AddMeasurementScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Add Measurement Screen</Text>
  </View>
);

const MeasurementDetailsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Measurement Details Screen</Text>
  </View>
);

const ClientDietPlansScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Client Diet Plans Screen</Text>
  </View>
);

const AddDietPlanScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Add Diet Plan Screen</Text>
  </View>
);

const DietPlanDetailsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Diet Plan Details Screen</Text>
  </View>
);

const Stack = createStackNavigator<ClientsStackParamList>();

const ClientsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ClientsList" 
        component={ClientsListScreen} 
        options={{ title: 'Danışanlar' }}
      />
      <Stack.Screen 
        name="ClientDetails" 
        component={ClientDetailsScreen}
        options={{ title: 'Danışan Detayları' }}
      />
      <Stack.Screen 
        name="AddClient" 
        component={AddClientScreen}
        options={{ title: 'Danışan Ekle' }}
      />
      <Stack.Screen 
        name="EditClient" 
        component={EditClientScreen}
        options={{ title: 'Danışanı Düzenle' }}
      />
      <Stack.Screen 
        name="ClientMeasurements" 
        component={ClientMeasurementsScreen}
        options={{ title: 'Ölçümler' }}
      />
      <Stack.Screen 
        name="AddMeasurement" 
        component={AddMeasurementScreen}
        options={{ title: 'Ölçüm Ekle' }}
      />
      <Stack.Screen 
        name="MeasurementDetails" 
        component={MeasurementDetailsScreen}
        options={{ title: 'Ölçüm Detayları' }}
      />
      <Stack.Screen 
        name="ClientDietPlans" 
        component={ClientDietPlansScreen}
        options={{ title: 'Diyet Planları' }}
      />
      <Stack.Screen 
        name="AddDietPlan" 
        component={AddDietPlanScreen}
        options={{ title: 'Diyet Planı Ekle' }}
      />
      <Stack.Screen 
        name="DietPlanDetails" 
        component={DietPlanDetailsScreen}
        options={{ title: 'Diyet Planı Detayları' }}
      />
    </Stack.Navigator>
  );
};

export default ClientsStack; 