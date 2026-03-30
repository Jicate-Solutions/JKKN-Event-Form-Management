'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { useRoles } from '@/hooks/use-roles';
import { UserService } from '@/lib/services/users/user-service';

export default function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientSupabaseClient();
  const { getLandingPage } = useRoles();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Handle the OAuth callback
        const { error } = await supabase.auth.getSession();

        if (error) throw error;

        // Get the current session after OAuth callback
        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('No session received');
        }

        // Redirect to appropriate page
        const redirectTo = searchParams.get('redirectTo') || getLandingPage();
        router.push(redirectTo);
      } catch (error) {
        console.error('Auth callback error:', error);
        router.push('/auth/login?error=callback_error');
      }
    };

    handleCallback();
  }, [router, searchParams, supabase, getLandingPage]);

  return null;
}
