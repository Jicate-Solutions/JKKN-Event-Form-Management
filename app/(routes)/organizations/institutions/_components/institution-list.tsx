// app/(routes)/organizations/institutions/_components/institution-list.tsx

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import { PaginationState } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
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
import { DataTable } from '@/components/ui/data-table';
import { Institution } from '@/types/organizations';
import { OrganizationService } from '@/lib/services/organization/organization-service';
import { getInstitutionColumns } from './columns';

interface InstitutionListProps {
  institutions: Institution[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}

export function InstitutionList({
  institutions,
  metadata,
  onPageChange,
  onRefresh
}: InstitutionListProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [institutionToDelete, setInstitutionToDelete] =
    useState<Institution | null>(null);

  const handleDelete = async () => {
    if (!institutionToDelete) return;

    try {
      setIsLoading(true);
      await OrganizationService.deleteInstitution(institutionToDelete.id);

      onRefresh(); // Refresh the list after deletion
    } catch (error) {
      console.error('Error deleting institution:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete institution'
      );
    } finally {
      setIsLoading(false);
      setInstitutionToDelete(null);
    }
  };

  const handlePaginationChange = (pagination: PaginationState) => {
    // Convert 0-indexed pageIndex to 1-indexed page
    const newPage = pagination.pageIndex + 1;

    // Only update if page changed
    if (newPage !== metadata.page) {
      onPageChange(newPage);
    }
  };

  // Calculate total pages for server-side pagination
  const pageCount = metadata.totalPages;

  // Get columns with delete handler and pagination info
  const columns = getInstitutionColumns({
    onDelete: setInstitutionToDelete,
    pageIndex: metadata.page - 1, // Convert 1-indexed to 0-indexed
    pageSize: metadata.limit
  });

  return (
    <div className='space-y-4'>
      <div className='flex justify-end pt-3'>
        <Button
          variant='outline'
          size='sm'
          onClick={onRefresh}
          className='ml-auto'
        >
          <RefreshCw className='mr-2 h-4 w-4' />
          Refresh
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={institutions}
        manualPagination={true}
        pageCount={pageCount}
        onPaginationChange={handlePaginationChange}
      />

      <AlertDialog
        open={!!institutionToDelete}
        onOpenChange={(open) => !open && setInstitutionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Institution</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {institutionToDelete?.name}? This
              action cannot be undone, and will also delete all departments
              associated with this institution.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {isLoading ? 'Deleting...' : 'Delete Institution'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
