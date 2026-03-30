// app/error.tsx
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-background'>
      <div className='text-center space-y-4 p-8 max-w-md'>
        <AlertCircle className='w-12 h-12 text-destructive mx-auto' />
        <h2 className='text-2xl font-bold tracking-tight'>
          Something went wrong!
        </h2>
        <p className='text-muted-foreground'>
          {error?.message || 'An unexpected error occurred'}
        </p>
        <div className='flex gap-4 justify-center mt-6'>
          <Button onClick={() => reset()} variant='default'>
            Try Again
          </Button>
          <Button onClick={() => window.location.reload()} variant='outline'>
            Refresh Page
          </Button>
        </div>
      </div>
    </div>
  );
}
