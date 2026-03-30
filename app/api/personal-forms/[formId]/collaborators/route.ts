// app/api/personal-forms/[formId]/collaborators/route.ts
// API routes for collaborator management

import { NextRequest, NextResponse } from 'next/server';
import { PersonalFormService } from '@/lib/services/personal-form-service';
import { withAuthApi } from '@/lib/auth/with-auth-api';
import { AddCollaboratorPayload } from '@/types/personal-forms';

/**
 * GET /api/personal-forms/[formId]/collaborators
 * Get all collaborators for a personal form
 * Requires can_manage_collaborators permission or being a collaborator
 */
export const GET = withAuthApi(async (req, context, session) => {
  try {
    const params = await Promise.resolve(context.params);
    const { formId } = params;
    const user = session!.user;

    // Get server Supabase client for proper authentication
    const { createServerSupabaseClient } = await import('@/lib/supabase/server');
    const supabase = await createServerSupabaseClient();

    // Check if user is super_admin
    const isSuperAdmin = await PersonalFormService.isSuperAdmin(user.id, supabase);

    // If not super_admin, check if user has access to view collaborators
    if (!isSuperAdmin) {
      const userCollaborator = await PersonalFormService.getUserCollaboratorRecord(
        formId,
        user.id,
        supabase
      );

      // User must be a collaborator to view collaborators (unless super_admin)
      if (!userCollaborator) {
        return NextResponse.json(
          { error: 'You do not have access to this form' },
          { status: 403 }
        );
      }
    }

    const collaborators = await PersonalFormService.getCollaborators(formId, supabase);

    return NextResponse.json(collaborators, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching collaborators:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch collaborators' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/personal-forms/[formId]/collaborators
 * Add a new collaborator to a personal form
 * Requires can_manage_collaborators permission
 */
export const POST = withAuthApi(async (req, context, session) => {
  try {
    const params = await Promise.resolve(context.params);
    const { formId } = params;
    const user = session!.user;

    // Get server Supabase client for proper authentication
    const { createServerSupabaseClient } = await import('@/lib/supabase/server');
    const supabase = await createServerSupabaseClient();

    // Check if user has manage permission
    const hasPermission = await PersonalFormService.checkUserPermission(
      formId,
      user.id,
      'can_manage_collaborators',
      supabase
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to manage collaborators' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Validate required fields
    if (!body.user_id) {
      return NextResponse.json(
        { error: 'Missing required field: user_id' },
        { status: 400 }
      );
    }

    // Don't allow adding the form creator again
    const form = await PersonalFormService.getPersonalForm(formId);
    if (body.user_id === form.created_by) {
      return NextResponse.json(
        { error: 'Form creator is already an owner and cannot be added again' },
        { status: 400 }
      );
    }

    const payload: AddCollaboratorPayload = {
      personal_form_id: formId,
      user_id: body.user_id,
      can_edit_structure: body.can_edit_structure ?? false,
      can_view_responses: body.can_view_responses ?? false,
      can_export_data: body.can_export_data ?? false,
      can_manage_collaborators: body.can_manage_collaborators ?? false,
      is_owner: body.is_owner ?? false,
      added_by: user.id
    };

    const collaborator = await PersonalFormService.addCollaborator(payload, undefined, supabase);

    return NextResponse.json(collaborator, { status: 201 });
  } catch (error: any) {
    console.error('Error adding collaborator:', error);

    if (error.message.includes('already a collaborator')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to add collaborator' },
      { status: 500 }
    );
  }
});
