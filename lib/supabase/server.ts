import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

let isBrowser = false;
try {
  isBrowser = typeof window !== 'undefined';
} catch (e) {
  // Ignore error
}

/**
 * This function should only be used in the app directory, not in the pages directory
 * If you need to use a Supabase client in the pages directory, use:
 * - createClientSupabaseClient() for client-side
 * - supabase-js createClient() directly for server-side
 */
export const createServerSupabaseClient = async () => {
  // Don't even try to use next/headers in the browser
  if (isBrowser) {
    throw new Error(
      'createServerSupabaseClient cannot be used in the browser. ' +
        'Use createClientSupabaseClient instead.'
    );
  }

  try {
    // Dynamic import to avoid loading next/headers at module evaluation time
    const headers = await import('next/headers');

    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            const cookieStore = await headers.cookies();
            const cookie = cookieStore.get(name);
            return cookie?.value ?? '';
          },
          async set(name: string, value: string, options: CookieOptions) {
            const cookieStore = await headers.cookies();
            cookieStore.set(name, value, options);
          },
          async remove(name: string, options: CookieOptions) {
            const cookieStore = await headers.cookies();
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          }
        }
      }
    );
  } catch (error) {
    throw new Error(
      'createServerSupabaseClient is only available in the App Router. ' +
        'For Pages Router, use createClient from @supabase/supabase-js directly.'
    );
  }
};

// Create server-side admin client with service role permissions
export const createServerAdminClient = () => {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error('Missing Supabase admin credentials in server environment');
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

/**
 * Helper to get authenticated session - only works in App Router
 * Uses getUser() to verify authentication with Supabase Auth server
 */
export async function getAuthSession() {
  try {
    const supabase = await createServerSupabaseClient();

    // First verify the user with Supabase Auth server
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { session: null, error: userError || new Error('No authenticated user') };
    }

    // Then get the session data
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return { session: null, error: sessionError || new Error('No session found') };
    }

    return { session, error: null };
  } catch (error) {
    console.error('Error in getAuthSession:', error);
    return { session: null, error: error as Error };
  }
}

/**
 * Get user session - only works in App Router
 */
export async function getSession() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return null;

    const {
      data: { session }
    } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.error('Error in getSession:', error);
    return null;
  }
}
