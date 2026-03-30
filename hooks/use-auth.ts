import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/auth';
import type { AuthError } from '@supabase/supabase-js';

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClientSupabaseClient();

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Google login error:', error);
      toast.error('Failed to sign in with Google');
      return { data: null, error: error as AuthError };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);

      // First check if there's an active session
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        // If no session exists, just redirect to login
        router.push('/auth/login');
        router.refresh();
        return { error: null };
      }

      // Clear local storage before sign out
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token');
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      router.push('/auth/login');
      router.refresh();
      toast.success('Signed out successfully');
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to sign out'
      );

      // Even if there's an error, try to redirect to login
      router.push('/auth/login');

      return { error: error as AuthError };
    } finally {
      setIsLoading(false);
    }
  };

  const getSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { data: data.session, error: null };
    } catch (error) {
      console.error('Get session error:', error);
      return { data: null, error: error as AuthError };
    }
  }, [supabase]);

  const getProfile = useCallback(async () => {
    try {
      const { data: session } = await getSession();
      if (!session?.user) return { data: null, error: new Error('No session') };

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      return { data: data as Profile, error: null };
    } catch (error) {
      console.error('Get profile error:', error);
      return { data: null, error: error as AuthError };
    }
  }, [supabase, getSession]);

  return {
    isLoading,
    signInWithGoogle,
    signOut,
    getSession,
    getProfile
  };
}

function getDefaultRedirect(role?: string): string {
  switch (role) {
    case 'super_admin':
    case 'administrator':
      return '/';
    case 'staff':
    case 'tutor':
      return '/';
    case 'student':
      return '/';
    default:
      return '/';
  }
}
