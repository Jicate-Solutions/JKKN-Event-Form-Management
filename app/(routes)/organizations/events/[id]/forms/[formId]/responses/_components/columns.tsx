'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Eye, Trash2, Copy, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormResponse } from '@/types/form-responses';
import { cn } from '@/lib/utils';

interface ResponseColumnsProps {
  onView: (response: FormResponse) => void;
  onDelete: (response: FormResponse) => void;
  onCopySubmissionId: (submissionId: string) => void;
  duplicateResponseIds: Set<string>;
  getUserRole: (user: FormResponse['user']) => string;
  renderPaymentStatus: (status: string | undefined) => React.ReactNode;
}

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

export const getResponseColumns = ({
  onView,
  onDelete,
  onCopySubmissionId,
  duplicateResponseIds,
  getUserRole,
  renderPaymentStatus
}: ResponseColumnsProps): ColumnDef<FormResponse>[] => [
  {
    accessorKey: 'user_email',
    header: ({ column }) => {
      return (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Email
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => {
      const isDuplicate = duplicateResponseIds.has(row.original.id);
      return (
        <div
          className={cn(
            'font-medium',
            isDuplicate && 'bg-amber-50 px-2 py-1 rounded'
          )}
        >
          {row.original.user_email}
        </div>
      );
    }
  },
  {
    id: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const role = getUserRole(row.original.user);
      return (
        <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted'>
          {role}
        </span>
      );
    }
  },
  {
    accessorKey: 'submission_id',
    header: 'Submission ID',
    cell: ({ row }) => {
      const submissionId = row.original.submission_id;
      if (!submissionId) {
        return (
          <span className='text-muted-foreground italic text-xs'>N/A</span>
        );
      }
      return (
        <div className='flex items-center space-x-1'>
          <code className='px-1.5 py-0.5 bg-muted rounded text-xs font-mono'>
            {submissionId}
          </code>
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6'
            onClick={() => onCopySubmissionId(submissionId)}
            title='Copy submission ID'
          >
            <Copy className='h-3 w-3' />
          </Button>
        </div>
      );
    }
  },
  {
    accessorKey: 'submitted_at',
    header: ({ column }) => {
      return (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Submitted At
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => {
      return <span>{safeFormatDate(row.original.submitted_at, 'PPp')}</span>;
    }
  },
  {
    accessorKey: 'payment_status',
    header: ({ column }) => {
      return (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Payment Status
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => {
      return renderPaymentStatus(row.original.payment_status);
    }
  },
  {
    id: 'actions',
    header: () => <div className='text-right'>Actions</div>,
    cell: ({ row }) => {
      const response = row.original;

      return (
        <div className='flex items-center justify-end space-x-1'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => onView(response)}
            className='hover:bg-primary/10 h-8 w-8'
            title='View details'
          >
            <Eye className='h-4 w-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => onDelete(response)}
            className='hover:bg-destructive/10 text-destructive h-8 w-8'
            title='Delete response'
          >
            <Trash2 className='h-4 w-4' />
          </Button>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false
  }
];
