import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className='bg-background border-t px-6'>
      <div className='container mx-auto py-12'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-8'>
          <div>
            <h3 className='text-lg font-semibold mb-4'>JKKN Event Forms</h3>
            <p className='text-sm text-muted-foreground'>
              Streamline your event management with our comprehensive form
              management system.
            </p>
          </div>

          <div>
            <h3 className='text-lg font-semibold mb-4'>Quick Links</h3>
            <ul className='space-y-2'>
              <li>
                <Link
                  href='/home'
                  className='text-sm text-muted-foreground hover:text-primary transition-colors'
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href='/about'
                  className='text-sm text-muted-foreground hover:text-primary transition-colors'
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href='/contact'
                  className='text-sm text-muted-foreground hover:text-primary transition-colors'
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href='/pricing'
                  className='text-sm text-muted-foreground hover:text-primary transition-colors'
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className='text-lg font-semibold mb-4'>Legal</h3>
            <ul className='space-y-2'>
              <li>
                <Link
                  href='/terms'
                  className='text-sm text-muted-foreground hover:text-primary transition-colors'
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  href='/privacy'
                  className='text-sm text-muted-foreground hover:text-primary transition-colors'
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href='/refund'
                  className='text-sm text-muted-foreground hover:text-primary transition-colors'
                >
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className='text-lg font-semibold mb-4'>Contact</h3>
            <address className='not-italic text-sm text-muted-foreground space-y-2'>
              <p>Email: admin@jicate.solutions</p>
              <p>Phone: +91 8760083627</p>
              <p>
                Address: JKKN Campus, Komarapalayam, Namakkal, Tamil Nadu, India
              </p>
            </address>
          </div>
        </div>

        <div className='border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center'>
          <p className='text-xs text-muted-foreground'>
            &copy; {new Date().getFullYear()} JKKN Event Forms. All rights
            reserved.
          </p>
          <div className='mt-4 md:mt-0'>
            <p className='text-xs text-muted-foreground'>
              Developed by Boobalan
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
