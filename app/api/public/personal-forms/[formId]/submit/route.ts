// app/api/public/personal-forms/[formId]/submit/route.ts
// Public submission endpoint for personal forms — NO authentication required
// Used by anonymous users scanning QR codes to submit forms

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  isEmailDomainAllowed,
  formatDomainsForDisplay
} from '@/lib/utils/domain-validation';

/**
 * POST /api/public/personal-forms/[formId]/submit
 * Submit a response to a public personal form without authentication.
 * Uses service role client to bypass RLS.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ formId: string }> | { formId: string } }
) {
  try {
    const params =
      context.params instanceof Promise ? await context.params : context.params;
    const { formId } = params;

    // Use admin client (service role) since there's no auth
    const supabase = createAdminClient();

    // 1. Validate the form exists, is public, and is published
    const { data: form, error: formError } = await supabase
      .from('personal_forms')
      .select(
        'id, title, status, is_public, submission_limit, restrict_domain, allowed_domains, fields, enable_user_autofetch, require_institutional_profile, allow_manual_entry_fallback'
      )
      .eq('id', formId)
      .single();

    if (formError || !form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    if (!form.is_public) {
      return NextResponse.json(
        { error: 'This form is not available for public submissions' },
        { status: 403 }
      );
    }

    if (form.status !== 'published') {
      return NextResponse.json(
        { error: 'This form is not currently accepting responses' },
        { status: 400 }
      );
    }

    // 2. Parse request body — accept both "responses" and "response_data" keys
    const body = await req.json();
    const responseData = body.response_data || body.responses;

    if (!responseData || typeof responseData !== 'object') {
      return NextResponse.json(
        {
          error: 'Missing required field: response_data (or responses)',
          hint: 'Send JSON with key "response_data" or "responses" containing field values'
        },
        { status: 400 }
      );
    }

    // 3. Validate required fields from form definition
    const fields = Array.isArray(form.fields) ? form.fields : [];
    const requiredFields = fields.filter((f: any) => f.required);
    const missingFields = requiredFields.filter(
      (f: any) => !responseData[f.id] || responseData[f.id] === ''
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          missing: missingFields.map((f: any) => ({
            id: f.id,
            label: f.label
          }))
        },
        { status: 400 }
      );
    }

    // 4. Check domain restriction if enabled
    const submissionEmail = body.user_email || body.email || null;

    if (
      form.restrict_domain &&
      form.allowed_domains &&
      form.allowed_domains.length > 0
    ) {
      if (!submissionEmail) {
        return NextResponse.json(
          {
            error: 'Email Required',
            message: `This form requires an email address from ${formatDomainsForDisplay(form.allowed_domains)}.`,
            restrictedDomains: form.allowed_domains
          },
          { status: 400 }
        );
      }

      if (!isEmailDomainAllowed(submissionEmail, form.allowed_domains)) {
        return NextResponse.json(
          {
            error: 'Access Restricted',
            message: `Only users with ${formatDomainsForDisplay(form.allowed_domains)} email addresses can submit this form.`,
            restrictedDomains: form.allowed_domains
          },
          { status: 403 }
        );
      }
    }

    // 5. Check submission limit
    const { data: canAcceptData, error: checkError } = await supabase.rpc(
      'can_accept_personal_form_submission',
      { form_id: formId }
    );

    if (checkError || !canAcceptData) {
      return NextResponse.json(
        { error: 'This form has reached its maximum number of submissions' },
        { status: 400 }
      );
    }

    // 6. Insert response using the RPC function for atomic submission_id generation
    const { data: response, error: insertError } = await supabase
      .rpc('create_personal_form_response', {
        p_personal_form_id: formId,
        p_response_data: responseData,
        p_user_email: submissionEmail,
        p_submitted_by: null,
        p_is_anonymous: body.is_anonymous ?? true,
        p_user_profile: null
      })
      .single();

    if (insertError) {
      console.error('Error inserting public response:', insertError);
      return NextResponse.json(
        { error: 'Failed to submit response. Please try again.' },
        { status: 500 }
      );
    }

    // 7. Return success
    return NextResponse.json(
      {
        success: true,
        message: 'Thank you! Your response has been submitted successfully.',
        submission_id: response.submission_id,
        submitted_at: response.submitted_at
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Public form submission error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
