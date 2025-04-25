import React from 'react';
import AppNavigator from './AppNavigator';
import AuthProvider from './AuthProvider';

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}