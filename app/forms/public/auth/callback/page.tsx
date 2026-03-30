'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { BeatLoader } from 'react-spinners';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = searchParams.get('formId');
  const formType = searchParams.get('type'); // 'personal' or null (organizational)

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClientSupabaseClient();
      try {
        // Try to get form info from query params, session storage, or local storage
        let finalFormId = formId;
        let finalFormType = formType;

        // Fallback to session storage if query params are missing
        if (!finalFormId) {
          finalFormId = sessionStorage.getItem('pending_form_id');
          finalFormType = sessionStorage.getItem('pending_form_type');
          console.log('Retrieved from session storage - formId:', finalFormId, 'type:', finalFormType);
        }

        // Fallback to local storage if both query params and session storage are missing
        if (!finalFormId) {
          finalFormId = localStorage.getItem('pending_form_id');
          finalFormType = localStorage.getItem('pending_form_type');
          const timestamp = localStorage.getItem('pending_form_timestamp');

          // Only use localStorage if it's recent (within last 10 minutes)
          if (timestamp && finalFormId) {
            const age = Date.now() - parseInt(timestamp);
            if (age > 10 * 60 * 1000) {
              console.log('localStorage form ID is too old, ignoring');
              finalFormId = null;
              finalFormType = null;
            } else {
              console.log('Retrieved from localStorage - formId:', finalFormId, 'type:', finalFormType);
            }
          }
        }

        console.log('Auth callback - Processing for form:', finalFormId, 'type:', finalFormType);

        const {
          data: { session },
          error
        } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth session error:', error);
          throw error;
        }

        if (!session) {
          console.error('No session found in callback');
          throw new Error('No session');
        }

        console.log('Auth callback - Session found, user:', session.user.email);

        // Clear both session storage and local storage after successful authentication
        sessionStorage.removeItem('pending_form_id');
        sessionStorage.removeItem('pending_form_type');
        localStorage.removeItem('pending_form_id');
        localStorage.removeItem('pending_form_type');
        localStorage.removeItem('pending_form_timestamp');

        // Add a small delay to ensure session is properly set
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Ensure we redirect to the specific form
        if (finalFormId) {
          const formUrl = finalFormType === 'personal'
            ? `/forms/public/personal/${finalFormId}`
            : `/forms/public/${finalFormId}`;
          console.log(`Redirecting to ${formUrl}`);
          // Use replace instead of push to avoid redirect loops
          window.location.href = formUrl;
        } else {
          // If no formId is provided, stay on this page and show error
          console.error('No formId provided in callback - cannot redirect to form');
          alert('Error: Form ID was lost during authentication. Please try accessing the form link again.');
          // Don't redirect to root - stay here to avoid redirect loop
          return;
        }
      } catch (error) {
        console.error('Auth callback error:', error);

        // Try to get form info from query params, session storage, or local storage for error handling
        const errorFormId = formId ||
                           sessionStorage.getItem('pending_form_id') ||
                           localStorage.getItem('pending_form_id');
        const errorFormType = formType ||
                             sessionStorage.getItem('pending_form_type') ||
                             localStorage.getItem('pending_form_type');

        console.log('Error handling - Retrieved formId:', errorFormId, 'type:', errorFormType);

        if (errorFormId) {
          const authUrl = errorFormType === 'personal'
            ? `/forms/public/auth?formId=${errorFormId}&type=personal`
            : `/forms/public/auth?formId=${errorFormId}`;
          console.log('Redirecting to auth page:', authUrl);
          window.location.href = authUrl;
        } else {
          console.error('No form ID available for redirect - showing error message');
          alert('Authentication failed. Please try accessing the form link again.');
        }
      }
    };

    handleCallback();
  }, [formId, formType, router]);

  return (
    <div className='min-h-screen flex items-center justify-center'>
      <BeatLoader size={8} color='#000000' />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen flex items-center justify-center'>
          <BeatLoader size={8} color='#000000' />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
