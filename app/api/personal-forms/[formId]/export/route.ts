// app/api/personal-forms/[formId]/export/route.ts
// API route for exporting form responses

import { NextRequest, NextResponse } from 'next/server';
import { PersonalFormService } from '@/lib/services/personal-form-service';
import { withAuthApi } from '@/lib/auth/with-auth-api';

/**
 * GET /api/personal-forms/[formId]/export?format=csv|excel
 * Export form responses as CSV or Excel
 * Requires can_export_data permission
 */
export const GET = withAuthApi(async (req, context, session) => {
  try {
    const { formId } = context.params;
    const user = session!.user;

    // Get server Supabase client
    const { createServerSupabaseClient } = await import('@/lib/supabase/server');
    const supabase = await createServerSupabaseClient();

    // Check if user has export permission
    const hasPermission = await PersonalFormService.checkUserPermission(
      formId,
      user.id,
      'can_export_data',
      supabase // Pass the server Supabase client
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to export data from this form' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'csv';

    if (!['csv', 'excel'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be either "csv" or "excel"' },
        { status: 400 }
      );
    }

    // Get the form for filename
    const form = await PersonalFormService.getPersonalForm(formId);
    const timestamp = new Date().toISOString().split('T')[0];
    const safeTitle = form.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    if (format === 'csv') {
      const csv = await PersonalFormService.exportToCSV(formId);

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${safeTitle}_responses_${timestamp}.csv"`,
          'Cache-Control': 'no-cache'
        }
      });
    } else {
      // Excel export
      const excel = await PersonalFormService.exportToExcel(formId);

      return new NextResponse(excel as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${safeTitle}_responses_${timestamp}.xlsx"`,
          'Cache-Control': 'no-cache'
        }
      });
    }
  } catch (error: any) {
    console.error('Error exporting responses:', error);

    if (error.message === 'No responses to export') {
      return NextResponse.json(
        { error: 'No responses available to export' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to export responses' },
      { status: 500 }
    );
  }
});
