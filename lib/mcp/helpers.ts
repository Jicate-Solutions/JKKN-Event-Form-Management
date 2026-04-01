// lib/mcp/helpers.ts
// Shared response formatting for MCP tool handlers

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { API_KEY_AUTH_MARKER, SERVICE_ROLE_AUTH_MARKER } from '@/lib/mcp/auth';

/**
 * Format a successful MCP tool response.
 */
export function toolSuccess(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Format an MCP tool error response.
 */
export function toolError(message: string, error?: unknown) {
  const details =
    error instanceof Error ? error.message : error ? String(error) : '';
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ error: message, details }, null, 2),
      },
    ],
    isError: true,
  };
}

/**
 * Create a Supabase client for use in MCP tools.
 *
 * - If token is API_KEY_AUTH_MARKER or SERVICE_ROLE_AUTH_MARKER:
 *   Uses service role key (admin access, bypasses RLS, never expires)
 * - Otherwise: Uses the user's JWT (respects RLS, expires in 1 hour)
 */
export function createMcpSupabaseClient(token: string) {
  // API key or service role auth → use admin client (permanent, no expiry)
  if (token === API_KEY_AUTH_MARKER || token === SERVICE_ROLE_AUTH_MARKER) {
    return createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  // User JWT auth → respect RLS (may expire)
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );
}
