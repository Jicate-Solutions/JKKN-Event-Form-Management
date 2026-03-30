'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { FormService } from '@/lib/services/form-service';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BeatLoader } from 'react-spinners';
import { FormFieldRenderer } from '@/components/form/form-field-renderer';
import { cn } from '@/lib/utils';

export default function FormPreviewPage() {
  const { formId } = useParams();
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [fieldVisibility, setFieldVisibility] = useState<
    Record<string, boolean>
  >({});
  const [submissionStats, setSubmissionStats] = useState<{
    currentCount: number;
    submissionLimit: number | null;
    remainingSlots: number | null;
    isUnlimited: boolean;
    canSubmit: boolean;
  } | null>(null);

  useEffect(() => {
    async function fetchForm() {
      try {
        setLoading(true);
        const data = await FormService.getForm(formId as string);
        setForm(data);

        // Fetch submission statistics if form has a submission limit
        if (data.submission_limit) {
          try {
            const stats = await FormService.getSubmissionStats(
              formId as string
            );
            setSubmissionStats(stats);
          } catch (error) {
            console.error('Error fetching submission stats:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching form:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchForm();
  }, [formId]);

  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldId]: value
    }));
  }, []);

  const handleVisibilityChange = useCallback(
    (fieldId: string, isVisible: boolean) => {
      setFieldVisibility((prev) => ({
        ...prev,
        [fieldId]: isVisible
      }));
    },
    []
  );

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-screen'>
        <BeatLoader color='#3b82f6' />
      </div>
    );
  }

  if (!form) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen'>
        <h1 className='text-2xl font-bold text-red-500'>Form Not Found</h1>
        <p className='text-gray-500 mt-2'>
          The form you&apos;re looking for doesn&apos;t exist or has been
          removed.
        </p>
      </div>
    );
  }

  return (
    <div className='max-w-4xl mx-auto px-4 py-8 space-y-8'>
      <Card>
        <CardHeader className='space-y-2'>
          <h1 className='text-2xl sm:text-3xl font-bold'>{form.title}</h1>
          {form.description && (
            <div
              className={cn(
                'text-muted-foreground prose prose-sm max-w-none rich-text-content',
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

          {/* Submission Limit Information */}
          {submissionStats && !submissionStats.isUnlimited && (
            <div className='mt-4 p-4 bg-muted rounded-lg'>
              <div className='flex items-center justify-between'>
                <div>
                  <h3 className='text-sm font-medium'>Submission Statistics</h3>
                  <p className='text-sm text-muted-foreground'>
                    {submissionStats.currentCount} of{' '}
                    {submissionStats.submissionLimit} submissions received
                  </p>
                </div>
                <div className='text-right'>
                  <p className='text-lg font-semibold'>
                    {submissionStats.remainingSlots} remaining
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    slots available
                  </p>
                </div>
              </div>
              {submissionStats.remainingSlots !== null &&
                submissionStats.remainingSlots <= 5 && (
                  <div className='mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md'>
                    <p className='text-sm text-yellow-800'>
                      <strong>Limited submissions remaining!</strong> Only{' '}
                      {submissionStats.remainingSlots} slots left.
                    </p>
                  </div>
                )}
            </div>
          )}
        </CardHeader>
        <CardContent className='p-6 space-y-6'>
          {form.fields.map((field: any) => (
            <div
              key={field.id}
              className='space-y-2 p-4 border rounded-lg transition-colors hover:bg-muted/50'
            >
              <FormFieldRenderer
                field={field}
                value={formValues[field.id]}
                onChange={handleFieldChange}
                allFields={form.fields}
                formValues={formValues}
                onVisibilityChange={handleVisibilityChange}
                disabled={true}
                preview={true}
                className='mt-1'
              />
            </div>
          ))}

          <div className='pt-6 border-t'>
            <div className='flex flex-col items-center space-y-2'>
              <Button
                disabled
                className='w-full sm:w-auto opacity-70'
                type='button'
              >
                Submit Form (Preview Mode)
              </Button>
              <p className='text-sm text-muted-foreground'>
                This is a preview mode. Form submissions are disabled.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
