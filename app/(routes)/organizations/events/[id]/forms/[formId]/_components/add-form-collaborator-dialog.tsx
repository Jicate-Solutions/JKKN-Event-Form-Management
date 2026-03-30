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
import { FormCollaboratorService } from '@/lib/services/forms/form-collaborator-service';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import type { FormPermissionLevel } from '@/types/organizations';
import { Check, ChevronsUpDown, Users, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface AddFormCollaboratorDialogProps {
  formId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddFormCollaboratorDialog({
  formId,
  open,
  onOpenChange,
  onSuccess
}: AddFormCollaboratorDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedPermission, setSelectedPermission] =
    useState<FormPermissionLevel>('view');
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [userSearchOpen, setUserSearchOpen] = useState(false);

  // Fetch available users (exclude already assigned collaborators)
  const fetchUsers = useCallback(async () => {
    setFetchingUsers(true);
    try {
      const supabase = createClientSupabaseClient();

      // Get all users with EVENT_COORDINATOR role
      const { data: allUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role')
        .eq('role', 'event_coordinator')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (usersError) throw usersError;

      // Get already assigned collaborators
      const { data: assignedCollaborators } =
        await FormCollaboratorService.getFormCollaborators(formId);

      // Filter out already assigned users
      const assignedUserIds = new Set(
        assignedCollaborators?.map((c) => c.user_id) || []
      );

      const availableUsers =
        allUsers?.filter((user) => !assignedUserIds.has(user.id)) || [];

      setUsers(availableUsers as User[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setFetchingUsers(false);
    }
  }, [formId]);

  useEffect(() => {
    if (open) {
      fetchUsers();
      setSelectedUserId('');
      setSelectedPermission('view');
    }
  }, [open, fetchUsers]);

  const handleAssign = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }

    setLoading(true);
    const { error } = await FormCollaboratorService.assignCollaborator({
      form_id: formId,
      user_id: selectedUserId,
      permission_level: selectedPermission
    });

    if (error) {
      toast.error('Failed to assign collaborator');
      setLoading(false);
      return;
    }

    toast.success('Collaborator assigned successfully');
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
            Add Form Collaborator
          </DialogTitle>
          <DialogDescription>
            Assign a user to help manage this form and view responses
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          {/* User Selection */}
          <div className='space-y-2'>
            <Label htmlFor='user'>Select User</Label>
            <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
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
              <PopoverContent className='w-[460px] p-0' align='start'>
                <Command>
                  <CommandInput placeholder='Search users...' />
                  <CommandList>
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

          {/* Permission Selection */}
          <div className='space-y-2'>
            <Label htmlFor='permission'>Permission Level</Label>
            <Select
              value={selectedPermission}
              onValueChange={(value: FormPermissionLevel) =>
                setSelectedPermission(value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='view'>
                  <div className='flex flex-col items-start'>
                    <span className='font-medium'>View Only</span>
                    <span className='text-xs text-muted-foreground'>
                      Can view form structure only
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value='edit'>
                  <div className='flex flex-col items-start'>
                    <span className='font-medium'>Can Edit</span>
                    <span className='text-xs text-muted-foreground'>
                      Can modify form fields and settings
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value='manage_responses'>
                  <div className='flex flex-col items-start'>
                    <span className='font-medium'>Manage Responses</span>
                    <span className='text-xs text-muted-foreground'>
                      Can view, export, and manage all responses
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Info Box */}
          <div className='flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'>
            <Info className='h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0' />
            <div className='text-xs text-blue-700 dark:text-blue-300'>
              <p className='font-medium mb-1'>Permission Details:</p>
              <ul className='list-disc list-inside space-y-0.5 ml-1'>
                <li>
                  <strong>View Only:</strong> Can see form fields and structure
                  (read-only)
                </li>
                <li>
                  <strong>Can Edit:</strong> Can modify form fields, add/remove
                  questions
                </li>
                <li>
                  <strong>Manage Responses:</strong> Full access to view,
                  export, and manage all form submissions
                </li>
              </ul>
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
            {loading ? 'Assigning...' : 'Assign Collaborator'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
