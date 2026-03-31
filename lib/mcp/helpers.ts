// lib/mcp/helpers.ts
// Shared response formatting for MCP tool handlers

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

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
 * Create a Supabase client from a bearer token for use in MCP tools.
 * This lets tools run queries as the authenticated user (respecting RLS).
 */
export function createMcpSupabaseClient(token: string) {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );
}
