import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * Creates a server-compatible Supabase admin client with service role permissions
 * Works in both pages directory and app directory
 */
export function createAdminClient() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error('Missing Supabase admin credentials');
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
}

/**
 * Execute an operation with the admin client, with fallback to regular client
 * @param operation Function that receives the admin client and performs operations
 * @param fallbackClient Optional client to use if admin client creation fails
 * @returns Result of the operation
 */
export async function withAdminClient<T>(
  operation: (client: ReturnType<typeof createClient<Database>>) => Promise<T>,
  fallbackClient?: ReturnType<typeof createClient<Database>>
): Promise<T> {
  try {
    const adminClient = createAdminClient();
    return await operation(adminClient);
  } catch (error) {
    if (fallbackClient) {
      console.warn(
        'Using fallback client instead of admin client. Some operations may fail due to RLS policies.'
      );
      return await operation(fallbackClient);
    }
    throw error;
  }
}

/**
 * Update event status through an admin client that has service role permissions
 * Works in both client and server contexts
 */
export async function updateEventStatus(
  eventId: string,
  status: 'upcoming' | 'ongoing' | 'completed',
  fallbackClient?: ReturnType<typeof createClient<Database>>
) {
  return withAdminClient(async (client) => {
    const { data, error } = await client
      .from('events')
      .update({ status })
      .eq('id', eventId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }, fallbackClient);
}

/**
 * Bulk update event statuses
 * Works in both client and server contexts
 */
export async function bulkUpdateEventStatuses(
  eventIds: string[],
  status: 'upcoming' | 'ongoing' | 'completed',
  fallbackClient?: ReturnType<typeof createClient<Database>>
) {
  if (!eventIds.length) return [];

  return withAdminClient(async (client) => {
    const { data, error } = await client
      .from('events')
      .update({ status })
      .in('id', eventIds)
      .select('*');

    if (error) throw error;
    return data || [];
  }, fallbackClient);
}
