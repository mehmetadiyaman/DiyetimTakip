import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/hooks/useAuth';
import { FeedbackProvider } from './src/contexts/FeedbackContext';

export default function App() {
  return (
    <AuthProvider>
      <FeedbackProvider>
        <AppNavigator />
      </FeedbackProvider>
    </AuthProvider>
  );
}
