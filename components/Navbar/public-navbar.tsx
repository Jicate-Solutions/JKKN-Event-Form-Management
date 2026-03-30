'use client';

import Link from 'next/link';
import { Button } from '../ui/button';
import { ModeToggle } from '@/components/theme/mode-toggle';
import { Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle
} from '@/components/ui/sheet';
import { useState } from 'react';

export function PublicNavbar() {
  const [open, setOpen] = useState(false);

  const navLinks = [
    { href: '/home', label: 'Home' },
    { href: '/about', label: 'About Us' },
    { href: '/contact', label: 'Contact Us' },
    { href: '/pricing', label: 'Pricing' }
  ];

  return (
    <header className='sticky px-6 top-0 z-10 w-full bg-background/95 shadow backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:shadow-secondary'>
      <div className='container mx-auto flex h-16 items-center justify-between'>
        <div className='flex items-center space-x-4'>
          <Link href='/home' className='font-bold text-xl'>
            JKKN Event Forms
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className='hidden md:flex items-center space-x-6'>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className='text-sm font-medium transition-colors hover:text-primary'
            >
              {link.label}
            </Link>
          ))}
          <ModeToggle />
          <Button asChild>
            <Link href='/auth/login'>Login</Link>
          </Button>
        </nav>

        {/* Mobile Navigation */}
        <div className='flex md:hidden items-center space-x-2'>
          <ModeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant='ghost' size='icon'>
                <Menu className='h-5 w-5' />
                <span className='sr-only'>Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side='right'>
              <SheetTitle>Navigation Menu</SheetTitle>
              <nav className='flex flex-col space-y-4 mt-8'>
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className='text-sm font-medium transition-colors hover:text-primary'
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <Button asChild className='mt-2'>
                  <Link href='/auth/login' onClick={() => setOpen(false)}>
                    Login
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
