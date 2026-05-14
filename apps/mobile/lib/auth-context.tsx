import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, type AppStateStatus, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import type { AuthResponse } from '@supabase/supabase-js';
import supabase, { getUser, isSupabaseConfigured, onAuthStateChange, signUp as authSignUp } from './auth';
import { handleAuthDeepLink } from './auth-deep-link';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<AuthResponse>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signUp: async () => ({
    data: { user: null, session: null },
    error: null,
  }),
  signIn: async () => {},
  signOut: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    // Check if user is already logged in
    const checkUser = async () => {
      try {
        try {
          const initial = await Linking.getInitialURL();
          if (initial) {
            const r = await handleAuthDeepLink(initial);
            if (r.handled && !r.ok && r.errorMessage) {
              Alert.alert('Could not complete sign-in', r.errorMessage);
            }
          }
        } catch (e) {
          console.warn('Auth deep link (initial):', e);
        }

        const currentUser = await getUser();
        if (currentUser) {
          setUser({
            id: currentUser.id,
            email: currentUser.email || '',
          });
        }
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    const linkSub = Linking.addEventListener('url', ({ url }) => {
      void (async () => {
        const r = await handleAuthDeepLink(url);
        if (r.handled && !r.ok && r.errorMessage) {
          Alert.alert('Could not complete sign-in', r.errorMessage);
        }
      })();
    });

    // Subscribe to auth state changes
    let subscription: any = null;
    try {
      const result = onAuthStateChange((event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      });
      subscription = result?.data?.subscription;
    } catch (error) {
      console.error('Error setting up auth state listener:', error);
      setLoading(false);
    }

    // Cleanup subscription on unmount
    return () => {
      linkSub.remove();
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from auth state:', error);
        }
      }
    };
  }, []);

  /** Refresh tokens when returning to foreground (reduces surprise 401s on long sessions). */
  useEffect(() => {
    supabase.auth.startAutoRefresh();
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        void supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => {
      sub.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const result = await authSignUp(email, password);

    if (result.error) {
      throw result.error;
    }

    // If email confirmation is required, data.session will be null
    // Only set user if we have a session (auto-login enabled)
    if (result.data.user && result.data.session) {
      setUser({
        id: result.data.user.id,
        email: result.data.user.email || '',
      });
    }

    return result;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Sign in error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    if (data.user) {
      setUser({
        id: data.user.id,
        email: data.user.email || '',
      });
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('signOut:', e);
    } finally {
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
