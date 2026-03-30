// app/api/personal-forms/[formId]/analytics/insights/route.ts
// API route for generating AI-powered insights using Claude API

import { NextRequest, NextResponse } from 'next/server';
import { AIInsightsService } from '@/lib/services/ai-insights-service';
import { PersonalFormAnalyticsService } from '@/lib/services/personal-form-analytics-service';
import { PersonalFormService } from '@/lib/services/personal-form-service';
import { withAuthApi } from '@/lib/auth/with-auth-api';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Session } from '@supabase/supabase-js';

// ============================================
// GENERATE AI INSIGHTS
// ============================================

export const POST = withAuthApi(
  async (
    req: NextRequest,
    context: { params: Record<string, string> },
    session: Session | null
  ) => {
    try {
      const formId = context.params.formId;
      const user = session!.user;

      // ============================================
      // 1. Permission Check
      // ============================================

      const hasPermission = await PersonalFormService.checkUserPermission(
        formId,
        user.id,
        'can_view_responses'
      );

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'You do not have permission to view insights for this form' },
          { status: 403 }
        );
      }

      // ============================================
      // 2. Get Form Details
      // ============================================

      const form = await PersonalFormService.getPersonalForm(formId);
      if (!form) {
        return NextResponse.json({ error: 'Form not found' }, { status: 404 });
      }

      // ============================================
      // 3. Parse Filters from Request Body
      // ============================================

      const body = await req.json().catch(() => ({}));
      const filters = body.filters || {};

      // ============================================
      // 4. Fetch Analytics Data
      // ============================================

      // Create server Supabase client for database operations
      const supabase = await createServerSupabaseClient();

      const [overview, fieldStatistics] = await Promise.all([
        PersonalFormAnalyticsService.getAnalyticsSummary(formId, filters, supabase),
        PersonalFormAnalyticsService.getFieldStatistics(formId, filters, supabase)
      ]);

      // ============================================
      // 5. Prepare Context for AI
      // ============================================

      const analyticsContext = {
        formTitle: form.title,
        formDescription: form.description || undefined,
        totalResponses: overview.totalResponses,
        uniqueSubmitters: overview.uniqueSubmitters,
        completionRate: overview.completionRate,
        responseVelocity: overview.responseVelocity,
        peakSubmissionDay: overview.peakSubmissionDay,
        submissionStatus: {
          atLimit: form.submission_limit
            ? overview.totalResponses >= form.submission_limit
            : false,
          remaining: form.submission_limit
            ? form.submission_limit - overview.totalResponses
            : null
        },
        responsesByDayOfWeek: overview.responsesByDayOfWeek,
        responsesByHourOfDay: overview.responsesByHourOfDay,
        responsesByPeriod: overview.responsesByPeriod,
        fieldStatistics: fieldStatistics,
        // MYJKKN Profile Statistics
        userTypeBreakdown: overview.userTypeBreakdown,
        institutionBreakdown: overview.institutionBreakdown,
        topInstitution: overview.topInstitution,
        departmentBreakdown: overview.departmentBreakdown,
        topDepartment: overview.topDepartment
      };

      // ============================================
      // 6. Generate AI Insights
      // ============================================

      console.log(
        `[AI Insights] Generating insights for form: ${form.title} (${formId})`
      );

      const insights = await AIInsightsService.generateInsights(
        analyticsContext
      );

      console.log(
        `[AI Insights] Generated ${insights.length} insights for form: ${formId}`
      );

      // ============================================
      // 7. Return Insights
      // ============================================

      return NextResponse.json(
        {
          insights,
          metadata: {
            formId: form.id,
            formTitle: form.title,
            totalResponses: overview.totalResponses,
            generatedAt: new Date().toISOString(),
            usingAI: !!process.env.ANTHROPIC_API_KEY
          }
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('[AI Insights API] Error generating insights:', error);

      // Return fallback insights on error
      try {
        const formId = context.params.formId;
        const form = await PersonalFormService.getPersonalForm(formId);

        if (form) {
          // Create server Supabase client for fallback data
          const fallbackSupabase = await createServerSupabaseClient();

          const overview = await PersonalFormAnalyticsService.getAnalyticsSummary(
            formId,
            undefined,
            fallbackSupabase
          );
          const fieldStatistics = await PersonalFormAnalyticsService.getFieldStatistics(
            formId,
            undefined,
            fallbackSupabase
          );

          const fallbackContext = {
            formTitle: form.title,
            formDescription: form.description || undefined,
            totalResponses: overview.totalResponses,
            uniqueSubmitters: overview.uniqueSubmitters,
            completionRate: overview.completionRate,
            responseVelocity: overview.responseVelocity,
            peakSubmissionDay: overview.peakSubmissionDay,
            submissionStatus: {
              atLimit: form.submission_limit
                ? overview.totalResponses >= form.submission_limit
                : false,
              remaining: form.submission_limit
                ? form.submission_limit - overview.totalResponses
                : null
            },
            responsesByDayOfWeek: overview.responsesByDayOfWeek,
            responsesByHourOfDay: overview.responsesByHourOfDay,
            responsesByPeriod: overview.responsesByPeriod,
            fieldStatistics: fieldStatistics,
            // MYJKKN Profile Statistics
            userTypeBreakdown: overview.userTypeBreakdown,
            institutionBreakdown: overview.institutionBreakdown,
            topInstitution: overview.topInstitution,
            departmentBreakdown: overview.departmentBreakdown,
            topDepartment: overview.topDepartment
          };

          const fallbackInsights = AIInsightsService.getFallbackInsights(
            fallbackContext
          );

          return NextResponse.json(
            {
              insights: fallbackInsights,
              metadata: {
                formId: form.id,
                formTitle: form.title,
                totalResponses: overview.totalResponses,
                generatedAt: new Date().toISOString(),
                usingAI: false,
                fallbackReason:
                  error instanceof Error ? error.message : 'Unknown error'
              }
            },
            { status: 200 }
          );
        }
      } catch (fallbackError) {
        console.error(
          '[AI Insights API] Error generating fallback insights:',
          fallbackError
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to generate insights',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  }
);

// ============================================
// GET CACHED INSIGHTS (Future Enhancement)
// ============================================

export const GET = withAuthApi(
  async (
    _req: NextRequest,
    context: { params: Record<string, string> },
    session: Session | null
  ) => {
    try {
      const formId = context.params.formId;
      const user = session!.user;

      // Check permission
      const hasPermission = await PersonalFormService.checkUserPermission(
        formId,
        user.id,
        'can_view_responses'
      );

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'You do not have permission to view insights for this form' },
          { status: 403 }
        );
      }

      // TODO: Implement insight caching mechanism
      // For now, return empty array and let client call POST to generate

      return NextResponse.json(
        {
          insights: [],
          cached: false,
          message: 'No cached insights available. Call POST to generate new insights.'
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('[AI Insights API] Error fetching cached insights:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch cached insights',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  }
);
