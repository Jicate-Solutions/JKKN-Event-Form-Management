'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { PaginationState } from '@tanstack/react-table';
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
import { Event } from '@/types/organizations';
import { EventService } from '@/lib/services/organization/event-service';
import { getEventColumns } from './columns';

interface EventListProps {
  events: Event[];
  loading?: boolean;
  error?: string | null;
  total: number;
  page: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onRefresh: () => void;
}

export function EventList({
  events,
  loading,
  error,
  total,
  page,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  onRefresh
}: EventListProps) {
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  const handleDelete = async () => {
    if (!eventToDelete) return;

    try {
      setDeleteLoading(true);
      await EventService.deleteEvent(eventToDelete.id);
      toast.success('Event deleted successfully');
      onRefresh();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    } finally {
      setDeleteLoading(false);
      setEventToDelete(null);
    }
  };

  const handlePaginationChange = (pagination: PaginationState) => {
    // Convert 0-indexed pageIndex to 1-indexed page
    const newPage = pagination.pageIndex + 1;
    const newPageSize = pagination.pageSize;

    // Update page if changed
    if (newPage !== page) {
      onPageChange(newPage);
    }

    // Update page size if changed
    if (newPageSize !== pageSize && onPageSizeChange) {
      onPageSizeChange(newPageSize);
    }
  };

  // Calculate total pages for server-side pagination
  const pageCount = Math.ceil(total / pageSize);

  // Get columns with delete handler and pagination info
  const columns = getEventColumns({
    onDelete: setEventToDelete,
    pageIndex: page - 1, // Convert 1-indexed to 0-indexed
    pageSize
  });

  return (
    <div className='space-y-4'>
      <DataTable
        columns={columns}
        data={events}
        manualPagination={true}
        pageCount={pageCount}
        onPaginationChange={handlePaginationChange}
      />

      <AlertDialog
        open={!!eventToDelete}
        onOpenChange={(open) => !open && setEventToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {eventToDelete?.title}? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {deleteLoading ? 'Deleting...' : 'Delete Event'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
