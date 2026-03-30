'use client';

// app/(routes)/personal/forms/[formId]/analytics/page.tsx
// Main analytics page for personal forms

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { ContentLayout } from '@/components/layout/content-layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Loader2,
  BarChart3,
  TrendingUp,
  Filter,
  Download
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AnalyticsOverview } from './_components/analytics-overview';
import { AnalyticsFieldsGrid } from './_components/analytics-fields-grid';
import { AnalyticsFilters } from './_components/analytics-filters';
import { ExportAnalytics } from './_components/export-analytics';
import { AnalyticsTrends } from './_components/analytics-trends';
import { AIInsightsPanel } from './_components/ai-insights-panel';

export interface AnalyticsFiltersState {
  dateRange?: {
    start: Date;
    end: Date;
  };
  isAnonymous?: boolean;
  submittedBy?: string;
}

export default function PersonalFormAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.formId as string;

  const [filters, setFilters] = useState<AnalyticsFiltersState>({});
  const [showFilters, setShowFilters] = useState(false);

  // Fetch form details
  const { data: form, isLoading: formLoading } = useQuery({
    queryKey: ['personal-form', formId],
    queryFn: async () => {
      const response = await fetch(`/api/personal-forms/${formId}`);
      if (!response.ok) throw new Error('Failed to fetch form');
      return response.json();
    }
  });

  // Fetch analytics data
  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useQuery({
    queryKey: ['personal-form-analytics', formId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.dateRange) {
        params.append('startDate', filters.dateRange.start.toISOString());
        params.append('endDate', filters.dateRange.end.toISOString());
      }

      if (filters.isAnonymous !== undefined) {
        params.append('isAnonymous', String(filters.isAnonymous));
      }

      if (filters.submittedBy) {
        params.append('submittedBy', filters.submittedBy);
      }

      const response = await fetch(
        `/api/personal-forms/${formId}/analytics?${params}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch analytics');
      }

      return response.json();
    },
    enabled: !!form
  });

  // Check permissions
  const { data: permissionsData, isLoading: permissionsLoading } = useQuery({
    queryKey: ['personal-form-permissions', formId],
    queryFn: async () => {
      const response = await fetch(
        `/api/personal-forms/${formId}/collaborators/me`
      );
      if (!response.ok) return null;
      return response.json();
    }
  });

  const canViewResponses =
    permissionsData?.is_owner || permissionsData?.can_view_responses || false;
  const canExport =
    permissionsData?.is_owner || permissionsData?.can_export_data || false;

  const isLoading = formLoading || analyticsLoading || permissionsLoading;

  // Handle filter apply
  const handleApplyFilters = (newFilters: AnalyticsFiltersState) => {
    setFilters(newFilters);
    setShowFilters(false);
    toast.success('Filters applied');
  };

  // Handle filter reset
  const handleResetFilters = () => {
    setFilters({});
    toast.success('Filters reset');
  };

  // Handle refresh
  const handleRefresh = async () => {
    toast.loading('Refreshing analytics...', { id: 'refresh' });
    await refetchAnalytics();
    toast.success('Analytics refreshed!', { id: 'refresh' });
  };

  // Show loading while fetching initial data
  if ((formLoading || permissionsLoading) && !form) {
    return (
      <ContentLayout title='Form Analytics'>
        <div className='flex items-center justify-center py-12'>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        </div>
      </ContentLayout>
    );
  }

  if (!form) {
    return (
      <ContentLayout title='Form Analytics'>
        <div className='text-center py-12'>
          <p className='text-destructive'>Form not found</p>
        </div>
      </ContentLayout>
    );
  }

  // Check permissions
  if (!permissionsLoading && !canViewResponses) {
    return (
      <ContentLayout title='Form Analytics'>
        <div className='text-center py-12'>
          <p className='text-destructive'>
            You do not have permission to view analytics for this form
          </p>
        </div>
      </ContentLayout>
    );
  }

  const hasActiveFilters =
    filters.dateRange !== undefined ||
    filters.isAnonymous !== undefined ||
    filters.submittedBy !== undefined;

  return (
    <ContentLayout title='Form Analytics'>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href='/'>Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href='/personal/forms'>My Forms</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/personal/forms/${formId}`}>Form Details</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Analytics</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='max-w-7xl mx-auto space-y-6 mt-4'>
        {/* Header */}
        <div>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => router.push(`/personal/forms/${formId}`)}
            className='mb-4'
          >
            <ArrowLeft className='h-4 w-4 mr-2' />
            Back to Form Details
          </Button>

          <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4'>
            <div>
              <div className='flex items-center gap-3'>
                <BarChart3 className='h-8 w-8 text-primary' />
                <h1 className='text-3xl font-bold tracking-tight'>
                  Form Analytics
                </h1>
              </div>
              <p className='text-muted-foreground mt-1'>{form.title}</p>
              {hasActiveFilters && (
                <p className='text-sm text-primary mt-1'>
                  Filters applied • {analyticsData?.overview?.totalResponses || 0}{' '}
                  responses shown
                </p>
              )}
            </div>

            <div className='flex gap-2'>
              {/* Export Button */}
              {canExport && analyticsData && (
                <ExportAnalytics
                  formId={formId}
                  formTitle={form.title}
                  filters={filters}
                />
              )}

              {/* Filters Button */}
              <Button
                variant='outline'
                size='sm'
                onClick={() => setShowFilters(!showFilters)}
                className={hasActiveFilters ? 'border-primary' : ''}
              >
                <Filter className='h-4 w-4 mr-2' />
                Filters
                {hasActiveFilters && (
                  <span className='ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs'>
                    Active
                  </span>
                )}
              </Button>

              {/* Reset Filters */}
              {hasActiveFilters && (
                <Button variant='ghost' size='sm' onClick={handleResetFilters}>
                  Reset
                </Button>
              )}

              {/* Refresh Button */}
              <Button
                variant='outline'
                size='sm'
                onClick={handleRefresh}
                disabled={analyticsLoading}
              >
                <TrendingUp
                  className={`h-4 w-4 ${analyticsLoading ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <AnalyticsFilters
            currentFilters={filters}
            onApplyFilters={handleApplyFilters}
            onClose={() => setShowFilters(false)}
          />
        )}

        {/* Loading State */}
        {analyticsLoading && !analyticsData && (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        )}

        {/* Error State */}
        {analyticsError && (
          <Card className='border-destructive'>
            <CardContent className='pt-6'>
              <p className='text-destructive text-center'>
                Error loading analytics: {(analyticsError as Error).message}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Analytics Content */}
        {analyticsData && (
          <Tabs defaultValue='overview' className='space-y-6'>
            <TabsList>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
              <TabsTrigger value='fields'>Field Statistics</TabsTrigger>
              <TabsTrigger value='trends'>Trends</TabsTrigger>
              <TabsTrigger value='ai-insights'>AI Insights</TabsTrigger>
            </TabsList>

            <TabsContent value='overview' className='space-y-6'>
              <AnalyticsOverview
                form={form}
                overview={analyticsData.overview}
              />
            </TabsContent>

            <TabsContent value='fields' className='space-y-6'>
              <AnalyticsFieldsGrid
                form={form}
                fieldStatistics={analyticsData.fieldStatistics}
              />
            </TabsContent>

            <TabsContent value='trends' className='space-y-6'>
              <AnalyticsTrends
                form={form}
                overview={analyticsData.overview}
              />
            </TabsContent>

            <TabsContent value='ai-insights' className='space-y-6'>
              <AIInsightsPanel
                formId={formId}
                formTitle={form.title}
                filters={filters}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </ContentLayout>
  );
}
