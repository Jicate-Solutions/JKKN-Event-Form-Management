import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createAdminClient } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    // Get the webhook payload
    const payload = await req.json();
    console.log('Received Razorpay webhook:', payload);

    // Verify webhook signature
    const webhookSignature = req.headers.get('x-razorpay-signature');
    if (!webhookSignature) {
      console.error('Missing Razorpay signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify the webhook signature
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('Webhook secret not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    const shasum = createHmac('sha256', secret);
    shasum.update(JSON.stringify(payload));
    const digest = shasum.digest('hex');

    if (digest !== webhookSignature) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Process the webhook based on event type
    const event = payload.event;

    if (event === 'payment.authorized' || event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;

      console.log('Processing payment webhook:', {
        event,
        paymentId,
        orderId
      });

      // Get the order details to find the submission ID
      const razorpay = new (await import('razorpay')).default({
        key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!
      });

      const order = await razorpay.orders.fetch(orderId);
      console.log('Order details:', order);

      // Extract submission ID from order notes
      const submissionId = order.notes?.submission_id;
      if (!submissionId) {
        console.error('No submission ID found in order notes');
        return NextResponse.json(
          { error: 'No submission ID found' },
          { status: 400 }
        );
      }

      // Convert to string if it's a number
      const submissionIdString = String(submissionId);

      // Update the payment status in the database
      const supabase = createAdminClient();

      // Find the submission
      const { data: submission, error: fetchError } = await supabase
        .from('form_responses')
        .select('id, payment_status')
        .eq('submission_id', submissionIdString)
        .single();

      if (fetchError || !submission) {
        console.error('Error finding submission:', fetchError);
        return NextResponse.json(
          { error: 'Submission not found' },
          { status: 404 }
        );
      }

      // Skip update if already completed
      if (submission.payment_status === 'completed') {
        console.log('Payment already marked as completed');
        return NextResponse.json({
          success: true,
          status: 'already_completed'
        });
      }

      // Update payment status
      const { data: updatedData, error: updateError } = await supabase
        .from('form_responses')
        .update({
          payment_status: 'completed',
          payment_id: paymentId,
          payment_updated_at: new Date().toISOString()
        })
        .eq('id', submission.id)
        .select();

      if (updateError) {
        console.error('Error updating payment status:', updateError);
        return NextResponse.json(
          { error: 'Failed to update payment status' },
          { status: 500 }
        );
      }

      console.log('Payment status updated via webhook:', updatedData);
      return NextResponse.json({ success: true });
    }

    // For other events, just acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
