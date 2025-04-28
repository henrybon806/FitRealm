import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Reward = {
  id: string;
  title: string;
  description: string;
};

type AuthContextType = {
  user: any;
  session: any;
  loading: boolean;
  rewards: Reward[];
  setRewards: React.Dispatch<React.SetStateAction<Reward[]>>;
  saveRewards: (rewards: Reward[]) => Promise<void>; // <-- NEW
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  rewards: [],
  setRewards: () => {},
  saveRewards: async () => {}, // <-- NEW
});

const REWARDS_STORAGE_KEY = 'user_rewards';

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState<Reward[]>([]);

  useEffect(() => {
    const loadRewards = async () => {
      try {
        const storedRewards = await AsyncStorage.getItem(REWARDS_STORAGE_KEY);
        if (storedRewards) {
          setRewards(JSON.parse(storedRewards));
        }
      } catch (error) {
        console.error('Failed to load rewards from storage', error);
      }
    };

    loadRewards();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session check:", session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`Auth event: ${event}`, session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // ✅ Separate Async Save Helper
  const saveRewards = async (newRewards: Reward[]) => {
    try {
      setRewards(newRewards); // Update state immediately
      await AsyncStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(newRewards));
    } catch (error) {
      console.error('Failed to save rewards to storage', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, rewards, setRewards, saveRewards }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;

export const useAuth = () => useContext(AuthContext);