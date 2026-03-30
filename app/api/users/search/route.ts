// app/api/users/search/route.ts
// API endpoint for searching users (for collaborator search)

import { NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/auth/with-auth-api';
import { UserRole, isUserRole } from '@/lib/constants/roles';

/**
 * GET /api/users/search?q=query&role=role
 * Search for users by name or email with optional role filtering
 * Used for adding collaborators to personal forms
 */
export const GET = withAuthApi(async (req, _context, session) => {
  try {
    const user = session!.user;
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const roleFilter = searchParams.get('role');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Get server Supabase client for proper authentication
    const { createServerSupabaseClient } = await import('@/lib/supabase/server');
    const supabase = await createServerSupabaseClient();

    // Build query with search and optional role filter
    let dbQuery = supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, role')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);

    // Add role filter if provided and valid
    if (roleFilter && isUserRole(roleFilter)) {
      dbQuery = dbQuery.eq('role', roleFilter as UserRole);
    }

    const { data, error } = await dbQuery
      .limit(20)
      .order('full_name', { ascending: true, nullsFirst: false });

    if (error) throw error;

    // Filter out the current user from results
    const users = (data || []).filter((u) => u.id !== user.id);

    return NextResponse.json({ users }, { status: 200 });
  } catch (error: any) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search users' },
      { status: 500 }
    );
  }
});
