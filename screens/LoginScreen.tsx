import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../app/AuthProvider'; // adjust path as needed
import { supabase } from '../app/supabase'
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);

    try {
      let authResponse;

      if (isSigningUp) {
        authResponse = await supabase.auth.signUp({
          email,
          password,
        });

        if (authResponse.error) throw authResponse.error;

        if (authResponse.data?.user?.identities?.length === 0) {
          Alert.alert('Error', 'This email is already registered. Please sign in instead.');
          setIsSigningUp(false);
          setLoading(false);
          return;
        }

        if (!authResponse.data.session) {
          Alert.alert('Verification Required', 'Please check your email to verify your account before logging in.');
          setIsSigningUp(false);
          setLoading(false);
          return;
        }
      } else {
        authResponse = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authResponse.error) throw authResponse.error;
      }

      console.log('Auth successful:', authResponse.data.user);

      if (authResponse.data.session) {
        // Navigate directly to Main with Character screen
        navigation.navigate('Main', { screen: 'Character' });
      } else {
        Alert.alert('Login Failed', 'Could not establish a session. Please try again.');
      }

    } catch (error: any) {
      Alert.alert('Authentication Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isSigningUp ? 'Create an Account' : 'Welcome Back'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#ccc"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#ccc"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleAuth}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading
            ? 'Processing...'
            : isSigningUp
              ? 'Sign Up'
              : 'Sign In'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setIsSigningUp(!isSigningUp)}
        disabled={loading}
      >
        <Text style={styles.switchText}>
          {isSigningUp
            ? 'Already have an account? Sign In'
            : 'Need an account? Sign Up'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#1e1e2e',
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8f8f2',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    backgroundColor: '#2a2a40',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#4e60d3',
    padding: 14,
    borderRadius: 10,
    marginVertical: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  switchText: {
    color: '#bbb',
    textAlign: 'center',
    marginTop: 16,
  },
});
