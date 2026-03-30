'use client';

import { useEventForms } from '@/hooks/organizations/use-event-forms';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BeatLoader } from 'react-spinners';
import Link from 'next/link';
import { Plus, Eye, Edit, FileText, Trash2, Share2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction
} from '@/components/ui/alert-dialog';
import { toast } from 'react-hot-toast';
import { FormService } from '@/lib/services/form-service';
import { Form } from '@/types/forms';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';

interface EventFormsListProps {
  eventId: string;
}

export function EventFormsList({ eventId }: EventFormsListProps) {
  const { forms, loading, error, refetch } = useEventForms(eventId);
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);
  const [shareForm, setShareForm] = useState<Form | null>(null);
  const [submissionStats, setSubmissionStats] = useState<
    Record<
      string,
      {
        currentCount: number;
        submissionLimit: number | null;
        remainingSlots: number | null;
        isUnlimited: boolean;
        canSubmit: boolean;
      }
    >
  >({});

  // Fetch submission stats for forms that have submission limits
  useEffect(() => {
    const fetchSubmissionStats = async () => {
      if (!forms || forms.length === 0) return;

      const formsWithLimits = forms.filter((form) => form.submission_limit);
      if (formsWithLimits.length === 0) return;

      // OPTIMIZATION: Fetch all submission stats in PARALLEL instead of sequentially
      const statsPromises = formsWithLimits.map((form) =>
        FormService.getSubmissionStats(form.id)
          .then((formStats) => ({ formId: form.id, stats: formStats }))
          .catch((error) => {
            console.error(
              `Error fetching submission stats for form ${form.id}:`,
              error
            );
            return null;
          })
      );

      const statsResults = await Promise.all(statsPromises);

      // Convert array to object, filtering out null results
      const stats: Record<string, any> = {};
      statsResults.forEach((result) => {
        if (result) {
          stats[result.formId] = result.stats;
        }
      });

      setSubmissionStats(stats);
    };

    fetchSubmissionStats();
  }, [forms]);

  if (loading) {
    return (
      <div className='flex justify-center items-center p-8'>
        <BeatLoader color='#00e902' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='text-center py-8'>
        <p className='text-destructive'>{error}</p>
        <Button variant='outline' onClick={refetch} className='mt-4'>
          Try Again
        </Button>
      </div>
    );
  }

  const handleDelete = async (formId: string) => {
    try {
      await FormService.deleteForm(formId);
      toast.success('Form deleted successfully');
      refetch();
    } catch (error) {
      console.error('Error deleting form:', error);
      toast.error('Failed to delete form');
    }
    setFormToDelete(null);
  };

  const copyShareLink = (form: Form) => {
    // Use slug if available, otherwise fall back to UUID
    const identifier = form.slug || form.id;
    const shareUrl = `${window.location.origin}/forms/public/${identifier}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard', {
      className: 'z-50'
    });
  };

  const getShareUrl = (form: Form) => {
    // Use slug if available, otherwise fall back to UUID
    const identifier = form.slug || form.id;
    return `${window.location.origin}/forms/public/${identifier}`;
  };

  return (
    <div className='space-y-4'>
      <div className='flex justify-between items-center'>
        <h2 className='text-xl font-semibold'>Event Forms</h2>
        <Button asChild>
          <Link href={`/organizations/events/${eventId}/forms/new`}>
            <Plus className='mr-2 h-4 w-4' />
            Create Form
          </Link>
        </Button>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className='p-6 text-center text-muted-foreground'>
            No forms created for this event yet
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {forms.map((form) => (
            <Card key={form.id}>
              <CardContent className='p-6'>
                <h3 className='font-semibold'>{form.title}</h3>
                {form.description && (
                  <div
                    className={cn(
                      'text-sm text-muted-foreground mt-1 prose prose-sm max-w-none rich-text-content',
                      'prose-headings:mt-1 prose-headings:mb-1',
                      'prose-p:mt-0 prose-p:mb-1',
                      'prose-ul:mt-0 prose-ul:mb-1 prose-ul:list-disc prose-ul:ml-4',
                      'prose-ol:mt-0 prose-ol:mb-1 prose-ol:list-decimal prose-ol:ml-4',
                      'prose-li:mt-0 prose-li:mb-0.5 prose-li:pl-1',
                      'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
                      '[&_h2]:text-base [&_h2]:font-medium [&_h2]:mt-2 [&_h2]:mb-1',
                      '[&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-1 [&_h3]:mb-1',
                      '[&_ul]:list-disc [&_ul]:ml-4 [&_ul]:mt-1 [&_ul]:mb-1',
                      '[&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:mt-1 [&_ol]:mb-1',
                      '[&_li]:mb-0.5 [&_li]:pl-1',
                      '[&_strong]:font-medium',
                      '[&_em]:italic',
                      '[&_u]:underline',
                      // Add line clamping for card layout
                      'line-clamp-3 overflow-hidden'
                    )}
                    dangerouslySetInnerHTML={{ __html: form.description }}
                  />
                )}

                {/* Submission Limit Information */}
                {form.submission_limit && submissionStats[form.id] && (
                  <div className='mt-3 p-3 bg-muted/50 rounded-md'>
                    <div className='flex items-center justify-between text-sm'>
                      <div>
                        <span className='font-medium'>Submissions:</span>
                        <span className='ml-1'>
                          {submissionStats[form.id].currentCount} /{' '}
                          {form.submission_limit}
                        </span>
                      </div>
                      <div className='text-right'>
                        <span className='font-medium text-primary'>
                          {submissionStats[form.id].remainingSlots} remaining
                        </span>
                      </div>
                    </div>
                    {submissionStats[form.id]?.remainingSlots !== null &&
                      submissionStats[form.id]?.remainingSlots !== undefined &&
                      (submissionStats[form.id]?.remainingSlots ?? 0) <= 5 && (
                        <div className='mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md'>
                          <p className='text-xs text-yellow-800'>
                            <strong>Limited slots!</strong> Only{' '}
                            {submissionStats[form.id]?.remainingSlots ?? 0}{' '}
                            left.
                          </p>
                        </div>
                      )}
                    {submissionStats[form.id]?.remainingSlots === 0 && (
                      <div className='mt-2 p-2 bg-red-50 border border-red-200 rounded-md'>
                        <p className='text-xs text-red-800'>
                          <strong>Submission limit reached!</strong> No more
                          submissions accepted.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className='mt-4 flex justify-end gap-2'>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant='outline' size='sm' asChild>
                          <Link
                            href={`/organizations/events/${eventId}/forms/${form.id}/preview`}
                          >
                            <Eye className='h-4 w-4' />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Preview Form</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant='outline' size='sm' asChild>
                          <Link
                            href={`/organizations/events/${eventId}/forms/${form.id}/responses`}
                          >
                            <FileText className='h-4 w-4' />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View Responses</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant='outline' size='sm' asChild>
                          <Link
                            href={`/organizations/events/${eventId}/forms/${form.id}/edit`}
                          >
                            <Edit className='h-4 w-4' />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit Form</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => setFormToDelete(form)}
                          className='text-destructive hover:text-destructive'
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete Form</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => setShareForm(form)}
                          className='text-blue-500 hover:text-blue-600'
                        >
                          <Share2 className='h-4 w-4' />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Share Form</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Delete Confirmation Dialog */}
      <AlertDialog
        open={!!formToDelete}
        onOpenChange={() => setFormToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this form? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => formToDelete && handleDelete(formToDelete.id)}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!shareForm} onOpenChange={() => setShareForm(null)}>
        <DialogContent className='sm:max-w-md max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Share Form</DialogTitle>
            <DialogDescription>
              Share this form using the link or QR code below
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            {/* Link Section */}
            <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2'>
              <Input
                value={shareForm ? getShareUrl(shareForm) : ''}
                readOnly
                className='min-w-0'
              />
              <Button
                onClick={() => shareForm && copyShareLink(shareForm)}
                variant='outline'
                className='shrink-0'
              >
                Copy
              </Button>
            </div>

            {/* QR Code Section */}
            <div className='flex flex-col items-center gap-4 p-4 bg-muted/50 rounded-lg'>
              <div className='bg-white p-4 rounded-xl shadow-sm qr-code'>
                {shareForm && (
                  <QRCodeSVG
                    value={getShareUrl(shareForm)}
                    size={180}
                    level='H'
                    includeMargin
                    imageSettings={{
                      src: '/assets/logo.png',
                      height: 35,
                      width: 35,
                      excavate: true
                    }}
                  />
                )}
              </div>
              <Button
                variant='outline'
                onClick={() => {
                  const qrCode = document.querySelector('.qr-code');
                  if (qrCode && shareForm) {
                    const svg = qrCode.querySelector('svg');
                    if (svg) {
                      const canvas = document.createElement('canvas');
                      const ctx = canvas.getContext('2d');
                      const svgData = new XMLSerializer().serializeToString(
                        svg
                      );
                      const img = new Image();
                      const logo = new Image();

                      // Set canvas dimensions
                      canvas.width = 600; // Wider canvas for text
                      canvas.height = 800; // Taller canvas for logo and text

                      img.onload = () => {
                        if (ctx) {
                          // Fill white background
                          ctx.fillStyle = 'white';
                          ctx.fillRect(0, 0, canvas.width, canvas.height);

                          // Add college logo at top
                          logo.onload = () => {
                            // Draw logo at top center
                            const logoWidth = 200;
                            const logoHeight = 100;
                            ctx.drawImage(
                              logo,
                              (canvas.width - logoWidth) / 2,
                              40,
                              logoWidth,
                              logoHeight
                            );

                            // Draw QR code in center
                            const qrSize = 300;
                            ctx.drawImage(
                              img,
                              (canvas.width - qrSize) / 2,
                              180,
                              qrSize,
                              qrSize
                            );

                            // Add form title
                            ctx.font = 'bold 24px Arial';
                            ctx.fillStyle = '#000000';
                            ctx.textAlign = 'center';
                            ctx.fillText(
                              shareForm.title,
                              canvas.width / 2,
                              540,
                              560 // max width
                            );

                            // Add form description
                            ctx.font = '16px Arial';
                            ctx.fillStyle = '#666666';

                            // Word wrap description
                            const words = shareForm.description?.split(' ') || [
                              'No description available'
                            ];
                            let line = '';
                            let y = 580;

                            words.forEach((word) => {
                              const testLine = line + word + ' ';
                              const metrics = ctx.measureText(testLine);

                              if (metrics.width > 500) {
                                ctx.fillText(line, canvas.width / 2, y);
                                line = word + ' ';
                                y += 25;
                              } else {
                                line = testLine;
                              }
                            });
                            ctx.fillText(line, canvas.width / 2, y);

                            // Add footer text
                            ctx.font = '14px Arial';
                            ctx.fillStyle = '#888888';
                            ctx.fillText(
                              'Scan to access form',
                              canvas.width / 2,
                              y + 50
                            );

                            // Download the image
                            const pngUrl = canvas.toDataURL('image/png');
                            const link = document.createElement('a');
                            link.download = `${shareForm.title
                              .toLowerCase()
                              .replace(/\s+/g, '-')}-qr.png`;
                            link.href = pngUrl;
                            link.click();
                          };
                          logo.src = '/assets/logo.png'; // Make sure this path is correct
                        }
                      };

                      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
                    }
                  }
                }}
                className='w-full sm:w-auto'
              >
                Download QR Code
              </Button>
            </div>
          </div>

          <p className='text-sm text-muted-foreground mt-2'>
            Anyone with this link or QR code can view and submit the form
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
