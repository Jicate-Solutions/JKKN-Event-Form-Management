'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { BeatLoader } from 'react-spinners';
import { FcGoogle } from 'react-icons/fc';
import Image from 'next/image';

function AuthFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = searchParams.get('formId');
  const formType = searchParams.get('type'); // 'personal' or null (organizational)
  const [loading, setLoading] = useState(false);

  // Determine redirect URL based on form type
  const getFormUrl = () => {
    if (formType === 'personal') {
      return `/forms/public/personal/${formId}`;
    }
    return `/forms/public/${formId}`;
  };

  // Check if user is already authenticated on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClientSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();

        console.log(
          'Auth page - Session check:',
          sessionData.session ? 'exists' : 'none'
        );

        if (sessionData.session) {
          // User is already logged in, redirect to the form
          const formUrl = getFormUrl();
          console.log(`User already logged in, redirecting to ${formUrl}`);
          window.location.href = formUrl;
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }
    };

    checkAuth();
  }, [formId, formType]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const supabase = createClientSupabaseClient();

      // Check if user is already authenticated
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData.session) {
        // User is already logged in, redirect to the form
        const formUrl = getFormUrl();
        console.log(`User already logged in, redirecting to ${formUrl}`);
        window.location.href = formUrl;
        return;
      }

      console.log(
        'Initiating Google login for form:',
        formId,
        'type:',
        formType
      );

      // Store form info in BOTH session storage AND local storage for redundancy
      if (formId) {
        sessionStorage.setItem('pending_form_id', formId);
        localStorage.setItem('pending_form_id', formId);
        localStorage.setItem('pending_form_timestamp', Date.now().toString());

        if (formType) {
          sessionStorage.setItem('pending_form_type', formType);
          localStorage.setItem('pending_form_type', formType);
        }

        console.log('Stored form info for OAuth:', { formId, formType });
      }

      // Build callback URL with type parameter if it's a personal form
      const callbackUrl =
        formType === 'personal'
          ? `${window.location.origin}/forms/public/auth/callback?formId=${formId}&type=personal`
          : `${window.location.origin}/forms/public/auth/callback?formId=${formId}`;

      console.log('OAuth callback URL:', callbackUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) throw error;
      if (data) {
        console.log('OAuth sign-in initiated, redirecting...');
        // The OAuth flow will handle the redirect
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error('Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-white to-gray-50 p-4 sm:p-6'>
      <div className='w-full flex flex-col items-center justify-center max-w-md space-y-8'>
        {/* Brand Name */}
        <div className='text-center space-y-2'>
          <h1 className='text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
            JKKN AI Forms
          </h1>
          <p className='text-sm text-gray-500'>
            Intelligent Form Management System
          </p>
        </div>

        {/* Auth Card */}
        <div className='bg-white rounded-xl shadow-lg p-6 sm:p-8 space-y-6'>
          <div className='text-center space-y-2'>
            <h2 className='text-2xl sm:text-3xl font-bold text-gray-900'>
              Welcome
            </h2>
            <p className='text-sm sm:text-base text-gray-600'>
              Please sign in to access the form
            </p>
          </div>

          <Button
            type='button'
            onClick={handleGoogleLogin}
            disabled={loading}
            className='w-full h-12 flex items-center justify-center gap-3 bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 transition-colors'
          >
            {loading ? (
              <BeatLoader size={8} color='#000000' />
            ) : (
              <>
                <FcGoogle className='w-5 h-5' />
                <span>Continue with Google</span>
              </>
            )}
          </Button>

          <div className='text-center text-sm text-gray-500'>
            <p>
              By continuing, you agree to our{' '}
              <a href='#' className='text-primary hover:underline'>
                Terms of Service
              </a>{' '}
              and{' '}
              <a href='#' className='text-primary hover:underline'>
                Privacy Policy
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className='text-center text-sm text-gray-600'>
          <p>
            Need help?{' '}
            <a href='#' className='text-primary hover:underline'>
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthFormPage() {
  return (
    <Suspense
      fallback={
        <div className='flex min-h-screen items-center justify-center'>
          <BeatLoader size={8} color='#000000' />
        </div>
      }
    >
      <AuthFormContent />
    </Suspense>
  );
}
