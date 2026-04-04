'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FormService } from '@/lib/services/form-service';
import { Form, FormField } from '@/types/forms';
import { FormResponse } from '@/types/form-responses';
import { BeatLoader } from 'react-spinners';
import { toast } from 'react-hot-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import SignaturePad from 'react-signature-canvas';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { FormFieldRenderer } from '@/components/form/form-field-renderer';

export default function PublicFormPage() {
  const { formId } = useParams();
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [userEmail, setUserEmail] = useState('');
  const signaturePadRef = React.useRef<SignaturePad>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isFormProcessingRef = React.useRef(false);
  const submissionToastIdRef = React.useRef<string | null>(null);
  const redirectTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [fieldVisibility, setFieldVisibility] = useState<
    Record<string, boolean>
  >({});
  const [submissionCount, setSubmissionCount] = useState<number | null>(null);

  // Clean up any pending toasts and timeouts when component unmounts
  useEffect(() => {
    // Capture current refs at the time the effect runs
    const currentToastId = submissionToastIdRef.current;
    const currentTimeout = redirectTimeoutRef.current;

    return () => {
      // Clean up any pending toasts
      if (currentToastId) {
        toast.dismiss(currentToastId);
      }

      // Clear any pending redirect timeouts
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }

      // Reset form processing state
      isFormProcessingRef.current = false;
    };
  }, []);

  useEffect(() => {
    async function fetchForm() {
      try {
        // formId can now be either a UUID or a slug
        const data = await FormService.getForm(formId as string);
        setForm(data as unknown as Form);

        // If form has submission limit, check current count
        if (data.submission_limit && data.submission_limit > 0) {
          try {
            const supabase = createClientSupabaseClient();
            const { count, error: countError } = await supabase
              .from('form_responses')
              .select('id', { count: 'exact', head: true })
              .eq('form_id', data.id); // Always use the actual form ID for queries

            if (!countError && count !== null) {
              setSubmissionCount(count);
            }
          } catch (error) {
            console.error('Error fetching submission count:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching form:', error);
        toast.error('Failed to load form');
      } finally {
        setLoading(false);
      }
    }
    fetchForm();
  }, [formId]);

  useEffect(() => {
    async function checkAuthAndGetUserEmail() {
      try {
        const supabase = createClientSupabaseClient();
        const {
          data: { session },
          error: sessionError
        } = await supabase.auth.getSession();

        console.log('Auth check - Session:', session ? 'exists' : 'none');

        if (!session) {
          // Redirect to auth page if not authenticated
          console.log('No session found, redirecting to auth page');
          router.push(`/forms/public/auth?formId=${formId}`);
          return;
        }

        // If authenticated, get user email
        const {
          data: { user },
          error: userError
        } = await supabase.auth.getUser();

        if (userError) {
          console.error('Error getting user:', userError);
          return;
        }

        if (user?.email) {
          console.log('User email found:', user.email);
          setUserEmail(user.email);
        } else {
          console.log('User found but no email');
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }
    }

    checkAuthAndGetUserEmail();
  }, [formId, router]);

  // Cleanup effect to reset submission state on unmount
  useEffect(() => {
    return () => {
      // Clean up submission state when component unmounts
      setIsSubmitting(false);
      isFormProcessingRef.current = false;

      // Dismiss any active toasts
      if (submissionToastIdRef.current) {
        toast.dismiss(submissionToastIdRef.current);
        submissionToastIdRef.current = null;
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Multiple submission prevention using both state and ref
    if (isSubmitting || isFormProcessingRef.current) {
      console.log(
        'Form submission already in progress, preventing duplicate submission'
      );
      toast.error('Form submission already in progress. Please wait...');
      return;
    }

    // Pre-validation checks (before setting submission state)
    try {
      // Check if form exists
      if (!form) {
        toast.error('Form not found');
        return;
      }

      // Check if user email is available
      if (!userEmail) {
        console.log('No user email found, redirecting to auth page');
        toast.error('Please log in to submit the form');
        router.push(`/forms/public/auth?formId=${formId}`);
        return;
      }

      // Validate required fields that are visible BEFORE processing
      const requiredFields = form.fields
        .filter(
          (field) =>
            field.required &&
            field.type !== 'payment' &&
            field.type !== 'image' &&
            // Only include fields that are visible based on conditional rules
            fieldVisibility[field.id] !== false
        )
        .map((field) => field.id);

      const missingFields = requiredFields.filter((fieldId) => {
        const value = formData[fieldId];
        const field = form.fields.find((f) => f.id === fieldId);

        // Check for empty values including empty strings, null, undefined, empty arrays
        if (value === null || value === undefined || value === '') {
          return true;
        }

        // For arrays (checkboxes), check if empty
        if (Array.isArray(value) && value.length === 0) {
          return true;
        }

        // For checkbox fields specifically, ensure the value is an array with at least one item
        if (
          field?.type === 'checkbox' &&
          (!Array.isArray(value) || value.length === 0)
        ) {
          return true;
        }

        // For string values, check if it's just whitespace
        if (typeof value === 'string' && value.trim() === '') {
          return true;
        }

        return false;
      });

      if (missingFields.length > 0) {
        const missingFieldNames = missingFields
          .map((fieldId) => {
            const field = form.fields.find((f) => f.id === fieldId);
            return field?.label || fieldId;
          })
          .join(', ');

        toast.error(
          `Please fill in all required fields: ${missingFieldNames}`,
          { duration: 5000 }
        );

        // Scroll to first missing field and add visual feedback
        const firstMissingFieldId = missingFields[0];
        const fieldElement = document.querySelector(
          `[data-field-id="${firstMissingFieldId}"]`
        );
        if (fieldElement) {
          fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Add temporary visual feedback
          fieldElement.classList.add(
            'ring-2',
            'ring-red-500',
            'ring-opacity-50'
          );
          setTimeout(() => {
            fieldElement.classList.remove(
              'ring-2',
              'ring-red-500',
              'ring-opacity-50'
            );
          }, 3000);
        }
        return;
      }

      // Check if submission limit has been reached
      if (form.submission_limit && form.submission_limit > 0) {
        const supabase = createClientSupabaseClient();
        const { count, error: countError } = await supabase
          .from('form_responses')
          .select('id', { count: 'exact', head: true })
          .eq('form_id', form.id);

        if (countError) {
          console.error('Error checking submission count:', countError);
          // Continue with submission even if count check fails
        } else if (count !== null && count >= form.submission_limit) {
          toast.error(
            `Submission limit reached. This form can only accept ${form.submission_limit} submissions.`,
            { duration: 6000 }
          );
          return;
        }
      }
    } catch (error) {
      console.error('Pre-validation error:', error);
      toast.error('Error validating form. Please try again.');
      return;
    }

    // All validations passed, now start the submission process
    setIsSubmitting(true);
    isFormProcessingRef.current = true;

    // Show loading toast and store the ID
    const loadingToastId = toast.loading('Processing your submission...');
    submissionToastIdRef.current = loadingToastId;

    try {
      // Process file uploads first
      const processedFormData = { ...formData };
      const fileUploadPromises = [];

      // Find all file fields and upload them
      for (const field of form.fields) {
        if (field.type === 'file' && formData[field.id]) {
          const file = formData[field.id];
          if (file instanceof File) {
            // Create a promise for each file upload
            const uploadPromise = new Promise<void>(async (resolve, reject) => {
              try {
                const supabase = createClientSupabaseClient();
                // Create a unique file path
                const fileExt = file.name.split('.').pop()?.toLowerCase();
                const fileName = `${Date.now()}_${file.name}`;
                const filePath = `${formId}/${fileName}`;

                // Upload file to Supabase Storage
                const { error: uploadError } = await supabase.storage
                  .from('form-uploads')
                  .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                  });

                if (uploadError) throw uploadError;

                // Get the public URL
                const { data: urlData } = supabase.storage
                  .from('form-uploads')
                  .getPublicUrl(filePath);

                // Replace the File object with the file metadata
                processedFormData[field.id] = {
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  url: urlData.publicUrl
                };

                console.log(
                  `File uploaded successfully: ${field.id}`,
                  processedFormData[field.id]
                );
                resolve();
              } catch (error) {
                console.error(
                  `Error uploading file for field ${field.id}:`,
                  error
                );
                reject(error);
              }
            });

            fileUploadPromises.push(uploadPromise);
          }
        }
      }

      // Wait for all file uploads to complete
      if (fileUploadPromises.length > 0) {
        await Promise.all(fileUploadPromises);
        console.log('All files uploaded successfully');
      }

      // Check if form has visible payment fields (skip hidden ones from conditional logic)
      const paymentFields = form.fields.filter(
        (field) =>
          field.type === 'payment' && fieldVisibility[field.id] !== false
      );
      const hasPayment = paymentFields.length > 0;
      const totalAmount = paymentFields.reduce(
        (sum, field) => sum + (field.payment_amount || 0),
        0
      );

      // Update payment status and amount in the form data
      const paymentStatus =
        hasPayment && totalAmount > 0 ? 'pending' : 'not_required';
      const paymentAmount = hasPayment && totalAmount > 0 ? totalAmount : null;

      // Use FormService to submit the response with processed form data
      const response = (await FormService.submitResponse(
        form.id,
        processedFormData,
        userEmail
      )) as FormResponse;

      // Check if response is valid
      if (!response || !response.submission_id) {
        throw new Error('Invalid response from server');
      }

      // If payment is required, redirect to payment page
      if (hasPayment && totalAmount > 0) {
        // Clear loading toast
        toast.dismiss(loadingToastId);
        submissionToastIdRef.current = null;

        // Show success notification
        toast.success('Form submitted successfully. Redirecting to payment...');

        // Immediately navigate to payment page using the current formId (could be slug or UUID)
        console.log(
          'Redirecting to payment page:',
          `/forms/public/${formId}/payment?submissionId=${response.submission_id}`
        );
        router.push(
          `/forms/public/${formId}/payment?submissionId=${response.submission_id}`
        );
      } else {
        // No payment needed, go to thank you page
        // Clear loading toast
        toast.dismiss(loadingToastId);
        submissionToastIdRef.current = null;

        // Show success notification
        toast.success('Form submitted successfully!');

        // Immediately navigate to thank you page using the current formId (could be slug or UUID)
        console.log(
          'Redirecting to thank you page:',
          `/forms/public/${formId}/thank-you?submissionId=${response.submission_id}`
        );
        router.push(
          `/forms/public/${formId}/thank-you?submissionId=${response.submission_id}`
        );
      }
    } catch (error) {
      console.error('Error submitting form:', error);

      // Dismiss the loading toast
      toast.dismiss(loadingToastId);
      submissionToastIdRef.current = null;

      // Check for duplicate submission ID error
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === '23505' &&
        (error as { message?: string }).message?.includes(
          'idx_form_responses_unique_submission_id'
        )
      ) {
        toast.error(
          'Your form was already submitted. Please refresh the page to submit again.',
          { duration: 6000 }
        );
      } else {
        toast.error('Failed to submit form. Please try again.');
      }
    } finally {
      // Always reset submission state in case of error
      // Only reset if we're not redirecting (successful submission)
      if (
        !window.location.href.includes('/payment') &&
        !window.location.href.includes('/thank-you')
      ) {
        setIsSubmitting(false);
        isFormProcessingRef.current = false;
      }
    }
  };

  const handleVisibilityChange = useCallback(
    (fieldId: string, isVisible: boolean) => {
      setFieldVisibility((prev) => ({
        ...prev,
        [fieldId]: isVisible
      }));
    },
    []
  );

  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value
    }));
  }, []);

  useEffect(() => {
    console.log('Form data updated:', formData); // Debug log
  }, [formData]);

  // Add a renderForm function
  const renderForm = () => {
    if (!form) return null;

    // Check if the form has conditional logic
    const hasConditionalLogic = form.fields.some(
      (field) => field.conditional_rules && field.conditional_rules.length > 0
    );

    return (
      <form onSubmit={handleSubmit} className='space-y-6'>
        {form.fields.map((field) => (
          <div key={field.id} className='space-y-2'>
            <FormFieldRenderer
              field={field}
              value={formData[field.id]}
              onChange={handleFieldChange}
              allFields={form.fields}
              formValues={formData}
              onVisibilityChange={handleVisibilityChange}
              disabled={isSubmitting}
              className='mt-1'
            />
          </div>
        ))}

        <Button type='submit' className='w-full' disabled={isSubmitting}>
          {isSubmitting ? (
            <div className='flex items-center justify-center gap-2'>
              <BeatLoader size={8} color='#ffffff' />
              <span>Processing...</span>
            </div>
          ) : (
            'Submit Form'
          )}
        </Button>
      </form>
    );
  };

  // Main component return
  return (
    <div className='container mx-auto px-4 py-8 max-w-3xl'>
      {loading ? (
        <div className='flex justify-center items-center h-60'>
          <BeatLoader color='#0284c7' />
        </div>
      ) : form ? (
        <Card className='overflow-hidden'>
          {form.banner_url && (
            <div className='relative h-48 sm:h-64 w-full'>
              <Image
                src={form.banner_url}
                alt={form.title}
                fill
                className='object-cover'
                sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
              />
            </div>
          )}
          <CardHeader>
            <h1 className='text-2xl font-bold'>{form.title}</h1>
            {form.description && (
              <div
                className={cn(
                  'text-muted-foreground mt-2 prose prose-sm max-w-none rich-text-content',
                  'prose-headings:mt-2 prose-headings:mb-2',
                  'prose-p:mt-0 prose-p:mb-2',
                  'prose-ul:mt-0 prose-ul:mb-2 prose-ul:list-disc prose-ul:ml-6',
                  'prose-ol:mt-0 prose-ol:mb-2 prose-ol:list-decimal prose-ol:ml-6',
                  'prose-li:mt-0 prose-li:mb-1 prose-li:pl-1',
                  'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
                  '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2',
                  '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2',
                  '[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mt-2 [&_ul]:mb-2',
                  '[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mt-2 [&_ol]:mb-2',
                  '[&_li]:mb-1 [&_li]:pl-1',
                  '[&_strong]:font-semibold',
                  '[&_em]:italic',
                  '[&_u]:underline'
                )}
                dangerouslySetInnerHTML={{ __html: form.description }}
              />
            )}

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
                    <p className='text-xs text-muted-foreground'>Signed in as</p>
                    <p className='text-sm font-medium truncate'>{userEmail}</p>
                  </div>
                </div>
              </div>
            )}

          </CardHeader>
          <CardContent>
            {/* Don't render form if submission limit is reached */}
            {form.submission_limit &&
            submissionCount !== null &&
            submissionCount >= form.submission_limit ? (
              <div className='text-center py-8'>
                <p className='text-muted-foreground'>
                  This form is no longer accepting submissions.
                </p>
              </div>
            ) : (
              renderForm()
            )}
          </CardContent>
        </Card>
      ) : (
        <div className='text-center p-8'>
          <h2 className='text-xl font-semibold text-destructive'>
            Form not found
          </h2>
          <p className='mt-2 text-muted-foreground'>
            The form you are looking for does not exist or may have been
            deleted.
          </p>
        </div>
      )}
    </div>
  );
}
