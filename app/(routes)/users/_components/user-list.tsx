'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Profile } from '@/types/auth';
import { PaginationState } from '@tanstack/react-table';
import { UserService } from '@/lib/services/users/user-service';
import { DataTable } from '@/components/ui/data-table';
import { getUserColumns } from './columns';
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

interface UserListProps {
  users: Profile[];
  pageCount: number;
  currentPage: number;
  pageSize: number;
  onPaginationChange: (pagination: PaginationState) => void;
  onRefresh: () => void;
}

export function UserList({
  users,
  pageCount,
  currentPage,
  pageSize,
  onPaginationChange,
  onRefresh
}: UserListProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<string | null>(null);

  const handleDeactivate = (userId: string) => {
    setUserToDeactivate(userId);
  };

  const handleDeactivateUser = async () => {
    if (!userToDeactivate) return;

    try {
      setIsLoading(true);
      await UserService.deactivateUser(userToDeactivate);
      onRefresh();
      toast.success('User deactivated successfully');
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast.error('Failed to deactivate user');
    } finally {
      setIsLoading(false);
      setUserToDeactivate(null);
    }
  };

  const columns = getUserColumns({
    onDeactivate: handleDeactivate,
    pageIndex: currentPage - 1, // Convert 1-based to 0-based
    pageSize
  });

  return (
    <>
      <DataTable
        columns={columns}
        data={users}
        manualPagination={true}
        pageCount={pageCount}
        onPaginationChange={onPaginationChange}
      />

      {/* Deactivation Confirmation Dialog */}
      <AlertDialog
        open={!!userToDeactivate}
        onOpenChange={() => setUserToDeactivate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will prevent the user from accessing the system. They will
              need to contact an administrator to reactivate their account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateUser}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              disabled={isLoading}
            >
              {isLoading ? 'Deactivating...' : 'Deactivate User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
