// In your main file (App.js or index.js)
import React from 'react';
// DO NOT import NavigationContainer
import AppNavigator from './AppNavigator';

export default function App() {
  // Just return your navigator without wrapping in NavigationContainer
  return <AppNavigator />;
}