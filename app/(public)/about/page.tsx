import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, Award, Clock, Target } from 'lucide-react';

export const metadata = {
  title: 'About Us - JKKN Event Forms',
  description:
    'Learn about JKKN Event Forms Management System and our mission to simplify event management.'
};

export default function AboutPage() {
  const teamMembers = [
    {
      name: 'Boobalan',
      role: 'Lead Developer',
      bio: 'Experienced full-stack developer with expertise in Next.js and event management systems.'
    },
    {
      name: 'Dr. Rajkumar',
      role: 'Project Advisor',
      bio: 'Senior faculty member with extensive experience in educational technology and event management.'
    },
    {
      name: 'Kavitha',
      role: 'UX Designer',
      bio: 'Creative designer focused on creating intuitive and accessible user experiences.'
    },
    {
      name: 'Naveen',
      role: 'System Administrator',
      bio: 'Infrastructure specialist ensuring the platform runs smoothly and securely.'
    }
  ];

  const values = [
    {
      icon: <Users className='h-10 w-10 text-primary' />,
      title: 'User-Centric',
      description:
        'We design our platform with users in mind, focusing on simplicity and efficiency.'
    },
    {
      icon: <Award className='h-10 w-10 text-primary' />,
      title: 'Excellence',
      description:
        'We strive for excellence in every aspect of our service and technology.'
    },
    {
      icon: <Clock className='h-10 w-10 text-primary' />,
      title: 'Reliability',
      description:
        'Our platform is built to be reliable and available when you need it most.'
    },
    {
      icon: <Target className='h-10 w-10 text-primary' />,
      title: 'Innovation',
      description:
        'We continuously innovate to provide the best solutions for event management.'
    }
  ];

  return (
    <div className='w-full px-4'>
      {/* Hero Section */}
      <section className='py-20 bg-gradient-to-b from-primary/10 to-background'>
        <div className='container mx-auto px-4 text-center'>
          <h1 className='text-4xl md:text-5xl font-bold mb-6'>
            About JKKN Event Forms
          </h1>
          <p className='text-xl text-muted-foreground max-w-3xl mx-auto'>
            We&apos;re on a mission to simplify event management for educational
            institutions and organizations.
          </p>
        </div>
      </section>

      {/* Our Story Section */}
      <section className='py-16'>
        <div className='container mx-auto px-4'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'>
            <div>
              <h2 className='text-3xl font-bold mb-6'>Our Story</h2>
              <div className='space-y-4 text-lg'>
                <p>
                  JKKN Event Forms was born out of the need for a comprehensive
                  solution to manage event registrations and payments for
                  educational institutions.
                </p>
                <p>
                  Founded in 1969, our platform has grown from a simple form
                  builder to a complete event management system that handles
                  everything from registration to payment processing.
                </p>
                <p>
                  We work closely with educational institutions to understand
                  their unique needs and challenges, ensuring our platform
                  provides the right solutions.
                </p>
              </div>
            </div>
            <div className='bg-muted rounded-lg p-8'>
              <h3 className='text-2xl font-bold mb-4'>Our Mission</h3>
              <p className='text-lg mb-6'>
                To empower educational institutions with intuitive tools that
                streamline event management, enhance participant experiences,
                and simplify administrative tasks.
              </p>
              <h3 className='text-2xl font-bold mb-4'>Our Vision</h3>
              <p className='text-lg'>
                To become the leading event form management platform for
                educational institutions worldwide, known for reliability,
                innovation, and exceptional user experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values Section */}
      <section className='py-16 bg-muted/30'>
        <div className='container mx-auto px-4'>
          <h2 className='text-3xl font-bold text-center mb-12'>
            Our Core Values
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'>
            {values.map((value, index) => (
              <div
                key={index}
                className='bg-background rounded-lg p-6 shadow-sm border'
              >
                <div className='mb-4'>{value.icon}</div>
                <h3 className='text-xl font-semibold mb-2'>{value.title}</h3>
                <p className='text-muted-foreground'>{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className='py-16'>
        <div className='container mx-auto px-4'>
          <h2 className='text-3xl font-bold text-center mb-12'>
            Meet Our Team
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'>
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className='bg-background rounded-lg p-6 shadow-sm border'
              >
                <div className='w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <span className='text-2xl font-bold text-primary'>
                    {member.name.charAt(0)}
                  </span>
                </div>
                <h3 className='text-xl font-semibold text-center mb-2'>
                  {member.name}
                </h3>
                <p className='text-primary text-center mb-4'>{member.role}</p>
                <p className='text-muted-foreground text-center'>
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='py-16 bg-primary text-primary-foreground'>
        <div className='container mx-auto px-4 text-center'>
          <h2 className='text-3xl font-bold mb-6'>
            Ready to Transform Your Event Management?
          </h2>
          <p className='text-xl max-w-2xl mx-auto mb-8'>
            Join hundreds of educational institutions already using JKKN Event
            Forms.
          </p>
          <div className='flex flex-col sm:flex-row justify-center gap-4'>
            <Button asChild size='lg' variant='secondary'>
              <Link href='/auth/login'>Get Started</Link>
            </Button>
            <Button
              asChild
              size='lg'
              variant='outline'
              className='bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10'
            >
              <Link href='/contact'>Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
