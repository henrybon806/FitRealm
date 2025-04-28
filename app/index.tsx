import React from 'react';
import AppNavigator from './AppNavigator';
import AuthProvider from './AuthProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ImageBackground } from 'react-native';

export default function App() {
  return (
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
  );
}