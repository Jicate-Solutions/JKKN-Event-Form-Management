'use client';

import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Copy,
  ArrowUpDown,
  Globe,
  Lock,
  ExternalLink,
  Users,
  Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { PersonalFormWithCollaborators } from '@/types/personal-forms';

interface PersonalFormColumnsProps {
  onDelete: (formId: string) => void;
  onDuplicate: (formId: string) => void;
  onShare: (formId: string) => void;
  pageIndex?: number;
  pageSize?: number;
}

function getStatusBadge(status: string) {
  const statusStyles: Record<string, string> = {
    draft: 'bg-gray-500 text-white hover:bg-gray-500/80',
    published: 'bg-green-600 text-white hover:bg-green-600/80',
    archived: 'bg-orange-600 text-white hover:bg-orange-600/80'
  };

  return (
    <Badge
      className={
        statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100'
      }
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function formatDate(date: string) {
  return format(new Date(date), 'MMM d, yyyy');
}

export const getPersonalFormColumns = ({
  onDelete,
  onDuplicate,
  onShare,
  pageIndex = 0,
  pageSize = 10
}: PersonalFormColumnsProps): ColumnDef<PersonalFormWithCollaborators>[] => [
  {
    id: 'serial',
    header: 'S.No',
    cell: ({ row }) => {
      const serialNumber = pageIndex * pageSize + row.index + 1;
      return <span className='font-medium'>{serialNumber}</span>;
    },
    enableSorting: false,
    enableHiding: false
  },
  {
    accessorKey: 'title',
    header: ({ column }) => {
      return (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Title
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => {
      const form = row.original;
      return (
        <div className='flex flex-col gap-1'>
          <Link
            href={`/personal/forms/${form.id}`}
            className='hover:underline text-primary font-medium'
          >
            {form.title}
          </Link>
        </div>
      );
    }
  },
  {
    accessorKey: 'status',
    header: ({ column }) => {
      return (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Status
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => {
      return getStatusBadge(row.original.status);
    }
  },
  {
    accessorKey: 'is_public',
    header: 'Visibility',
    cell: ({ row }) => {
      const isPublic = row.original.is_public;
      return (
        <div className='flex items-center gap-2'>
          {isPublic ? (
            <>
              <Globe className='h-4 w-4 text-green-600' />
              <span className='text-sm'>Public</span>
            </>
          ) : (
            <>
              <Lock className='h-4 w-4 text-gray-600' />
              <span className='text-sm'>Private</span>
            </>
          )}
        </div>
      );
    }
  },
  {
    accessorKey: 'response_count',
    header: ({ column }) => {
      return (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Responses
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => {
      const count = row.original.response_count || 0;
      const limit = row.original.submission_limit;
      return (
        <div className='flex flex-col gap-1'>
          <span className='font-medium'>{count}</span>
          {limit && (
            <span className='text-xs text-muted-foreground'>
              of {limit} limit
            </span>
          )}
        </div>
      );
    }
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => {
      return (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Created
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => {
      return <span>{formatDate(row.original.created_at)}</span>;
    }
  },
  {
    id: 'actions',
    header: () => <div className='text-right'>Actions</div>,
    cell: ({ row }) => {
      const form = row.original;

      return (
        <div className='text-right'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' className='h-8 w-8 p-0'>
                <span className='sr-only'>Open menu</span>
                <MoreVertical className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-48'>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link
                  href={`/personal/forms/${form.id}`}
                  className='cursor-pointer'
                >
                  <Eye className='mr-2 h-4 w-4' />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/personal/forms/builder/${form.id}`}
                  className='cursor-pointer'
                >
                  <Edit className='mr-2 h-4 w-4' />
                  Edit Form
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/personal/forms/${form.id}/preview`}
                  className='cursor-pointer'
                >
                  <ExternalLink className='mr-2 h-4 w-4' />
                  Preview Form
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/personal/forms/${form.id}/collaborators`}
                  className='cursor-pointer'
                >
                  <Users className='mr-2 h-4 w-4' />
                  Collaborators
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onShare(form.id)}
                className='cursor-pointer'
              >
                <Share2 className='mr-2 h-4 w-4' />
                Share Form
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDuplicate(form.id)}
                className='cursor-pointer'
              >
                <Copy className='mr-2 h-4 w-4' />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(form.id)}
                className='text-destructive focus:text-destructive cursor-pointer'
              >
                <Trash2 className='mr-2 h-4 w-4' />
                Delete Form
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false
  }
];
