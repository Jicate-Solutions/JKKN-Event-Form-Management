import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle,
  FileText,
  Calendar,
  CreditCard,
  Users
} from 'lucide-react';
import Image from 'next/image';

export const metadata = {
  title: 'Home - JKKN Event Forms',
  description:
    'Create, manage, and collect payments for your event forms with our comprehensive platform.'
};

export default function HomePage() {
  const features = [
    {
      icon: <FileText className='h-10 w-10 text-primary' />,
      title: 'Custom Form Creation',
      description:
        'Create customized forms for your events with various field types and validation options.'
    },
    {
      icon: <Calendar className='h-10 w-10 text-primary' />,
      title: 'Event Management',
      description:
        'Organize and manage multiple events with dedicated forms and participant tracking.'
    },
    {
      icon: <CreditCard className='h-10 w-10 text-primary' />,
      title: 'Secure Payments',
      description:
        'Collect payments securely through Razorpay integration with detailed transaction records.'
    },
    {
      icon: <Users className='h-10 w-10 text-primary' />,
      title: 'User Management',
      description:
        'Manage different user roles and permissions for your organization.'
    }
  ];

  const benefits = [
    'Streamlined event registration process',
    'Secure payment collection',
    'Detailed analytics and reporting',
    'Customizable form templates',
    'Mobile-responsive design',
    'Multi-user collaboration'
  ];

  return (
    <div className='w-full px-4'>
      {/* Hero Section */}
      <section className='relative py-20 md:py-32 bg-gradient-to-b from-primary/10 to-background'>
        <div className='container mx-auto px-4 text-center'>
          <h1 className='text-4xl md:text-6xl font-bold tracking-tight mb-6'>
            Streamline Your Event Form Management
          </h1>
          <p className='text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10'>
            Create, manage, and collect payments for your event forms with our
            comprehensive platform.
          </p>
          <div className='flex flex-col sm:flex-row justify-center gap-4'>
            <Button asChild size='lg' className='text-lg'>
              <Link href='/auth/login'>Get Started</Link>
            </Button>
            <Button asChild size='lg' variant='outline' className='text-lg'>
              <Link href='/pricing'>View Pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className='py-20 bg-muted/30'>
        <div className='container mx-auto px-4'>
          <h2 className='text-3xl md:text-4xl font-bold text-center mb-16'>
            Powerful Features for Event Organizers
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'>
            {features.map((feature, index) => (
              <div
                key={index}
                className='bg-background rounded-lg p-6 shadow-sm border'
              >
                <div className='mb-4'>{feature.icon}</div>
                <h3 className='text-xl font-semibold mb-2'>{feature.title}</h3>
                <p className='text-muted-foreground'>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className='py-20'>
        <div className='container mx-auto px-4'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'>
            <div>
              <h2 className='text-3xl md:text-4xl font-bold mb-6'>
                Why Choose JKKN Event Forms?
              </h2>
              <p className='text-lg text-muted-foreground mb-8'>
                Our platform is designed to make event form management simple,
                secure, and efficient for organizations of all sizes.
              </p>
              <ul className='space-y-4'>
                {benefits.map((benefit, index) => (
                  <li key={index} className='flex items-start'>
                    <CheckCircle className='h-6 w-6 text-primary mr-2 flex-shrink-0' />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className='mt-8'>
                <Link href='/about'>
                  Learn More <ArrowRight className='ml-2 h-4 w-4' />
                </Link>
              </Button>
            </div>
            <div className='relative h-[400px] rounded-lg overflow-hidden shadow-xl'>
              <div className='absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg flex items-center justify-center'>
                <div className='text-center p-8'>
                  <h3 className='text-2xl font-bold mb-4'>
                    Ready to simplify your event management?
                  </h3>
                  <p className='mb-6'>
                    Join hundreds of organizations already using our platform
                  </p>
                  <Button asChild size='lg'>
                    <Link href='/auth/login'>Sign Up Now</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='py-20 bg-primary text-primary-foreground'>
        <div className='container mx-auto px-4 text-center'>
          <h2 className='text-3xl md:text-4xl font-bold mb-6'>
            Ready to Get Started?
          </h2>
          <p className='text-xl max-w-2xl mx-auto mb-10'>
            Join our platform today and transform how you manage event
            registrations and payments.
          </p>
          <Button asChild size='lg' variant='secondary' className='text-lg'>
            <Link href='/auth/login'>Get Started</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
