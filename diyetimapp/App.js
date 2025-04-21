import React from 'react';
import { StatusBar } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/hooks/useAuth';
import { FeedbackProvider } from './src/contexts/FeedbackContext';
import AppNavigator from './src/navigation/AppNavigator';
import theme from './src/themes/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar backgroundColor={theme.palette.primary.main} barStyle="light-content" />
        <AuthProvider>
          <FeedbackProvider>
            <AppNavigator />
          </FeedbackProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
