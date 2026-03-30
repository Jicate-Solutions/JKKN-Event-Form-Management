// app/api/personal-forms/[formId]/responses/route.ts
// API routes for form response management

import { NextRequest, NextResponse } from 'next/server';
import { PersonalFormService } from '@/lib/services/personal-form-service';
import { withAuthApi } from '@/lib/auth/with-auth-api';
import { SubmitPersonalFormResponsePayload } from '@/types/personal-forms';
import {
  isEmailDomainAllowed,
  formatDomainsForDisplay
} from '@/lib/utils/domain-validation';
import { MYJKKNApiService } from '@/lib/services/myjkkn-api-service';
import { UserProfile, PersonalForm } from '@/types/personal-forms';

/**
 * Fetch user profile if autofetch is enabled
 * Throws error if require_institutional_profile is true and user not found
 */
async function fetchUserProfileIfEnabled(
  form: PersonalForm,
  userEmail: string | null
): Promise<UserProfile | null> {
  console.log('\n========== MYJKKN AUTO-FETCH DEBUG ==========');
  console.log('[Auto-Fetch] Form Settings:', {
    formId: form.id,
    formTitle: form.title,
    enable_user_autofetch: form.enable_user_autofetch,
    require_institutional_profile: form.require_institutional_profile,
    allow_manual_entry_fallback: form.allow_manual_entry_fallback,
    userEmail: userEmail
  });

  // Check if autofetch is enabled
  if (!form.enable_user_autofetch) {
    console.log('[Auto-Fetch] ❌ Auto-fetch is DISABLED for this form');
    console.log('============================================\n');
    return null;
  }

  if (!userEmail) {
    console.log('[Auto-Fetch] ❌ No user email provided for auto-fetch');
    console.log('============================================\n');
    return null;
  }

  try {
    console.log('[Auto-Fetch] ✅ Starting auto-fetch for:', userEmail);
    console.log('[Auto-Fetch] Using system-wide MYJKKN API key from environment');

    // API key is now managed centrally via environment variables
    // No need to pass it - MYJKKNApiService will use process.env.MYJKKN_API_KEY
    const profile = await MYJKKNApiService.getUserProfile(userEmail);

    if (profile) {
      console.log('[Auto-Fetch] ✅ Profile found successfully!');
      console.log('[Auto-Fetch] Profile data:', {
        user_type: profile.user_type,
        full_name: profile.full_name,
        email: profile.email,
        mobile: profile.mobile,
        institution_name: profile.institution_name,
        department_name: profile.department_name,
        identifier: profile.identifier,
        additional_info: profile.additional_info,
        is_active: profile.is_active
      });
      console.log('============================================\n');
      return profile;
    } else {
      console.log('[Auto-Fetch] ⚠️ No profile found in MYJKKN for:', userEmail);

      // Check if institutional profile is required
      if (form.require_institutional_profile) {
        console.log('[Auto-Fetch] ❌ Profile is REQUIRED - blocking submission');
        console.log('============================================\n');
        throw new Error('PROFILE_REQUIRED');
      }

      console.log('[Auto-Fetch] ℹ️ Profile not required - allowing submission without profile');
      console.log('============================================\n');
      // Otherwise, allow submission without profile
      return null;
    }
  } catch (error: any) {
    console.error('[Auto-Fetch] ❌ Error fetching user profile:', error);
    console.error('[Auto-Fetch] Error details:', {
      message: error.message,
      stack: error.stack
    });

    // If profile is required, throw the error to block submission
    if (
      form.require_institutional_profile ||
      error.message === 'PROFILE_REQUIRED'
    ) {
      console.log('[Auto-Fetch] ❌ Blocking submission due to profile requirement');
      console.log('============================================\n');
      throw error;
    }

    console.log('[Auto-Fetch] ℹ️ Continuing submission despite error (profile not required)');
    console.log('============================================\n');
    // Otherwise, don't block submission
    return null;
  }
}

/**
 * GET /api/personal-forms/[formId]/responses
 * Get responses for a personal form
 * Requires can_view_responses permission
 */
