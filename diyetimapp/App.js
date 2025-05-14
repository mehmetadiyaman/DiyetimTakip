import React from 'react';
import { StatusBar } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/hooks/useAuth';
import { FeedbackProvider } from './src/contexts/FeedbackContext';
import { Provider as PaperProvider } from 'react-native-paper';
import theme from './src/themes/theme';

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <StatusBar backgroundColor={theme.palette.primary.main} barStyle="light-content" />
      <AuthProvider>
        <FeedbackProvider>
          <AppNavigator />
        </FeedbackProvider>
      </AuthProvider>
    </PaperProvider>
  );
}
