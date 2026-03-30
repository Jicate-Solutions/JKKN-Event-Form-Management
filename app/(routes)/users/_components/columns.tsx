'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Profile } from '@/types/auth';
import { UserRole } from '@/lib/constants/roles';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { Eye, Edit, UserX } from 'lucide-react';

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  administrator: 'Administrator',
  institution_coordinator: 'Institution Coordinator',
  event_coordinator: 'Event Coordinator',
  staff: 'Staff',
  student: 'Student',
  public: 'Public'
};

const getInitials = (user: Profile) => {
  return user.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : user.email[0].toUpperCase();
};

interface UserColumnsProps {
  onDeactivate: (userId: string) => void;
  pageIndex?: number;
  pageSize?: number;
}

export const getUserColumns = ({
  onDeactivate,
  pageIndex = 0,
  pageSize = 10
}: UserColumnsProps): ColumnDef<Profile>[] => [
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
    accessorKey: 'full_name',
    header: ({ column }) => {
      return (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          User
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className='flex items-center gap-3'>
          <Avatar className='h-10 w-10'>
            <AvatarImage
              src={user.avatar_url || ''}
              alt={user.full_name || user.email}
            />
            <AvatarFallback className='bg-primary/10 text-primary'>
              {getInitials(user)}
            </AvatarFallback>
          </Avatar>
          <div className='flex flex-col'>
            <span className='font-medium'>{user.full_name || 'N/A'}</span>
            <span className='text-sm text-muted-foreground'>{user.email}</span>
          </div>
        </div>
      );
    }
  },
  {
    accessorKey: 'role',
    header: ({ column }) => {
      return (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Role
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => {
      const role = row.original.role as UserRole;
      return (
        <Badge
          variant={
            role === UserRole.SUPER_ADMIN || role === UserRole.ADMINISTRATOR
              ? 'destructive'
              : role === UserRole.INSTITUTION_COORDINATOR ||
                  role === UserRole.EVENT_COORDINATOR
                ? 'default'
                : 'outline'
          }
        >
          {ROLE_LABELS[role]}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
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
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
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
          Joined Date
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <span className='text-sm'>
          {format(new Date(row.original.created_at), 'MMM dd, yyyy')}
        </span>
      );
    }
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const user = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' className='h-8 w-8 p-0'>
              <span className='sr-only'>Open menu</span>
              <MoreHorizontal className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(user.id)}
            >
              Copy user ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/users/${user.id}`}>
                <Eye className='mr-2 h-4 w-4' />
                View details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/users/${user.id}/edit`}>
                <Edit className='mr-2 h-4 w-4' />
                Edit user
              </Link>
            </DropdownMenuItem>
            {user.role !== UserRole.SUPER_ADMIN && user.is_active && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDeactivate(user.id)}
                  className='text-destructive focus:text-destructive'
                >
                  <UserX className='mr-2 h-4 w-4' />
                  Deactivate user
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
  }
];
