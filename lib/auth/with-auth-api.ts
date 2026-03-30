import { createServerSupabaseClient } from '@/lib/supabase/server';
import { UserRole } from '@/lib/constants/roles';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { NextRequest } from 'next/server';

interface WithAuthApiOptions {
  requiredRole?: UserRole;
}

type ApiHandler = (
  req: NextRequest,
  context: { params: Record<string, string> },
  session: NonNullable<Awaited<ReturnType<typeof getAuthSession>>>['session']
) => Promise<Response>;

export function withAuthApi(
  handler: ApiHandler,
  options: WithAuthApiOptions = {}
) {
  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> | Record<string, string> }
  ) => {
    try {
      const supabase = await createServerSupabaseClient();
      const { session, error } = await getAuthSession();

      if (error || !session) {
        return ErrorHandler.createErrorResponse('Unauthorized', 401);
      }

      if (options.requiredRole) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (
          !profile ||
          !hasRequiredRole(profile.role as UserRole, options.requiredRole)
        ) {
          return ErrorHandler.createErrorResponse(
            'Insufficient permissions',
            403
          );
        }
      }

      // Await params if it's a Promise (Next.js 15)
      const resolvedParams = context.params instanceof Promise
        ? await context.params
        : context.params;

      return handler(req, { params: resolvedParams }, session);
    } catch (error) {
      console.error('API auth error:', error);
      return ErrorHandler.createErrorResponse('Internal server error', 500);
    }
  };
}

async function getAuthSession() {
  const supabase = await createServerSupabaseClient();

  // Use getUser() to verify authentication with Supabase Auth server
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
}

function hasRequiredRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleIndex = Object.values(UserRole).indexOf(userRole);
  const requiredIndex = Object.values(UserRole).indexOf(requiredRole);
  return roleIndex <= requiredIndex;
}
