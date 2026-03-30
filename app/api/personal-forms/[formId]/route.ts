// app/api/personal-forms/[formId]/route.ts
// API routes for individual personal form operations

import { NextRequest, NextResponse } from 'next/server';
import { PersonalFormService } from '@/lib/services/personal-form-service';
import { withAuthApi } from '@/lib/auth/with-auth-api';
import { UpdatePersonalFormPayload } from '@/types/personal-forms';

/**
 * GET /api/personal-forms/[formId]
 * Get a single personal form by ID or slug
 */
export const GET = withAuthApi(async (req, context, session) => {
  try {
    const { formId } = context.params;
    const user = session!.user;

    // Get server Supabase client
    const { createServerSupabaseClient } = await import('@/lib/supabase/server');
    const supabase = await createServerSupabaseClient();

    const form = await PersonalFormService.getPersonalForm(formId, user.id, supabase);

    return NextResponse.json(form, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching personal form:', error);

    if (error.message === 'Personal form not found') {
      return NextResponse.json(
        { error: 'Personal form not found' },
        { status: 404 }
      );
    }

    if (error.message === 'You do not have access to this form') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch personal form' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/personal-forms/[formId]
 * Update a personal form
 * Requires can_edit_structure permission
 */
export const PUT = withAuthApi(async (req, context, session) => {
  try {
    const { formId } = context.params;
    const user = session!.user;

    const body = await req.json();
    const updates: UpdatePersonalFormPayload = body;

    // Log form update configuration
    console.log('[Form Update] Configuration:', {
      enable_user_autofetch: updates.enable_user_autofetch,
      restrict_domain: updates.restrict_domain,
      allowed_domains: updates.allowed_domains
    });

    // Get server Supabase client
    const { createServerSupabaseClient } = await import(
      '@/lib/supabase/server'
    );
    const supabase = await createServerSupabaseClient();

    // Permission check is done inside updatePersonalForm
    const form = await PersonalFormService.updatePersonalForm(
      formId,
      updates,
      user.id,
      supabase
    );

    return NextResponse.json(form, { status: 200 });
  } catch (error: any) {
    console.error('Error updating personal form:', error);

    if (error.message === 'You do not have permission to edit this form') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update personal form' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/personal-forms/[formId]
 * Delete a personal form
 * Only the creator can delete
 */
export const DELETE = withAuthApi(async (req, context, session) => {
  try {
    const { formId } = context.params;
    const user = session!.user;

    console.log('[API DELETE] Starting delete process for form:', formId);
    console.log('[API DELETE] User ID:', user.id);

    // Get server Supabase client
    const { createServerSupabaseClient } = await import('@/lib/supabase/server');
    const supabase = await createServerSupabaseClient();

    // Get the form to check creator (pass userId and server client for permission check)
    console.log('[API DELETE] Fetching form to check permissions...');
    const form = await PersonalFormService.getPersonalForm(formId, user.id, supabase);
    console.log('[API DELETE] Form fetched:', { id: form.id, title: form.title, created_by: form.created_by });

    // Only creator can delete
    if (form.created_by !== user.id) {
      console.error('[API DELETE] Permission denied - user is not creator');
      console.error('[API DELETE] Form creator:', form.created_by, 'User ID:', user.id);
      return NextResponse.json(
        { error: 'Only the form creator can delete this form' },
        { status: 403 }
      );
    }

    console.log('[API DELETE] Permission check passed - calling deletePersonalForm...');
    await PersonalFormService.deletePersonalForm(formId, supabase);
    console.log('[API DELETE] Form deleted successfully from database');

    return NextResponse.json(
      { message: 'Personal form deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API DELETE] Error deleting personal form:', error);
    console.error('[API DELETE] Error stack:', error.stack);

    if (error.message === 'You do not have access to this form') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to delete personal form' },
      { status: 500 }
    );
  }
});
