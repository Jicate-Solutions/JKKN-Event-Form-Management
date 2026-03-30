'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ContentLayout } from '@/components/layout/content-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BeatLoader } from 'react-spinners';
import { FormService } from '@/lib/services/form-service';
import { Form, FormField } from '@/types/forms';
import { FormResponse as FormResponseType } from '@/types/form-responses';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Download,
  Eye,
  FileText,
  BarChart2,
  Search,
  X,
  Filter,
  RefreshCcw,
  Copy,
  Trash2,
  CalendarIcon
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from '@/components/ui/pagination';
import { FormStatistics } from '../_components/form-statistics';
import Image from 'next/image';
import { ResponseDetails } from './_components/response-details';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { useRef } from 'react';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CardDescription,
  CardHeader as UiCardHeader,
  CardTitle as UiCardTitle
} from '@/components/ui/card';
import {
  TableBody as UiTableBody,
  TableHeader as UiTableHeader,
  TableRow as UiTableRow
} from '@/components/ui/table';
import { UserRole } from '@/lib/constants/roles';

interface ResponseUser {
  id?: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  user_metadata?: {
    full_name?: string;
    role?: string;
    email_verified?: boolean;
  };
}

type FormResponse = FormResponseType;

interface FieldMapping {
  id: string;
  label: string;
  type: string;
}

const getFieldMappings = (form: Form): FieldMapping[] => {
  return form.fields.map((field) => ({
    id: field.id,
    label: field.label,
    type: field.type
  }));
};

const formatResponseValue = (value: any, fieldType: string) => {
  if (value === null || value === undefined) return 'N/A';

  switch (fieldType) {
    case 'file':
      if (typeof value === 'object' && value.url) {
        return (
          <div className='space-y-2'>
            <a
              href={value.url}
              target='_blank'
              rel='noopener noreferrer'
              className='text-blue-600 hover:underline flex items-center gap-2'
            >
              {value.name}
            </a>
            {value.type?.startsWith('image/') && (
              <Image
                src={value.url}
                alt={value.name}
                className='max-w-[200px] h-auto rounded-md border'
                width={200}
                height={200}
              />
            )}
          </div>
        );
      }
      return 'N/A';

    case 'checkbox':
    case 'multiselect':
      if (Array.isArray(value)) {
        return (
          <div className='space-y-1'>
            {value.map((item, idx) => (
              <div key={idx}>• {item.trim()}</div>
            ))}
          </div>
        );
      }
      return value ? 'Yes' : 'No';

    case 'date':
      if (!value) return 'N/A';
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return `Invalid date: ${value}`;
        }
        return format(date, 'PP');
      } catch (error) {
        console.error('Error formatting date value:', error, 'Value:', value);
        return `Invalid date: ${value}`;
      }

    default:
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return value.toString().trim();
  }
};

function formatTimeValue(value: string): string {
  if (!value) return 'N/A';

  try {
    // Validate time format (HH:MM)
    if (!value.match(/^\d{1,2}:\d{2}$/)) {
      return value; // Return as-is if not in expected format
    }

    const [hours, minutes] = value.split(':');
    const hourNum = parseInt(hours, 10);
    const minuteNum = parseInt(minutes, 10);

    // Validate hour and minute ranges
    if (hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59) {
      return `Invalid time: ${value}`;
    }

    const date = new Date();
    date.setHours(hourNum, minuteNum);

    return date.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting time value:', error, 'Value:', value);
    return value;
  }
}

function formatDateValue(dateString: string): string {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return `Invalid date: ${dateString}`;
    }
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date string:', error, 'Value:', dateString);
    return `Invalid date: ${dateString}`;
  }
}

function formatFieldValue(value: any): React.ReactNode {
  if (!value) return 'N/A';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') {
    if ('url' in value) {
      const isImage = value.type.startsWith('image/');
      return (
        <div className='space-y-2'>
          <div className='flex items-center gap-2'>
            <FileText className='h-4 w-4' />
            <span>{value.name}</span>
          </div>
          {isImage ? (
            <Image
              src={value.url}
              alt={value.name}
              className='max-w-full h-auto rounded-md border'
              width={300}
              height={300}
            />
          ) : (
            <Button
              variant='outline'
              size='sm'
              onClick={() => window.open(value.url, '_blank')}
            >
              View Document
            </Button>
          )}
        </div>
      );
    }
    if ('dataUrl' in value) return 'Signature';
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    if (value.match(/^\d{2}:\d{2}$/)) {
      return formatTimeValue(value);
    }
    if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return formatDateValue(value);
    }
  }
  return String(value);
}

