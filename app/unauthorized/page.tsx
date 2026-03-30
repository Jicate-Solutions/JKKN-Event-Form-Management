'use client';

import { useRouter } from 'next/navigation';
import { ShieldX } from 'lucide-react';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-gray-50'>
      <div className='max-w-md w-full p-8 bg-white rounded-lg shadow-lg text-center'>
        <div className='flex justify-center mb-4'>
          <ShieldX className='h-16 w-16 text-red-600' />
        </div>

        <h1 className='text-3xl font-bold text-gray-900'>Access Denied</h1>

        <div className='mt-2 text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-md mb-4'>
          <p className='font-medium'>Error 401: Unauthorized</p>
        </div>

        <p className='text-gray-600 mb-6'>
          You don&apos;t have permission to access this page. This section
          requires elevated privileges.
        </p>

        <div className='flex flex-col gap-3'>
          <button
            onClick={() => router.push('/')}
            className='w-full rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
          >
            Go to Home Page
          </button>

          <button
            onClick={() => router.back()}
            className='w-full rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2'
          >
            Go Back
          </button>
        </div>

        <p className='mt-6 text-sm text-gray-500'>
          If you believe this is a mistake, please contact your system
          administrator.
        </p>
      </div>
    </div>
  );
}
