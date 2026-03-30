'use server';

import Razorpay from 'razorpay';
import { createHmac } from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/client';

interface CreateOrderInput {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export async function createOrder(input: CreateOrderInput) {
  try {
    const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      console.error('Razorpay keys are missing');
      return { error: 'Payment configuration error' };
    }

    const instance = new Razorpay({
      key_id,
      key_secret
    });

    // Ensure amount is a valid number
    const amount = Number(input.amount);
    if (isNaN(amount) || amount <= 0) {
      console.error('Invalid payment amount:', input.amount);
      return { error: 'Invalid payment amount' };
    }

    // Ensure receipt is not too long (Razorpay limit is 40 characters)
    const receipt = input.receipt.substring(0, 40);

    const order = await instance.orders.create({
      amount: Math.round(amount * 100), // Convert to smallest currency unit
      currency: input.currency,
      receipt: receipt,
      notes: input.notes || {}
    });

    if (!order) {
      return { error: 'Error creating order' };
    }

    return { orderId: order.id };
  } catch (error) {
    console.error('Error creating order:', error);

    // Extract error message in a type-safe way
    let errorMessage = 'Failed to create payment order';

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object') {
      // Try to extract Razorpay error description
      try {
        const errorObj = error as any;
        if (errorObj.error?.description) {
          errorMessage = String(errorObj.error.description);
        }
      } catch (e) {
        // If extraction fails, use default error message
      }
    }

    return { error: errorMessage };
  }
}

interface VerifyPaymentInput {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  submission_id: string;
}

export async function verifyPayment(data: VerifyPaymentInput) {
  try {
    console.log('Starting payment verification process:', {
      payment_id: data.razorpay_payment_id,
      order_id: data.razorpay_order_id,
      submission_id: data.submission_id
    });

    // Verify signature
    const shasum = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!);
    shasum.update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== data.razorpay_signature) {
      console.error('Signature verification failed:', {
        calculated: digest,
        received: data.razorpay_signature
      });
      return { error: 'Invalid payment signature' };
    }

    console.log('Signature verification successful');

    // Fetch payment details from Razorpay to confirm status
    try {
      const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      const key_secret = process.env.RAZORPAY_KEY_SECRET;

      if (!key_id || !key_secret) {
        console.error('Razorpay keys are missing');
        return { error: 'Payment configuration error' };
      }

      const instance = new Razorpay({
        key_id,
        key_secret
      });

      // Fetch payment details to verify status
      const paymentDetails = await instance.payments.fetch(
        data.razorpay_payment_id
      );
      console.log('Payment details from Razorpay:', paymentDetails);

      // If payment is not captured or authorized, log the issue
      if (
        paymentDetails.status !== 'captured' &&
        paymentDetails.status !== 'authorized'
      ) {
        console.error('Payment not captured or authorized:', paymentDetails);

        // If there's a specific error related to UPI, log it
        if (
          paymentDetails.error_code === 'BAD_REQUEST_ERROR' &&
          paymentDetails.error_reason === 'transaction_on_vpa_restricted'
        ) {
          return {
            error:
              'Your UPI ID has been temporarily restricted. Please try using a different UPI ID or payment method.',
            upiError: true
          };
        }

        // Continue with the process anyway, as the webhook might update it later
        console.log(
          'Continuing with verification despite payment status:',
          paymentDetails.status
        );
      }
    } catch (razorpayError) {
      // Log the error but continue with the process
      console.error(
        'Error fetching payment details from Razorpay:',
        razorpayError
      );
      console.log('Continuing with verification despite Razorpay API error');
    }

    // Use admin client to bypass RLS policies
    const supabase = createAdminClient();

    console.log('Updating payment status for submission:', data.submission_id);

    // First, try to get the submission by submission_id
    const submissionResponse = await supabase
      .from('form_responses')
      .select('id, payment_status')
      .eq('submission_id', data.submission_id)
      .single();

    let submissionData = submissionResponse.data;
    const fetchError = submissionResponse.error;

    // If not found by submission_id, try by internal id
    if (fetchError || !submissionData) {
      console.log('Submission not found by submission_id, trying internal ID');
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('form_responses')
        .select('id, payment_status')
        .eq('id', data.submission_id)
        .single();

      if (fallbackError || !fallbackData) {
        console.error('Error fetching submission by both methods:', {
          fetchError,
          fallbackError
        });
        return { error: 'Failed to find submission' };
      }

      submissionData = fallbackData;
    }

    console.log('Found submission:', submissionData);

    // Check if payment is already marked as completed
    if (submissionData.payment_status === 'completed') {
      console.log('Payment already marked as completed, skipping update');
      return { success: true, alreadyCompleted: true };
    }

    // Update payment status using the internal ID
    const { data: updatedData, error } = await supabase
      .from('form_responses')
      .update({
        payment_status: 'completed',
        payment_id: data.razorpay_payment_id,
        payment_updated_at: new Date().toISOString()
      })
      .eq('id', submissionData.id)
      .select('*, forms(title, description)');

    if (error) {
      console.error('Database update error:', error);
      return { error: 'Failed to update payment status' };
    }

    console.log('Payment status updated successfully:', updatedData);

    // Send email notification with payment details
    try {
      if (updatedData && updatedData[0]) {
        const formResponse = updatedData[0];
        const formTitle = formResponse.forms?.title || 'Form Submission';
        const formDescription = formResponse.forms?.description;

        // Send email with payment details
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            formTitle,
            formDescription,
            submissionId: formResponse.submission_id,
            submissionDate: new Date(
              formResponse.submitted_at || ''
            ).toLocaleString(),
            userEmail: formResponse.user_email,
            paymentStatus: 'completed',
            paymentAmount: formResponse.payment_amount,
            paymentId: data.razorpay_payment_id,
            paymentDate: new Date().toLocaleString()
          })
        });

        console.log(
          'Payment confirmation email sent to:',
          formResponse.user_email
        );
      }
    } catch (emailError) {
      console.error('Error sending payment confirmation email:', emailError);
      // Don't throw error here to avoid blocking payment verification
    }

    return { success: true };
  } catch (error) {
    console.error('Error verifying payment:', error);
    return { error: 'Payment verification failed' };
  }
}
