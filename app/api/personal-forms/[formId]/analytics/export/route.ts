// app/api/personal-forms/[formId]/analytics/export/route.ts
// API route for exporting personal form analytics

import { NextRequest, NextResponse } from 'next/server';
import { PersonalFormAnalyticsService } from '@/lib/services/personal-form-analytics-service';
import { PersonalFormService } from '@/lib/services/personal-form-service';
import { withAuthApi } from '@/lib/auth/with-auth-api';
import { Parser } from '@json2csv/plainjs';
import * as XLSX from 'xlsx';

/**
 * GET /api/personal-forms/[formId]/analytics/export
 * Export analytics data as CSV or Excel
 * Requires can_export_data permission
 */
export const GET = withAuthApi(async (req, context, session) => {
  try {
    const { formId } = await context.params;
    const user = session!.user;

    // Check if user has export permission
    const hasPermission = await PersonalFormService.checkUserPermission(
      formId,
      user.id,
      'can_export_data'
    );

    if (!hasPermission) {
      return NextResponse.json(
        {
          error: 'You do not have permission to export analytics for this form'
        },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const format = searchParams.get('format') || 'csv';

    // Parse query parameters for filters
    const filters: any = {};

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate && endDate) {
      filters.dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    const isAnonymous = searchParams.get('isAnonymous');
    if (isAnonymous !== null) {
      filters.isAnonymous = isAnonymous === 'true';
    }

    // Get form and analytics data
    const form = await PersonalFormService.getPersonalForm(formId);
    const [overview, fieldStatistics] = await Promise.all([
      PersonalFormAnalyticsService.getAnalyticsSummary(formId, filters),
      PersonalFormAnalyticsService.getFieldStatistics(formId, filters)
    ]);

    if (format === 'excel') {
      // Create Excel workbook with multiple sheets
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Overview
      const overviewData = [
        ['Metric', 'Value'],
        ['Form Title', form.title],
        ['Total Responses', overview.totalResponses],
        ['Unique Submitters', overview.uniqueSubmitters],
        ['Completion Rate', `${overview.completionRate}%`],
        ['Response Velocity', `${overview.responseVelocity} per day`],
        ['Peak Submission Day', overview.peakSubmissionDay],
        [
          'At Submission Limit',
          overview.submissionStatus.atLimit ? 'Yes' : 'No'
        ],
        [
          'Submissions Remaining',
          overview.submissionStatus.remaining || 'Unlimited'
        ]
      ];
      const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

      // Sheet 2: Response Trend
      const trendData = [
        ['Date', 'Daily Count', 'Cumulative Count'],
        ...overview.responsesByPeriod.map((item) => [
          item.day,
          item.count,
          item.cumulativeCount
        ])
      ];
      const trendSheet = XLSX.utils.aoa_to_sheet(trendData);
      XLSX.utils.book_append_sheet(workbook, trendSheet, 'Response Trend');

      // Sheet 3: Day of Week Distribution
      const dowData = [
        ['Day of Week', 'Response Count'],
        ...overview.responsesByDayOfWeek.map((item) => [item.day, item.count])
      ];
      const dowSheet = XLSX.utils.aoa_to_sheet(dowData);
      XLSX.utils.book_append_sheet(workbook, dowSheet, 'Day Distribution');

      // Sheet 4: Hour of Day Distribution
      const hourData = [
        ['Hour', 'Response Count'],
        ...overview.responsesByHourOfDay.map((item) => [
          `${item.hour}:00`,
          item.count
        ])
      ];
      const hourSheet = XLSX.utils.aoa_to_sheet(hourData);
      XLSX.utils.book_append_sheet(workbook, hourSheet, 'Hour Distribution');

      // Sheet 5: Field Statistics Summary
      const fieldSummaryData = [
        [
          'Field Name',
          'Type',
          'Total Responses',
          'Filled',
          'Empty',
          'Fill Rate'
        ],
        ...fieldStatistics.map((stat) => [
          stat.label,
          stat.fieldType,
          stat.totalResponses,
          stat.filledCount,
          stat.emptyCount,
          `${stat.fillRate}%`
        ])
      ];
      const fieldSummarySheet = XLSX.utils.aoa_to_sheet(fieldSummaryData);
      XLSX.utils.book_append_sheet(
        workbook,
        fieldSummarySheet,
        'Field Summary'
      );

      // Sheet 6: Choice Field Details
      const choiceFields = fieldStatistics.filter(
        (stat) => stat.optionDistribution && stat.optionDistribution.length > 0
      );
      if (choiceFields.length > 0) {
        const choiceData = [['Field Name', 'Option', 'Count', 'Percentage']];
        choiceFields.forEach((stat) => {
          stat.optionDistribution!.forEach((option) => {
            choiceData.push([
              stat.label,
              option.option,
              option.count.toString(),
              `${option.percentage}%`
            ]);
          });
        });
        const choiceSheet = XLSX.utils.aoa_to_sheet(choiceData);
        XLSX.utils.book_append_sheet(workbook, choiceSheet, 'Choice Fields');
      }

      // Generate buffer
      const buffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx'
      });

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${form.title}_analytics.xlsx"`
        }
      });
    } else {
      // CSV Export - Summary format
      const csvData = [
        // Overview section
        { Category: 'Overview', Metric: 'Form Title', Value: form.title },
        {
          Category: 'Overview',
          Metric: 'Total Responses',
          Value: overview.totalResponses
        },
        {
          Category: 'Overview',
          Metric: 'Unique Submitters',
          Value: overview.uniqueSubmitters
        },
        {
          Category: 'Overview',
          Metric: 'Completion Rate',
          Value: `${overview.completionRate}%`
        },
        {
          Category: 'Overview',
          Metric: 'Response Velocity',
          Value: `${overview.responseVelocity} per day`
        },
        {
          Category: 'Overview',
          Metric: 'Peak Submission Day',
          Value: overview.peakSubmissionDay
        },
        { Category: '', Metric: '', Value: '' }, // Empty row

        // Field statistics
        ...fieldStatistics.flatMap((stat) => [
          {
            Category: 'Field Statistics',
            Metric: `${stat.label} - Type`,
            Value: stat.fieldType
          },
          {
            Category: 'Field Statistics',
            Metric: `${stat.label} - Fill Rate`,
            Value: `${stat.fillRate}%`
          },
          {
            Category: 'Field Statistics',
            Metric: `${stat.label} - Filled Count`,
            Value: stat.filledCount
          },
          {
            Category: 'Field Statistics',
            Metric: `${stat.label} - Empty Count`,
            Value: stat.emptyCount
          }
        ])
      ];

      const parser = new Parser();
      const csv = parser.parse(csvData);

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${form.title}_analytics.csv"`
        }
      });
    }
  } catch (error: any) {
    console.error('Error exporting analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export analytics' },
      { status: 500 }
    );
  }
});
