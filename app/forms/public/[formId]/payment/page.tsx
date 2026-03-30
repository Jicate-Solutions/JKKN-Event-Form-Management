'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { loadRazorpay } from '@/lib/utils/load-razorpay';
import { createOrder, verifyPayment } from '@/app/actions/razorpay';
import { BeatLoader } from 'react-spinners';
import Link from 'next/link';
import Image from 'next/image';

export default function PaymentPage() {
  const { formId } = useParams();
  const searchParams = useSearchParams();
  const submissionId = searchParams.get('submissionId');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [submission, setSubmission] = useState<any>(null);
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      if (!submissionId) {
        toast.error('Submission ID not found');
        window.location.href = `/forms/public/${formId}`;
        return;
      }

      try {
        const supabase = createClientSupabaseClient();
        console.log('Looking up submission with ID:', submissionId);

        // Get the form submission
        const submissionResponse = await supabase
          .from('form_responses')
          .select('*')
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
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('form_responses')
            .select('*')
            .eq('id', submissionId)
            .single();

          console.log('Fallback lookup result:', {
            fallbackData,
            fallbackError
          });

          if (fallbackError || !fallbackData) {
            throw new Error('Submission not found');
          }

          // Use the fallback data
          submissionData = fallbackData;
        }

        // Check if payment is already completed
        if (submissionData.payment_status === 'completed') {
          toast.success('Payment already completed');
          window.location.href = `/forms/public/${formId}/thank-you?submissionId=${submissionId}`;
          return;
        }

        // Get the form details
        const { data: formData, error: formError } = await supabase
          .from('forms')
          .select('*')
          .eq('id', submissionData.form_id)
          .single();

        if (formError || !formData) {
          throw new Error('Form not found');
        }

        setSubmission(submissionData);
        setForm(formData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load payment details');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [formId, submissionId]);

  const handlePayment = async () => {
    if (!submission || !form) return;

    setProcessing(true);

    try {
      // Load Razorpay script
      await loadRazorpay();

      // Debug payment amount
      console.log('Payment amount type:', typeof submission.payment_amount);
      console.log('Payment amount value:', submission.payment_amount);

      // Ensure payment amount is a valid number
      const paymentAmount = Number(submission.payment_amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        throw new Error('Invalid payment amount');
      }

      // Create order
      const orderResult = await createOrder({
        amount: paymentAmount,
        currency: 'INR',
        receipt: `receipt_${submission.submission_id.substring(0, 30)}`,
        notes: {
          form_id: form.id,
          form_title: form.title,
          submission_id: submission.submission_id
        }
      });

      if (orderResult.error) {
        toast.error(`Payment error: ${orderResult.error}`);
        setProcessing(false);
        return;
      }

      // Detect if user is on mobile
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      console.log('Device detection - Mobile:', isMobile);

      // Open Razorpay payment form
      const options: any = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: paymentAmount * 100,
        currency: 'INR',
        name: 'JKKN Institution',
        description: `Payment for ${form.title}`,
        order_id: orderResult.orderId,
        handler: async function (response: any) {
          // Verify payment
          console.log('Payment response received:', response);

          const verifyResult = await verifyPayment({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            submission_id: submission.submission_id
          });

          console.log('Payment verification result:', verifyResult);

          if (verifyResult.error) {
            // Check if this is a UPI-specific error
            if (verifyResult.upiError) {
              toast.error(verifyResult.error, { duration: 6000 });
              // Show a modal or alert with alternative payment methods
              if (
                confirm(
                  'Would you like to try again with a different payment method?'
                )
              ) {
                setProcessing(false);
                // Re-trigger payment flow
                setTimeout(() => handlePayment(), 500);
                return;
              } else {
                setProcessing(false);
                return;
              }
            } else {
              toast.error(verifyResult.error);
              return;
            }
          }

          toast.success('Payment successful');

          // For mobile devices, add a small delay and check payment status again
          if (isMobile) {
            toast.loading('Finalizing payment...');

            // Wait 3 seconds to allow webhook to process
            setTimeout(async () => {
              try {
                // Check payment status directly
                const supabase = createClientSupabaseClient();
                const { data, error } = await supabase
                  .from('form_responses')
                  .select('payment_status')
                  .eq('submission_id', submission.submission_id)
                  .single();

                console.log('Final payment status check:', data);

                // If still pending, try one more manual update
                if (data && data.payment_status === 'pending') {
                  console.log(
                    'Payment still pending, attempting manual update'
                  );

                  // Try one more verification
                  await verifyPayment({
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature,
                    submission_id: submission.submission_id
                  });
                }

                toast.dismiss();
                window.location.href = `/forms/public/${formId}/thank-you?submissionId=${submissionId}`;
              } catch (err) {
                console.error('Error in final status check:', err);
                toast.dismiss();
                window.location.href = `/forms/public/${formId}/thank-you?submissionId=${submissionId}`;
              }
            }, 3000);
          } else {
            // For desktop, proceed directly
            window.location.href = `/forms/public/${formId}/thank-you?submissionId=${submissionId}`;
          }
        },
        prefill: {
          email: submission.user_email,
          contact: ''
        },
        theme: {
          color: '#4f46e5'
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
            toast.error('Payment cancelled');
          }
        }
      };

      // Add improved configuration for UPI payments in India
      if (isMobile) {
        options.config = {
          display: {
            blocks: {
              upi: {
                name: 'Pay via UPI',
                instruments: [{ method: 'upi' }]
              },
              cards: {
                name: 'Pay via Cards',
                instruments: [{ method: 'card' }]
              },
              netbanking: {
                name: 'Pay via Net Banking',
                instruments: [{ method: 'netbanking' }]
              }
            },
            sequence: ['upi', 'cards', 'netbanking'],
            preferences: {
              show_default_blocks: false
            }
          }
        };
      }

      const razorpay = new (window as any).Razorpay(options);
      razorpay.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);

        // Check for specific UPI restriction error
        if (
          response.error.reason === 'transaction_on_vpa_restricted' ||
          response.error.description?.includes(
            "recipient's bank is currently unable to receive money"
          )
        ) {
          toast.error(
            'Your UPI ID has been temporarily restricted. Please try using a different UPI ID or payment method.',
            { duration: 6000 }
          );
        } else {
          toast.error('Payment failed: ' + response.error.description);
        }

        setProcessing(false);
      });
      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-screen p-4'>
        <div className='text-center'>
          <BeatLoader color='#4f46e5' />
          <p className='mt-4 text-slate-600'>Loading payment details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        <div className='mb-6 text-center'>
          <h1 className='text-2xl font-bold text-slate-900'>
            JKKN Institution
          </h1>
          <p className='text-slate-500 mt-1'>Payment Gateway</p>
        </div>

        <Card className='shadow-lg border-0'>
          <CardHeader className='pb-4 bg-gradient-to-r from-lime-600 to-lime-700 text-white rounded-t-lg'>
            <CardTitle className='text-xl md:text-2xl'>
              Complete Your Payment
            </CardTitle>
            <CardDescription className='text-indigo-100'>
              Please complete the payment to finalize your form submission
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6 p-6'>
            <div className='space-y-4'>
              <div className='flex justify-between items-center pb-3 border-b border-slate-100'>
                <p className='text-sm font-medium text-slate-500'>Form</p>
                <p className='font-medium text-slate-900'>{form?.title}</p>
              </div>

              <div className='flex justify-between items-center pb-3 border-b border-slate-100'>
                <p className='text-sm font-medium text-slate-500'>Email</p>
                <p className='font-medium text-slate-900'>
                  {submission?.user_email}
                </p>
              </div>

              <div className='flex justify-between items-center pb-3 border-b border-slate-100'>
                <p className='text-sm font-medium text-slate-500'>
                  Reference ID
                </p>
                <p className='font-medium text-slate-900'>
                  {submission?.submission_id}
                </p>
              </div>

              <div className='flex justify-between items-center pt-2'>
                <p className='text-sm font-medium text-slate-500'>Amount</p>
                <p className='text-3xl font-bold text-lime-600'>
                  ₹{Number(submission?.payment_amount).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Add payment method guidance for mobile users */}
            {/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && (
              <div className='p-4 bg-blue-50 border border-blue-100 rounded-md text-sm'>
                <p className='font-medium text-lime-800 flex items-center'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className='h-4 w-4 mr-1'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                  Payment Tips:
                </p>
                <ul className='list-disc pl-5 mt-2 text-blue-700 space-y-1'>
                  <li>
                    If UPI payment fails, try using a different UPI app (Google
                    Pay, PhonePe, Paytm)
                  </li>
                  <li>Alternatively, use a debit/credit card for payment</li>
                  <li>Ensure your UPI app is up-to-date</li>
                </ul>
              </div>
            )}

            <div className='pt-4'>
              <Button
                className='w-full py-6 text-base font-medium bg-lime-600 hover:bg-lime-700'
                onClick={handlePayment}
                disabled={processing}
              >
                {processing ? (
                  <span className='flex items-center justify-center'>
                    <BeatLoader size={8} color='#ffffff' className='mr-2' />
                    Processing...
                  </span>
                ) : (
                  <span className='flex items-center justify-center'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      className='h-5 w-5 mr-2'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z'
                      />
                    </svg>
                    Pay Now
                  </span>
                )}
              </Button>
            </div>

            <div className='flex items-center justify-center space-x-4 mt-6 pt-4 border-t border-slate-100'>
              <div className='flex items-center'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='h-4 w-4 text-slate-400 mr-1'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                  />
                </svg>
                <span className='text-xs text-slate-500'>Secure payment</span>
              </div>

              <div className='flex items-center'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='h-4 w-4 text-slate-400 mr-1'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                  />
                </svg>
                <span className='text-xs text-slate-500'>
                  Powered by Razorpay
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className='mt-6 text-center'>
          <Link
            href={`/forms/public/${formId}`}
            className='text-sm text-lime-600 hover:text-lime-800 hover:underline'
          >
            Return to form
          </Link>
        </div>
      </div>
    </div>
  );
}
