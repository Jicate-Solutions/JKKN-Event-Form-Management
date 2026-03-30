'use client';

import { FormResponse } from '@/types/form-responses';
import {
  FormField,
  ConditionalRule,
  ConditionalRuleState
} from '@/types/forms';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { FormService } from '@/lib/services/form-service';
import { toast } from 'react-hot-toast';

// Utility function to safely format dates
const safeFormatDate = (dateValue: any, formatStr: string): string => {
  if (!dateValue) return 'N/A';

  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return `Invalid date: ${dateValue}`;
    }
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error, 'Value:', dateValue);
    return `Invalid date: ${dateValue}`;
  }
};

interface ResponseDetailsProps {
  response:
    | (FormResponse & {
        __userInfo?: {
          id: string;
          role?: string;
        };
      })
    | null;
  open: boolean;
  onClose: () => void;
  onDelete?: (responseId: string) => Promise<void>;
  onNavigate?: (direction: 'prev' | 'next') => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

// Helper to evaluate a conditional rule - same logic as in FormFieldRenderer
const evaluateConditionalRule = (
  rule: ConditionalRule,
  formValues: Record<string, any>
): boolean => {
  const sourceFieldValue = formValues[rule.source_field_id];
  const ruleValue = rule.value;

  let result = false;

  switch (rule.state) {
    case 'is_empty':
      result =
        sourceFieldValue === undefined ||
        sourceFieldValue === null ||
        sourceFieldValue === '' ||
        (Array.isArray(sourceFieldValue) && sourceFieldValue.length === 0);
      break;

    case 'is_filled':
      result =
        sourceFieldValue !== undefined &&
        sourceFieldValue !== null &&
        sourceFieldValue !== '' &&
        (!Array.isArray(sourceFieldValue) || sourceFieldValue.length > 0);
      break;

    case 'is_equal':
      result = sourceFieldValue === ruleValue;
      break;

    case 'is_not_equal':
      result = sourceFieldValue !== ruleValue;
      break;

    case 'contains':
      result =
        typeof sourceFieldValue === 'string' &&
        sourceFieldValue.includes(ruleValue || '');
      break;

    case 'not_contains':
      result =
        typeof sourceFieldValue === 'string' &&
        !sourceFieldValue.includes(ruleValue || '');
      break;

    case 'greater_than':
      result = Number(sourceFieldValue) > Number(ruleValue);
      break;

    case 'less_than':
      result = Number(sourceFieldValue) < Number(ruleValue);
      break;

    case 'before':
      result = new Date(sourceFieldValue) < new Date(ruleValue || '');
      break;

    case 'after':
      result = new Date(sourceFieldValue) > new Date(ruleValue || '');
      break;

    case 'equal_to_date':
      result =
        new Date(sourceFieldValue).toDateString() ===
        new Date(ruleValue || '').toDateString();
      break;

    case 'not_equal_to_date':
      result =
        new Date(sourceFieldValue).toDateString() !==
        new Date(ruleValue || '').toDateString();
      break;

    case 'equal_to_day':
      result =
        new Date(sourceFieldValue).getDay() === parseInt(ruleValue || '0', 10);
      break;

    case 'not_equal_to_day':
      result =
        new Date(sourceFieldValue).getDay() !== parseInt(ruleValue || '0', 10);
      break;

    default:
      result = false;
  }

  return result;
};

export function ResponseDetails({
  response,
  open,
  onClose,
  onDelete,
  onNavigate,
  hasPrevious = false,
  hasNext = false
}: ResponseDetailsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Fetch additional details when the component is shown
  useEffect(() => {
    if (!response || !open || !response.submission_id) return;

    const fetchAdditionalDetails = async () => {
      setIsLoading(true);
      setDetailsError(null);

      try {
        const fullDetails = await FormService.getFormResponseBySubmissionId(
          response.submission_id as string,
          response.__userInfo
        );
        console.log('Additional details loaded successfully');
      } catch (error) {
        console.error('Error fetching response details:', error);
        setDetailsError('Failed to load complete response details');
        toast.error('Failed to load complete response details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdditionalDetails();
  }, [open, response]);

  // Calculate which fields should be visible based on conditional logic
  const visibleFields = useMemo(() => {
    if (!response?.form?.fields) return [];

    const allFields = response.form.fields;
    const formValues = response.response_data;
    const fieldVisibility: Record<string, boolean> = {};

    // Initialize all fields as visible by default
    allFields.forEach((field) => {
      fieldVisibility[field.id] = true;
    });

    // Apply conditional logic rules
    allFields.forEach((field) => {
      // Check if this field has its own conditional rules
      if (field.conditional_rules && field.conditional_rules.length > 0) {
        let shouldBeVisible = true;

        for (const rule of field.conditional_rules) {
          const conditionMet = evaluateConditionalRule(rule, formValues);

          if (conditionMet) {
            if (rule.action === 'hide') {
              shouldBeVisible = false;
              break;
            } else if (rule.action === 'show') {
              shouldBeVisible = true;
            }
          } else {
            if (rule.action === 'show') {
              shouldBeVisible = false;
            }
          }
        }

        fieldVisibility[field.id] = shouldBeVisible;
      }

      // Check if OTHER fields have rules that affect THIS field
      allFields.forEach((otherField) => {
        if (otherField.id === field.id || !otherField.conditional_rules) return;

        otherField.conditional_rules.forEach((rule) => {
          const targetsThisField =
            rule.target_field_ids && rule.target_field_ids.includes(field.id);

          if (targetsThisField) {
            const conditionMet = evaluateConditionalRule(rule, formValues);

            if (conditionMet) {
              if (rule.action === 'hide' || rule.action === 'hide_multiple') {
                fieldVisibility[field.id] = false;
              } else if (
                rule.action === 'show' ||
                rule.action === 'show_multiple'
              ) {
                fieldVisibility[field.id] = true;
              }
            } else {
              if (rule.action === 'show' || rule.action === 'show_multiple') {
                fieldVisibility[field.id] = false;
              }
            }
          }
        });
      });
    });

    // Return only visible fields
    return allFields.filter((field) => fieldVisibility[field.id]);
  }, [response?.form?.fields, response?.response_data]);

  if (!response) {
    return null;
  }

  const handleDelete = async () => {
    if (!response || !onDelete) return;

    try {
      setIsDeleting(true);
      await onDelete(response.id);
      setShowDeleteDialog(false);
      onClose();
    } catch (error) {
      console.error('Error deleting response:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // If we don't have form data, show an error
  if (!response.form) {
    return (
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Response Details</DialogTitle>
          </DialogHeader>
          <div className='py-6 text-center'>
            <p className='text-red-500'>
              {detailsError ||
                'Unable to load response details. You may not have permission to view this response.'}
            </p>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  function renderFieldValue(field: FormField, response: FormResponse) {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <p className='break-words'>
            {response.response_data[field.id] || 'N/A'}
          </p>
        );

      case 'textarea':
        return (
          <p className='whitespace-pre-wrap break-words'>
            {response.response_data[field.id] || 'N/A'}
          </p>
        );

      case 'select':
      case 'radio':
        return <p>{response.response_data[field.id] || 'N/A'}</p>;

      case 'checkbox':
        const selectedOptions = response.response_data[field.id] || [];
        return (
          <div className='space-y-1'>
            {selectedOptions.map((option: string) => (
              <p key={option}>{option}</p>
            ))}
          </div>
        );

      case 'date':
        const dateValue = response.response_data[field.id];
        const formattedDate = safeFormatDate(dateValue, 'PPP');
        return (
          <p
            className={formattedDate.includes('Invalid') ? 'text-red-500' : ''}
          >
            {formattedDate}
          </p>
        );

      case 'time':
        const timeValue = response.response_data[field.id];
        if (!timeValue) {
          return <p>N/A</p>;
        }

        try {
          // Validate time format (HH:MM)
          if (timeValue.match(/^\d{2}:\d{2}$/)) {
            const [hours, minutes] = timeValue.split(':');
            const date = new Date();
            date.setHours(parseInt(hours), parseInt(minutes));

            return (
              <p>
                {date.toLocaleTimeString('en-IN', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
            );
          } else {
            return <p>{timeValue}</p>;
          }
        } catch (error) {
          console.error(
            'Error formatting time:',
            error,
            'Time value:',
            timeValue
          );
          return <p>{timeValue}</p>;
        }

      case 'file':
        const fileData = response.response_data[field.id];
        if (!fileData?.url) {
          return <p>No file uploaded</p>;
        }

        const isImage =
          fileData.type?.startsWith('image/') ||
          fileData.name?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);

        return (
          <div className='space-y-3'>
            <a
              href={fileData.url}
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary hover:underline inline-flex items-center gap-2'
            >
              📎 {fileData.name}
            </a>
            {isImage && (
              <div className='relative w-full max-w-sm'>
                <Image
                  src={fileData.url}
                  alt={fileData.name || 'Uploaded image'}
                  width={300}
                  height={200}
                  className='rounded-md border object-cover'
                  style={{ maxHeight: '200px', width: 'auto' }}
                />
              </div>
            )}
          </div>
        );

      case 'signature':
        return response.response_data[field.id] ? (
          <div className='relative h-40 w-full border rounded-md'>
            <Image
              src={response.response_data[field.id]}
              alt='Signature'
              fill
              className='object-contain'
            />
          </div>
        ) : (
          <p>No signature</p>
        );

      case 'conditional':
        const conditionalData = response.response_data[field.id];

        const extractConditionalValues = (
          data: any
        ): { mainValue: string; conditionalValue: string } => {
          if (!data) return { mainValue: 'N/A', conditionalValue: '' };

          if (typeof data !== 'object')
            return { mainValue: String(data), conditionalValue: '' };

          if ('mainValue' in data && typeof data.mainValue !== 'object') {
            return {
              mainValue: data.mainValue || 'N/A',
              conditionalValue: data.conditionalValue || ''
            };
          }

          if ('mainValue' in data && typeof data.mainValue === 'object') {
            const innerValues = extractConditionalValues(data.mainValue);
            return {
              mainValue: innerValues.mainValue,
              conditionalValue:
                data.conditionalValue || innerValues.conditionalValue
            };
          }

          return {
            mainValue: JSON.stringify(data),
            conditionalValue: ''
          };
        };

        const { mainValue, conditionalValue } =
          extractConditionalValues(conditionalData);

        return (
          <div className='space-y-2'>
            <p>
              <strong>Selected option:</strong> {mainValue}
            </p>
            {mainValue === field.conditional_trigger_value &&
              conditionalValue && (
                <div className='pl-4 border-l-2 border-primary/20'>
                  <p>
                    <strong>{field.conditional_label || 'Details'}:</strong>{' '}
                    {conditionalValue}
                  </p>
                </div>
              )}
          </div>
        );

      case 'payment':
        try {
          if (
            response.payment_status ||
            response.payment_amount ||
            response.payment_id
          ) {
            return (
              <p className='text-muted-foreground italic'>
                Payment details shown above
              </p>
            );
          }

          const rawData = response.response_data[field.id];
          const paymentData =
            typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

          if (!paymentData) return <p>No payment data</p>;

          const amount = paymentData.amount || 0;
          const currency = paymentData.currency || '₹';
          const status = paymentData.status || 'N/A';
          const paymentId = paymentData.payment_id;

          return (
            <div className='space-y-2 p-4 bg-muted/50 rounded-lg'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <p className='text-sm text-muted-foreground'>Amount</p>
                  <p className='font-medium'>
                    {currency} {amount}
                  </p>
                </div>
                <div>
                  <p className='text-sm text-muted-foreground'>Status</p>
                  <p className='font-medium capitalize text-green-600'>
                    {status}
                  </p>
                </div>
                {paymentId && (
                  <div className='col-span-2'>
                    <p className='text-sm text-muted-foreground'>Payment ID</p>
                    <p className='font-medium break-all text-primary'>
                      {paymentId}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        } catch (error) {
          console.error('Error parsing payment data:', error);
          return <p>Error displaying payment data</p>;
        }

      default:
        return <p>{response.response_data[field.id] || 'N/A'}</p>;
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle className='flex justify-between items-center'>
              <span>Response Details</span>
              {onDelete && (
                <Button
                  variant='outline'
                  size='sm'
                  className='text-destructive hover:bg-destructive/10'
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className='h-4 w-4 mr-2' />
                  Delete
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className='max-h-[60vh]'>
            <div className='space-y-6 p-4'>
              <div className='space-y-2'>
                <p className='text-sm text-muted-foreground'>Submitted By</p>
                <p className='font-medium'>{response.user_email}</p>
              </div>
              {response.submission_id && (
                <div className='space-y-2'>
                  <p className='text-sm text-muted-foreground'>Submission ID</p>
                  <div className='flex items-center'>
                    <code className='px-2 py-1 bg-muted rounded text-sm font-mono break-all'>
                      {response.submission_id}
                    </code>
                  </div>
                </div>
              )}
              <div className='space-y-2'>
                <p className='text-sm text-muted-foreground'>Submitted At</p>
                <p className='font-medium'>
                  {safeFormatDate(response.submitted_at, 'PPP p')}
                </p>
              </div>

              {/* Payment Details Section */}
              {(response.payment_status || response.payment_amount) && (
                <div className='space-y-2 border p-4 rounded-lg bg-muted/30'>
                  <p className='font-semibold'>Payment Details</p>

                  <div className='grid grid-cols-2 gap-4 mt-3'>
                    {response.payment_status && (
                      <div>
                        <p className='text-sm text-muted-foreground'>
                          Payment Status
                        </p>
                        <p
                          className={`font-medium capitalize ${
                            response.payment_status === 'completed'
                              ? 'text-green-600'
                              : response.payment_status === 'pending'
                                ? 'text-amber-600'
                                : response.payment_status === 'not_required'
                                  ? 'text-slate-600'
                                  : ''
                          }`}
                        >
                          {response.payment_status}
                        </p>
                      </div>
                    )}

                    {response.payment_amount && (
                      <div>
                        <p className='text-sm text-muted-foreground'>
                          Payment Amount
                        </p>
                        <p className='font-medium'>
                          ₹ {response.payment_amount}
                        </p>
                      </div>
                    )}

                    {response.payment_id && (
                      <div className='col-span-2'>
                        <p className='text-sm text-muted-foreground'>
                          Payment ID
                        </p>
                        <p className='font-medium break-all text-primary'>
                          {response.payment_id}
                        </p>
                      </div>
                    )}

                    {response.payment_updated_at && (
                      <div className='col-span-2'>
                        <p className='text-sm text-muted-foreground'>
                          Payment Updated
                        </p>
                        <p className='font-medium'>
                          {safeFormatDate(response.payment_updated_at, 'PPP p')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className='border-t pt-6'>
                <div className='flex items-center justify-between mb-4'>
                  <p className='font-semibold'>Form Responses</p>
                  {visibleFields.length !== response.form?.fields.length && (
                    <p className='text-xs text-muted-foreground'>
                      Showing {visibleFields.length} of{' '}
                      {response.form?.fields.length} fields (conditional logic
                      applied)
                    </p>
                  )}
                </div>
                <div className='space-y-6'>
                  {visibleFields.map((field) => (
                    <div key={field.id} className='space-y-2'>
                      <p className='font-medium'>{field.label}</p>
                      {renderFieldValue(field, response)}
                    </div>
                  ))}
                  {visibleFields.length === 0 && (
                    <p className='text-muted-foreground italic text-center py-4'>
                      No fields are visible based on the form&apos;s conditional
                      logic rules.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          {onNavigate && (
            <DialogFooter className='flex justify-between items-center border-t pt-4'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => onNavigate('prev')}
                disabled={!hasPrevious}
              >
                <ArrowLeft className='h-4 w-4 mr-2' />
                Previous Response
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => onNavigate('next')}
                disabled={!hasNext}
              >
                Next Response
                <ArrowRight className='h-4 w-4 ml-2' />
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Response</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this response? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className='bg-destructive hover:bg-destructive/90'
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
