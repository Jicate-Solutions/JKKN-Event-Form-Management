'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionContext } from '@/providers/session-provider';
import { UserRole } from '@/lib/constants/roles';
import { BeatLoader } from 'react-spinners';
import { ContentLayout } from '@/components/layout/content-layout';

interface WithAuthOptions {
  requiredRole?: UserRole;
  redirectTo?: string;
}

export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithAuthOptions = {}
) {
  return function WithAuthComponent(props: P) {
    const router = useRouter();
    const { session, profile, isLoading, hasRole } = useSessionContext();
    const { requiredRole, redirectTo = '/auth/login' } = options;

    useEffect(() => {
      async function checkAuth() {
        if (!isLoading && !session) {
          router.push(redirectTo);
          return;
        }

        if (requiredRole && !isLoading && profile) {
          const hasRequiredRole = await hasRole(requiredRole);
          if (!hasRequiredRole) {
            router.push('/unauthorized');
          }
        }
      }

      checkAuth();
    }, [
      session,
      profile,
      isLoading,
      router,
      redirectTo,
      requiredRole,
      hasRole
    ]);

    if (isLoading) {
      return (
        <ContentLayout title='Loading...'>
          <div className='flex items-center justify-center min-h-[400px]'>
            <BeatLoader color='#00e902' />
          </div>
        </ContentLayout>
      );
    }

    if (!session || (requiredRole && !profile)) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}
