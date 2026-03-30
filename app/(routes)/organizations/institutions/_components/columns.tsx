'use client';

import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  MoreVertical,
  Edit,
  Trash2,
  Building2,
  Plus,
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
import { Institution } from '@/types/organizations';

interface InstitutionColumnsProps {
  onDelete: (institution: Institution) => void;
  pageIndex?: number;
  pageSize?: number;
}

function formatDate(date: string) {
  return format(new Date(date), 'MMM d, yyyy');
}

export const getInstitutionColumns = ({
  onDelete,
  pageIndex = 0,
  pageSize = 10
}: InstitutionColumnsProps): ColumnDef<Institution>[] => [
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
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => {
      return <span className='font-medium'>{row.original.name}</span>;
    }
  },
  {
    accessorKey: 'is_active',
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
      const isActive = row.original.is_active;
      return (
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
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
      const institution = row.original;

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
                  href={`/organizations/institutions/${institution.id}`}
                  className='cursor-pointer'
                >
                  <Building2 className='mr-2 h-4 w-4' />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/organizations/institutions/${institution.id}/edit`}
                  className='cursor-pointer'
                >
                  <Edit className='mr-2 h-4 w-4' />
                  Edit Institution
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href={`/organizations/institutions/${institution.id}/departments/new`}
                  className='cursor-pointer'
                >
                  <Plus className='mr-2 h-4 w-4' />
                  Add Department
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(institution)}
                className='text-destructive focus:text-destructive cursor-pointer'
              >
                <Trash2 className='mr-2 h-4 w-4' />
                Delete Institution
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
