'use client';

import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  MoreVertical,
  Edit,
  Trash2,
  FileText,
  Eye,
  ArrowUpDown
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
import { Event } from '@/types/organizations';

interface EventColumnsProps {
  onDelete: (event: Event) => void;
  pageIndex?: number;
  pageSize?: number;
}

function getStatusBadge(status: string) {
  const validStatus = ['completed', 'ongoing', 'upcoming'].includes(status)
    ? status
    : 'upcoming';

  const statusStyles: Record<string, string> = {
    completed: 'bg-red-600 text-white hover:bg-red-600/80',
    ongoing: 'bg-green-600 text-white hover:bg-green-600/80',
    upcoming: 'bg-blue-600 text-white hover:bg-blue-600/80'
  };

  return (
    <Badge
      className={
        statusStyles[validStatus as keyof typeof statusStyles] || 'bg-gray-100'
      }
    >
      {validStatus.charAt(0).toUpperCase() + validStatus.slice(1)}
    </Badge>
  );
}

function formatDateTime(date: string) {
  return format(new Date(date), 'MMM d, yyyy h:mm a');
}

export const getEventColumns = ({
  onDelete,
  pageIndex = 0,
  pageSize = 10
}: EventColumnsProps): ColumnDef<Event>[] => [
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
      const event = row.original;
      return (
        <Link
          href={`/organizations/events/${event.id}`}
          className='hover:underline text-primary font-medium'
        >
          {event.title}
        </Link>
      );
    }
  },
  {
    accessorKey: 'place.name',
    header: 'Place',
    cell: ({ row }) => {
      const event = row.original;
      return <span>{event.place?.name || '-'}</span>;
    }
  },
  {
    accessorKey: 'start_time',
    header: ({ column }) => {
      return (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Start Time
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => {
      return <span>{formatDateTime(row.original.start_time)}</span>;
    }
  },
  {
    accessorKey: 'end_time',
    header: ({ column }) => {
      return (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          End Time
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => {
      return <span>{formatDateTime(row.original.end_time)}</span>;
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
    id: 'actions',
    header: () => <div className='text-right'>Actions</div>,
    cell: ({ row }) => {
      const event = row.original;

      return (
        <div className='text-right'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' className='h-8 w-8 p-0'>
                <span className='sr-only'>Open menu</span>
                <MoreVertical className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link
                  href={`/organizations/events/${event.id}`}
                  className='cursor-pointer'
                >
                  <Eye className='mr-2 h-4 w-4' />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/organizations/events/${event.id}/edit`}
                  className='cursor-pointer'
                >
                  <Edit className='mr-2 h-4 w-4' />
                  Edit Event
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/organizations/events/${event.id}`}
                  className='cursor-pointer'
                >
                  <FileText className='mr-2 h-4 w-4' />
                  Manage Forms
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(event)}
                className='text-destructive focus:text-destructive cursor-pointer'
              >
                <Trash2 className='mr-2 h-4 w-4' />
                Delete Event
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
