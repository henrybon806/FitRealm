import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from './supabase'

type AuthContextType = {
  user: any;
  session: any;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, session: null, loading: true });

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session check:", session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Set up listener for auth changes
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

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;

export const useAuth = () => useContext(AuthContext);