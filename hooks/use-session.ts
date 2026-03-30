import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Session } from '@supabase/supabase-js';
import { Profile } from '@/types/auth';
import { UserRole } from '@/lib/constants/roles';
import { AuthService } from '@/lib/auth/auth-service';
import { createClientSupabaseClient } from '@/lib/supabase/client';

export function useSession() {
  const router = useRouter();
  const supabase = createClientSupabaseClient();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const { session: newSession } = await AuthService.getSession();
      setSession(newSession);

      if (newSession?.user) {
        const userProfile = await AuthService.getUserProfile();
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      setSession(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Role-based authorization helpers
  const hasRole = useCallback(
    async (requiredRole: UserRole): Promise<boolean> => {
      return AuthService.hasRole(requiredRole);
    },
    []
  );

  const canManageRoles = useCallback(async (): Promise<boolean> => {
    return AuthService.canManageRoles();
  }, []);

  const canManageUsers = useCallback(async (): Promise<boolean> => {
    return AuthService.canManageUsers();
  }, []);

  useEffect(() => {
    refreshSession();

    // Subscribe to auth changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await refreshSession();
        router.refresh();
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
        router.push('/auth/login');
      }
    });

    // Subscribe to profile changes
    const profileSubscription = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session?.user.id}`
        },
        async () => {
          await refreshSession();
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      profileSubscription.unsubscribe();
    };
  }, [supabase, router, refreshSession, session?.user.id]);

  return {
    session,
    profile,
    isLoading,
    refreshSession,
    hasRole,
    canManageRoles,
    canManageUsers
  };
}