export const GET = withAuthApi(async (req, context, session) => {
  try {
    const { formId } = context.params;
    const user = session!.user;

    // Create server Supabase client for database operations
    const { createServerSupabaseClient } = await import(
      '@/lib/supabase/server'
    );
    const supabase = await createServerSupabaseClient();

    // Check if user is the creator first
    const form = await PersonalFormService.getPersonalForm(
      formId,
      undefined,
      supabase
    );
    const isCreator = form.created_by === user.id;

    // If not creator, check if user has view responses permission
    if (!isCreator) {
      const hasPermission = await PersonalFormService.checkUserPermission(
        formId,
        user.id,
        'can_view_responses',
        supabase // Pass the server Supabase client
      );

      if (!hasPermission) {
        return NextResponse.json(
          {
            error: 'You do not have permission to view responses for this form'
          },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || undefined;

    // Pass server Supabase client for proper authentication context
    const result = await PersonalFormService.getResponses(
      formId,
      user.id,
      page,
      limit,
      supabase,
      search
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching responses:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch responses' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/personal-forms/[formId]/responses
 * Submit a response to a personal form
 * Public endpoint if form is published and public
 * Authenticated endpoint otherwise
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ formId: string }> | { formId: string } }
) {
  try {
    const params =
      context.params instanceof Promise ? await context.params : context.params;
    const { formId } = params;

    // Get the form to check if it's public
    const form = await PersonalFormService.getPersonalForm(formId);

    // Check if form is published
    if (form.status !== 'published') {
      return NextResponse.json(
        { error: 'This form is not accepting responses' },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Validate required fields
    if (!body.response_data) {
      return NextResponse.json(
        { error: 'Missing required field: response_data' },
        { status: 400 }
      );
    }

    // Check domain restriction if enabled
    if (
      form.restrict_domain &&
      form.allowed_domains &&
      form.allowed_domains.length > 0
    ) {
      const submissionEmail = body.user_email;

      // Require email for domain-restricted forms
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

      // Validate email domain
      if (!isEmailDomainAllowed(submissionEmail, form.allowed_domains)) {
        return NextResponse.json(
          {
            error: 'Access Restricted',
            message: `Only users with ${formatDomainsForDisplay(form.allowed_domains)} email addresses can submit this form.`,
            restrictedDomains: form.allowed_domains,
            providedEmail: submissionEmail
          },
          { status: 403 }
        );
      }
    }

    // If form is public, allow anonymous submissions using admin client to bypass RLS
    if (form.is_public) {
      // Use admin client for public submissions to bypass RLS policies
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const supabase = createAdminClient();

      // Check if form can accept submissions
      const { data: canAcceptData, error: checkError } = await supabase.rpc(
        'can_accept_personal_form_submission',
        { form_id: formId }
      );

      if (checkError || !canAcceptData) {
        return NextResponse.json(
          { error: 'Form has reached its submission limit' },
          { status: 400 }
        );
      }

      // Fetch user profile if autofetch is enabled
      let userProfile = null;
      try {
        userProfile = await fetchUserProfileIfEnabled(
          form,
          body.user_email || null
        );
      } catch (profileError: any) {
        console.error(
          '[Auto-Fetch] Profile fetch failed:',
          profileError.message
        );

        // If profile is required and user not found, block submission
        if (
          profileError.message === 'PROFILE_REQUIRED' ||
          form.require_institutional_profile
        ) {
          return NextResponse.json(
            {
              error: 'Email Not Registered',
              message: `Your email (${body.user_email}) was not found in the MYJKKN system. This form requires a valid institutional profile. Please ensure you're using your institutional email (@jkkn.ac.in) or contact the administrator.`,
              code: 'PROFILE_NOT_FOUND',
              allow_manual_fallback: form.allow_manual_entry_fallback
            },
            { status: 404 }
          );
        }

        // Otherwise, continue without profile (already null)
        console.log(
          '[Auto-Fetch] Continuing submission without profile (graceful fallback)'
        );
      }

      // Use RPC function for atomic submission_id generation and insert
      // This prevents duplicate submission_id errors from concurrent submissions
      const { data: response, error: insertError } = await supabase
        .rpc('create_personal_form_response', {
          p_personal_form_id: formId,
          p_response_data: body.response_data,
          p_user_email: body.user_email || null,
          p_submitted_by: null,
          p_is_anonymous: body.is_anonymous ?? true,
          p_user_profile: (userProfile as any) || null
        })
        .single();

      if (insertError) {
        console.error('Error inserting response:', insertError);
        throw insertError;
      }

      return NextResponse.json(response, { status: 201 });
    }

    // If form is not public, require authentication
    return withAuthApi(async (req, context, session) => {
      const user = session!.user;
      const payload: SubmitPersonalFormResponsePayload = {
        personal_form_id: formId,
        response_data: body.response_data,
        submitted_by: user.id,
        user_email: body.user_email || user.email,
        is_anonymous: body.is_anonymous ?? false
      };

      const response = await PersonalFormService.submitResponse(payload);
      return NextResponse.json(response, { status: 201 });
    })(req, context);
  } catch (error: any) {
    console.error('Error submitting response:', error);

    if (error.message.includes('submission limit')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to submit response' },
      { status: 500 }
    );
  }
}
