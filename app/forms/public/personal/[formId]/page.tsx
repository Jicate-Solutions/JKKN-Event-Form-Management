'use client';

// app/forms/public/personal/[formId]/page.tsx
// Public submission page for personal forms

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Send, CheckCircle2, ShieldAlert, Lock, AlertCircle } from 'lucide-react';
import { FormFieldRenderer } from '@/components/form/form-field-renderer';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { createClientSupabaseClient } from '@/lib/supabase/client';

interface PersonalForm {
  id: string;
  title: string;
  description?: string;
  banner_url?: string;
  fields: any[];
  status: string;
  is_public: boolean;
  submission_limit?: number;
  restrict_domain?: boolean;
  allowed_domains?: string[];
  created_at: string;
}

interface AccessError {
  type: 'auth_required' | 'access_restricted' | 'not_found';
  message: string;
  restrictedDomains?: string[];
  userEmail?: string;
}

export default function PublicPersonalFormPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.formId as string;

  const [form, setForm] = useState<PersonalForm | null>(null);
  const [formLoading, setFormLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submissionCount, setSubmissionCount] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [accessError, setAccessError] = useState<AccessError | null>(null);

  // Combined loading state - both form and auth must complete
  const loading = formLoading || authLoading;

  // Fetch form data
  useEffect(() => {
    async function fetchForm() {
      try {
        const response = await fetch(`/api/personal-forms/public/${formId}`);

        // Handle domain restriction errors
        if (response.status === 401) {
          const errorData = await response.json();

          // Auto-redirect to auth page instead of showing inline message
          console.log('Form requires authentication, redirecting to auth page...');
          setFormLoading(false); // Complete form loading before redirect
          router.push(`/forms/public/auth?formId=${formId}&type=personal`);
          return;
        }

        if (response.status === 403) {
          const errorData = await response.json();
          setAccessError({
            type: 'access_restricted',
            message: errorData.message || 'Access restricted',
            restrictedDomains: errorData.restrictedDomains,
            userEmail: errorData.userEmail
          });
          setFormLoading(false);
          return;
        }

        if (!response.ok) {
          setAccessError({
            type: 'not_found',
            message: 'Form not found or not available'
          });
          setFormLoading(false);
          return;
        }

        const data = await response.json();

        // Ensure fields is an array
        if (data.fields && !Array.isArray(data.fields)) {
          console.error('Fields is not an array:', data.fields);
          data.fields = [];
        }

        setForm(data);

        // Fetch submission count if limit exists
        if (data.submission_limit) {
          const countResponse = await fetch(
            `/api/personal-forms/${formId}/responses?page=1&limit=1`
          );
          if (countResponse.ok) {
            const countData = await countResponse.json();
            setSubmissionCount(countData.total);
          }
        }
      } catch (error) {
        console.error('Error fetching form:', error);
        setAccessError({
          type: 'not_found',
          message: 'Failed to load form'
        });
      } finally {
        setFormLoading(false);
      }
    }

    fetchForm();
  }, [formId, router]);

  // Check authentication and get user email (only for getting email, not for forcing redirect)
  useEffect(() => {
    async function checkAuthAndGetUserEmail() {
      try {
        const supabase = createClientSupabaseClient();
        const {
          data: { session },
          error: sessionError
        } = await supabase.auth.getSession();

        console.log('Auth check - Session:', session ? 'exists' : 'none');

        // Don't redirect here - let the API handle access control
        // If the form has domain restriction, the API will return 401/403
        // which is already handled in the fetchForm effect

        if (session) {
          // If authenticated, get user email
          const {
            data: { user },
            error: userError
          } = await supabase.auth.getUser();

          if (userError) {
            console.error('Error getting user:', userError);
            setAuthLoading(false);
            return;
          }

          if (user?.email) {
            console.log('User email found:', user.email);
            setUserEmail(user.email);
          } else {
            console.log('User found but no email');
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        // Always complete auth loading, even if there's no session
        setAuthLoading(false);
      }
    }

    checkAuthAndGetUserEmail();
  }, []);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) return;

    // Determine the email to use for submission
    // For authenticated users, use their email
    // For non-authenticated users on forms without domain restriction, they can still submit
    // The API will validate if authentication is required based on domain restriction
    const submissionEmail = userEmail || formData['email'] || '';

    // Validate required fields
    const requiredFields = Array.isArray(form?.fields)
      ? form.fields.filter((field) => field.required)
      : [];
    const missingFields = requiredFields.filter(
      (field) => !formData[field.id] || formData[field.id] === ''
    );

    if (missingFields.length > 0) {
      toast.error(
        `Please fill in all required fields: ${missingFields.map((f) => f.label).join(', ')}`
      );
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`/api/personal-forms/${formId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_data: formData,
          user_email: submissionEmail,
          is_anonymous: !userEmail // Anonymous if not authenticated
        })
      });

      if (!response.ok) {
        const error = await response.json();

        // Handle domain restriction error during submission
        if (response.status === 403 && error.restrictedDomains) {
          toast.error(error.message || 'Access restricted');
          setAccessError({
            type: 'access_restricted',
            message: error.message,
            restrictedDomains: error.restrictedDomains,
            userEmail: error.providedEmail || userEmail
          });
          return;
        }

        throw new Error(error.error || 'Failed to submit form');
      }

      const result = await response.json();
      setSubmissionId(result.submission_id);
      setSubmitted(true);
      toast.success('Form submitted successfully!');
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4'>
        <Card className='max-w-md w-full'>
          <CardContent className='pt-6'>
            <div className='flex flex-col items-center justify-center space-y-4'>
              <Loader2 className='h-10 w-10 animate-spin text-primary' />
              <div className='text-center space-y-2'>
                <h3 className='font-semibold text-lg'>Loading Form</h3>
                <p className='text-sm text-muted-foreground'>
                  {authLoading && formLoading && 'Checking authentication and loading form...'}
                  {!authLoading && formLoading && 'Loading form data...'}
                  {authLoading && !formLoading && 'Verifying access permissions...'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show access error UI
  if (accessError) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4'>
        <Card className='max-w-lg mx-auto'>
          <CardContent className='pt-6 space-y-4'>
            {/* Auth Required Error */}
            {accessError.type === 'auth_required' && (
              <>
                <div className='flex justify-center'>
                  <div className='rounded-full bg-yellow-100 dark:bg-yellow-900 p-3'>
                    <Lock className='h-8 w-8 text-yellow-600 dark:text-yellow-400' />
                  </div>
                </div>
                <div className='text-center'>
                  <h2 className='text-2xl font-bold mb-2'>Authentication Required</h2>
                  <p className='text-muted-foreground mb-4'>{accessError.message}</p>
                  {accessError.restrictedDomains && accessError.restrictedDomains.length > 0 && (
                    <Alert className='mb-4'>
                      <AlertCircle className='h-4 w-4' />
                      <AlertDescription>
                        This form requires authentication with an email address from:{' '}
                        <strong>
                          {accessError.restrictedDomains.map((d) => `@${d}`).join(', ')}
                        </strong>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <div className='flex justify-center'>
                  <Button
                    onClick={() => router.push(`/forms/public/auth?formId=${formId}&type=personal`)}
                  >
                    Sign In to Continue
                  </Button>
                </div>
              </>
            )}

            {/* Access Restricted Error */}
            {accessError.type === 'access_restricted' && (
              <>
                <div className='flex justify-center'>
                  <div className='rounded-full bg-red-100 dark:bg-red-900 p-3'>
                    <ShieldAlert className='h-8 w-8 text-red-600 dark:text-red-400' />
                  </div>
                </div>
                <div className='text-center'>
                  <h2 className='text-2xl font-bold mb-2'>Access Restricted</h2>
                  <p className='text-muted-foreground mb-4'>{accessError.message}</p>
                  {accessError.userEmail && (
                    <Alert variant='destructive' className='mb-4'>
                      <AlertCircle className='h-4 w-4' />
                      <AlertDescription>
                        Your email <strong>{accessError.userEmail}</strong> does not have access to
                        this form.
                      </AlertDescription>
                    </Alert>
                  )}
                  {accessError.restrictedDomains && accessError.restrictedDomains.length > 0 && (
                    <div className='p-4 bg-muted rounded-lg text-left'>
                      <p className='text-sm font-medium mb-2'>Allowed Email Domains:</p>
                      <ul className='space-y-1'>
                        {accessError.restrictedDomains.map((domain) => (
                          <li key={domain} className='text-sm flex items-center gap-2'>
                            <CheckCircle2 className='h-4 w-4 text-green-600' />
                            <code className='font-mono'>@{domain}</code>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className='text-sm text-muted-foreground mt-4'>
                    Please sign in with an authorized email address or contact the form owner for
                    access.
                  </p>
                </div>
                <div className='flex justify-center gap-3'>
                  <Button
                    variant='outline'
                    onClick={() => router.push(`/forms/public/auth?formId=${formId}&type=personal`)}
                  >
                    Sign In with Different Account
                  </Button>
                </div>
              </>
            )}

            {/* Not Found Error */}
            {accessError.type === 'not_found' && (
              <>
                <div className='flex justify-center'>
                  <div className='rounded-full bg-gray-100 dark:bg-gray-800 p-3'>
                    <AlertCircle className='h-8 w-8 text-gray-600 dark:text-gray-400' />
                  </div>
                </div>
                <div className='text-center'>
                  <h2 className='text-2xl font-bold mb-2'>Form Not Found</h2>
                  <p className='text-muted-foreground'>{accessError.message}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!form) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted'>
        <Card className='max-w-md mx-auto'>
          <CardContent className='pt-6 text-center'>
            <p className='text-destructive'>Form not found or not available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if form is accepting submissions
  const isAcceptingSubmissions =
    form.status === 'published' &&
    (!form.submission_limit ||
      !submissionCount ||
      submissionCount < form.submission_limit);

  if (!isAcceptingSubmissions) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4'>
        <Card className='max-w-md mx-auto'>
          <CardContent className='pt-6 text-center space-y-4'>
            <p className='text-muted-foreground'>
              {form.status !== 'published'
                ? 'This form is not currently accepting submissions'
                : 'This form has reached its submission limit'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show success message after submission
  if (submitted && submissionId) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4'>
        <Card className='max-w-md mx-auto'>
          <CardContent className='pt-6 text-center space-y-4'>
            <div className='flex justify-center'>
              <div className='rounded-full bg-green-100 dark:bg-green-900 p-3'>
                <CheckCircle2 className='h-8 w-8 text-green-600 dark:text-green-400' />
              </div>
            </div>
            <div>
              <h2 className='text-2xl font-bold mb-2'>Thank You!</h2>
              <p className='text-muted-foreground'>
                Your response has been submitted successfully
              </p>
            </div>
            <div className='p-4 bg-muted rounded-lg'>
              <p className='text-sm font-medium mb-1'>Submission ID</p>
              <p className='font-mono text-sm'>{submissionId}</p>
            </div>
            <p className='text-sm text-muted-foreground'>
              Please save this ID for your records
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4'>
      <div className='max-w-3xl mx-auto space-y-6'>
        {/* Form Header */}
        <Card>
          {form.banner_url && (
            <div className='relative w-full h-48 overflow-hidden rounded-t-lg'>
              <Image
                src={form.banner_url}
                alt={form.title}
                fill
                className='object-cover'
              />
            </div>
          )}
          <CardHeader>
            <div className='flex items-start justify-between'>
              <div className='flex-1'>
                <CardTitle className='text-3xl mb-2'>{form.title}</CardTitle>
                {form.description && (
                  <CardDescription
                    className='text-base'
                    dangerouslySetInnerHTML={{ __html: form.description }}
                  />
                )}
              </div>
              <Badge variant='secondary' className='ml-4'>
                {form.is_public ? 'Public' : 'Private'}
              </Badge>
            </div>

            {/* Display logged-in user's email */}
            {userEmail && (
              <div className='mt-4 p-3 bg-muted rounded-lg border'>
                <div className='flex items-center gap-2'>
                  <div className='flex-shrink-0'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      className='h-5 w-5 text-muted-foreground'
                      viewBox='0 0 20 20'
                      fill='currentColor'
                    >
                      <path d='M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z' />
                      <path d='M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z' />
                    </svg>
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs text-muted-foreground'>
                      Signed in as
                    </p>
                    <p className='text-sm font-medium truncate'>{userEmail}</p>
                  </div>
                </div>
              </div>
            )}

          </CardHeader>
        </Card>

        {/* Form Fields */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className='pt-6 space-y-6'>
              {Array.isArray(form.fields) && form.fields.length > 0 ? (
                form.fields.map((field) => (
                  <div key={field.id}>
                    <FormFieldRenderer
                      field={field}
                      value={formData[field.id]}
                      onChange={(fieldId, value) =>
                        handleFieldChange(fieldId, value)
                      }
                      formValues={formData}
                      formId={formId}
                      formType='personal'
                    />
                  </div>
                ))
              ) : (
                <p className='text-muted-foreground text-center py-8'>
                  This form has no fields configured.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className='flex justify-end mt-6'>
            <Button
              type='submit'
              size='lg'
              disabled={submitting}
              className='min-w-[200px]'
            >
              {submitting ? (
                <>
                  <Loader2 className='h-5 w-5 mr-2 animate-spin' />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className='h-5 w-5 mr-2' />
                  Submit Form
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Footer */}
        <div className='text-center text-sm text-muted-foreground'>
          <p>This form is powered by JKKN AI Form Management System</p>
        </div>
      </div>
    </div>
  );
}
