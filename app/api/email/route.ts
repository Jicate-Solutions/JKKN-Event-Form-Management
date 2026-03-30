import { NextRequest, NextResponse } from 'next/server';
import { EmailService, FormSubmissionEmailData } from '@/lib/services/email-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formTitle, formDescription, submissionId, userEmail, paymentStatus, paymentAmount, paymentId } = body as FormSubmissionEmailData;

    // Validate required fields
    if (!formTitle || !submissionId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Format dates
    const submissionDate = body.submissionDate || new Date().toLocaleString();
    const paymentDate = body.paymentDate || (paymentId ? new Date().toLocaleString() : undefined);

    // Send email
    const result = await EmailService.sendFormSubmissionEmail({
      formTitle,
      formDescription,
      submissionId,
      submissionDate,
      userEmail,
      paymentStatus,
      paymentAmount,
      paymentId,
      paymentDate,
    });

    if (result.error) {
      console.error('Failed to send email:', result.error);
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error in email API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
