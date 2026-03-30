import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Check,
  Mail,
  Phone,
  Calendar,
  Users,
  FileText,
  CreditCard
} from 'lucide-react';

export const metadata = {
  title: 'Pricing - JKKN Event Forms',
  description:
    'Custom pricing plans for the JKKN Event Forms Management System based on your specific needs.'
};

export default function PricingPage() {
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

  const pricingFactors = [
    'Number of events you plan to manage',
    'Expected registrations per event',
    'Required features and customizations',
    'Support level needed',
    'Contract duration',
    'Integration requirements'
  ];

  const faqs = [
    {
      question: 'How is pricing determined?',
      answer:
        'Pricing is customized based on your specific usage requirements, number of events, and features needed. Our team will work with you to create a tailored package.'
    },
    {
      question: 'Is there a free trial available?',
      answer:
        'Yes, we offer a limited free trial to help you evaluate if our platform meets your needs. Contact our team to set up your trial.'
    },
    {
      question: 'What payment methods do you accept?',
      answer:
        'We accept all major credit cards, debit cards, UPI, and net banking through our Razorpay integration.'
    },
    {
      question: 'Do you offer discounts for educational institutions?',
      answer:
        'Yes, we offer special pricing for educational institutions. Please contact our sales team for more information.'
    },
    {
      question: 'Can I upgrade my plan as my needs grow?',
      answer:
        'Absolutely! Our flexible pricing model allows you to scale your usage as your needs evolve. Simply contact us to adjust your plan.'
    },
    {
      question: 'Is there a long-term contract requirement?',
      answer:
        'We offer both monthly and annual billing options. Annual plans typically come with a discount compared to monthly billing.'
    }
  ];

  return (
    <>
      {/* Hero Section */}
      <section className='py-20 bg-gradient-to-b from-primary/10 to-background'>
        <div className='container mx-auto px-4 text-center'>
          <h1 className='text-4xl md:text-5xl font-bold mb-6'>
            Custom Pricing for Your Needs
          </h1>
          <p className='text-xl text-muted-foreground max-w-3xl mx-auto mb-8'>
            We offer tailored pricing based on your specific requirements and
            usage patterns.
          </p>
          <Button asChild size='lg'>
            <Link href='/contact'>Contact for Pricing</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className='py-20 bg-muted/30'>
        <div className='container mx-auto px-4'>
          <h2 className='text-3xl md:text-4xl font-bold text-center mb-16'>
            Features Included in All Plans
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

      {/* Custom Pricing Section */}
      <section className='py-20'>
        <div className='container mx-auto px-4'>
          <div className='max-w-4xl mx-auto bg-background rounded-lg shadow-sm border p-8'>
            <h2 className='text-3xl font-bold mb-6 text-center'>
              Get a Custom Quote
            </h2>
            <p className='text-center text-muted-foreground mb-8'>
              Our pricing is tailored to your specific needs. Contact us to
              discuss your requirements and get a personalized quote.
            </p>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-8 mb-8'>
              <div className='flex flex-col items-center p-6 bg-muted/30 rounded-lg'>
                <Mail className='h-12 w-12 text-primary mb-4' />
                <h3 className='text-xl font-semibold mb-2'>Email Us</h3>
                <p className='text-center mb-4'>
                  Send us your requirements and we&apos;ll get back to you with
                  a quote.
                </p>
                <Button asChild>
                  <Link href='mailto:admin@jicate.solutions'>
                    admin@jicate.solutions
                  </Link>
                </Button>
              </div>

              <div className='flex flex-col items-center p-6 bg-muted/30 rounded-lg'>
                <Phone className='h-12 w-12 text-primary mb-4' />
                <h3 className='text-xl font-semibold mb-2'>Call Us</h3>
                <p className='text-center mb-4'>
                  Speak directly with our team to discuss your needs.
                </p>
                <Button asChild>
                  <Link href='tel:+918760083627'>+91 8760083627</Link>
                </Button>
              </div>
            </div>

            <div className='mt-12'>
              <h3 className='text-xl font-semibold mb-4'>
                Factors that influence pricing:
              </h3>
              <ul className='space-y-3'>
                {pricingFactors.map((factor, index) => (
                  <li key={index} className='flex items-start'>
                    <Check className='h-5 w-5 text-primary mr-2 flex-shrink-0' />
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className='py-16 bg-muted/30'>
        <div className='container mx-auto px-4'>
          <h2 className='text-3xl font-bold text-center mb-12'>
            Frequently Asked Questions
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto'>
            {faqs.map((faq, index) => (
              <div
                key={index}
                className='bg-background rounded-lg p-6 shadow-sm border'
              >
                <h3 className='text-xl font-semibold mb-3'>{faq.question}</h3>
                <p className='text-muted-foreground'>{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='py-16 bg-primary text-primary-foreground'>
        <div className='container mx-auto px-4 text-center'>
          <h2 className='text-3xl font-bold mb-6'>Ready to Get Started?</h2>
          <p className='text-xl max-w-2xl mx-auto mb-8'>
            Contact us today to discuss your requirements and get a customized
            pricing plan that fits your needs.
          </p>
          <div className='flex flex-col sm:flex-row justify-center gap-4'>
            <Button asChild size='lg' variant='secondary'>
              <Link href='/contact'>Contact Us</Link>
            </Button>
            <Button
              asChild
              size='lg'
              variant='outline'
              className='bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10'
            >
              <Link href='/about'>Learn More</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
