// app/api/personal-forms/[formId]/stats/route.ts
// API route for getting form response statistics

import { NextRequest, NextResponse } from 'next/server';
import { PersonalFormService } from '@/lib/services/personal-form-service';
import { withAuthApi } from '@/lib/auth/with-auth-api';

/**
 * GET /api/personal-forms/[formId]/stats
 * Get response statistics for a personal form
 * Requires can_view_responses permission
 */
export const GET = withAuthApi(async (req, context, session) => {
  try {
    const { formId } = context.params;
    const user = session!.user;

    // Get server Supabase client
    const { createServerSupabaseClient } = await import('@/lib/supabase/server');
    const supabase = await createServerSupabaseClient();

    // Check if user has view responses permission
    const hasPermission = await PersonalFormService.checkUserPermission(
      formId,
      user.id,
      'can_view_responses',
      supabase // Pass the server Supabase client
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to view statistics for this form' },
        { status: 403 }
      );
    }

    const stats = await PersonalFormService.getResponseStatistics(formId);

    return NextResponse.json(stats, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
});
