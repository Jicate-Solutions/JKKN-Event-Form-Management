// app/api/personal-forms/[formId]/analytics/route.ts
// API route for getting personal form analytics data

import { NextRequest, NextResponse } from 'next/server';
import { PersonalFormAnalyticsService } from '@/lib/services/personal-form-analytics-service';
import { PersonalFormService } from '@/lib/services/personal-form-service';
import { withAuthApi } from '@/lib/auth/with-auth-api';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/personal-forms/[formId]/analytics
 * Get comprehensive analytics data for a personal form
 * Requires can_view_responses permission
 */
export const GET = withAuthApi(async (req, context, session) => {
  try {
    const { formId } = await context.params;
    const user = session!.user;

    // Create server Supabase client for database operations
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
        { error: 'You do not have permission to view analytics for this form' },
        { status: 403 }
      );
    }

    // Parse query parameters for filters
    const searchParams = req.nextUrl.searchParams;
    const filters: any = {};

    // Date range filter
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate && endDate) {
      filters.dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    // Anonymous filter
    const isAnonymous = searchParams.get('isAnonymous');
    if (isAnonymous !== null) {
      filters.isAnonymous = isAnonymous === 'true';
    }

    // Submitted by filter
    const submittedBy = searchParams.get('submittedBy');
    if (submittedBy) {
      filters.submittedBy = submittedBy;
    }

    // Get analytics data - pass server Supabase client
    const [overview, fieldStatistics] = await Promise.all([
      PersonalFormAnalyticsService.getAnalyticsSummary(formId, filters, supabase),
      PersonalFormAnalyticsService.getFieldStatistics(formId, filters, supabase)
    ]);

    return NextResponse.json(
      {
        overview,
        fieldStatistics
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
});
