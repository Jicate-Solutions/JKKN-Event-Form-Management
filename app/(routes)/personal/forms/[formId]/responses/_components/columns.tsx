'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface FormResponse {
  id: string;
  personal_form_id: string;
  submission_id: string;
  response_data: Record<string, any>;
  submitted_at: string;
  created_at?: string;
  user_email?: string;
  submitted_by?: string | null;
  is_anonymous?: boolean;
  user_profile?: {
    user_type: 'student' | 'staff';
    full_name: string;
    email: string;
    mobile?: string;
    institution_name?: string;
    department_name?: string;
    identifier?: string; // Roll number or Staff ID
    additional_info?: string; // Program or Category
    is_active: boolean;
  } | null;
}

interface ResponseColumnsProps {
  onViewDetails: (response: FormResponse) => void;
  pageIndex?: number;
  pageSize?: number;
}

export const getResponseColumns = ({
  onViewDetails,
  pageIndex = 0,
  pageSize = 20
}: ResponseColumnsProps): ColumnDef<FormResponse>[] => [
  {
    id: 'serial',
    header: 'S.No',
    cell: ({ row }) => {
      const serialNumber = pageIndex * pageSize + row.index + 1;
      return (
        <div className='w-[50px] text-center font-medium'>{serialNumber}</div>
      );
    }
  },
  {
    accessorKey: 'submission_id',
    header: 'Submission ID',
    cell: ({ row }) => {
      const submissionId = row.getValue('submission_id') as string;
      return (
        <div className='font-mono text-sm max-w-[200px] truncate'>
          {submissionId}
        </div>
      );
    }
  },
  {
    accessorKey: 'user_email',
    header: 'Email',
    cell: ({ row }) => {
      const email = row.getValue('user_email') as string | undefined;
      const isAnonymous = row.original.is_anonymous;

      if (isAnonymous || !email) {
        return (
          <Badge variant='secondary' className='text-xs'>
            Anonymous
          </Badge>
        );
      }

      return <div className='max-w-[250px] truncate'>{email}</div>;
    }
  },
  {
    accessorKey: 'user_profile',
    header: 'User Info',
    cell: ({ row }) => {
      const profile = row.original.user_profile;

      if (!profile) {
        return (
          <Badge variant='outline' className='text-xs'>
            No Profile
          </Badge>
        );
      }

      return (
        <div className='min-w-[200px] space-y-1'>
          <div className='font-medium text-sm'>{profile.full_name}</div>
          <div className='text-xs text-muted-foreground flex items-center gap-2'>
            {profile.user_type === 'student' ? (
              <>
                <Badge variant='secondary' className='text-[10px] px-1 py-0'>
                  Learner
                </Badge>
                <span>{profile.identifier}</span>
              </>
            ) : (
              <>
                <Badge variant='secondary' className='text-[10px] px-1 py-0'>
                  Facilitator
                </Badge>
                <span>{profile.identifier}</span>
              </>
            )}
          </div>
        </div>
      );
    }
  },
  {
    accessorKey: 'submitted_at',
    header: 'Submitted',
    cell: ({ row }) => {
      const submittedAt = row.getValue('submitted_at') as string;
      const createdAt = row.original.created_at;
      const dateStr = submittedAt || createdAt;

      if (!dateStr) return 'N/A';

      try {
        return (
          <div className='text-sm'>
            {format(new Date(dateStr), 'MMM dd, yyyy HH:mm')}
          </div>
        );
      } catch (error) {
        return 'Invalid date';
      }
    }
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const response = row.original;

      return (
        <Button
          variant='ghost'
          size='sm'
          onClick={() => onViewDetails(response)}
          className='h-8 w-8 p-0'
          title='View Details'
        >
          <Eye className='h-4 w-4' />
        </Button>
      );
    }
  }
];
