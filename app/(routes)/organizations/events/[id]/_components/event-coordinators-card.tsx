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
import { EventCoordinatorService } from '@/lib/services/organization/event-coordinator-service';
import type { EventCoordinator } from '@/types/organizations';
import { AddEventCoordinatorDialog } from './add-event-coordinator-dialog';
import { CoordinatorRoleBadge } from './coordinator-role-badge';
import { Users, Plus, Trash2, Crown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { BeatLoader } from 'react-spinners';
import { UserRole } from '@/lib/constants/roles';

interface EventCoordinatorsCardProps {
  eventId: string;
  eventInstitutionId: string | null;
  currentUserId: string;
  currentUserRole: UserRole | null;
  coordinatorInstitutionId: string | null;
  isOwner: boolean;
}

export function EventCoordinatorsCard({
  eventId,
  eventInstitutionId,
  currentUserId,
  currentUserRole,
  coordinatorInstitutionId,
  isOwner
}: EventCoordinatorsCardProps) {
  const [coordinators, setCoordinators] = useState<EventCoordinator[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedCoordinator, setSelectedCoordinator] =
    useState<EventCoordinator | null>(null);
  const [updating, setUpdating] = useState(false);

  // Determine if user can manage coordinators
  const canManageCoordinators =
    // Super admin and Administrator can manage all events
    currentUserRole === UserRole.SUPER_ADMIN ||
    currentUserRole === UserRole.ADMINISTRATOR ||
    // Event owner can manage their event
    isOwner ||
    // Institution coordinator can manage events in their institution
    (currentUserRole === UserRole.INSTITUTION_COORDINATOR &&
      coordinatorInstitutionId &&
      eventInstitutionId &&
      coordinatorInstitutionId === eventInstitutionId);

  // Fetch coordinators
  const fetchCoordinators = async () => {
    setLoading(true);
    const { data, error } = await EventCoordinatorService.getEventCoordinators(
      eventId
    );

    if (error) {
      console.error('Error fetching coordinators:', error);
      toast.error('Failed to load coordinators');
      setLoading(false);
      return;
    }

    setCoordinators(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCoordinators();
  }, [eventId]);

  // Note: Role change is no longer needed as we only have coordinator role
  // Keeping this for compatibility, but it should not be used
  const handleRoleChange = async (
    coordinator: EventCoordinator,
    newRole: 'coordinator'
  ) => {
    if (coordinator.role === 'owner') {
      toast.error('Cannot change owner role');
      return;
    }

    setUpdating(true);
    const { error } = await EventCoordinatorService.updateCoordinatorRole(
      eventId,
      coordinator.user_id,
      newRole
    );

    if (error) {
      toast.error('Failed to update role');
      setUpdating(false);
      return;
    }

    toast.success('Role updated successfully');
    await fetchCoordinators();
    setUpdating(false);
  };

  // Handle remove coordinator
  const handleRemoveCoordinator = async () => {
    if (!selectedCoordinator) return;

    if (selectedCoordinator.role === 'owner') {
      toast.error('Cannot remove event owner');
      setRemoveDialogOpen(false);
      return;
    }

    setUpdating(true);
    const { error } = await EventCoordinatorService.removeCoordinator(
      eventId,
      selectedCoordinator.user_id
    );

    if (error) {
      toast.error('Failed to remove coordinator');
      setUpdating(false);
      return;
    }

    toast.success('Coordinator removed successfully');
    setRemoveDialogOpen(false);
    setSelectedCoordinator(null);
    await fetchCoordinators();
    setUpdating(false);
  };

  // Handle coordinator added
  const handleCoordinatorAdded = () => {
    setAddDialogOpen(false);
    fetchCoordinators();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center'>
            <Users className='mr-2 h-5 w-5' />
            Event Coordinators
          </CardTitle>
        </CardHeader>
        <CardContent className='flex justify-center items-center min-h-[200px]'>
          <BeatLoader color='#00e902' size={10} />
        </CardContent>
      </Card>
    );
  }

  const owner = coordinators.find((c) => c.role === 'owner');
  const otherCoordinators = coordinators.filter((c) => c.role !== 'owner');

  return (
    <>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center'>
                <Users className='mr-2 h-5 w-5' />
                Event Coordinators
              </CardTitle>
              <CardDescription className='mt-1'>
                Manage who can access and coordinate this event
              </CardDescription>
            </div>
            {canManageCoordinators && (
              <Button onClick={() => setAddDialogOpen(true)} size='sm'>
                <Plus className='mr-2 h-4 w-4' />
                Add Coordinator
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {/* Event Owner Section */}
            {owner && (
              <div>
                <p className='text-xs text-muted-foreground mb-2 font-medium'>
                  Event Owner
                </p>
                <div className='flex items-center justify-between p-3 rounded-lg border bg-primary/5'>
                  <div className='flex items-center gap-3'>
                    <Avatar className='h-10 w-10'>
                      <AvatarImage src={owner.user?.avatar_url} />
                      <AvatarFallback className='bg-primary/10 text-primary font-medium'>
                        {owner.user?.full_name
                          ? owner.user.full_name.charAt(0).toUpperCase()
                          : 'O'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className='text-sm font-medium flex items-center gap-2'>
                        {owner.user?.full_name || 'Unknown'}
                        <Crown className='h-4 w-4 text-yellow-600' />
                      </p>
                      {owner.user?.email && (
                        <a
                          href={`mailto:${owner.user.email}`}
                          className='text-xs text-muted-foreground hover:text-primary transition-colors'
                        >
                          {owner.user.email}
                        </a>
                      )}
                    </div>
                  </div>
                  <CoordinatorRoleBadge role='owner' />
                </div>
              </div>
            )}

            {/* Other Coordinators Section */}
            {otherCoordinators.length > 0 && (
              <div>
                <p className='text-xs text-muted-foreground mb-2 font-medium'>
                  Assigned Coordinators
                </p>
                <div className='space-y-2'>
                  {otherCoordinators.map((coordinator) => (
                    <div
                      key={coordinator.id}
                      className='flex items-center justify-between p-3 rounded-lg border bg-muted/50 hover:bg-muted transition-colors'
                    >
                      <div className='flex items-center gap-3'>
                        <Avatar className='h-10 w-10'>
                          <AvatarImage src={coordinator.user?.avatar_url} />
                          <AvatarFallback className='bg-primary/10 text-primary font-medium'>
                            {coordinator.user?.full_name
                              ? coordinator.user.full_name
                                  .charAt(0)
                                  .toUpperCase()
                              : 'C'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className='text-sm font-medium'>
                            {coordinator.user?.full_name || 'Unknown'}
                          </p>
                          {coordinator.user?.email && (
                            <a
                              href={`mailto:${coordinator.user.email}`}
                              className='text-xs text-muted-foreground hover:text-primary transition-colors'
                            >
                              {coordinator.user.email}
                            </a>
                          )}
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        {canManageCoordinators ? (
                          <>
                            <CoordinatorRoleBadge role={coordinator.role} />
                            <Button
                              variant='ghost'
                              size='icon'
                              onClick={() => {
                                setSelectedCoordinator(coordinator);
                                setRemoveDialogOpen(true);
                              }}
                              disabled={updating}
                            >
                              <Trash2 className='h-4 w-4 text-destructive' />
                            </Button>
                          </>
                        ) : (
                          <CoordinatorRoleBadge role={coordinator.role} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {otherCoordinators.length === 0 && (
              <div className='text-center py-6 text-muted-foreground'>
                <Users className='h-12 w-12 mx-auto mb-2 opacity-50' />
                <p className='text-sm'>No coordinators assigned yet</p>
                {canManageCoordinators && (
                  <p className='text-xs mt-1'>
                    Click &quot;Add Coordinator&quot; to assign team members
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Coordinator Dialog */}
      <AddEventCoordinatorDialog
        eventId={eventId}
        eventInstitutionId={eventInstitutionId}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleCoordinatorAdded}
      />

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Coordinator</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <span className='font-medium'>
                {selectedCoordinator?.user?.full_name}
              </span>{' '}
              from this event? They will lose access to this event and its
              forms.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveCoordinator}
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
