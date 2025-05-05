import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../hooks/useAuth';
import { ActivityIndicator, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../themes/theme';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main Screens
import DashboardScreen from '../screens/app/DashboardScreen';
import ClientsScreen from '../screens/app/ClientsScreen';
import ClientDetailsScreen from '../screens/app/ClientDetailsScreen';
import AppointmentsScreen from '../screens/app/AppointmentsScreen';
import DietPlansScreen from '../screens/app/DietPlansScreen';
import MeasurementsScreen from '../screens/app/MeasurementsScreen';
import ProfileScreen from '../screens/app/ProfileScreen';
import { commonStyles } from '../themes';

// New Screens
import FoodItemsScreen from '../screens/app/FoodItemsScreen';
import RecipesScreen from '../screens/app/RecipesScreen';
import MealPlannerScreen from '../screens/app/MealPlannerScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Ortak stack navigator ayarları
const stackScreenOptions = {
  headerStyle: { backgroundColor: theme.palette.primary.main },
  headerTintColor: theme.palette.primary.contrastText,
  headerTitleStyle: { 
    fontWeight: theme.typography.fontWeight.bold,
    fontSize: theme.typography.fontSize.lg
  },
  cardStyle: { backgroundColor: theme.palette.background.default }
};

// Auth Stack Navigator
const AuthStack = () => (
  <Stack.Navigator screenOptions={stackScreenOptions}>
    <Stack.Screen 
      name="Login" 
      component={LoginScreen} 
      options={{ title: 'Giriş Yap' }} 
    />
    <Stack.Screen 
      name="Register" 
      component={RegisterScreen} 
      options={{ title: 'Kayıt Ol' }} 
    />
  </Stack.Navigator>
);

// Tab Navigator
const AppTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'Dashboard') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Clients') {
          iconName = focused ? 'people' : 'people-outline';
        } else if (route.name === 'Appointments') {
          iconName = focused ? 'calendar' : 'calendar-outline';
        } else if (route.name === 'MealPlanner') {
          iconName = focused ? 'restaurant' : 'restaurant-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        }

        return <Ionicons name={iconName} size={24} color={color} />;
      },
      tabBarActiveTintColor: theme.palette.primary.main,
      tabBarInactiveTintColor: theme.palette.grey[600],
      tabBarIconStyle: {
        marginTop: 2
      },
      tabBarStyle: {
        backgroundColor: theme.palette.background.paper,
        borderTopColor: theme.palette.grey[300],
        height: 80,
        paddingTop: 5,
        paddingBottom: 7
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 3
      },
      headerStyle: { backgroundColor: theme.palette.primary.main },
      headerTintColor: theme.palette.primary.contrastText,
      headerTitleStyle: { 
        fontWeight: theme.typography.fontWeight.bold,
        fontSize: theme.typography.fontSize.lg
      }
    })}
  >
    <Tab.Screen 
      name="Dashboard" 
      component={DashboardStack} 
      options={{ title: 'Ana Sayfa', headerShown: false }} 
    />
    <Tab.Screen 
      name="Clients" 
      component={ClientsStack} 
      options={{ title: 'Danışanlar', headerShown: false }} 
    />
    <Tab.Screen 
      name="MealPlanner" 
      component={MealPlannerStack} 
      options={{ title: 'Beslenme', headerShown: false }} 
    />
    <Tab.Screen 
      name="Appointments" 
      component={AppointmentsStack} 
      options={{ title: 'Randevular', headerShown: false }} 
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen} 
      options={{ title: 'Profil' }} 
    />
  </Tab.Navigator>
);

// Dashboard Stack
const DashboardStackNav = createStackNavigator();
const DashboardStack = () => (
  <DashboardStackNav.Navigator screenOptions={stackScreenOptions}>
    <DashboardStackNav.Screen 
      name="DashboardMain" 
      component={DashboardScreen} 
      options={{ title: 'Ana Sayfa' }} 
    />
    <DashboardStackNav.Screen 
      name="DietPlanDetails" 
      component={DietPlansScreen} 
      options={{ title: 'Diyet Planı Detayları' }} 
    />
  </DashboardStackNav.Navigator>
);

// Clients Stack
const ClientsStackNav = createStackNavigator();
const ClientsStack = () => (
  <ClientsStackNav.Navigator screenOptions={stackScreenOptions}>
    <ClientsStackNav.Screen 
      name="ClientsList" 
      component={ClientsScreen} 
      options={{ title: 'Danışanlar' }} 
    />
    <ClientsStackNav.Screen 
      name="ClientDetails" 
      component={ClientDetailsScreen} 
      options={({ route }) => ({ title: route.params?.clientName || 'Danışan Detayları' })} 
    />
    <ClientsStackNav.Screen 
      name="Measurements" 
      component={MeasurementsScreen} 
      options={({ route }) => ({ title: `${route.params?.clientName ? route.params.clientName + ' - ' : ''}Ölçümler` })} 
    />
    <ClientsStackNav.Screen 
      name="DietPlans" 
      component={DietPlansScreen} 
      options={({ route }) => ({ title: `${route.params?.clientName ? route.params.clientName + ' - ' : ''}Diyet Planları` })} 
    />
    <ClientsStackNav.Screen 
      name="ClientMealPlanner" 
      component={MealPlannerScreen} 
      options={({ route }) => ({ title: `${route.params?.clientName ? route.params.clientName + ' - ' : ''}Beslenme Takibi` })} 
    />
  </ClientsStackNav.Navigator>
);

// Appointments Stack
const AppointmentsStackNav = createStackNavigator();
const AppointmentsStack = () => (
  <AppointmentsStackNav.Navigator screenOptions={stackScreenOptions}>
    <AppointmentsStackNav.Screen 
      name="AppointmentsMain" 
      component={AppointmentsScreen} 
      options={{ title: 'Randevular' }} 
    />
  </AppointmentsStackNav.Navigator>
);

// Meal Planner Stack
const MealPlannerStackNav = createStackNavigator();
const MealPlannerStack = () => (
  <MealPlannerStackNav.Navigator screenOptions={stackScreenOptions}>
    <MealPlannerStackNav.Screen 
      name="MealPlannerMain" 
      component={MealPlannerScreen} 
      options={{ title: 'Beslenme Takibi' }} 
    />
    <MealPlannerStackNav.Screen 
      name="FoodItems" 
      component={FoodItemsScreen} 
      options={{ title: 'Besin Havuzu' }} 
    />
    <MealPlannerStackNav.Screen 
      name="Recipes" 
      component={RecipesScreen} 
      options={{ title: 'Tarifler' }} 
    />
  </MealPlannerStackNav.Navigator>
);

// Main App Navigator
export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={commonStyles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.palette.primary.main} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppTabs /> : <AuthStack />}
    </NavigationContainer>
  );
} 