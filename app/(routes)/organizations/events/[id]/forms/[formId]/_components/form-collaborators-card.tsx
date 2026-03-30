'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { FormCollaboratorService } from '@/lib/services/forms/form-collaborator-service';
import type { FormCollaborator, FormPermissionLevel } from '@/types/organizations';
import { AddFormCollaboratorDialog } from './add-form-collaborator-dialog';
import { PermissionLevelBadge } from './permission-level-badge';
import { Users, Plus, Trash2, Crown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { BeatLoader } from 'react-spinners';

interface FormCollaboratorsCardProps {
  formId: string;
  currentUserId: string;
  isFormCreator: boolean;
  isEventOwner: boolean;
}

export function FormCollaboratorsCard({
  formId,
  currentUserId,
  isFormCreator,
  isEventOwner
}: FormCollaboratorsCardProps) {
  const [collaborators, setCollaborators] = useState<FormCollaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] =
    useState<FormCollaborator | null>(null);
  const [updating, setUpdating] = useState(false);

  // Can manage if user is form creator or event owner
  const canManage = isFormCreator || isEventOwner;

  // Fetch collaborators
  const fetchCollaborators = async () => {
    setLoading(true);
    const { data, error } = await FormCollaboratorService.getFormCollaborators(
      formId
    );

    if (error) {
      console.error('Error fetching collaborators:', error);
      toast.error('Failed to load collaborators');
      setLoading(false);
      return;
    }

    setCollaborators(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCollaborators();
  }, [formId]);

  // Handle permission change
  const handlePermissionChange = async (
    collaborator: FormCollaborator,
    newPermission: FormPermissionLevel
  ) => {
    setUpdating(true);
    const { error } = await FormCollaboratorService.updateCollaboratorPermission(
      formId,
      collaborator.user_id,
      newPermission
    );

    if (error) {
      toast.error('Failed to update permission');
      setUpdating(false);
      return;
    }

    toast.success('Permission updated successfully');
    await fetchCollaborators();
    setUpdating(false);
  };

  // Handle remove collaborator
  const handleRemoveCollaborator = async () => {
    if (!selectedCollaborator) return;

    setUpdating(true);
    const { error } = await FormCollaboratorService.removeCollaborator(
      formId,
      selectedCollaborator.user_id
    );

    if (error) {
      toast.error('Failed to remove collaborator');
      setUpdating(false);
      return;
    }

    toast.success('Collaborator removed successfully');
    setRemoveDialogOpen(false);
    setSelectedCollaborator(null);
    await fetchCollaborators();
    setUpdating(false);
  };

  // Handle collaborator added
  const handleCollaboratorAdded = () => {
    setAddDialogOpen(false);
    fetchCollaborators();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center'>
            <Users className='mr-2 h-5 w-5' />
            Form Collaborators
          </CardTitle>
        </CardHeader>
        <CardContent className='flex justify-center items-center min-h-[200px]'>
          <BeatLoader color='#00e902' size={10} />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center'>
                <Users className='mr-2 h-5 w-5' />
                Form Collaborators
              </CardTitle>
              <CardDescription className='mt-1'>
                Manage who can access and edit this form
              </CardDescription>
            </div>
            {canManage && (
              <Button onClick={() => setAddDialogOpen(true)} size='sm'>
                <Plus className='mr-2 h-4 w-4' />
                Add Collaborator
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {collaborators.length > 0 ? (
              <div className='space-y-2'>
                {collaborators.map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className='flex items-center justify-between p-3 rounded-lg border bg-muted/50 hover:bg-muted transition-colors'
                  >
                    <div className='flex items-center gap-3'>
                      <Avatar className='h-10 w-10'>
                        <AvatarImage src={collaborator.user?.avatar_url} />
                        <AvatarFallback className='bg-primary/10 text-primary font-medium'>
                          {collaborator.user?.full_name
                            ? collaborator.user.full_name.charAt(0).toUpperCase()
                            : 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className='text-sm font-medium'>
                          {collaborator.user?.full_name || 'Unknown'}
                        </p>
                        {collaborator.user?.email && (
                          <a
                            href={`mailto:${collaborator.user.email}`}
                            className='text-xs text-muted-foreground hover:text-primary transition-colors'
                          >
                            {collaborator.user.email}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      {canManage ? (
                        <>
                          <Select
                            value={collaborator.permission_level}
                            onValueChange={(value: FormPermissionLevel) =>
                              handlePermissionChange(collaborator, value)
                            }
                            disabled={updating}
                          >
                            <SelectTrigger className='w-40'>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='view'>View Only</SelectItem>
                              <SelectItem value='edit'>Can Edit</SelectItem>
                              <SelectItem value='manage_responses'>
                                Manage Responses
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => {
                              setSelectedCollaborator(collaborator);
                              setRemoveDialogOpen(true);
                            }}
                            disabled={updating}
                          >
                            <Trash2 className='h-4 w-4 text-destructive' />
                          </Button>
                        </>
                      ) : (
                        <PermissionLevelBadge
                          permission={collaborator.permission_level}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-6 text-muted-foreground'>
                <Users className='h-12 w-12 mx-auto mb-2 opacity-50' />
                <p className='text-sm'>No collaborators assigned yet</p>
                {canManage && (
                  <p className='text-xs mt-1'>
                    Click &quot;Add Collaborator&quot; to assign team members
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Collaborator Dialog */}
      <AddFormCollaboratorDialog
        formId={formId}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleCollaboratorAdded}
      />

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Collaborator</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <span className='font-medium'>
                {selectedCollaborator?.user?.full_name}
              </span>{' '}
              from this form? They will lose access to this form.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveCollaborator}
              disabled={updating}
              className='bg-destructive hover:bg-destructive/90'
            >
              {updating ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
