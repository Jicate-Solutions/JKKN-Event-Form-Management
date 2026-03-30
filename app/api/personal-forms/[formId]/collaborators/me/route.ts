// app/api/personal-forms/[formId]/collaborators/me/route.ts
// Get current user's permissions for a personal form

import { NextRequest, NextResponse } from 'next/server';
import { PersonalFormService } from '@/lib/services/personal-form-service';
import { withAuthApi } from '@/lib/auth/with-auth-api';

/**
 * GET /api/personal-forms/[formId]/collaborators/me
 * Get current user's permissions for a personal form
 */
export const GET = withAuthApi(async (req, context, session) => {
  try {
    const params = await Promise.resolve(context.params);
    const { formId } = params;
    const user = session!.user;

    // Get server Supabase client
    const { createServerSupabaseClient } = await import('@/lib/supabase/server');
    const supabase = await createServerSupabaseClient();

    // Check if user is super_admin
    const isSuperAdmin = await PersonalFormService.isSuperAdmin(user.id, supabase);

    // Super admins have all permissions
    if (isSuperAdmin) {
      return NextResponse.json(
        {
          is_owner: false, // They're not the actual owner
          is_super_admin: true, // But they have super admin access
          can_edit_structure: true,
          can_view_responses: true,
          can_export_data: true,
          can_manage_collaborators: true
        },
        { status: 200 }
      );
    }

    // Get the form to check if user is creator
    const form = await PersonalFormService.getPersonalForm(formId, user.id, supabase);
    const isOwner = form.created_by === user.id;

    // If user is the creator, they have all permissions
    if (isOwner) {
      return NextResponse.json(
        {
          is_owner: true,
          can_edit_structure: true,
          can_view_responses: true,
          can_export_data: true,
          can_manage_collaborators: true
        },
        { status: 200 }
      );
    }

    // Get user's collaborator record
    const collaborator = await PersonalFormService.getUserCollaboratorRecord(
      formId,
      user.id,
      supabase
    );

    if (!collaborator) {
      return NextResponse.json(
        {
          is_owner: false,
          can_edit_structure: false,
          can_view_responses: false,
          can_export_data: false,
          can_manage_collaborators: false
        },
        { status: 200 }
      );
    }

    // Return user's permissions
    return NextResponse.json(
      {
        is_owner: collaborator.is_owner,
        can_edit_structure: collaborator.can_edit_structure,
        can_view_responses: collaborator.can_view_responses,
        can_export_data: collaborator.can_export_data,
        can_manage_collaborators: collaborator.can_manage_collaborators
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching user permissions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
});
