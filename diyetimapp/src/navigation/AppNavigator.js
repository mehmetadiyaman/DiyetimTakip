import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../hooks/useAuth';
import { ActivityIndicator, View, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import ExerciseTrackingScreen from '../screens/app/ExerciseTrackingScreen';
import NotificationSettingsScreen from '../screens/app/NotificationSettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Modern header background with subtle gradient
const HeaderBackground = () => {
  return (
    <LinearGradient
      colors={['#4caf50', '#66bb6a', '#81c784']}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    />
  );
};

// Refined stack navigator options
const stackScreenOptions = {
  headerStyle: { 
    height: Platform.OS === 'ios' ? 88 : 70, // Reduced height
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    borderBottomWidth: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  headerBackground: HeaderBackground,
  headerTintColor: '#ffffff',
  headerTitleStyle: { 
    fontWeight: '700',
    fontSize: 24,
    letterSpacing: 0.5,
    color: '#ffffff',
    ...Platform.select({
      ios: {
        fontFamily: 'Noteworthy-Light',
        shadowColor: 'rgba(0,0,0,0.3)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 1,
      },
      android: {
        fontFamily: 'cursive',
      }
    })
  },
  headerTitleAlign: 'center',
  headerLeftContainerStyle: {
    paddingLeft: 16,
  },
  headerRightContainerStyle: {
    paddingRight: 16,
  },
  cardStyle: { backgroundColor: theme.palette.background.default },
  // Add smooth transitions between screens
  transitionSpec: {
    open: {
      animation: 'timing',
      config: {
        duration: 300,
      },
    },
    close: {
      animation: 'timing',
      config: {
        duration: 250,
      },
    },
  },
  cardStyleInterpolator: ({ current, layouts }) => {
    return {
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0],
            }),
          },
        ],
        opacity: current.progress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 0.8, 1],
        }),
      },
      overlayStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.5],
        }),
      },
    };
  },
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
        } else if (route.name === 'DietPlans') {
          iconName = focused ? 'nutrition' : 'nutrition-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        }

        return <Ionicons name={iconName} size={22} color={color} />;
      },
      tabBarActiveTintColor: theme.palette.primary.main,
      tabBarInactiveTintColor: theme.palette.grey[500],
      tabBarIconStyle: {
        marginTop: 2
      },
      tabBarStyle: {
        backgroundColor: '#ffffff',
        borderTopColor: 'rgba(0,0,0,0.05)',
        height: 76,
        paddingTop: 5,
        paddingBottom: 7,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '500',
        marginBottom: 3
      },
      headerStyle: { 
        height: Platform.OS === 'ios' ? 88 : 70, // Reduced height
        elevation: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        borderBottomWidth: 0,
        borderBottomLeftRadius: 14,
        borderBottomRightRadius: 14,
      },
      headerBackground: HeaderBackground,
      headerTintColor: '#ffffff',
      headerTitleStyle: { 
        fontWeight: '700',
        fontSize: 24,
        letterSpacing: 0.5,
        color: '#ffffff',
        ...Platform.select({
          ios: {
            fontFamily: 'Noteworthy-Light',
            shadowColor: 'rgba(0,0,0,0.3)',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.3,
            shadowRadius: 1,
          },
          android: {
            fontFamily: 'cursive',
          }
        })
      },
      headerTitleAlign: 'center',
      headerLeftContainerStyle: {
        paddingLeft: 16,
      },
      headerRightContainerStyle: {
        paddingRight: 16,
      }
    })}
  >
    <Tab.Screen 
      name="Dashboard" 
      component={DashboardStack} 
      options={{ 
        title: 'Ana Sayfa', 
        headerShown: false,
      }} 
    />
    <Tab.Screen 
      name="Clients" 
      component={ClientsStack} 
      options={{ 
        title: 'Danışanlar', 
        headerShown: false,
      }} 
    />
    <Tab.Screen 
      name="DietPlans" 
      component={DietPlansStack} 
      options={{ 
        title: 'Diyet Planları', 
        headerShown: false,
      }} 
    />
    <Tab.Screen 
      name="Appointments" 
      component={AppointmentsStack} 
      options={{ 
        title: 'Randevular', 
        headerShown: false,
      }} 
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileStack} 
      options={{ 
        title: 'Profil', 
        headerShown: false,
      }} 
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
      options={{ 
        title: 'Ana Sayfa',
        headerLeft: () => null,
      }} 
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
      options={{ 
        title: 'Danışanlar',
        headerLeft: () => null,
      }} 
    />
    <ClientsStackNav.Screen 
      name="ClientDetails" 
      component={ClientDetailsScreen} 
      options={({ route }) => ({ 
        title: route.params?.clientName || 'Danışan Detayları',
        headerLeft: () => null,
        headerTitleStyle: {
          ...stackScreenOptions.headerTitleStyle,
          fontSize: undefined,
          fontWeight: '700',
          adjustsFontSizeToFit: true,
          maxFontSizeMultiplier: 1.2,
          numberOfLines: 1,
        }
      })} 
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
    <ClientsStackNav.Screen 
      name="ExerciseTracking" 
      component={ExerciseTrackingScreen} 
      options={({ route }) => ({ title: `${route.params?.clientName ? route.params.clientName + ' - ' : ''}Egzersiz Takibi` })} 
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
      options={{ 
        title: 'Randevular',
        headerLeft: () => null,
      }} 
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
      options={{ 
        title: 'Beslenme Takibi',
        headerLeft: () => null,
      }} 
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
    <MealPlannerStackNav.Screen 
      name="ExerciseTracking" 
      component={ExerciseTrackingScreen} 
      options={{ title: 'Egzersiz Takibi' }} 
    />
  </MealPlannerStackNav.Navigator>
);

// Diet Plans Stack
const DietPlansStackNav = createStackNavigator();
const DietPlansStack = () => (
  <DietPlansStackNav.Navigator screenOptions={stackScreenOptions}>
    <DietPlansStackNav.Screen 
      name="DietPlansMain" 
      component={DietPlansScreen} 
      options={{ 
        title: 'Diyet Planları',
        headerLeft: () => null,
      }} 
    />
    <DietPlansStackNav.Screen 
      name="FoodItems" 
      component={FoodItemsScreen} 
      options={{ title: 'Besin Havuzu' }} 
    />
    <DietPlansStackNav.Screen 
      name="Recipes" 
      component={RecipesScreen} 
      options={{ title: 'Tarifler' }} 
    />
    <DietPlansStackNav.Screen 
      name="MealPlanner" 
      component={MealPlannerScreen} 
      options={{ title: 'Beslenme Takibi' }} 
    />
  </DietPlansStackNav.Navigator>
);

// Profile Stack
const ProfileStackNav = createStackNavigator();
const ProfileStack = () => (
  <ProfileStackNav.Navigator screenOptions={stackScreenOptions}>
    <ProfileStackNav.Screen 
      name="ProfileMain" 
      component={ProfileScreen} 
      options={{ 
        title: 'Profil',
        headerLeft: () => null,
      }} 
    />
    <ProfileStackNav.Screen 
      name="NotificationSettings" 
      component={NotificationSettingsScreen} 
      options={{ title: 'Bildirim Ayarları' }} 
    />
  </ProfileStackNav.Navigator>
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