import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode
} from 'react';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/auth';
import { useSessionSync } from '@/hooks/use-session-sync';

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {}
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientSupabaseClient();

  const refreshUser = useCallback(async () => {
    try {
      setLoading(true);

      // Use getUser() instead of getSession()
      const {
        data: { user },
        error
      } = await supabase.auth.getUser();

      if (error || !user) {
        setUser(null);
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUser(profile);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const signOut = async () => {
    try {
      // First check if there's an active session before signing out
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        // If no session exists, just redirect to login
        setUser(null);
        window.location.href = '/auth/login';
        return;
      }

      // Clear local storage before sign out
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token');
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      // Force a hard redirect instead of using router.push
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if there's an error, try to redirect to login
      window.location.href = '/auth/login';
      throw error;
    }
  };

  // Initial auth check
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Use the session sync hook
  useSessionSync();

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
