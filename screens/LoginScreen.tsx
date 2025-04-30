import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Animated, 
  Easing, 
  KeyboardAvoidingView, 
  Platform,
  SafeAreaView
} from 'react-native';
import { useAuth } from '../app/AuthProvider';
import { supabase } from '../app/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
// Remove LinearGradient import and use View instead

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    ).start();
  }, []);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);

    try {
      let authResponse;

      if (isSigningUp) {
        authResponse = await supabase.auth.signUp({ email, password });

        if (authResponse.error) throw authResponse.error;

        if (authResponse.data?.user?.identities?.length === 0) {
          Alert.alert('Error', 'This email is already registered.');
          setIsSigningUp(false);
          setLoading(false);
          return;
        }

        if (!authResponse.data.session) {
          Alert.alert('Verify Email', 'Check your inbox to verify your account.');
          setIsSigningUp(false);
          setLoading(false);
          return;
        }
      } else {
        authResponse = await supabase.auth.signInWithPassword({ email, password });

        if (authResponse.error) throw authResponse.error;
      }

      if (authResponse.data.session) {
        try {
          navigation.navigate('Main', { screen: 'Character' });
        } catch (navError) {
          console.error("Navigation error:", navError);
          Alert.alert('Navigation Error', 'Could not navigate to Character screen');
        }
      } else {
        Alert.alert('Login Failed', 'No session created.');
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      Alert.alert('Authentication Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const animateButtonPress = () => {
    Animated.sequence([
      Animated.spring(buttonScale, {
        toValue: 0.95,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Using View with background colors instead of LinearGradient */}
      <View style={styles.gradientContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.outerContainer}>
            {/* BIG "Fit Realm" Logo */}
            <Animated.Text style={[styles.logo, { opacity: fadeAnim, transform: [{ scale: pulseAnim }] }]}>
              Fit Realm
            </Animated.Text>

            <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
              <Animated.Text style={[styles.title, { transform: [{ scale: pulseAnim }] }]}>
                {isSigningUp ? '✨ Create an Account' : '⚡ Welcome Back'}
              </Animated.Text>

              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'email' && styles.inputFocused,
                ]}
                placeholder="Email"
                placeholderTextColor="#aaa"
                value={email}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'password' && styles.inputFocused,
                ]}
                placeholder="Password"
                placeholderTextColor="#aaa"
                value={password}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                onChangeText={setPassword}
                secureTextEntry
              />

              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={() => {
                    animateButtonPress();
                    handleAuth();
                  }}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading
                      ? 'Loading...'
                      : isSigningUp
                        ? 'Sign Up'
                        : 'Sign In'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>

              <TouchableOpacity
                onPress={() => setIsSigningUp(!isSigningUp)}
                activeOpacity={0.6}
                disabled={loading}
              >
                <Text style={styles.switchText}>
                  {isSigningUp
                    ? 'Already have an account? Sign In'
                    : 'No account yet? Sign Up'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f0c29',
  },
  gradientContainer: {
    flex: 1,
    backgroundColor: '#302b63', // Middle color as fallback
  },
  outerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logo: {
    fontSize: 50,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 40,
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: '#4e60d3',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  container: {
    width: '100%',
    backgroundColor: '#1e1e2e',
    borderRadius: 20,
    padding: 24,
    elevation: 10,
    shadowColor: '#4e60d3',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f8f8f2',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#555',
    backgroundColor: '#2a2a40',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    marginBottom: 16,
    fontSize: 16,
  },
  inputFocused: {
    borderColor: '#4e60d3',
  },
  button: {
    backgroundColor: '#4e60d3',
    padding: 14,
    borderRadius: 12,
    marginVertical: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 18,
  },
  switchText: {
    color: '#bbb',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
});