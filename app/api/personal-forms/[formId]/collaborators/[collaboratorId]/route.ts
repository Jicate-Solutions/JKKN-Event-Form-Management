// app/api/personal-forms/[formId]/collaborators/[collaboratorId]/route.ts
// API routes for individual collaborator operations

import { NextRequest, NextResponse } from 'next/server';
import { PersonalFormService } from '@/lib/services/personal-form-service';
import { withAuthApi } from '@/lib/auth/with-auth-api';
import { UpdateCollaboratorPermissionsPayload } from '@/types/personal-forms';

/**
 * PUT /api/personal-forms/[formId]/collaborators/[collaboratorId]
 * Update collaborator permissions
 * Requires can_manage_collaborators permission
 */
export const PUT = withAuthApi(async (req, context, session) => {
  try {
    const params = await Promise.resolve(context.params);
    const { formId, collaboratorId } = params;
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
    const updates: UpdateCollaboratorPermissionsPayload = body;

    const collaborator = await PersonalFormService.updateCollaboratorPermissions(
      collaboratorId,
      updates
    );

    return NextResponse.json(collaborator, { status: 200 });
  } catch (error: any) {
    console.error('Error updating collaborator permissions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update collaborator permissions' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/personal-forms/[formId]/collaborators/[collaboratorId]
 * Remove a collaborator from a personal form
 * Requires can_manage_collaborators permission
 * Cannot remove the form creator
 */
export const DELETE = withAuthApi(async (req, context, session) => {
  try {
    const params = await Promise.resolve(context.params);
    console.log('[DELETE Collaborator] Raw params:', params);
    const { formId, collaboratorId } = params;
    console.log('[DELETE Collaborator] Extracted - formId:', formId, 'collaboratorId:', collaboratorId);
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

    // Get the form to check creator
    const form = await PersonalFormService.getPersonalForm(formId);

    // Get all collaborators to find the one being removed
    const collaborators = await PersonalFormService.getCollaborators(formId, supabase);

    console.log('[DELETE Collaborator] Searching for collaboratorId:', collaboratorId);
    console.log('[DELETE Collaborator] Available collaborators:', collaborators.map(c => ({ id: c.id, user_id: c.user_id })));

    const collaboratorToRemove = collaborators.find(
      (c) => String(c.id) === String(collaboratorId)
    );

    if (!collaboratorToRemove) {
      console.error('[DELETE Collaborator] Collaborator not found. Looking for:', collaboratorId);
      console.error('[DELETE Collaborator] Available IDs:', collaborators.map(c => c.id));
      return NextResponse.json(
        { error: 'Collaborator not found' },
        { status: 404 }
      );
    }

    // Check if trying to remove the creator
    if (collaboratorToRemove.user_id === form.created_by) {
      return NextResponse.json(
        { error: 'Cannot remove the form creator' },
        { status: 400 }
      );
    }

    console.log('[DELETE Collaborator] Removing collaborator:', collaboratorToRemove.id);
    await PersonalFormService.removeCollaborator(collaboratorId, supabase);

    return NextResponse.json(
      { message: 'Collaborator removed successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error removing collaborator:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove collaborator' },
      { status: 500 }
    );
  }
});
