// lib/services/personal-form-analytics-service.ts
// Service layer for Personal Forms Analytics feature

import { createClientSupabaseClient } from '@/lib/supabase/client';
import { PersonalFormService } from './personal-form-service';
import {
  PersonalForm,
  PersonalFormResponse
} from '@/types/personal-forms';
import { FormField } from '@/types/forms';
import {
  startOfDay,
  endOfDay,
  subDays,
  format,
  isWithinInterval,
  differenceInMinutes
} from 'date-fns';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface AnalyticsFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  isAnonymous?: boolean;
  submittedBy?: string;
  fieldFilters?: {
    fieldId: string;
    value: any;
  }[];
}

export interface AnalyticsOverview {
  totalResponses: number;
  uniqueSubmitters: number;
  completionRate: number;
  avgCompletionTime: number; // in minutes
  responsesByPeriod: {
    date: string;
    day: string;
    count: number;
    cumulativeCount: number;
  }[];
  peakSubmissionDay: string;
  responseVelocity: number; // per day
  submissionStatus: {
    atLimit: boolean;
    remaining: number | null;
  };
  responsesByDayOfWeek: {
    day: string;
    count: number;
  }[];
  responsesByHourOfDay: {
    hour: number;
    count: number;
  }[];
  userTypeBreakdown?: {
    student: number;
    staff: number;
    noProfile: number;
  };
  institutionBreakdown?: Record<string, number>;
  topInstitution?: string | null;
  departmentBreakdown?: Record<string, number>;
  topDepartment?: string | null;
}

export interface FieldAnalytics {
  fieldId: string;
  fieldType: string;
  label: string;
  totalResponses: number;
  filledCount: number;
  emptyCount: number;
  fillRate: number;

  // Choice field data
  optionDistribution?: {
    option: string;
    count: number;
    percentage: number;
  }[];

  // Text field data
  textStats?: {
    uniqueValues: number;
    avgLength: number;
    minLength: number;
    maxLength: number;
    topValues: { value: string; count: number; percentage: number }[];
  };

  // Number field data
  numberStats?: {
    min: number;
    max: number;
    avg: number;
    median: number;
    sum: number;
    distribution: { range: string; count: number }[];
  };

  // Date/time field data
  dateStats?: {
    earliest: string;
    latest: string;
    mostCommon: string;
    distribution: { date: string; count: number }[];
  };

  // File field data
  fileStats?: {
    totalFiles: number;
    fileTypes: { type: string; count: number }[];
    avgFileSize?: number;
    totalSize?: number;
  };
}

export interface AIInsight {
  id: string;
  category: 'performance' | 'recommendation' | 'anomaly' | 'opportunity' | 'trend';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  supportingData: any;
  actionable: boolean;
  recommendation?: string;
  createdAt: string;
}

// ============================================
// PERSONAL FORM ANALYTICS SERVICE
// ============================================

