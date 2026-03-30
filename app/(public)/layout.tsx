import { PublicNavbar } from '@/components/Navbar/public-navbar';
import { PublicFooter } from '@/components/Footer/public-footer';
import { ThemeProvider } from '@/providers/theme-provider';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'JKKN Event Forms Management',
  description:
    'Streamline your event management with our comprehensive form management system.'
};

export default function PublicLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='flex min-h-screen flex-col'>
      <ThemeProvider
        attribute='class'
        defaultTheme='system'
        enableSystem
        disableTransitionOnChange
        storageKey='theme-preference'
      >
        <PublicNavbar />
        <main className='flex-1'>{children}</main>
        <PublicFooter />
        <Toaster
          position='top-right'
          toastOptions={{
            className: 'z-50 bg-white dark:bg-black',
            style: {
              background: 'white',
              color: 'var(--foreground)',
              border: '1px solid var(--border)'
            }
          }}
        />
      </ThemeProvider>
    </div>
  );
}
