// lib/mcp/auth.ts
// MCP authentication helpers — verifies tokens and extracts user info

import { createClient } from '@supabase/supabase-js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { ROLE_HIERARCHY, UserRole } from '@/lib/constants/roles';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Verify a bearer token from an MCP request.
 * Supports Supabase JWT tokens (from Google OAuth sessions).
 * Returns AuthInfo with userId as clientId and role in scopes.
 */
export async function verifyToken(
  _req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

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
 * Extract auth info from the MCP extra parameter.
 * Returns userId, role, and token. Throws if unauthenticated.
 */
export function extractAuth(extra: { authInfo?: AuthInfo }): {
  userId: string;
  role: string;
  token: string;
} {
  const authInfo = extra.authInfo;
  if (!authInfo?.clientId) {
    throw new Error('Authentication required. Please provide a valid Supabase access token.');
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
