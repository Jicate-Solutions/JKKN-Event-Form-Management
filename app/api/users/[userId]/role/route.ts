import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/supabase/server';
import { createErrorResponse } from '@/lib/utils';
import { RoleService } from '@/lib/services/users/role-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    // Check authentication
    const { session, error: authError } = await getAuthSession();
    if (authError || !session) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Parse and validate new role
    const body = await request.json();
    const newRole = body.role as string;

    if (!newRole || !RoleService.isValidRole(newRole)) {
      return createErrorResponse('Invalid role specified', 400);
    }

    // Check if user can modify the role
    const { allowed, error: permissionError } = await RoleService.canModifyRole(
      session.user.id,
      userId,
      newRole
    );

    if (permissionError) {
      return createErrorResponse(permissionError.message, 403);
    }

    if (!allowed) {
      return createErrorResponse(
        'Insufficient permissions to modify this role',
        403
      );
    }

    // Update the role
    const { data: updatedUser, error: updateError } =
      await RoleService.updateUserRole(userId, newRole, session.user.id);

    if (updateError) {
      console.error('Error updating role:', updateError);
      return createErrorResponse('Failed to update role', 500, {
        message: updateError.message
      });
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error in role update route:', error);
    return createErrorResponse('Internal server error', 500, {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
