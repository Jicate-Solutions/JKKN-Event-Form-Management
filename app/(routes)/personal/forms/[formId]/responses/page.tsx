'use client';

// app/(routes)/personal/forms/[formId]/responses/page.tsx
// View and manage form responses for personal forms

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useMemo, useEffect } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Loader2,
  FileSpreadsheet,
  FileText,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { DataTable } from '@/components/ui/data-table';
import { getResponseColumns, FormResponse } from './_components/columns';
import { PaginationState } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';

export default function ResponsesPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.formId as string;

  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(
    null
  );
  const [isExporting, setIsExporting] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20
  });
  const [searchInput, setSearchInput] = useState(''); // User input
  const [globalFilter, setGlobalFilter] = useState(''); // Debounced value for API

  // Debounce search - wait 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setGlobalFilter(searchInput);
      setPagination((prev) => ({ ...prev, pageIndex: 0 })); // Reset to first page
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch form details
  const { data: form, isLoading: formLoading } = useQuery({
    queryKey: ['personal-form', formId],
    queryFn: async () => {
      const response = await fetch(`/api/personal-forms/${formId}`);
      if (!response.ok) throw new Error('Failed to fetch form');
      return response.json();
    }
  });

  // Fetch responses with server-side pagination and search
  const {
    data: responsesData,
    isLoading: responsesLoading,
    error: responsesError,
    refetch: refetchResponses
  } = useQuery({
    queryKey: [
      'personal-form-responses',
      formId,
      pagination.pageIndex,
      pagination.pageSize,
      globalFilter
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (pagination.pageIndex + 1).toString(),
        limit: pagination.pageSize.toString(),
        ...(globalFilter && { search: globalFilter })
      });

      const response = await fetch(
        `/api/personal-forms/${formId}/responses?${params}`
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch responses');
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

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    toast.loading('Refreshing responses...', { id: 'refresh' });
    await refetchResponses();
    toast.success('Responses refreshed!', { id: 'refresh' });
  }, [refetchResponses]);

  // Handle export
  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      setIsExporting(true);
      const response = await fetch(
        `/api/personal-forms/${formId}/export?format=${format}`
      );

      if (!response.ok) {
        throw new Error('Failed to export responses');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${form?.title || 'form'}_responses.${format === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Exported ${responsesData?.total || 0} responses`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export responses');
    } finally {
      setIsExporting(false);
    }
  };

  // Format value helper
  const formatValue = (value: any, fieldType?: string): React.ReactNode => {
    if (value === null || value === undefined) return 'N/A';

    // Handle time fields - format to 12-hour with AM/PM
    if (fieldType === 'time' && typeof value === 'string') {
      try {
        // Parse HH:mm format
        const [hours, minutes] = value.split(':');
        const hour = parseInt(hours, 10);
        const min = parseInt(minutes, 10);

        if (!isNaN(hour) && !isNaN(min)) {
          const period = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
          return `${displayHour}:${minutes} ${period}`;
        }
      } catch (e) {
        console.error('Error formatting time:', e);
      }
      return value;
    }

    // Handle file uploads - show as clickable link
    if (typeof value === 'object') {
      if (value.url && value.name) {
        return (
          <a
            href={value.url}
            target='_blank'
            rel='noopener noreferrer'
            className='text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline flex items-center gap-2'
          >
            <svg
              className='h-4 w-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
              />
            </svg>
            {value.name}
          </a>
        );
      }
      if (Array.isArray(value)) return value.join(', ');
      return JSON.stringify(value);
    }
    return String(value);
  };

  // Prepare data for table
  const responses = useMemo(() => responsesData?.data || [], [responsesData]);
  const total = responsesData?.total || 0;
  const pageCount = Math.ceil(total / pagination.pageSize);

  // Create columns with callbacks
  const columns = useMemo(
    () =>
      getResponseColumns({
        onViewDetails: setSelectedResponse,
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize
      }),
    [pagination.pageIndex, pagination.pageSize]
  );

  const canViewResponses =
    permissionsData?.is_owner || permissionsData?.can_view_responses || false;
  const canExport =
    permissionsData?.is_owner || permissionsData?.can_export_data || false;

  const isLoading = formLoading || responsesLoading || permissionsLoading;

  // Show loading while fetching initial data (form + permissions)
  if ((formLoading || permissionsLoading) && !form) {
    return (
      <ContentLayout title='Form Responses'>
        <div className='flex items-center justify-center py-12'>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        </div>
      </ContentLayout>
    );
  }

  if (!form) {
    return (
      <ContentLayout title='Form Responses'>
        <div className='text-center py-12'>
          <p className='text-destructive'>Form not found</p>
        </div>
      </ContentLayout>
    );
  }

  // Only check permissions after permission data has loaded
  if (!permissionsLoading && !canViewResponses) {
    return (
      <ContentLayout title='Form Responses'>
        <div className='text-center py-12'>
          <p className='text-destructive'>
            You do not have permission to view responses
          </p>
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title='Form Responses'>
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
            <BreadcrumbPage>Responses</BreadcrumbPage>
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
              <h1 className='text-3xl font-bold tracking-tight'>
                Form Responses
              </h1>
              <p className='text-muted-foreground mt-1'>
                {total} {total === 1 ? 'response' : 'responses'} for{' '}
                {form.title}
              </p>
            </div>

            <div className='flex gap-2'>
              {/* Refresh Button */}
              <Button
                variant='outline'
                size='sm'
                onClick={handleRefresh}
                disabled={responsesLoading}
                title='Refresh responses'
              >
                <RefreshCw
                  className={cn('h-4 w-4', responsesLoading && 'animate-spin')}
                />
              </Button>

              {/* Export Buttons */}
              {canExport && responses.length > 0 && (
                <>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handleExport('csv')}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    ) : (
                      <FileText className='h-4 w-4 mr-2' />
                    )}
                    Export CSV
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handleExport('excel')}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    ) : (
                      <FileSpreadsheet className='h-4 w-4 mr-2' />
                    )}
                    Export Excel
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Response Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 md:grid-cols-3'>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>
                  Total Responses
                </p>
                <p className='text-2xl font-bold'>{total}</p>
              </div>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>
                  Form Fields
                </p>
                <p className='text-2xl font-bold'>{form.fields?.length || 0}</p>
              </div>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>
                  {form.submission_limit ? 'Completion Rate' : 'Submission Status'}
                </p>
                <p className='text-2xl font-bold'>
                  {form.submission_limit && form.submission_limit > 0 ? (
                    <>
                      {Math.round((total / form.submission_limit) * 100)}%
                      <span className='text-sm font-normal text-muted-foreground ml-2'>
                        ({total} / {form.submission_limit})
                      </span>
                    </>
                  ) : (
                    <>
                      {total}
                      <span className='text-sm font-normal text-muted-foreground ml-2'>
                        (Unlimited)
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Responses Table */}
        <Card>
          <CardHeader>
            <CardTitle>Submissions</CardTitle>
            <CardDescription>
              All form submissions with submission IDs and timestamps
            </CardDescription>
          </CardHeader>
          <CardContent>
            {responsesError && (
              <div className='text-center py-6 text-destructive bg-destructive/10 rounded-lg mb-4'>
                <p>
                  Error loading responses: {(responsesError as Error).message}
                </p>
              </div>
            )}

            <DataTable
              columns={columns}
              data={responses}
              manualPagination
              pageCount={pageCount}
              onPaginationChange={setPagination}
              searchKey='submission_id'
              searchPlaceholder='Search by submission ID or email...'
              globalFilter={searchInput}
              onGlobalFilterChange={setSearchInput}
            />
          </CardContent>
        </Card>

        {/* Response Details Dialog */}
        <Dialog
          open={!!selectedResponse}
          onOpenChange={() => setSelectedResponse(null)}
        >
          <DialogContent className='max-w-3xl w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0'>
            <DialogHeader className='px-6 pt-6 pb-4 border-b flex-shrink-0'>
              <DialogTitle>Response Details</DialogTitle>
            </DialogHeader>

            {selectedResponse && (
              <div className='overflow-y-auto flex-1 px-6 py-4'>
                <div className='space-y-6 pb-2'>
                  {/* Metadata */}
                  <div className='grid gap-4 sm:grid-cols-2 p-4 bg-muted rounded-lg'>
                    <div>
                      <p className='text-sm font-medium text-muted-foreground'>
                        Submission ID
                      </p>
                      <p className='font-mono text-sm sm:text-base break-all'>
                        {selectedResponse.submission_id}
                      </p>
                    </div>
                    <div>
                      <p className='text-sm font-medium text-muted-foreground'>
                        Submitted
                      </p>
                      <p className='text-sm sm:text-base'>
                        {format(
                          new Date(
                            selectedResponse.submitted_at ||
                              selectedResponse.created_at ||
                              new Date()
                          ),
                          'PPpp'
                        )}
                      </p>
                    </div>
                    {selectedResponse.user_email && (
                      <div className='sm:col-span-2'>
                        <p className='text-sm font-medium text-muted-foreground'>
                          Email
                        </p>
                        <p className='text-sm sm:text-base break-all'>
                          {selectedResponse.user_email}
                        </p>
                      </div>
                    )}
                    {selectedResponse.user_profile && (
                      <div className='sm:col-span-2'>
                        <p className='text-sm font-medium text-muted-foreground mb-2'>
                          MYJKKN Profile
                        </p>
                        <div className='p-4 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-2'>
                          <div className='flex items-start justify-between'>
                            <div>
                              <p className='font-semibold text-base'>
                                {selectedResponse.user_profile.full_name}
                              </p>
                              <div className='flex items-center gap-2 mt-1'>
                                <Badge
                                  variant={
                                    selectedResponse.user_profile.user_type ===
                                    'student'
                                      ? 'default'
                                      : 'secondary'
                                  }
                                  className='text-xs'
                                >
                                  {selectedResponse.user_profile.user_type ===
                                  'student'
                                    ? 'Student'
                                    : 'Staff'}
                                </Badge>
                                {selectedResponse.user_profile.identifier && (
                                  <span className='text-sm text-muted-foreground'>
                                    {selectedResponse.user_profile.identifier}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge variant='outline' className='text-xs'>
                              Auto-fetched
                            </Badge>
                          </div>

                          {selectedResponse.user_profile.institution_name && (
                            <div className='text-sm'>
                              <span className='text-muted-foreground'>
                                Institution:{' '}
                              </span>
                              <span className='font-medium'>
                                {selectedResponse.user_profile.institution_name}
                              </span>
                            </div>
                          )}

                          {selectedResponse.user_profile.department_name && (
                            <div className='text-sm'>
                              <span className='text-muted-foreground'>
                                Department:{' '}
                              </span>
                              <span className='font-medium'>
                                {selectedResponse.user_profile.department_name}
                              </span>
                            </div>
                          )}

                          {selectedResponse.user_profile.additional_info && (
                            <div className='text-sm'>
                              <span className='text-muted-foreground'>
                                {selectedResponse.user_profile.user_type ===
                                'student'
                                  ? 'Program'
                                  : 'Category'}
                                :{' '}
                              </span>
                              <span className='font-medium'>
                                {selectedResponse.user_profile.additional_info}
                              </span>
                            </div>
                          )}

                          {selectedResponse.user_profile.mobile && (
                            <div className='text-sm'>
                              <span className='text-muted-foreground'>
                                Mobile:{' '}
                              </span>
                              <span className='font-medium'>
                                {selectedResponse.user_profile.mobile}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Response Data */}
                  <div className='space-y-4'>
                    <h3 className='font-semibold text-base sm:text-lg'>
                      Form Responses
                    </h3>
                    {form.fields
                      .filter((field: any) => field.type !== 'image') // Filter out image fields (display-only)
                      .map((field: any) => {
                        const value = selectedResponse.response_data[field.id];
                        return (
                          <div
                            key={field.id}
                            className='border-b pb-4 last:border-0 last:pb-0'
                          >
                            <p className='text-sm font-medium mb-2 text-foreground'>
                              {field.label}
                              {field.required && (
                                <span className='text-destructive ml-1'>*</span>
                              )}
                            </p>
                            <div className='text-sm text-muted-foreground break-words whitespace-pre-wrap'>
                              {formatValue(value, field.type)}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ContentLayout>
  );
}
