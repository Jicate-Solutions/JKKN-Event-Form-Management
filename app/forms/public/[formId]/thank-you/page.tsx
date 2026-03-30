'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BeatLoader } from 'react-spinners';
import Confetti from 'react-confetti';
import { useWindowSize } from '@/hooks/use-mobile';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import { Download } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ThankYouPage() {
  const { formId } = useParams();
  const searchParams = useSearchParams();
  const submissionId = searchParams.get('submissionId');
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(true);
  const [quote, setQuote] = useState<string>('');
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const { width, height } = useWindowSize();
  const cardRef = useRef<HTMLDivElement>(null);

  // Function to capture and download the card as an image
  const handleDownloadImage = async () => {
    if (!cardRef.current) return;

    try {
      setDownloading(true);
      toast.loading('Generating your receipt...');

      const canvas = await html2canvas(cardRef.current, {
        scale: 2, // Higher quality
        backgroundColor: '#f8fafc', // Match the background color
        logging: false,
        useCORS: true
      });

      // Convert to image and download
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `submission-${
        submission?.submission_id || 'receipt'
      }.png`;
      link.click();

      toast.dismiss();
      toast.success('Receipt downloaded successfully!');
    } catch (error) {
      console.error('Error generating image:', error);
      toast.dismiss();
      toast.error('Failed to generate receipt image');
    } finally {
      setDownloading(false);
    }
  };

  // Fetch AI inspirational quote
  useEffect(() => {
    async function fetchInspirationalQuote() {
      try {
        setQuoteLoading(true);
        const response = await fetch('/api/ai/motivation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt:
              'Generate an inspirational quote about success and achievement'
          })
        });

        const data = await response.json();
        if (data.message) {
          setQuote(data.message);
        } else {
          setQuote('Your journey to success begins with a single step.');
        }
      } catch (error) {
        console.error('Error fetching quote:', error);
        setQuote('Your journey to success begins with a single step.');
      } finally {
        setQuoteLoading(false);
      }
    }

    fetchInspirationalQuote();
  }, []);

  useEffect(() => {
    async function fetchSubmission() {
      if (!submissionId) {
        setLoading(false);
        return;
      }

      try {
        const supabase = createClientSupabaseClient();
        console.log('Looking up submission with ID:', submissionId);

        // Try to find by submission_id first
        const submissionResponse = await supabase
          .from('form_responses')
          .select('*, forms(*)')
          .eq('submission_id', submissionId)
          .single();

        let submissionData = submissionResponse.data;
        const submissionError = submissionResponse.error;

        console.log('Submission lookup result:', {
          submissionData,
          submissionError
        });

        if (submissionError || !submissionData) {
          // Try fallback to internal ID lookup
          console.log('Trying fallback lookup by internal ID');
          const fallbackResponse = await supabase
            .from('form_responses')
            .select('*, forms(*)')
            .eq('id', submissionId)
            .single();

          console.log('Fallback lookup result:', {
            data: fallbackResponse.data,
            error: fallbackResponse.error
          });

          if (fallbackResponse.error || !fallbackResponse.data) {
            console.error('Both lookups failed');
          } else {
            // Use the fallback data
            submissionData = fallbackResponse.data;
          }
        }

        if (submissionData) {
          setSubmission(submissionData);
        }
      } catch (error) {
        console.error('Error fetching submission:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSubmission();

    // Hide confetti after 5 seconds
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [submissionId]);

  // Add a periodic refresh for pending payments
  useEffect(() => {
    // If payment is pending, refresh the status every 5 seconds
    if (submission?.payment_status === 'pending') {
      const refreshInterval = setInterval(async () => {
        try {
          const supabase = createClientSupabaseClient();
          const { data, error } = await supabase
            .from('form_responses')
            .select('*, forms(*)')
            .eq('submission_id', submissionId as string)
            .single();

          if (error) throw error;

          // Update submission data if payment status has changed
          if (data.payment_status !== submission.payment_status) {
            setSubmission(data);
            // Show confetti if payment is now completed
            if (data.payment_status === 'completed') {
              setShowConfetti(true);
              // Hide confetti after 5 seconds
              setTimeout(() => {
                setShowConfetti(false);
              }, 5000);
            }
          }
        } catch (error) {
          console.error('Error refreshing payment status:', error);
        }
      }, 5000);

      return () => clearInterval(refreshInterval);
    }
  }, [submission, submissionId]);

  return (
    <div className='min-h-screen bg-slate-50 flex flex-col'>
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={200}
        />
      )}

      <div className='flex-1 flex items-center justify-center p-4'>
        <Card className='w-full max-w-md shadow-lg'>
          <div ref={cardRef}>
            <CardHeader className='text-center pb-2'>
              <div className='mx-auto mb-4 bg-green-100 p-3 rounded-full w-16 h-16 flex items-center justify-center'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='h-8 w-8 text-green-600'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M5 13l4 4L19 7'
                  />
                </svg>
              </div>
              <CardTitle className='text-2xl font-bold text-slate-900'>
                Thank You!
              </CardTitle>
              <CardDescription className='text-slate-600'>
                Your form has been submitted successfully
              </CardDescription>
            </CardHeader>

            <CardContent className='space-y-6'>
              {/* AI Inspirational Quote */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className='bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100'
              >
                {quoteLoading ? (
                  <div className='flex justify-center py-2'>
                    <BeatLoader color='#4f46e5' size={8} />
                  </div>
                ) : (
                  <div className='text-center'>
                    <p className='text-indigo-700 font-medium italic'>
                      &ldquo;{quote}&rdquo;
                    </p>
                    <p className='text-xs text-slate-500 mt-2'>
                      - AI Inspiration
                    </p>
                  </div>
                )}
              </motion.div>

              {loading ? (
                <div className='flex justify-center py-4'>
                  <BeatLoader color='#4f46e5' />
                </div>
              ) : submission ? (
                <>
                  <div className='space-y-4'>
                    <div className='space-y-1'>
                      <p className='text-sm font-medium text-slate-500'>Form</p>
                      <p className='font-medium text-slate-900'>
                        {submission.forms?.title}
                      </p>
                    </div>

                    <div className='space-y-1'>
                      <p className='text-sm font-medium text-slate-500'>
                        Submission ID
                      </p>
                      <p className='font-medium text-slate-900 text-sm'>
                        {submission.submission_id || submission.id}
                      </p>
                    </div>

                    <div className='space-y-1'>
                      <p className='text-sm font-medium text-slate-500'>Date</p>
                      <p className='font-medium text-slate-900'>
                        {new Date(submission.submitted_at).toLocaleDateString(
                          'en-US',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }
                        )}
                      </p>
                    </div>
                  </div>

                  {submission.payment_status === 'pending' &&
                    submission.payment_amount > 0 && (
                      <div className='bg-yellow-50 border border-yellow-100 rounded-lg p-4'>
                        <div className='flex items-start'>
                          <div className='flex-shrink-0'>
                            <svg
                              xmlns='http://www.w3.org/2000/svg'
                              className='h-5 w-5 text-yellow-400'
                              viewBox='0 0 20 20'
                              fill='currentColor'
                            >
                              <path
                                fillRule='evenodd'
                                d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z'
                                clipRule='evenodd'
                              />
                            </svg>
                          </div>
                          <div className='ml-3'>
                            <h3 className='text-sm font-medium text-yellow-800'>
                              Payment Pending
                            </h3>
                            <div className='mt-2 text-sm text-yellow-700'>
                              <p>
                                Your submission requires a payment of ₹
                                {submission.payment_amount.toFixed(2)}
                              </p>
                            </div>
                            <div className='mt-3'>
                              <Button
                                size='sm'
                                className='bg-yellow-500 hover:bg-yellow-600 text-white'
                                asChild
                              >
                                <Link
                                  href={`/forms/public/${formId}/payment?submissionId=${submissionId}`}
                                >
                                  Complete Payment
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  {submission.payment_status === 'completed' && (
                    <div className='bg-green-50 border border-green-100 rounded-lg p-4'>
                      <div className='flex items-start'>
                        <div className='flex-shrink-0'>
                          <svg
                            xmlns='http://www.w3.org/2000/svg'
                            className='h-5 w-5 text-green-400'
                            viewBox='0 0 20 20'
                            fill='currentColor'
                          >
                            <path
                              fillRule='evenodd'
                              d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                              clipRule='evenodd'
                            />
                          </svg>
                        </div>
                        <div className='ml-3'>
                          <h3 className='text-sm font-medium text-green-800'>
                            Payment Completed
                          </h3>
                          <div className='mt-2 text-sm text-green-700'>
                            <p>
                              Your payment of ₹
                              {submission.payment_amount?.toFixed(2)} has been
                              received.
                            </p>
                            {submission.payment_id && (
                              <p className='mt-1 text-xs'>
                                Payment ID: {submission.payment_id}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className='text-center text-slate-600'>
                  Thank you for your submission. You may close this page now.
                </p>
              )}
            </CardContent>
          </div>

          <CardContent className='pt-0'>
            <div className='pt-4 flex flex-col sm:flex-row gap-3 justify-center'>
              <Button variant='default' className='w-full sm:w-auto' asChild>
                <Link href={`/forms/public/${formId}`}>Back to Form</Link>
              </Button>

              {!loading && submission && (
                <Button
                  variant='outline'
                  className='w-full sm:w-auto flex items-center gap-2'
                  onClick={handleDownloadImage}
                  disabled={downloading}
                >
                  <Download className='h-4 w-4' />
                  {downloading ? 'Generating...' : 'Download Receipt'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <footer className='py-4 text-center text-xs text-slate-500'>
        &copy; {new Date().getFullYear()} JKKN Institution. All rights reserved.
      </footer>
    </div>
  );
}
