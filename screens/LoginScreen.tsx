import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL as url, SUPABASE_ANON_KEY as key } from '@env';
import { RootStackParamList } from '../app/AppNavigator'; // Import from your navigator file

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Login'
>;

const supabase = createClient(url, key);

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  const handleAuth = async () => {
    try {
      if (isSigningUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      
      navigation.navigate('Character');
    } catch (error: any) {
      Alert.alert('Authentication Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isSigningUp ? 'Create Account' : 'Login'}</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#ccc"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#ccc"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleAuth}>
        <Text style={styles.buttonText}>
          {isSigningUp ? 'Sign Up & Continue' : 'Log In'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsSigningUp(!isSigningUp)}>
        <Text style={styles.linkText}>
          {isSigningUp
            ? 'Already have an account? Log In'
            : 'No account? Sign Up'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e1e2e',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#2a2a40',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    color: '#fff',
  },
  button: {
    backgroundColor: '#4e60d3',
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  linkText: {
    color: '#bbb',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});