import { Resend } from 'resend';
import FormSubmissionEmail from '@/components/emails/form-submission-email';
import { ReactElement } from 'react';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

export interface FormSubmissionEmailData {
  formTitle: string;
  formDescription?: string;
  submissionId: string;
  submissionDate: string;
  userEmail: string;
  paymentStatus?: string;
  paymentAmount?: number;
  paymentId?: string;
  paymentDate?: string;
}

export const EmailService = {
  /**
   * Send form submission confirmation email
   */
  async sendFormSubmissionEmail(data: FormSubmissionEmailData) {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY is not defined');
        return { error: 'Email service not configured' };
      }

      const { userEmail, formTitle, ...emailProps } = data;

      const emailComponent = FormSubmissionEmail({
        formTitle,
        userEmail,
        ...emailProps
      }) as ReactElement;

      const { data: emailData, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'JKKN Institutions <no-reply@jkkn.edu.in>',
        to: userEmail,
        subject: `Form Submission Confirmation - ${formTitle}`,
        react: emailComponent,
      });

      if (error) {
        console.error('Error sending email:', error);
        return { error };
      }

      return { data: emailData };
    } catch (error) {
      console.error('Error in sendFormSubmissionEmail:', error);
      return { error };
    }
  }
};
