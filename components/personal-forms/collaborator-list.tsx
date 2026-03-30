'use client';

// components/personal-forms/collaborator-list.tsx
// List and manage collaborators for personal forms

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Crown, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PermissionToggle } from './permission-toggle';
import {
  PersonalFormCollaborator,
  PersonalFormPermission,
  PERMISSION_LABELS,
  PERMISSION_DESCRIPTIONS
} from '@/types/personal-forms';
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

interface CollaboratorListProps {
  formId: string;
  creatorId: string;
  showOnlyOwners?: boolean;
}

export function CollaboratorList({ formId, creatorId, showOnlyOwners }: CollaboratorListProps) {
  const [collaboratorToRemove, setCollaboratorToRemove] =
    useState<PersonalFormCollaborator | null>(null);
  const queryClient = useQueryClient();

  // Fetch collaborators
  const { data: allCollaborators, isLoading } = useQuery({
    queryKey: ['personal-form-collaborators', formId],
    queryFn: async () => {
      const response = await fetch(
        `/api/personal-forms/${formId}/collaborators`
      );
      if (!response.ok) throw new Error('Failed to fetch collaborators');
      return response.json() as Promise<PersonalFormCollaborator[]>;
    }
  });

  // Filter collaborators based on showOnlyOwners prop
  const collaborators = showOnlyOwners !== undefined
    ? (allCollaborators || []).filter(c => c.is_owner === showOnlyOwners)
    : (allCollaborators || []);

  // Remove collaborator mutation
  const removeMutation = useMutation({
    mutationFn: async (collaboratorId: string) => {
      const response = await fetch(
        `/api/personal-forms/${formId}/collaborators/${collaboratorId}`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove collaborator');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Collaborator removed successfully');
      queryClient.invalidateQueries({
        queryKey: ['personal-form-collaborators', formId]
      });
      setCollaboratorToRemove(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    );
  }

  if (!collaborators || collaborators.length === 0) {
    return (
      <div className='text-center py-12 text-muted-foreground'>
        <p>No collaborators yet</p>
      </div>
    );
  }

  // Sort: owners first, then by added date
  const sortedCollaborators = [...collaborators].sort((a, b) => {
    if (a.is_owner && !b.is_owner) return -1;
    if (!a.is_owner && b.is_owner) return 1;
    return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
  });

  return (
    <>
      <div className='space-y-4'>
        {sortedCollaborators.map((collaborator) => {
          const isCreator = collaborator.user_id === creatorId;
          const userDisplayName =
            collaborator.profiles?.full_name || 'Unnamed User';
          const userEmail = collaborator.profiles?.email || '';

          return (
            <div
              key={collaborator.id}
              className='border rounded-lg p-4 space-y-4'
            >
              {/* Collaborator Header */}
              <div className='flex items-start justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium'>
                    {userDisplayName.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div className='flex items-center gap-2'>
                      <p className='font-medium'>{userDisplayName}</p>
                      {collaborator.is_owner && (
                        <Badge
                          variant='secondary'
                          className='flex items-center gap-1'
                        >
                          <Crown className='h-3 w-3' />
                          Owner
                        </Badge>
                      )}
                      {isCreator && <Badge variant='default'>Creator</Badge>}
                    </div>
                    <p className='text-sm text-muted-foreground'>{userEmail}</p>
                  </div>
                </div>

                {/* Remove button (disabled for creator) */}
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setCollaboratorToRemove(collaborator)}
                  disabled={isCreator || removeMutation.isPending}
                  title={
                    isCreator
                      ? 'Cannot remove form creator'
                      : 'Remove collaborator'
                  }
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>

              {/* Permissions */}
              {!collaborator.is_owner && (
                <div className='space-y-2'>
                  <p className='text-sm font-medium text-muted-foreground'>
                    Permissions
                  </p>
                  <div className='grid gap-2'>
                    {(
                      [
                        'can_edit_structure',
                        'can_view_responses',
                        'can_export_data',
                        'can_manage_collaborators'
                      ] as PersonalFormPermission[]
                    ).map((permission) => (
                      <PermissionToggle
                        key={permission}
                        formId={formId}
                        collaboratorId={collaborator.id}
                        permission={permission}
                        enabled={collaborator[permission]}
                        label={PERMISSION_LABELS[permission]}
                        description={PERMISSION_DESCRIPTIONS[permission]}
                        disabled={isCreator}
                      />
                    ))}
                  </div>
                </div>
              )}

              {collaborator.is_owner && (
                <div className='text-sm text-muted-foreground bg-muted/50 rounded-lg p-3'>
                  Owners have full access to all features
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Remove Confirmation Dialog */}
      <AlertDialog
        open={!!collaboratorToRemove}
        onOpenChange={() => setCollaboratorToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Collaborator?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <span className='font-medium'>
                {collaboratorToRemove?.profiles?.full_name || 'this user'}
              </span>{' '}
              from this form? They will lose all access to view and edit this
              form.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (collaboratorToRemove) {
                  removeMutation.mutate(collaboratorToRemove.id);
                }
              }}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