export const PersonalFormAnalyticsService = {
  /**
   * Get comprehensive analytics summary for a personal form
   */
  async getAnalyticsSummary(
    formId: string,
    filters?: AnalyticsFilters,
    supabaseClient?: any
  ): Promise<AnalyticsOverview> {
    try {
      const supabase = supabaseClient || createClientSupabaseClient();

      // Get form details
      const form = await PersonalFormService.getPersonalForm(formId, undefined, supabase);

      // Get all responses (apply filters) - pass supabase client for server-side
      let responses = await PersonalFormService.getAllResponsesForExport(formId, supabase);

      // Apply filters
      if (filters) {
        responses = this.applyFilters(responses, filters);
      }

      // Calculate metrics
      const totalResponses = responses.length;

      // Unique submitters (non-anonymous)
      const uniqueSubmitters = new Set(
        responses
          .filter((r) => r.submitted_by && !r.is_anonymous)
          .map((r) => r.submitted_by)
      ).size;

      // Completion rate (percentage of fields filled)
      const completionRate = this.calculateCompletionRate(form, responses);

      // Average completion time (estimated from submission patterns)
      const avgCompletionTime = this.estimateAvgCompletionTime(responses);

      // Response trend data (last 14 days)
      const responsesByPeriod = this.getResponsesByPeriod(responses, 14);

      // Peak submission day
      const peakSubmissionDay = this.getPeakSubmissionDay(responsesByPeriod);

      // Response velocity (responses per day)
      const responseVelocity = this.calculateResponseVelocity(responses);

      // Submission status
      const submissionStatus = {
        atLimit: form.submission_limit
          ? totalResponses >= form.submission_limit
          : false,
        remaining: form.submission_limit
          ? Math.max(0, form.submission_limit - totalResponses)
          : null
      };

      // Day of week distribution
      const responsesByDayOfWeek = this.getResponsesByDayOfWeek(responses);

      // Hour of day distribution
      const responsesByHourOfDay = this.getResponsesByHourOfDay(responses);

      // MYJKKN Profile Statistics
      const userTypeBreakdown = {
        student: 0,
        staff: 0,
        noProfile: 0
      };

      const institutionCounts: Record<string, number> = {};
      const departmentCounts: Record<string, number> = {};

      responses.forEach((response) => {
        if (response.user_profile) {
          if (response.user_profile.user_type === 'student') {
            userTypeBreakdown.student++;
          } else if (response.user_profile.user_type === 'staff') {
            userTypeBreakdown.staff++;
          }

          if (response.user_profile.institution_name) {
            institutionCounts[response.user_profile.institution_name] =
              (institutionCounts[response.user_profile.institution_name] || 0) + 1;
          }

          if (response.user_profile.department_name) {
            departmentCounts[response.user_profile.department_name] =
              (departmentCounts[response.user_profile.department_name] || 0) + 1;
          }
        } else {
          userTypeBreakdown.noProfile++;
        }
      });

      // Find top institution
      const topInstitution =
        Object.entries(institutionCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
        null;

      // Find top department
      const topDepartment =
        Object.entries(departmentCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
        null;

      return {
        totalResponses,
        uniqueSubmitters,
        completionRate,
        avgCompletionTime,
        responsesByPeriod,
        peakSubmissionDay,
        responseVelocity,
        submissionStatus,
        responsesByDayOfWeek,
        responsesByHourOfDay,
        userTypeBreakdown,
        institutionBreakdown: institutionCounts,
        topInstitution,
        departmentBreakdown: departmentCounts,
        topDepartment
      };
    } catch (error) {
      console.error('Error getting analytics summary:', error);
      throw error;
    }
  },

  /**
   * Get field-level statistics for all fields in a form
   */
  async getFieldStatistics(
    formId: string,
    filters?: AnalyticsFilters,
    supabaseClient?: any
  ): Promise<FieldAnalytics[]> {
    try {
      const supabase = supabaseClient || createClientSupabaseClient();

      // Get form details
      const form = await PersonalFormService.getPersonalForm(formId, undefined, supabase);

      // Get all responses - pass supabase client for server-side
      let responses = await PersonalFormService.getAllResponsesForExport(formId, supabase);

      // Apply filters
      if (filters) {
        responses = this.applyFilters(responses, filters);
      }

      // Calculate statistics for each field
      const fieldStatistics: FieldAnalytics[] = form.fields
        .filter((field) => field.type !== 'image') // Skip image fields
        .map((field) => this.calculateFieldStatistics(field, responses));

      return fieldStatistics;
    } catch (error) {
      console.error('Error getting field statistics:', error);
      throw error;
    }
  },

  /**
   * Get statistics for a single field
   */
  async getSingleFieldStatistics(
    formId: string,
    fieldId: string,
    filters?: AnalyticsFilters
  ): Promise<FieldAnalytics | null> {
    try {
      const allStats = await this.getFieldStatistics(formId, filters);
      return allStats.find((stat) => stat.fieldId === fieldId) || null;
    } catch (error) {
      console.error('Error getting single field statistics:', error);
      throw error;
    }
  },

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  /**
   * Apply filters to responses array
   */
  applyFilters(
    responses: PersonalFormResponse[],
    filters: AnalyticsFilters
  ): PersonalFormResponse[] {
    let filtered = [...responses];

    // Date range filter
    if (filters.dateRange) {
      filtered = filtered.filter((r) => {
        const submittedAt = new Date(r.submitted_at);
        return isWithinInterval(submittedAt, {
          start: startOfDay(filters.dateRange!.start),
          end: endOfDay(filters.dateRange!.end)
        });
      });
    }

    // Anonymous filter
    if (filters.isAnonymous !== undefined) {
      filtered = filtered.filter((r) => r.is_anonymous === filters.isAnonymous);
    }

    // Submitted by filter
    if (filters.submittedBy) {
      filtered = filtered.filter((r) => r.submitted_by === filters.submittedBy);
    }

    // Field-specific filters
    if (filters.fieldFilters && filters.fieldFilters.length > 0) {
      filtered = filtered.filter((r) => {
        return filters.fieldFilters!.every((fieldFilter) => {
          const value = r.response_data[fieldFilter.fieldId];

          // Handle array values (checkboxes)
          if (Array.isArray(value)) {
            return value.includes(fieldFilter.value);
          }

          return value === fieldFilter.value;
        });
      });
    }

    return filtered;
  },

  /**
   * Calculate overall completion rate (percentage of fields filled)
   */
  calculateCompletionRate(
    form: PersonalForm,
    responses: PersonalFormResponse[]
  ): number {
    if (responses.length === 0) return 0;

    const totalFields = form.fields.filter((f) => f.type !== 'image').length;
    if (totalFields === 0) return 100;

    let totalFillRate = 0;

    responses.forEach((response) => {
      let filledFields = 0;
      form.fields.forEach((field) => {
        if (field.type === 'image') return; // Skip image fields

        const value = response.response_data[field.id];
        if (value !== null && value !== undefined && value !== '') {
          filledFields++;
        }
      });

      totalFillRate += (filledFields / totalFields) * 100;
    });

    return Math.round(totalFillRate / responses.length);
  },

  /**
   * Estimate average completion time based on submission patterns
   * This is an estimate since we don't track actual completion time
   */
  estimateAvgCompletionTime(responses: PersonalFormResponse[]): number {
    // For now, return a placeholder estimate
    // In a real implementation, you'd track form view time vs submission time
    // This could be enhanced with client-side tracking
    return 3.5; // 3.5 minutes placeholder
  },

  /**
   * Get responses grouped by period (daily)
   */
  getResponsesByPeriod(
    responses: PersonalFormResponse[],
    days: number = 14
  ): AnalyticsOverview['responsesByPeriod'] {
    const today = new Date();

    // Initialize array with the last N days
    const dailyData = Array.from({ length: days }, (_, i) => {
      const date = subDays(today, days - i - 1);
      return {
        date: date.toISOString(),
        day: format(date, 'MMM dd'),
        count: 0,
        cumulativeCount: 0
      };
    });

    // Count responses for each day
    responses.forEach((response) => {
      const responseDate = new Date(response.submitted_at);

      dailyData.forEach((dayData) => {
        const dayDate = new Date(dayData.date);
        if (
          isWithinInterval(responseDate, {
            start: startOfDay(dayDate),
            end: endOfDay(dayDate)
          })
        ) {
          dayData.count++;
        }
      });
    });

    // Calculate cumulative counts
    let cumulative = 0;
    dailyData.forEach((day) => {
      cumulative += day.count;
      day.cumulativeCount = cumulative;
    });

    return dailyData;
  },

  /**
   * Get peak submission day from period data
   */
  getPeakSubmissionDay(
    responsesByPeriod: AnalyticsOverview['responsesByPeriod']
  ): string {
    if (responsesByPeriod.length === 0) return 'N/A';

    const peak = [...responsesByPeriod].sort((a, b) => b.count - a.count)[0];
    return peak.day;
  },

  /**
   * Calculate response velocity (responses per day)
   */
  calculateResponseVelocity(responses: PersonalFormResponse[]): number {
    if (responses.length === 0) return 0;

    // Get date range
    const dates = responses.map((r) => new Date(r.submitted_at));
    const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
    const latest = new Date(Math.max(...dates.map((d) => d.getTime())));

    const daysDiff = Math.max(
      1,
      Math.ceil((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24))
    );

    return Math.round((responses.length / daysDiff) * 10) / 10; // Round to 1 decimal
  },

  /**
   * Get responses by day of week
   */
  getResponsesByDayOfWeek(
    responses: PersonalFormResponse[]
  ): AnalyticsOverview['responsesByDayOfWeek'] {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const counts = new Array(7).fill(0);

    responses.forEach((response) => {
      const dayIndex = new Date(response.submitted_at).getDay();
      counts[dayIndex]++;
    });

    return days.map((day, index) => ({
      day,
      count: counts[index]
    }));
  },

  /**
   * Get responses by hour of day
   */
  getResponsesByHourOfDay(
    responses: PersonalFormResponse[]
  ): AnalyticsOverview['responsesByHourOfDay'] {
    const counts = new Array(24).fill(0);

    responses.forEach((response) => {
      const hour = new Date(response.submitted_at).getHours();
      counts[hour]++;
    });

    return counts.map((count, hour) => ({
      hour,
      count
    }));
  },

  /**
   * Calculate statistics for a single field
   */
  calculateFieldStatistics(
    field: FormField,
    responses: PersonalFormResponse[]
  ): FieldAnalytics {
    const totalResponses = responses.length;
    let filledCount = 0;
    let emptyCount = 0;

    // Count filled vs empty
    responses.forEach((response) => {
      const value = response.response_data[field.id];
      if (value === null || value === undefined || value === '') {
        emptyCount++;
      } else {
        filledCount++;
      }
    });

    const fillRate = totalResponses > 0
      ? Math.round((filledCount / totalResponses) * 100)
      : 0;

    const baseStats: FieldAnalytics = {
      fieldId: field.id,
      fieldType: field.type,
      label: field.label,
      totalResponses,
      filledCount,
      emptyCount,
      fillRate
    };

    // Add type-specific statistics
    if (['select', 'radio', 'checkbox', 'conditional'].includes(field.type)) {
      baseStats.optionDistribution = this.calculateOptionDistribution(
        field,
        responses
      );
    } else if (['text', 'textarea', 'email'].includes(field.type)) {
      baseStats.textStats = this.calculateTextStats(field, responses);
    } else if (field.type === 'number') {
      baseStats.numberStats = this.calculateNumberStats(field, responses);
    } else if (['date', 'time'].includes(field.type)) {
      baseStats.dateStats = this.calculateDateStats(field, responses);
    } else if (field.type === 'file') {
      baseStats.fileStats = this.calculateFileStats(field, responses);
    }

    return baseStats;
  },

  /**
   * Calculate option distribution for choice fields
   */
  calculateOptionDistribution(
    field: FormField,
    responses: PersonalFormResponse[]
  ): FieldAnalytics['optionDistribution'] {
    const options = field.options || field.condition_options || [];
    if (options.length === 0) return [];

    const counts = options.reduce(
      (acc, option) => {
        acc[option] = 0;
        return acc;
      },
      {} as Record<string, number>
    );

    responses.forEach((response) => {
      const value = response.response_data[field.id];

      // Handle arrays (checkboxes, multi-select)
      if (Array.isArray(value)) {
        value.forEach((v) => {
          if (counts[v] !== undefined) {
            counts[v]++;
          }
        });
      } else if (typeof value === 'object' && value?.mainValue) {
        // Handle conditional fields
        if (counts[value.mainValue] !== undefined) {
          counts[value.mainValue]++;
        }
      } else if (value && counts[value] !== undefined) {
        // Simple value
        counts[value]++;
      }
    });

    return Object.entries(counts).map(([option, count]) => ({
      option,
      count,
      percentage: Math.round((count / responses.length) * 100)
    }));
  },

  /**
   * Calculate text field statistics
   */
  calculateTextStats(
    field: FormField,
    responses: PersonalFormResponse[]
  ): FieldAnalytics['textStats'] {
    const values: string[] = [];
    const uniqueValues = new Set<string>();
    const valueFrequency: Record<string, number> = {};
    let totalLength = 0;
    let minLength = Infinity;
    let maxLength = 0;

    responses.forEach((response) => {
      const value = response.response_data[field.id];

      if (value !== null && value !== undefined && value !== '') {
        const stringValue = String(value);
        values.push(stringValue);
        uniqueValues.add(stringValue);

        totalLength += stringValue.length;
        minLength = Math.min(minLength, stringValue.length);
        maxLength = Math.max(maxLength, stringValue.length);

        valueFrequency[stringValue] = (valueFrequency[stringValue] || 0) + 1;
      }
    });

    const avgLength = values.length > 0 ? Math.round(totalLength / values.length) : 0;

    // Get top 5 most common values
    const topValues = Object.entries(valueFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({
        value: value.length > 50 ? value.substring(0, 50) + '...' : value,
        count,
        percentage: Math.round((count / responses.length) * 100)
      }));

    return {
      uniqueValues: uniqueValues.size,
      avgLength,
      minLength: minLength === Infinity ? 0 : minLength,
      maxLength,
      topValues
    };
  },

  /**
   * Calculate number field statistics
   */
  calculateNumberStats(
    field: FormField,
    responses: PersonalFormResponse[]
  ): FieldAnalytics['numberStats'] {
    const numbers: number[] = [];

    responses.forEach((response) => {
      const value = response.response_data[field.id];
      if (value !== null && value !== undefined && value !== '') {
        const num = Number(value);
        if (!isNaN(num)) {
          numbers.push(num);
        }
      }
    });

    if (numbers.length === 0) {
      return {
        min: 0,
        max: 0,
        avg: 0,
        median: 0,
        sum: 0,
        distribution: []
      };
    }

    const sorted = [...numbers].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const sum = numbers.reduce((acc, n) => acc + n, 0);
    const avg = sum / numbers.length;
    const median = sorted[Math.floor(sorted.length / 2)];

    // Create distribution buckets
    const bucketCount = 5;
    const bucketSize = (max - min) / bucketCount;
    const distribution: { range: string; count: number }[] = [];

    for (let i = 0; i < bucketCount; i++) {
      const rangeStart = min + i * bucketSize;
      const rangeEnd = min + (i + 1) * bucketSize;
      const count = numbers.filter((n) => n >= rangeStart && n < rangeEnd).length;

      distribution.push({
        range: `${Math.round(rangeStart)}-${Math.round(rangeEnd)}`,
        count
      });
    }

    return {
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      avg: Math.round(avg * 100) / 100,
      median: Math.round(median * 100) / 100,
      sum: Math.round(sum * 100) / 100,
      distribution
    };
  },

  /**
   * Calculate date/time field statistics
   */
  calculateDateStats(
    field: FormField,
    responses: PersonalFormResponse[]
  ): FieldAnalytics['dateStats'] {
    const dates: Date[] = [];
    const dateFrequency: Record<string, number> = {};

    responses.forEach((response) => {
      const value = response.response_data[field.id];
      if (value) {
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            dates.push(date);
            const dateStr = format(date, 'yyyy-MM-dd');
            dateFrequency[dateStr] = (dateFrequency[dateStr] || 0) + 1;
          }
        } catch (e) {
          // Invalid date, skip
        }
      }
    });

    if (dates.length === 0) {
      return {
        earliest: '',
        latest: '',
        mostCommon: '',
        distribution: []
      };
    }

    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
    const earliest = format(sorted[0], 'PPP');
    const latest = format(sorted[sorted.length - 1], 'PPP');

    // Find most common date
    const mostCommonEntry = Object.entries(dateFrequency).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const mostCommon = mostCommonEntry
      ? format(new Date(mostCommonEntry[0]), 'PPP')
      : '';

    // Distribution
    const distribution = Object.entries(dateFrequency)
      .map(([date, count]) => ({
        date: format(new Date(date), 'MMM dd, yyyy'),
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 dates

    return {
      earliest,
      latest,
      mostCommon,
      distribution
    };
  },

  /**
   * Calculate file field statistics
   */
  calculateFileStats(
    field: FormField,
    responses: PersonalFormResponse[]
  ): FieldAnalytics['fileStats'] {
    let totalFiles = 0;
    const fileTypes: Record<string, number> = {};

    responses.forEach((response) => {
      const value = response.response_data[field.id];

      if (value && typeof value === 'object') {
        totalFiles++;

        // Extract file type from filename or URL
        const fileName = value.name || value.url || '';
        const extension = fileName.split('.').pop()?.toLowerCase() || 'unknown';

        fileTypes[extension] = (fileTypes[extension] || 0) + 1;
      }
    });

    const fileTypesArray = Object.entries(fileTypes).map(([type, count]) => ({
      type,
      count
    }));

    return {
      totalFiles,
      fileTypes: fileTypesArray
    };
  }
};
