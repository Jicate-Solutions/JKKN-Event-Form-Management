'use client';

import { SheetMenu } from './sheet-menu';
import { Button } from '../ui/button';
import { UserNav } from './user-nav';
import { useAuth } from '@/providers/auth-provider';
import { ModeToggle } from '@/components/theme/mode-toggle';

interface NavbarProps {
  title: string;
}

export function Navbar({ title }: NavbarProps) {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className='sticky top-0 z-10 w-full bg-background/95 shadow backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:shadow-secondary'>
      <div className='mx-4 sm:mx-8 flex h-14 items-center justify-between'>
        <div className='flex items-center space-x-4 lg:space-x-0'>
          <SheetMenu />
          <h1 className='font-bold'>{title}</h1>
        </div>
        <div className='flex items-center justify-between space-x-4'>
          {/* Desktop view */}
          <div className='hidden md:flex items-center space-x-2'>
            <ModeToggle />
            <UserNav />
          </div>

          {/* Mobile view */}
          <div className='flex md:hidden items-center space-x-2'>
            <ModeToggle />
            <UserNav />
            <Button
              variant='destructive'
              size='sm'
              onClick={handleSignOut}
              className='text-sm'
            >
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
