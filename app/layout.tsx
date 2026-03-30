// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import ErrorBoundary from '@/components/error/ErrorBoundary';
import { ThemeProvider } from '@/providers/theme-provider';
import Providers from '@/lib/query/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'JKKN Event Forms Management',
  description: 'JKKN Event Forms Management System'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <ThemeProvider
            attribute='class'
            defaultTheme='system'
            enableSystem
            disableTransitionOnChange
            storageKey='theme-preference'
          >
            <ErrorBoundary>
              {children}
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
            </ErrorBoundary>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
