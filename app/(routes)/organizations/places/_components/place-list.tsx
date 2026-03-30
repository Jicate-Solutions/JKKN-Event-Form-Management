'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
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
import { Place } from '@/types/organizations';
import { PlaceService } from '@/lib/services/organization/place-service';
import { PlaceFilters } from './place-filters';
import { getPlaceColumns } from './columns';

interface PlaceListProps {
  places: Place[];
  onRefresh: () => void;
  onFiltersChange: (filters: { search?: string; isActive?: boolean }) => void;
}

export function PlaceList({
  places,
  onRefresh,
  onFiltersChange
}: PlaceListProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [placeToDelete, setPlaceToDelete] = useState<Place | null>(null);

  const handleDelete = async () => {
    if (!placeToDelete) return;

    try {
      setIsLoading(true);
      await PlaceService.deletePlace(placeToDelete.id);
      toast.success('Place deleted successfully');
      onRefresh();
    } catch (error) {
      console.error('Error deleting place:', error);
      toast.error('Failed to delete place');
    } finally {
      setIsLoading(false);
      setPlaceToDelete(null);
    }
  };

  // Get columns with delete handler
  const columns = getPlaceColumns({
    onDelete: setPlaceToDelete
  });

  return (
    <div className='space-y-4'>
      <PlaceFilters onFiltersChange={onFiltersChange} />

      <DataTable columns={columns} data={places} searchKey='name' />

      <AlertDialog
        open={!!placeToDelete}
        onOpenChange={(open) => !open && setPlaceToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Place</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {placeToDelete?.name}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {isLoading ? 'Deleting...' : 'Delete Place'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
