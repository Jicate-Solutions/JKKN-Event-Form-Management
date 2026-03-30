import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { UserRole, isUserRole } from '@/lib/constants/roles';
import { AuthService } from '@/lib/auth/auth-service';

// Define protected routes and their required roles
const PROTECTED_ROUTES: Record<string, UserRole[]> = {
  '/': [
    UserRole.SUPER_ADMIN,
    UserRole.ADMINISTRATOR,
    UserRole.INSTITUTION_COORDINATOR,
    UserRole.EVENT_COORDINATOR
  ],
  '/users': [
    UserRole.SUPER_ADMIN,
    UserRole.ADMINISTRATOR,
    UserRole.INSTITUTION_COORDINATOR
  ]
};

// Define public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/callback',
  '/contact',
  '/refund',
  '/privacy',
  '/terms',
  '/pricing',
  '/about',
  '/home',
  '/auth/not-authorized',
  '/unauthorized'
];
// Add these paths to your public routes
const publicPaths = [
  '/forms/public/auth',
  '/forms/public/(.*)',
  '/auth/callback',
  '/auth/not-authorized'
];

export async function proxy(request: NextRequest) {
  try {
    const res = NextResponse.next();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            res.cookies.set({
              name,
              value,
              ...options
            });
          },
          remove(name: string, options: CookieOptions) {
            res.cookies.set({
              name,
              value: '',
              ...options
            });
          }
        }
      }
    );

    // Use getUser() instead of getSession() for security
    // getUser() verifies the token with Supabase Auth server
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    // Get session only if user is authenticated
    const session = user ? (await supabase.auth.getSession()).data.session : null;

    // Get the pathname
    const pathname = request.nextUrl.pathname;

    // Check if it's a public form route (institutional or personal)
    const isPublicFormPath = pathname.startsWith('/forms/public/');
    const isAuthPath = pathname === '/forms/public/auth';
    const isCallbackPath = pathname === '/forms/public/auth/callback';

    // Allow access to public form paths without role check
    if (isPublicFormPath) {
      // Personal forms public submissions don't require authentication
      if (pathname.startsWith('/forms/public/personal/')) {
        return res;
      }

      // Institutional forms require authentication
      if (!user && !isAuthPath && !isCallbackPath) {
        // Extract the form identifier from the URL (could be UUID or slug)
        const formIdentifier = pathname.split('/')[3];

        // For paths that require authentication but aren't the auth page itself
        if (formIdentifier && formIdentifier !== 'auth') {
          console.log(
            `Middleware: No session, redirecting to auth for form ${formIdentifier}`
          );
          return NextResponse.redirect(
            new URL(`/forms/public/auth?formId=${formIdentifier}`, request.url)
          );
        }
      }
      // If authenticated or accessing auth pages, allow access
      return res;
    }

    // Handle personal workspace routes - require authentication but no specific role
    if (pathname.startsWith('/personal')) {
      if (!user) {
        const redirectUrl = new URL('/auth/login', request.url);
        redirectUrl.searchParams.set('redirectTo', pathname);
        return NextResponse.redirect(redirectUrl);
      }
      // All authenticated users can access personal workspace
      return res;
    }

    // Handle public routes
    if (PUBLIC_ROUTES.includes(pathname)) {
      // For unauthorized page, always allow access without redirect
      if (pathname === '/unauthorized') {
        return res;
      }

      if (user) {
        // If logged in, redirect to dashboard
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        return NextResponse.redirect(
          new URL(getDefaultRedirect(profile?.role as UserRole), request.url)
        );
      }
      return res;
    }

    // Handle admin routes - explicitly check for admin access
    if (pathname.startsWith('/admin')) {
      if (!user) {
        const redirectUrl = new URL('/auth/login', request.url);
        redirectUrl.searchParams.set('redirectTo', pathname);
        return NextResponse.redirect(redirectUrl);
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin =
        profile?.role === UserRole.SUPER_ADMIN ||
        profile?.role === UserRole.ADMINISTRATOR;

      if (!isAdmin) {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }

    // Add this section to handle admin routes
    if (pathname.startsWith('/organizations/') || pathname === '/') {
      if (!user) {
        const redirectUrl = new URL('/auth/login', request.url);
        redirectUrl.searchParams.set('redirectTo', pathname);
        return NextResponse.redirect(redirectUrl);
      }

      // Only check roles for admin routes
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile?.role) {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }

    // Check role-based access for protected routes
    const route = Object.entries(PROTECTED_ROUTES).find(([path]) =>
      pathname.startsWith(path)
    );

    if (route) {
      const [path, allowedRoles] = route;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      if (
        !profile ||
        !isUserRole(profile.role) ||
        !allowedRoles.includes(profile.role)
      ) {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }

    // Special handling for institution routes
    if (pathname.startsWith('/institution/')) {
      const institutionId = pathname.split('/')[2];
      if (user?.id) {
        const canAccess = await AuthService.canAccessInstitution(
          user.id,
          institutionId
        );

        if (!canAccess) {
          return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
      } else {
        return NextResponse.redirect(new URL('/auth/login', request.url));
      }
    }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.error();
  }
}

function getDefaultRedirect(role?: UserRole): string {
  switch (role) {
    case UserRole.SUPER_ADMIN:
    case UserRole.ADMINISTRATOR:
      return '/';
    default:
      return '/';
  }
}

// Update the config to exclude public form routes
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    '/forms/public/:path*'
  ]
};
