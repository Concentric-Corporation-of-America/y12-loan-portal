import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';

// Demo mode flag - enables demo authentication when Supabase is unavailable
// Set to false to use real Supabase authentication
const DEMO_MODE = false;

interface DemoUser {
  id: string;
  email: string;
  user_metadata: Record<string, unknown>;
  role?: string;
}

interface AuthContextType {
  user: User | DemoUser | null;
  session: Session | null;
  isLoading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo user storage key
const DEMO_USER_KEY = 'y12_demo_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | DemoUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (DEMO_MODE) {
      // Check for existing demo user in localStorage
      const storedUser = localStorage.getItem(DEMO_USER_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (DEMO_MODE) {
      // Demo sign in - check if user exists in localStorage
      const storedUser = localStorage.getItem(DEMO_USER_KEY);
      if (storedUser) {
        const demoUser = JSON.parse(storedUser);
        if (demoUser.email === email) {
          setUser(demoUser);
          return { error: null };
        }
      }
      // For demo, allow any login with valid format
      const demoUser: DemoUser = {
        id: `demo-${Date.now()}`,
        email,
        user_metadata: { first_name: 'Demo', last_name: 'User' },
        role: email.includes('admin') ? 'admin' : 'member',
      };
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
      setUser(demoUser);
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, unknown>) => {
    if (DEMO_MODE) {
      // Demo sign up - create user and store in localStorage
      const demoUser: DemoUser = {
        id: `demo-${Date.now()}`,
        email,
        user_metadata: metadata || {},
        role: 'member',
      };
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
      setUser(demoUser);
      return { error: null };
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    if (DEMO_MODE) {
      localStorage.removeItem(DEMO_USER_KEY);
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    if (DEMO_MODE) {
      // Demo mode - just return success
      return { error: null };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isDemo: DEMO_MODE,
        signIn,
        signUp,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
