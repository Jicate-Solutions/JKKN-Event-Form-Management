'use client';

/**
 * The bug report button, in the bottom-right corner of every signed-in page.
 *
 * Follows the MyJKKN-Library setup (same SDK, same version, same variable
 * names), with one difference: when either variable is missing the SDK is not
 * mounted at all, so the page renders exactly as it did before and nothing is
 * sent anywhere.
 *
 * Read as `process.env.NEXT_PUBLIC_...` written out in full on purpose: Next.js
 * replaces those exact names with their values at build time, so they must not
 * be looked up through a variable.
 */

import { BugReporterProvider } from '@boobalan_jkkn/bug-reporter-sdk';
import { useAuth } from '@/providers/auth-provider';

const API_KEY = process.env.NEXT_PUBLIC_BUG_REPORTER_API_KEY;
const API_URL = process.env.NEXT_PUBLIC_BUG_REPORTER_API_URL;

export function BugReporterWrapper({
  children
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  // Not configured yet: render the app untouched, no button.
  if (!API_KEY || !API_URL) {
    return <>{children}</>;
  }

  return (
    <BugReporterProvider
      apiKey={API_KEY}
      apiUrl={API_URL}
      // Only signed-in users get the button.
      enabled={!!user}
      debug={process.env.NODE_ENV === 'development'}
      // So a report arrives with a name on it rather than "someone".
      userContext={
        user
          ? {
              userId: user.id,
              name: user.full_name ?? user.email?.split('@')[0],
              email: user.email
            }
          : undefined
      }
    >
      {children}
    </BugReporterProvider>
  );
}
