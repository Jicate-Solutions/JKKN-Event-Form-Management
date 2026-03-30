'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EventCoordinatorService } from '@/lib/services/organization/event-coordinator-service';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { Check, ChevronsUpDown, Users, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface AddEventCoordinatorDialogProps {
  eventId: string;
  eventInstitutionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddEventCoordinatorDialog({
  eventId,
  eventInstitutionId,
  open,
  onOpenChange,
  onSuccess
}: AddEventCoordinatorDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'coordinator'>('coordinator');
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [userSearchOpen, setUserSearchOpen] = useState(false);

  // Fetch available users from the same institution (exclude already assigned coordinators)
  const fetchUsers = useCallback(async () => {
    setFetchingUsers(true);
    try {
      const supabase = createClientSupabaseClient();

      // If no institution is assigned to the event, we can't filter by institution
      if (!eventInstitutionId) {
        toast.error('Event has no institution assigned');
        setUsers([]);
        setFetchingUsers(false);
        return;
      }

      // Get users from the same institution via department_coordinators
      // Event coordinators are linked through departments
      const { data: deptCoordinators, error: deptError } = await supabase
        .from('department_coordinators')
        .select(`
          user_id,
          department:departments!department_coordinators_department_id_fkey (
            id,
            institution_id
          ),
          user:profiles!department_coordinators_user_id_fkey (
            id,
            full_name,
            email,
            avatar_url,
            role,
            is_active
          )
        `);

      if (deptError) throw deptError;

      // Filter to get only event coordinators from this institution who are active
      const eventCoordinators = deptCoordinators
        ?.filter((item) => {
          const user = item.user as any;
          const department = item.department as any;
          return (
            user &&
            user.role === 'event_coordinator' &&
            user.is_active === true &&
            department &&
            department.institution_id === eventInstitutionId
          );
        })
        .map((item) => {
          const user = item.user as any;
          return {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            avatar_url: user.avatar_url
          };
        }) || [];

      // Remove duplicates (a user can be coordinator of multiple departments)
      const uniqueCoordinators = Array.from(
        new Map(eventCoordinators.map((user) => [user.id, user])).values()
      );

      // Get already assigned coordinators
      const { data: assignedCoordinators } =
        await EventCoordinatorService.getEventCoordinators(eventId);

      // Filter out already assigned users
      const assignedUserIds = new Set(
        assignedCoordinators?.map((c) => c.user_id) || []
      );

      const availableUsers = uniqueCoordinators.filter(
        (user) => !assignedUserIds.has(user.id)
      );

      setUsers(availableUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setFetchingUsers(false);
    }
  }, [eventId, eventInstitutionId]);

  useEffect(() => {
    if (open) {
      fetchUsers();
      setSelectedUserId('');
      setSelectedRole('coordinator');
    }
  }, [open, fetchUsers]);

  const handleAssign = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }

    setLoading(true);
    const { error } = await EventCoordinatorService.assignCoordinator({
      event_id: eventId,
      user_id: selectedUserId,
      role: selectedRole
    });

    if (error) {
      toast.error('Failed to assign coordinator');
      setLoading(false);
      return;
    }

    toast.success('Coordinator assigned successfully');
    setLoading(false);
    onSuccess();
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center'>
            <Users className='mr-2 h-5 w-5' />
            Add Event Coordinator
          </DialogTitle>
          <DialogDescription>
            Assign a user to help manage this event and its forms
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          {/* User Selection */}
          <div className='space-y-2'>
            <Label htmlFor='user'>Select User</Label>
            <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen} modal={true}>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  role='combobox'
                  aria-expanded={userSearchOpen}
                  className='w-full justify-between'
                  disabled={fetchingUsers}
                >
                  {selectedUser ? (
                    <div className='flex items-center gap-2'>
                      <Avatar className='h-6 w-6'>
                        <AvatarImage src={selectedUser.avatar_url} />
                        <AvatarFallback className='text-xs'>
                          {selectedUser.full_name
                            ? selectedUser.full_name.charAt(0).toUpperCase()
                            : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className='truncate'>{selectedUser.full_name}</span>
                    </div>
                  ) : (
                    <span className='text-muted-foreground'>
                      {fetchingUsers ? 'Loading users...' : 'Select user...'}
                    </span>
                  )}
                  <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className='w-[--radix-popover-trigger-width] p-0'
                align='start'
                side='bottom'
                sideOffset={4}
              >
                <Command className='max-h-[300px]'>
                  <CommandInput placeholder='Search users...' />
                  <CommandList className='max-h-[240px] overflow-y-auto'>
                    <CommandEmpty>No users found.</CommandEmpty>
                    <CommandGroup>
                      {users.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={user.full_name}
                          onSelect={() => {
                            setSelectedUserId(user.id);
                            setUserSearchOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedUserId === user.id
                                ? 'opacity-100'
                                : 'opacity-0'
                            )}
                          />
                          <Avatar className='h-8 w-8 mr-2'>
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback className='text-xs'>
                              {user.full_name
                                ? user.full_name.charAt(0).toUpperCase()
                                : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className='flex flex-col'>
                            <span className='font-medium'>
                              {user.full_name}
                            </span>
                            <span className='text-xs text-muted-foreground'>
                              {user.email}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Info Box */}
          <div className='flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'>
            <Info className='h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0' />
            <div className='text-xs text-blue-700 dark:text-blue-300'>
              <p className='font-medium mb-1'>Coordinator Permissions:</p>
              <p className='mt-1'>
                Coordinators can view and edit events, create forms, and view
                responses. They will have full access to manage this event and
                its associated forms.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={loading || !selectedUserId}>
            {loading ? 'Assigning...' : 'Assign Coordinator'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
