import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { CreateUserRequest } from '@/types/users';
import type { CookieOptions } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

// Create admin client for user management
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: Request) {
  try {
    const response = NextResponse.next();

    // Create authenticated client with cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const cookies = new Map(
              request.headers
                .get('cookie')
                ?.split(';')
                .map((c) => {
                  const [key, ...rest] = c.trim().split('=');
                  return [key, rest.join('=')];
                })
            );
            return cookies.get(name) ?? '';
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value,
              ...options
            });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value: '',
              ...options,
              maxAge: 0
            });
          }
        }
      }
    );

    const json = await request.json();
    const { email, full_name, role, phone_number, password } =
      json as CreateUserRequest;

    // Validate required fields
    if (!email || !full_name || !role || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // First check if email exists in auth
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = authUsers.users.find((user) => user.email === email);

    // If auth user exists, check and clean up both auth and profile
    if (authUser) {
      // Delete profile if exists
      const { error: profileDeleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('email', email);

      if (profileDeleteError) {
        console.error('Profile deletion error:', profileDeleteError);
      }

      // Delete auth user
      const { error: authDeleteError } =
        await supabaseAdmin.auth.admin.deleteUser(authUser.id);

      if (authDeleteError) {
        console.error('Auth user deletion error:', authDeleteError);
      }
    }

    // Then check if email exists in profiles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (profile) {
      return NextResponse.json(
        {
          error: 'Email is already registered',
          details: 'A user with this email already exists in the system'
        },
        { status: 409 }
      );
    }

    // First check if the current user is authenticated (use getUser for security)
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentUser, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['super_admin', 'administrator'].includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Validate role
    const validRoles = [
      'super_admin',
      'administrator',
      'institution_coordinator',
      'event_coordinator',
      'staff',
      'student',
      'public'
    ];

    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      );
    }

    // Only super_admin can create other super_admins
    if (role === 'super_admin' && currentUser?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admins can create other super admins' },
        { status: 403 }
      );
    }

    // Create auth user with admin client
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          role,
          phone_number
        }
      });

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: authError.status || 500 }
      );
    }

    // Create profile with admin client
    const profileData = {
      id: authData.user.id,
      email,
      full_name,
      role,
      phone_number,
      is_active: true,
      profile_complete: false,
      updated_at: new Date().toISOString()
    };

    console.log('Attempting to create profile with data:', profileData);

    try {
      // Replace the double-check and insert with an upsert.
      // This will update the profile if one already exists (e.g. from the trigger)
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .upsert(profileData, { onConflict: 'email' }) // perform an upsert on email
        .select()
        .single();

      if (error) {
        // If upsert fails, delete the auth user and return error
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        console.error('Profile upsert error:', error);
        return NextResponse.json(
          {
            error: 'Failed to create user profile',
            details: error.message,
            code: error.code
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data,
        message: 'User created successfully'
      });
    } catch (error) {
      // Clean up auth user if profile upsert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      console.error('Error in profile upsert:', error);
      return NextResponse.json(
        {
          error: 'Failed to create user profile',
          details: error instanceof Error ? error.message : 'Unknown error',
          code: error instanceof Error ? error.cause : 'UNKNOWN'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in POST /api/users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
