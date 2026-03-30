// app/(routes)/layout.tsx
'use client';

import AdminPanelLayout from '@/components/layout/admin-panel-layout';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { BeatLoader } from 'react-spinners';
import ErrorBoundary from '@/components/error/ErrorBoundary';
function LayoutContent({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <BeatLoader color='#000000' />
      </div>
    );
  }

  return <>{children}</>;
}
export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <AdminPanelLayout>
        <AuthProvider>
          <LayoutContent>{children}</LayoutContent>
        </AuthProvider>
      </AdminPanelLayout>
    </ErrorBoundary>
  );
}
