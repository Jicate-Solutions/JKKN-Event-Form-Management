'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ContentLayout } from '@/components/layout/content-layout';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function UserDetailsError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('User details page error:', error);
  }, [error]);

  return (
    <ContentLayout title='User Details'>
      <div className='flex h-[450px] flex-col items-center justify-center gap-4'>
        <div className='flex items-center gap-2 text-destructive'>
          <AlertCircle className='h-5 w-5' />
          <span>Something went wrong while loading the user details</span>
        </div>
        <div className='flex gap-4'>
          <Button onClick={reset} variant='default'>
            Try again
          </Button>
          <Button variant='outline' asChild>
            <Link href='/'>Go back</Link>
          </Button>
        </div>
      </div>
    </ContentLayout>
  );
}