// Add formatToString helper function to fix Date type errors
const formatToString = (date?: Date) => {
  if (!date) return '';
  try {
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return format(date, 'PPP');
  } catch (error) {
    console.error('Error formatting date to string:', error);
    return 'Invalid date';
  }
};

// Utility function to safely format dates
const safeFormatDate = (dateValue: any, formatStr: string): string => {
  if (!dateValue) return 'N/A';

  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return `Invalid date: ${dateValue}`;
    }
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error, 'Value:', dateValue);
    return `Invalid date: ${dateValue}`;
  }
};

export default function FormResponsesPage() {
  const { id: eventId, formId } = useParams<{
    id: string;
    formId: string;
  }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(
    null
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [customPage, setCustomPage] = useState('');
  // Add state variables to store user info
  const [currentUser, setCurrentUser] = useState<{ id: string; role?: string }>(
    { id: '' }
  );

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>(
    undefined
  );
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>(
    undefined
  );
  const [isFiltering, setIsFiltering] = useState(false);
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all');
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  // Function to get role from user object consistently
  const getUserRole = (user: ResponseUser | undefined): string => {
    if (user && 'role' in user && user.role) {
      return user.role;
    } else if (user?.user_metadata?.role) {
      return user.user_metadata.role;
    }
    return 'public';
  };

  // Function to get user's full name consistently
  const getUserFullName = (user: ResponseUser | undefined): string => {
    if (user && 'full_name' in user && user.full_name) {
      return user.full_name;
    } else if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    return '';
  };

  // Function to identify potential duplicate responses
  const findPotentialDuplicates = (
    responses: FormResponse[]
  ): Record<string, FormResponse[]> => {
    const duplicates: Record<string, FormResponse[]> = {};

    // Group by user_email
    const responsesByUser: Record<string, FormResponse[]> = {};

    responses.forEach((response) => {
      if (!responsesByUser[response.user_email]) {
        responsesByUser[response.user_email] = [];
      }
      responsesByUser[response.user_email].push(response);
    });

    // For each user, find submissions that are close in time (within 10 minutes)
    Object.entries(responsesByUser).forEach(([email, userResponses]) => {
      if (userResponses.length <= 1) return;

      // Sort by submission time
      userResponses.sort(
        (a, b) =>
          new Date(a.submitted_at).getTime() -
          new Date(b.submitted_at).getTime()
      );

      // Check for submissions that are close in time
      for (let i = 0; i < userResponses.length - 1; i++) {
        const currentTime = new Date(userResponses[i].submitted_at).getTime();
        const nextTime = new Date(userResponses[i + 1].submitted_at).getTime();

        // If submissions are within 10 minutes (600000 ms) of each other
        if (nextTime - currentTime < 600000) {
          // Check if response data is similar
          const currentData = JSON.stringify(userResponses[i].response_data);
          const nextData = JSON.stringify(userResponses[i + 1].response_data);

          if (
            currentData === nextData ||
            (currentData.length > 0 &&
              nextData.length > 0 &&
              (currentData.includes(nextData) ||
                nextData.includes(currentData)))
          ) {
            const key = `${email}-${Math.floor(currentTime / 600000)}`;
            if (!duplicates[key]) {
              duplicates[key] = [userResponses[i]];
            }
            duplicates[key].push(userResponses[i + 1]);
          }
        }
      }
    });

    return duplicates;
  };

  // Collect unique roles from responses
  const uniqueRoles = useMemo(() => {
    return [...new Set(responses.map((r) => getUserRole(r.user)))];
  }, [responses]);

  // Get unique payment statuses for the filter
  const uniquePaymentStatuses = useMemo(() => {
    const statuses = new Set<string>();
    responses.forEach((response) => {
      if (response.payment_status) {
        statuses.add(response.payment_status);
      }
    });
    return Array.from(statuses);
  }, [responses]);

  const potentialDuplicates = useMemo(
    () => findPotentialDuplicates(responses),
    [responses]
  );

  // Set of duplicate response IDs for quick lookup
  const duplicateResponseIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(potentialDuplicates).forEach((group) => {
      group.forEach((response) => {
        ids.add(response.id);
      });
    });
    return ids;
  }, [potentialDuplicates]);

  const isFirstRender = useRef(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Get current user
        const supabase = createClientSupabaseClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (!user) {
          console.error('No authenticated user found');
          return;
        }

        console.log('Full user object:', JSON.stringify(user, null, 2));

        // Fetch the user's profile to get their role
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
        }

        const userRole = profileData?.role;

        // Store user info in state for later use
        setCurrentUser({
          id: user.id,
          role: userRole
        });

        console.log('Current user:', {
          id: user.id,
          email: user.email,
          role: userRole,
          profileData
        });

        const [formData, responsesData] = await Promise.all([
          FormService.getForm(formId as string),
          FormService.getFormResponses(formId as string, {
            id: user.id,
            role: userRole
          })
        ]);

        console.log('Form data:', formData);
        console.log(`Fetched ${responsesData?.length || 0} responses`);

        // Fetch user details for each response with batch processing
        const BATCH_SIZE = 100; // Process in smaller batches
        let enrichedResponses: FormResponse[] = [];

        // Process responses in batches to avoid overwhelming Promise.all
        for (let i = 0; i < responsesData.length; i += BATCH_SIZE) {
          const batch = responsesData.slice(i, i + BATCH_SIZE);
          console.log(
            `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(responsesData.length / BATCH_SIZE)} (${batch.length} responses)`
          );

          const batchResults = await Promise.all(
            batch.map(async (response) => {
              try {
                const { data: userData } = await supabase
                  .from('profiles')
                  .select('full_name, email, avatar_url, role')
                  .eq('email', response.user_email)
                  .single();

                return {
                  ...response,
                  user: userData
                };
              } catch (error) {
                console.error(
                  `Error fetching user data for ${response.user_email}:`,
                  error
                );
                return response;
              }
            })
          );

          // Add batch results to overall results
          enrichedResponses = [...enrichedResponses, ...batchResults];
          console.log(
            `Enriched ${enrichedResponses.length} of ${responsesData.length} responses with user data so far`
          );
        }

        console.log(
          `Completed enrichment: ${enrichedResponses.length} of ${responsesData.length} responses with user data`
        );

        // Convert database type to Form type
        setForm({
          ...formData,
          description: formData.description ?? undefined,
          fields: formData.fields as any
        } as Form);
        setResponses(enrichedResponses);

        // Set initial filter role if it's not set yet
        if (isFirstRender.current && filterRole === '') {
          setFilterRole('all');
          isFirstRender.current = false;
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [formId, filterRole, setFilterRole, setForm, setResponses]);

  useEffect(() => {
    // Initialize filter state when responses are loaded
    if (responses.length > 0 && filterRole === '') {
      setFilterRole('all');
    }
  }, [responses, setFilterRole, filterRole]);

  // Filter responses based on current filters
  const filteredResponses = useMemo(() => {
    return responses.filter((response) => {
      // Show only duplicates if the filter is on
      if (showDuplicatesOnly && !duplicateResponseIds.has(response.id)) {
        return false;
      }

      // Filter by role
      if (
        filterRole &&
        filterRole !== 'all' &&
        getUserRole(response.user) !== filterRole
      ) {
        return false;
      }

      // Filter by payment status
      if (
        filterPaymentStatus &&
        filterPaymentStatus !== 'all' &&
        response.payment_status !== filterPaymentStatus
      ) {
        return false;
      }

      // Filter by search term
      if (
        searchTerm &&
        !response.user_email.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !getUserFullName(response.user)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) &&
        !(
          response.submission_id &&
          response.submission_id
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        )
      ) {
        return false;
      }

      // Filter by date range
      if (filterStartDate) {
        const startDate = new Date(filterStartDate);
        startDate.setHours(0, 0, 0, 0);
        if (new Date(response.submitted_at) < startDate) {
          return false;
        }
      }
      if (filterEndDate) {
        const endDate = new Date(filterEndDate);
        endDate.setHours(23, 59, 59, 999);
        if (new Date(response.submitted_at) > endDate) {
          return false;
        }
      }

      return true;
    });
  }, [
    responses,
    searchTerm,
    filterRole,
    filterStartDate,
    filterEndDate,
    filterPaymentStatus,
    showDuplicatesOnly,
    duplicateResponseIds
  ]);

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setFilterRole('all');
    setFilterStartDate(undefined);
    setFilterEndDate(undefined);
    setFilterPaymentStatus('all');
    setShowDuplicatesOnly(false);
    setIsFiltering(false);
    setPage(1);
  };

  // Calculate pagination based on filtered responses
  const totalPages = Math.ceil(filteredResponses.length / pageSize);
  const paginatedResponses = filteredResponses.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Handle custom page navigation
  const handlePageJump = () => {
    const pageNum = parseInt(customPage, 10);
    if (!isNaN(pageNum) && pageNum > 0 && pageNum <= totalPages) {
      setPage(pageNum);
      setCustomPage('');
    } else {
      toast.error(
        `Please enter a valid page number between 1 and ${totalPages}`
      );
    }
  };

  // Generate pagination links with ellipsis for large number of pages
  const renderPaginationLinks = () => {
    const pageLinks = [];

    if (totalPages <= 7) {
      // If there are 7 or fewer pages, show all pages
      for (let i = 1; i <= totalPages; i++) {
        pageLinks.push(
          <PaginationItem key={i}>
            <PaginationLink onClick={() => setPage(i)} isActive={page === i}>
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      // Always show first page
      pageLinks.push(
        <PaginationItem key={1}>
          <PaginationLink onClick={() => setPage(1)} isActive={page === 1}>
            1
          </PaginationLink>
        </PaginationItem>
      );

      // Determine range of pages to show around current page
      let startPage = Math.max(2, page - 1);
      let endPage = Math.min(totalPages - 1, page + 1);

      // Adjust if we're near the beginning
      if (page <= 3) {
        startPage = 2;
        endPage = 4;
      }

      // Adjust if we're near the end
      if (page >= totalPages - 2) {
        startPage = totalPages - 3;
        endPage = totalPages - 1;
      }

      // Add ellipsis before middle pages if needed
      if (startPage > 2) {
        pageLinks.push(
          <PaginationItem key='ellipsis-start'>
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pageLinks.push(
          <PaginationItem key={i}>
            <PaginationLink onClick={() => setPage(i)} isActive={page === i}>
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      // Add ellipsis after middle pages if needed
      if (endPage < totalPages - 1) {
        pageLinks.push(
          <PaginationItem key='ellipsis-end'>
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Always show last page
      pageLinks.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            onClick={() => setPage(totalPages)}
            isActive={page === totalPages}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return pageLinks;
  };

  const copySubmissionId = (submissionId: string) => {
    navigator.clipboard.writeText(submissionId);
    toast.success('Submission ID copied to clipboard');
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      // If filtering is active, we should export only the filtered responses
      if (isFiltering && filteredResponses.length > 0) {
        // Use existing form data instead of fetching it again
        if (!form) {
          toast.error('Cannot export: Form data not available');
          return;
        }

        // Helper function to format conditional field values properly
        const formatConditionalValue = (value: any): string => {
          if (value === null || value === undefined) return '';

          // Helper function to extract values from deeply nested conditional objects
          const extractNestedValues = (
            data: any
          ): { mainValue: string; conditionalValue: string } => {
            if (!data) return { mainValue: '', conditionalValue: '' };

            // If not an object, return as mainValue
            if (typeof data !== 'object')
              return { mainValue: String(data), conditionalValue: '' };

            // Base case: simple mainValue/conditionalValue object
            if ('mainValue' in data && typeof data.mainValue !== 'object') {
              return {
                mainValue: data.mainValue || '',
                conditionalValue: data.conditionalValue || ''
              };
            }

            // Recursive case: nested mainValue objects
            if ('mainValue' in data && typeof data.mainValue === 'object') {
              // Keep the current conditionalValue, but check inner mainValue
              const innerValues = extractNestedValues(data.mainValue);
              return {
                mainValue: innerValues.mainValue,
                conditionalValue:
                  data.conditionalValue || innerValues.conditionalValue
              };
            }

            // Fallback for other structures
            return { mainValue: JSON.stringify(data), conditionalValue: '' };
          };

          // Process conditional field object
          if (typeof value === 'object' && 'mainValue' in value) {
            const { mainValue, conditionalValue } = extractNestedValues(value);
            if (conditionalValue) {
              return `${mainValue} - ${conditionalValue}`;
            }
            return mainValue || '';
          }

          // For simple string values or arrays
          if (Array.isArray(value)) {
            return value.join(', ');
          }

          if (typeof value === 'object') {
            return value.name || JSON.stringify(value);
          }

          return String(value);
        };

        // Create data rows from filtered responses
        const rows = filteredResponses.map((response) => {
          const rowData: Record<string, any> = {
            'User Email': response.user_email,
            'Submission Date': formatToString(new Date(response.submitted_at)),
            'Submission ID': response.submission_id || 'N/A',
            'Payment Status': response.payment_status || 'N/A',
            'Payment Amount': response.payment_amount
              ? `${response.payment_amount.toFixed(2)}`
              : 'N/A',
            'Payment ID': response.payment_id || 'N/A',
            'Payment Date': response.payment_updated_at
              ? formatToString(new Date(response.payment_updated_at))
              : 'N/A'
          };

          // Add form field values with proper formatting for conditional fields
          form.fields.forEach((field: FormField) => {
            if (field.type === 'conditional') {
              rowData[field.label] = formatConditionalValue(
                response.response_data[field.id]
              );
            } else {
              rowData[field.label] = response.response_data[field.id] || 'N/A';
            }
          });

          return rowData;
        });

        // Download the file
        if (format === 'csv') {
          const csvContent = convertToCSV(rows);
          const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;'
          });
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', `${form.title}-filtered-responses.csv`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          // For Excel, use XLSX library for filtered data too
          try {
            const XLSX = await import('xlsx');
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(
              workbook,
              worksheet,
              'Filtered Responses'
            );
            XLSX.writeFile(workbook, `${form.title}-filtered-responses.xlsx`);
          } catch (error) {
            console.error('Error generating Excel file:', error);
            toast.error(
              'Failed to generate Excel file. Using the service method instead.'
            );
            await FormService.exportResponses(formId as string, format);
            toast.success(
              'Note: The exported file contains all responses, not just filtered ones.'
            );
          }
        }
      } else {
        // Export all responses using the FormService
        await FormService.exportResponses(formId as string, format);
      }
    } catch (error) {
      console.error('Error exporting responses:', error);
      toast.error('Failed to export responses');
    }
  };

  // Helper function to convert data to CSV
  const convertToCSV = (objArray: Record<string, any>[]) => {
    if (objArray.length === 0) return '';

    const header = Object.keys(objArray[0]).join(',');
    const rows = objArray.map((obj) =>
      Object.values(obj)
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(',')
    );

    return [header, ...rows].join('\n');
  };

  const renderPaymentStatus = (status: string | undefined) => {
    if (!status) return 'Not Paid';

    switch (status.toLowerCase()) {
      case 'paid':
        return (
          <Badge variant='default' className='bg-green-100 text-green-800'>
            Paid
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant='secondary' className='bg-yellow-100 text-yellow-800'>
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant='destructive' className='bg-red-100 text-red-800'>
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant='outline' className='bg-gray-100 text-gray-800'>
            {status}
          </Badge>
        );
    }
  };

  // Function to handle deleting a response
  const handleDeleteResponse = async (responseId: string) => {
    try {
      await FormService.deleteFormResponse(responseId);

      // Update the responses array by removing the deleted response
      setResponses((prev) => prev.filter((r) => r.id !== responseId));

      toast.success('Response deleted successfully');
    } catch (error) {
      console.error('Error deleting response:', error);
      toast.error('Failed to delete response');
    }
  };

  // Add the ability to navigate between responses
  const handleResponseNavigation = (direction: 'prev' | 'next') => {
    if (!selectedResponse || !form) return;

    const currentIndex = filteredResponses.findIndex(
      (r) => r.id === selectedResponse.id
    );
    if (currentIndex === -1) return;

    let nextIndex: number;
    if (direction === 'prev') {
      nextIndex = Math.max(0, currentIndex - 1);
    } else {
      nextIndex = Math.min(filteredResponses.length - 1, currentIndex + 1);
    }

    if (nextIndex !== currentIndex) {
      setSelectedResponse({
        ...filteredResponses[nextIndex],
        form,
        // Preserve user info for authorization when navigating
        __userInfo: {
          id: currentUser.id,
          role: currentUser.role
        }
      });
    }
  };

  if (loading) {
    return (
      <ContentLayout title='Form Responses'>
        <div className='flex justify-center items-center min-h-[400px]'>
          <BeatLoader color='#00e902' />
        </div>
      </ContentLayout>
    );
  }

  if (!form) return null;

  return (
    <ContentLayout title={`${form.title} - Responses`}>
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
              <Link href='/organizations/events'>Events</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/organizations/events/${eventId}`}>
                Event Details
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Form Responses</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='mt-6 space-y-6'>
        <div className='flex justify-between items-center'>
          <div>
            <h1 className='text-2xl font-bold'>{form.title}</h1>
            <p className='text-sm text-muted-foreground mt-1'>
              Total Responses: {responses.length}
              {isFiltering && (
                <span className='ml-2'>
                  (Filtered: {filteredResponses.length})
                </span>
              )}
            </p>
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              onClick={() =>
                router.push(
                  `/organizations/events/${eventId}/forms/${formId}/statistics`
                )
              }
            >
              <BarChart2 className='h-4 w-4 mr-2' />
              Statistics
            </Button>
            <Button variant='outline' onClick={() => handleExport('csv')}>
              <Download className='h-4 w-4 mr-2' />
              Export{' '}
              {isFiltering
                ? `Filtered (${filteredResponses.length})`
                : 'All'}{' '}
              as CSV
            </Button>
            <Button variant='outline' onClick={() => handleExport('excel')}>
              <Download className='h-4 w-4 mr-2' />
              Export{' '}
              {isFiltering
                ? `Filtered (${filteredResponses.length})`
                : 'All'}{' '}
              as Excel
            </Button>
          </div>
        </div>

        {/* Filter controls */}
        <div className='flex flex-wrap gap-3 items-start'>
          <div className='relative flex-1 min-w-[200px]'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search by email or submission ID...'
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsFiltering(
                  !!e.target.value ||
                    filterRole !== 'all' ||
                    !!filterStartDate ||
                    !!filterEndDate ||
                    filterPaymentStatus !== 'all' ||
                    showDuplicatesOnly
                );
                setPage(1);
              }}
              className='pl-9'
            />
            {searchTerm && (
              <Button
                variant='ghost'
                size='icon'
                className='absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6'
                onClick={() => {
                  setSearchTerm('');
                  setIsFiltering(
                    filterRole !== 'all' ||
                      !!filterStartDate ||
                      !!filterEndDate ||
                      filterPaymentStatus !== 'all' ||
                      showDuplicatesOnly
                  );
                }}
              >
                <X className='h-3 w-3' />
              </Button>
            )}
          </div>

          <Select
            value={filterRole}
            onValueChange={(value) => {
              setFilterRole(value);
              setIsFiltering(
                !!searchTerm ||
                  value !== 'all' ||
                  !!filterStartDate ||
                  !!filterEndDate ||
                  filterPaymentStatus !== 'all' ||
                  showDuplicatesOnly
              );
              setPage(1);
            }}
          >
            <SelectTrigger className='w-full sm:w-[180px]'>
              <SelectValue placeholder='Filter by role' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All roles</SelectItem>
              {uniqueRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Payment status filter */}
          <Select
            value={filterPaymentStatus}
            onValueChange={(value) => {
              setFilterPaymentStatus(value);
              setIsFiltering(
                !!searchTerm ||
                  filterRole !== 'all' ||
                  !!filterStartDate ||
                  !!filterEndDate ||
                  value !== 'all' ||
                  showDuplicatesOnly
              );
              setPage(1);
            }}
          >
            <SelectTrigger className='w-full sm:w-[180px]'>
              <SelectValue placeholder='Payment status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All payment statuses</SelectItem>
              {uniquePaymentStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date range filters */}
          <div className='flex gap-2'>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  className={cn(
                    'justify-start text-left font-normal w-[170px]',
                    !filterStartDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className='mr-2 h-4 w-4' />
                  {filterStartDate
                    ? formatToString(filterStartDate)
                    : 'Start date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='start'>
                <Calendar
                  mode='single'
                  selected={filterStartDate}
                  onSelect={(date) => {
                    setFilterStartDate(date);
                    setIsFiltering(
                      !!searchTerm ||
                        filterRole !== 'all' ||
                        !!date ||
                        !!filterEndDate ||
                        filterPaymentStatus !== 'all' ||
                        showDuplicatesOnly
                    );
                    setPage(1);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  className={cn(
                    'justify-start text-left font-normal w-[170px]',
                    !filterEndDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className='mr-2 h-4 w-4' />
                  {filterEndDate ? formatToString(filterEndDate) : 'End date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='start'>
                <Calendar
                  mode='single'
                  selected={filterEndDate}
                  onSelect={(date) => {
                    setFilterEndDate(date);
                    setIsFiltering(
                      !!searchTerm ||
                        filterRole !== 'all' ||
                        !!filterStartDate ||
                        !!date ||
                        filterPaymentStatus !== 'all' ||
                        showDuplicatesOnly
                    );
                    setPage(1);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Duplicates filter */}
          <Button
            variant={showDuplicatesOnly ? 'secondary' : 'outline'}
            size='sm'
            onClick={() => {
              setShowDuplicatesOnly(!showDuplicatesOnly);
              setIsFiltering(
                !!searchTerm ||
                  filterRole !== 'all' ||
                  !!filterStartDate ||
                  !!filterEndDate ||
                  filterPaymentStatus !== 'all' ||
                  !showDuplicatesOnly
              );
              setPage(1);
            }}
            className='whitespace-nowrap'
          >
            <Filter className='h-4 w-4 mr-2' />
            {showDuplicatesOnly ? 'Showing duplicates' : 'Show duplicates'}
            {Object.keys(potentialDuplicates).length > 0 && (
              <Badge variant='destructive' className='ml-2'>
                {Object.values(potentialDuplicates).reduce(
                  (acc, group) => acc + group.length,
                  0
                )}
              </Badge>
            )}
          </Button>

          {/* Reset filters */}
          {isFiltering && (
            <Button
              variant='ghost'
              size='sm'
              onClick={resetFilters}
              className='whitespace-nowrap'
            >
              <RefreshCcw className='h-4 w-4 mr-2' />
              Reset filters
            </Button>
          )}
        </div>

        {/* Active filters display */}
        {isFiltering && (
          <div className='flex flex-wrap gap-2'>
            {searchTerm && (
              <Badge variant='outline' className='flex items-center gap-1'>
                Search: {searchTerm}
                <X
                  className='h-3 w-3 cursor-pointer'
                  onClick={() => {
                    setSearchTerm('');
                    setIsFiltering(
                      filterRole !== 'all' ||
                        !!filterStartDate ||
                        !!filterEndDate ||
                        filterPaymentStatus !== 'all' ||
                        showDuplicatesOnly
                    );
                  }}
                />
              </Badge>
            )}
            {filterRole && filterRole !== 'all' && (
              <Badge variant='outline' className='flex items-center gap-1'>
                Role: {filterRole}
                <X
                  className='h-3 w-3 cursor-pointer'
                  onClick={() => {
                    setFilterRole('all');
                    setIsFiltering(
                      !!searchTerm ||
                        !!filterStartDate ||
                        !!filterEndDate ||
                        filterPaymentStatus !== 'all' ||
                        showDuplicatesOnly
                    );
                  }}
                />
              </Badge>
            )}
            {filterPaymentStatus && filterPaymentStatus !== 'all' && (
              <Badge variant='outline' className='flex items-center gap-1'>
                Payment: {filterPaymentStatus}
                <X
                  className='h-3 w-3 cursor-pointer'
                  onClick={() => {
                    setFilterPaymentStatus('all');
                    setIsFiltering(
                      !!searchTerm ||
                        filterRole !== 'all' ||
                        !!filterStartDate ||
                        !!filterEndDate ||
                        showDuplicatesOnly
                    );
                  }}
                />
              </Badge>
            )}
            {filterStartDate && (
              <Badge variant='outline' className='flex items-center gap-1'>
                From: {formatToString(filterStartDate)}
                <X
                  className='h-3 w-3 cursor-pointer'
                  onClick={() => {
                    setFilterStartDate(undefined);
                    setIsFiltering(
                      !!searchTerm ||
                        filterRole !== 'all' ||
                        !!filterEndDate ||
                        filterPaymentStatus !== 'all' ||
                        showDuplicatesOnly
                    );
                  }}
                />
              </Badge>
            )}
            {filterEndDate && (
              <Badge variant='outline' className='flex items-center gap-1'>
                To: {formatToString(filterEndDate)}
                <X
                  className='h-3 w-3 cursor-pointer'
                  onClick={() => {
                    setFilterEndDate(undefined);
                    setIsFiltering(
                      !!searchTerm ||
                        filterRole !== 'all' ||
                        !!filterStartDate ||
                        filterPaymentStatus !== 'all' ||
                        showDuplicatesOnly
                    );
                  }}
                />
              </Badge>
            )}
            {showDuplicatesOnly && (
              <Badge variant='outline' className='flex items-center gap-1'>
                Duplicates only
                <X
                  className='h-3 w-3 cursor-pointer'
                  onClick={() => {
                    setShowDuplicatesOnly(false);
                    setIsFiltering(
                      !!searchTerm ||
                        filterRole !== 'all' ||
                        !!filterStartDate ||
                        !!filterEndDate ||
                        filterPaymentStatus !== 'all'
                    );
                  }}
                />
              </Badge>
            )}
          </div>
        )}

        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow className='bg-muted/50'>
                <TableHead className='w-16 font-medium'>S.No</TableHead>
                <TableHead className='font-medium'>Email</TableHead>
                <TableHead className='font-medium'>Role</TableHead>
                <TableHead className='font-medium'>Submission ID</TableHead>
                <TableHead className='font-medium'>Submitted At</TableHead>
                <TableHead className='font-medium'>Payment Status</TableHead>
                <TableHead className='w-20 font-medium text-right'>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedResponses.length > 0 ? (
                paginatedResponses.map((response, index) => (
                  <TableRow
                    key={response.id}
                    className={cn(
                      'hover:bg-muted/50',
                      duplicateResponseIds.has(response.id) && 'bg-amber-50'
                    )}
                  >
                    <TableCell className='font-medium'>
                      {(page - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell>{response.user_email}</TableCell>
                    <TableCell>
                      <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted'>
                        {getUserRole(response.user)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {response.submission_id ? (
                        <div className='flex items-center space-x-1'>
                          <code className='px-1.5 py-0.5 bg-muted rounded text-xs font-mono'>
                            {response.submission_id}
                          </code>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-6 w-6'
                            onClick={() =>
                              copySubmissionId(response.submission_id!)
                            }
                            title='Copy submission ID'
                          >
                            <Copy className='h-3 w-3' />
                          </Button>
                        </div>
                      ) : (
                        <span className='text-muted-foreground italic text-xs'>
                          N/A
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {safeFormatDate(response.submitted_at, 'PPp')}
                    </TableCell>
                    <TableCell>
                      {renderPaymentStatus(response.payment_status)}
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex items-center justify-end space-x-1'>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() =>
                            setSelectedResponse({
                              ...response,
                              form,
                              __userInfo: {
                                id: currentUser.id,
                                role: currentUser.role
                              }
                            })
                          }
                          className='hover:bg-primary/10 h-8 w-8'
                          title='View details'
                        >
                          <Eye className='h-4 w-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => {
                            setSelectedResponse({
                              ...response,
                              form,
                              __userInfo: {
                                id: currentUser.id,
                                role: currentUser.role
                              }
                            });
                          }}
                          className='hover:bg-destructive/10 text-destructive h-8 w-8'
                          title='Delete response'
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className='h-24 text-center'>
                    {isFiltering ? (
                      <div className='flex flex-col items-center justify-center text-muted-foreground'>
                        <Filter className='h-8 w-8 mb-2' />
                        <p>No results match your filters.</p>
                        <Button
                          variant='link'
                          onClick={resetFilters}
                          className='mt-2'
                        >
                          Reset filters
                        </Button>
                      </div>
                    ) : (
                      <p className='text-muted-foreground'>No responses yet.</p>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 0 && (
          <div className='w-full flex flex-col md:flex-row items-center justify-between gap-4 mt-4'>
            <div className='flex items-center gap-2'>
              <p className='text-sm text-muted-foreground'>
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, filteredResponses.length)} of{' '}
                {filteredResponses.length} responses
              </p>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  const newPageSize = parseInt(value, 10);
                  setPageSize(newPageSize);
                  // Adjust current page to keep user at a similar position in the data
                  const firstItemIndex = (page - 1) * pageSize;
                  setPage(Math.floor(firstItemIndex / newPageSize) + 1);
                }}
              >
                <SelectTrigger className='w-[80px]'>
                  <SelectValue placeholder='10' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='5'>5</SelectItem>
                  <SelectItem value='10'>10</SelectItem>
                  <SelectItem value='20'>20</SelectItem>
                  <SelectItem value='50'>50</SelectItem>
                  <SelectItem value='100'>100</SelectItem>
                </SelectContent>
              </Select>
              <p className='text-sm text-muted-foreground'>per page</p>
            </div>

            <div className='flex items-center gap-2'>
              <div className='flex items-center'>
                <Input
                  className='w-16 h-8'
                  placeholder='Page'
                  value={customPage}
                  onChange={(e) => setCustomPage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePageJump();
                    }
                  }}
                />
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handlePageJump}
                  className='ml-2'
                  disabled={totalPages <= 1}
                >
                  Go
                </Button>
              </div>

              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      variant='outline'
                      size='icon'
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      className='h-8 w-8'
                    >
                      <span className='sr-only'>First page</span>
                      <span>«</span>
                    </Button>
                  </PaginationItem>
                  <PaginationItem>
                    <Button
                      variant='outline'
                      size='icon'
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className='h-8 w-8'
                    >
                      <span className='sr-only'>Previous page</span>
                      <span>‹</span>
                    </Button>
                  </PaginationItem>

                  {renderPaginationLinks()}

                  <PaginationItem>
                    <Button
                      variant='outline'
                      size='icon'
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages || totalPages === 0}
                      className='h-8 w-8'
                    >
                      <span className='sr-only'>Next page</span>
                      <span>›</span>
                    </Button>
                  </PaginationItem>
                  <PaginationItem>
                    <Button
                      variant='outline'
                      size='icon'
                      onClick={() => setPage(totalPages)}
                      disabled={page === totalPages || totalPages === 0}
                      className='h-8 w-8'
                    >
                      <span className='sr-only'>Last page</span>
                      <span>»</span>
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}

        <ResponseDetails
          response={selectedResponse}
          open={!!selectedResponse}
          onClose={() => setSelectedResponse(null)}
          onDelete={handleDeleteResponse}
          onNavigate={form ? handleResponseNavigation : undefined}
          hasPrevious={
            !!selectedResponse &&
            filteredResponses.findIndex((r) => r.id === selectedResponse.id) > 0
          }
          hasNext={
            !!selectedResponse &&
            filteredResponses.findIndex((r) => r.id === selectedResponse.id) <
              filteredResponses.length - 1
          }
        />
      </div>
    </ContentLayout>
  );
}
