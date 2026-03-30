'use client';

import { Suspense } from 'react';
import { BeatLoader } from 'react-spinners';
import CallbackHandler from './callback-handler';

export default function AuthCallbackPage() {
  return (
    <div className='min-h-screen flex items-center justify-center'>
      <div className='text-center'>
        <BeatLoader color='#000000' />
        <p className='mt-4 text-black'>Completing sign in</p>

        <Suspense fallback={null}>
          <CallbackHandler />
        </Suspense>
      </div>
    </div>
  );
}
