import React from 'react';
import AppNavigator from './AppNavigator';
import AuthProvider from './AuthProvider';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaView style={styles.safeTopOnly} edges={['top']}>
      <StatusBar barStyle="light" backgroundColor="#0f0c29" translucent={false} />
      <View style={styles.fullScreen}>
        <AuthProvider>
            <AppNavigator />
        </AuthProvider>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeTopOnly: {
    flex: 1,
    backgroundColor: '#0f0c29', // Apply dark background to safe area too
  },
  fullScreen: {
    flex: 1,
    backgroundColor: '#0f0c29',
  },
});