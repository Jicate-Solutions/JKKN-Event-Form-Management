'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { BeatLoader } from 'react-spinners';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { FcGoogle } from 'react-icons/fc';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientSupabaseClient();
  const [isLoading, setIsLoading] = useState(false);

  const getRedirectPath = async () => {
    try {
      const redirectTo = searchParams?.get('redirectTo');
      if (redirectTo) return redirectTo;

      // Get user's role to determine landing page
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role) {
          const { getDefaultRedirect } = await import('@/lib/constants/roles');
          return getDefaultRedirect(profile.role as any);
        }
      }

      return '/dashboard';
    } catch (error) {
      console.error('Error getting redirect path:', error);
      return '/dashboard';
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
          error
        } = await supabase.auth.getSession();

        if (error) {
          console.error('Session check error:', error);
          return;
        }

        if (session) {
          const redirectPath = await getRedirectPath();
          router.push(redirectPath);
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }
    };

    checkAuth();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const redirectPath = await getRedirectPath();
        router.push(redirectPath);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase.auth, searchParams]);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Google login error:', error);
      toast.error('Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6'>
      <div className='w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row'>
        {/* Left Panel - Login Form */}
        <div className='w-full lg:w-1/2 p-6 sm:p-8 md:p-10 lg:p-12 flex flex-col justify-center'>
          <div className='max-w-md mx-auto w-full space-y-8'>
            {/* Brand Section */}
            <div className='text-center space-y-3'>
              <div className='inline-block'>
                <h1 className='text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
                  JKKN AI Forms
                </h1>
              </div>
              <p className='text-sm text-gray-500 font-medium'>
                Intelligent Event & Form Management Platform
              </p>
            </div>

            {/* Welcome Section */}
            <div className='text-center space-y-2 pt-4'>
              <h2 className='text-2xl sm:text-3xl font-bold text-gray-900'>
                Welcome Back
              </h2>
              <p className='text-sm sm:text-base text-gray-600'>
                Sign in to access your dashboard
              </p>
            </div>

            {/* Login Button */}
            <div className='space-y-4'>
              <Button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className='w-full h-12 flex items-center justify-center gap-3 bg-white text-gray-800 border-2 border-gray-200 hover:border-blue-400 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md'
              >
                {isLoading ? (
                  <BeatLoader size={8} color='#3b82f6' />
                ) : (
                  <>
                    <FcGoogle className='w-6 h-6' />
                    <span className='font-medium'>Continue with Google</span>
                  </>
                )}
              </Button>

              {/* Security Badge */}
              <div className='flex items-center justify-center gap-2 text-xs text-gray-500'>
                <svg
                  className='w-4 h-4'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>Secured with OAuth 2.0 Authentication</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Features */}
        <div className='w-full lg:w-1/2 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700 p-6 sm:p-8 md:p-10 lg:p-12 flex flex-col justify-center text-white'>
          <div className='max-w-md mx-auto space-y-8'>
            {/* Main Heading */}
            <div className='space-y-3'>
              <h3 className='text-3xl xl:text-4xl font-bold leading-tight'>
                Powerful Form Management
              </h3>
              <p className='text-blue-100 text-base xl:text-lg leading-relaxed'>
                Streamline your event registrations and data collection with
                AI-powered automation
              </p>
            </div>

            {/* Features List */}
            <div className='space-y-4'>
              <div className='flex items-start gap-3'>
                <div className='flex-shrink-0 w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center'>
                  <svg
                    className='w-5 h-5'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                </div>
                <div>
                  <h4 className='font-semibold mb-1'>Smart Form Builder</h4>
                  <p className='text-sm text-blue-100'>
                    Create dynamic forms with conditional logic and validations
                  </p>
                </div>
              </div>

              <div className='flex items-start gap-3'>
                <div className='flex-shrink-0 w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center'>
                  <svg
                    className='w-5 h-5'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path d='M9 2a1 1 0 000 2h2a1 1 0 100-2H9z' />
                    <path
                      fillRule='evenodd'
                      d='M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z'
                      clipRule='evenodd'
                    />
                  </svg>
                </div>
                <div>
                  <h4 className='font-semibold mb-1'>Real-time Analytics</h4>
                  <p className='text-sm text-blue-100'>
                    Track submissions and generate insights instantly
                  </p>
                </div>
              </div>

              <div className='flex items-start gap-3'>
                <div className='flex-shrink-0 w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center'>
                  <svg
                    className='w-5 h-5'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z'
                      clipRule='evenodd'
                    />
                  </svg>
                </div>
                <div>
                  <h4 className='font-semibold mb-1'>Enterprise Security</h4>
                  <p className='text-sm text-blue-100'>
                    Role-based access control and data encryption
                  </p>
                </div>
              </div>

              <div className='flex items-start gap-3'>
                <div className='flex-shrink-0 w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center'>
                  <svg
                    className='w-5 h-5'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path d='M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z' />
                  </svg>
                </div>
                <div>
                  <h4 className='font-semibold mb-1'>Team Collaboration</h4>
                  <p className='text-sm text-blue-100'>
                    Manage events and forms with your team seamlessly
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className='grid grid-cols-3 gap-4 pt-6 border-t border-white/20'>
              <div className='text-center'>
                <div className='text-2xl font-bold'>3K+</div>
                <div className='text-xs text-blue-100'>Users</div>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold'>15K+</div>
                <div className='text-xs text-blue-100'>Forms</div>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold'>50K+</div>
                <div className='text-xs text-blue-100'>Responses</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className='flex items-center justify-center min-h-screen'>
          <BeatLoader size={8} color='#000000' />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
