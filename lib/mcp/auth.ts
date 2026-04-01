// lib/mcp/auth.ts
// MCP authentication helpers — verifies tokens and extracts user info
//
// Three auth modes (tried in order):
// 1. MCP_SECRET_KEY — permanent API key, never expires (for Claude Code / server-to-server)
// 2. Supabase Service Role Key — admin access, never expires
// 3. Supabase JWT — user-level access, expires in 1 hour (for OAuth / Claude.ai)

import { createClient } from '@supabase/supabase-js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { ROLE_HIERARCHY, UserRole } from '@/lib/constants/roles';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Special marker for API key auth — tools check this to use admin client
export const API_KEY_AUTH_MARKER = '__mcp_api_key__';
export const SERVICE_ROLE_AUTH_MARKER = '__mcp_service_role__';

/**
 * Verify a bearer token from an MCP request.
 *
 * Supports three auth modes:
 * 1. MCP_SECRET_KEY (env var) — permanent, for Claude Code
 * 2. SUPABASE_SERVICE_ROLE_KEY — permanent, admin access
 * 3. Supabase user JWT — expires in 1 hour
 */
export async function verifyToken(
  _req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  // Mode 1: Check against MCP_SECRET_KEY (permanent, never expires)
  const mcpSecretKey = process.env.MCP_SECRET_KEY;
  if (mcpSecretKey && bearerToken === mcpSecretKey) {
    // Use the configured default user, or fallback to the first super_admin
    const defaultUserId = process.env.MCP_DEFAULT_USER_ID || 'mcp-api-key-user';
    return {
      token: API_KEY_AUTH_MARKER,
      clientId: defaultUserId,
      scopes: ['super_admin'],
    };
  }

  // Mode 2: Check against Supabase Service Role Key (permanent, never expires)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey && bearerToken === serviceRoleKey) {
    const defaultUserId = process.env.MCP_DEFAULT_USER_ID || 'service-role-user';
    return {
      token: SERVICE_ROLE_AUTH_MARKER,
      clientId: defaultUserId,
      scopes: ['super_admin'],
    };
  }

  // Mode 3: Supabase user JWT (expires in 1 hour)
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${bearerToken}` } },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return undefined;

    // Fetch the user's role from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || 'public';

    return {
      token: bearerToken,
      clientId: user.id,
      scopes: [role],
    };
  } catch {
    return undefined;
  }
}

/**
 * Check if the auth is via permanent API key (not user JWT).
 */
export function isApiKeyAuth(token: string): boolean {
  return token === API_KEY_AUTH_MARKER || token === SERVICE_ROLE_AUTH_MARKER;
}

/**
 * Extract auth info from the MCP extra parameter.
 * Returns userId, role, and token. Throws if unauthenticated.
 *
 * For API key auth: userId is the MCP_DEFAULT_USER_ID (or a placeholder).
 * For JWT auth: userId is the actual Supabase user ID.
 */
export function extractAuth(extra: { authInfo?: AuthInfo }): {
  userId: string;
  role: string;
  token: string;
} {
  const authInfo = extra.authInfo;
  if (!authInfo?.clientId) {
    throw new Error('Authentication required. Please provide a valid token or API key.');
  }

  return {
    userId: authInfo.clientId,
    role: authInfo.scopes?.[0] || 'public',
    token: authInfo.token,
  };
}

/**
 * Check if a user's role meets the minimum required role.
 * Uses the existing ROLE_HIERARCHY from the app's constants.
 */
export function hasMinimumRole(userRole: string, requiredRole: string): boolean {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole as UserRole);
  const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole as UserRole);
  if (userIndex === -1 || requiredIndex === -1) return false;
  return userIndex <= requiredIndex;
}
