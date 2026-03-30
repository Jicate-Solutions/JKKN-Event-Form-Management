'use client';

import { useState } from 'react';
import { Profile } from '@/types/auth';
import { UserRole } from '@/lib/constants/roles';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { useRoles } from '@/hooks/use-roles';
import { BeatLoader } from 'react-spinners';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  administrator: 'Administrator',
  staff: 'Staff',
  student: 'Student',
  institution_coordinator: 'Institution Coordinator',
  event_coordinator: 'Event Coordinator',
  public: 'Public'
};

interface RolesListProps {
  users: Profile[];
  onRoleUpdate: (userId: string, newRole: UserRole) => Promise<void>;
  currentUserRole: UserRole;
}

export function RolesList({
  users,
  onRoleUpdate,
  currentUserRole
}: RolesListProps) {
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    userId: string;
    role: UserRole;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const { getRoleLabel, getRoleDescription } = useRoles(currentUserRole);

  const handleRoleSelect = (userId: string, role: UserRole) => {
    setPendingRoleChange({ userId, role });
  };

  const handleConfirmRoleChange = async () => {
    if (!pendingRoleChange) return;

    try {
      setIsUpdating(true);
      await onRoleUpdate(pendingRoleChange.userId, pendingRoleChange.role);
      toast.success('Role updated successfully');
      setPendingRoleChange(null);
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update role'
      );
    } finally {
      setIsUpdating(false);
    }
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

  const columns: ColumnDef<Profile>[] = [
    {
      id: 'serialNumber',
      header: 'S.No',
      cell: ({ row }) => row.index + 1
    },
    {
      accessorKey: 'full_name',
      header: 'User',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className='flex items-center gap-2'>
            <Avatar className='h-8 w-8'>
              <AvatarImage
                src={user.avatar_url || ''}
                alt={user.full_name || user.email}
              />
              <AvatarFallback>{getInitials(user)}</AvatarFallback>
            </Avatar>
            <div>
              <p className='font-medium'>{user.full_name}</p>
              <p className='text-sm text-muted-foreground'>{user.email}</p>
            </div>
          </div>
        );
      }
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const user = row.original;
        const canModifyRole =
          currentUserRole === UserRole.SUPER_ADMIN ||
          (currentUserRole === UserRole.ADMINISTRATOR &&
            user.role !== UserRole.SUPER_ADMIN);

        return (
          <Select
            value={user.role}
            onValueChange={(value: UserRole) =>
              handleRoleSelect(user.id, value)
            }
            disabled={
              !canModifyRole || user.role === UserRole.SUPER_ADMIN || isUpdating
            }
          >
            <SelectTrigger className='w-[180px]'>
              <SelectValue>
                <Badge
                  variant={
                    user.role === UserRole.SUPER_ADMIN
                      ? 'destructive'
                      : 'outline'
                  }
                >
                  {ROLE_LABELS[user.role]}
                </Badge>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.values(UserRole).map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      )
    }
  ];

  return (
    <div className='space-y-4'>
      <DataTable columns={columns} data={users} />

      <AlertDialog
        open={!!pendingRoleChange}
        onOpenChange={(open) => !open && setPendingRoleChange(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change User Role</AlertDialogTitle>
          </AlertDialogHeader>
          {pendingRoleChange && (
            <div className='py-4'>
              <AlertDialogDescription>
                Are you sure you want to change this user&apos;s role to{' '}
                {ROLE_LABELS[pendingRoleChange.role]}?
              </AlertDialogDescription>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRoleChange}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <BeatLoader size={8} color='#FFFFFF' />
              ) : (
                'Confirm Change'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
