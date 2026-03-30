'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { z } from 'zod';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contactSchema = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
    email: z.string().email({ message: 'Please enter a valid email address' }),
    subject: z
      .string()
      .min(5, { message: 'Subject must be at least 5 characters' }),
    message: z
      .string()
      .min(10, { message: 'Message must be at least 10 characters' })
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      // Validate form data
      contactSchema.parse(formData);

      // In a real application, you would send this data to your API
      // For now, we'll just simulate a successful submission
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success('Your message has been sent successfully!');
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(err.message);
        });
      } else {
        toast.error('An error occurred. Please try again later.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    {
      icon: <Mail className='h-6 w-6 text-primary' />,
      title: 'Email Us',
      details: 'admin@jicate.solutions',
      description: 'For general inquiries and support'
    },
    {
      icon: <Phone className='h-6 w-6 text-primary' />,
      title: 'Call Us',
      details: '+91 8760083627',
      description: 'Monday to Friday, 9am to 5pm'
    },
    {
      icon: <MapPin className='h-6 w-6 text-primary' />,
      title: 'Visit Us',
      details: 'JKKN Campus, Komarapalayam',
      description: 'Namakkal, Tamil Nadu, India'
    }
  ];

  return (
    <div className='w-full px-4'>
      {/* Hero Section */}
      <section className='py-20 bg-gradient-to-b from-primary/10 to-background'>
        <div className='container mx-auto px-4 text-center'>
          <h1 className='text-4xl md:text-5xl font-bold mb-6'>Contact Us</h1>
          <p className='text-xl text-muted-foreground max-w-3xl mx-auto'>
            Have questions or need assistance? We&apos;re here to help you.
          </p>
        </div>
      </section>

      {/* Contact Information */}
      <section className='py-16'>
        <div className='container mx-auto px-4'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            {contactInfo.map((info, index) => (
              <div
                key={index}
                className='bg-background rounded-lg p-6 shadow-sm border text-center'
              >
                <div className='mx-auto w-12 h-12 flex items-center justify-center bg-primary/10 rounded-full mb-4'>
                  {info.icon}
                </div>
                <h3 className='text-xl font-semibold mb-2'>{info.title}</h3>
                <p className='font-medium mb-2'>{info.details}</p>
                <p className='text-muted-foreground'>{info.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className='py-16 bg-muted/30'>
        <div className='container mx-auto px-4'>
          <div className='max-w-3xl mx-auto bg-background rounded-lg shadow-sm border p-8'>
            <h2 className='text-3xl font-bold mb-6 text-center'>
              Send Us a Message
            </h2>
            <p className='text-muted-foreground mb-8 text-center'>
              Fill out the form below and we&apos;ll get back to you as soon as
              possible.
            </p>

            <form onSubmit={handleSubmit} className='space-y-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='space-y-2'>
                  <Label htmlFor='name'>Your Name</Label>
                  <Input
                    id='name'
                    name='name'
                    placeholder='John Doe'
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='email'>Your Email</Label>
                  <Input
                    id='email'
                    name='email'
                    type='email'
                    placeholder='john@example.com'
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='subject'>Subject</Label>
                <Input
                  id='subject'
                  name='subject'
                  placeholder='How can we help you?'
                  value={formData.subject}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='message'>Message</Label>
                <Textarea
                  id='message'
                  name='message'
                  placeholder='Your message here...'
                  rows={6}
                  value={formData.message}
                  onChange={handleChange}
                  required
                />
              </div>

              <Button type='submit' className='w-full' disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className='flex items-center'>
                    <svg
                      className='animate-spin -ml-1 mr-2 h-4 w-4 text-white'
                      xmlns='http://www.w3.org/2000/svg'
                      fill='none'
                      viewBox='0 0 24 24'
                    >
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'
                      ></circle>
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                      ></path>
                    </svg>
                    Sending...
                  </span>
                ) : (
                  <span className='flex items-center'>
                    <Send className='mr-2 h-4 w-4' /> Send Message
                  </span>
                )}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
