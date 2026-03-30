'use client';

// components/personal-forms/add-collaborator-dialog.tsx
// Dialog for adding collaborators to personal forms

import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  PERMISSION_LABELS,
  PERMISSION_DESCRIPTIONS,
  PersonalFormPermission
} from '@/types/personal-forms';

interface User {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
}

interface AddCollaboratorDialogProps {
  open: boolean;
  onClose: () => void;
  formId: string;
}

export function AddCollaboratorDialog({
  open,
  onClose,
  formId
}: AddCollaboratorDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const queryClient = useQueryClient();

  // Permission state
  const [permissions, setPermissions] = useState({
    can_edit_structure: false,
    can_view_responses: false,
    can_export_data: false,
    can_manage_collaborators: false,
    is_owner: false
  });

  // Search for users
  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      toast.error('Please enter at least 2 characters to search');
      return;
    }

    setIsSearching(true);
    try {
      // Build API URL with role filter if not 'all'
      let url = `/api/users/search?q=${encodeURIComponent(searchQuery)}`;
      if (roleFilter !== 'all') {
        url += `&role=${encodeURIComponent(roleFilter)}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to search users');
      }

      const data = await response.json();
      setSearchResults(data.users || []);

      if (data.users.length === 0) {
        toast.success('No users found matching your search');
      }
    } catch (error: any) {
      console.error('Error searching users:', error);
      toast.error(error.message || 'Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  // Add collaborator mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) throw new Error('No user selected');

      const response = await fetch(
        `/api/personal-forms/${formId}/collaborators`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: selectedUser.id,
            ...permissions
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add collaborator');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Collaborator added successfully');
      queryClient.invalidateQueries({
        queryKey: ['personal-form-collaborators', formId]
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const handleClose = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setSearchResults([]);
    setSelectedUser(null);
    setPermissions({
      can_edit_structure: false,
      can_view_responses: false,
      can_export_data: false,
      can_manage_collaborators: false,
      is_owner: false
    });
    onClose();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
      case 'administrator':
        return 'bg-red-500 text-white';
      case 'institution_coordinator':
        return 'bg-purple-500 text-white';
      case 'event_coordinator':
        return 'bg-blue-500 text-white';
      case 'staff':
        return 'bg-green-500 text-white';
      case 'student':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const togglePermission = (
    permission: PersonalFormPermission | 'is_owner'
  ) => {
    setPermissions((prev) => ({
      ...prev,
      [permission]: !prev[permission]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-[600px] max-h-[90vh] sm:max-h-[85vh] flex flex-col'>
        <DialogHeader className='flex-shrink-0'>
          <DialogTitle>Add Collaborator</DialogTitle>
          <DialogDescription>
            Search for a user and assign permissions to collaborate on this
            form.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6 py-4 overflow-y-auto flex-1'>
          {/* User Search */}
          <div className='space-y-4'>
            <div>
              <Label>Search User</Label>
              <p className='text-sm text-muted-foreground mt-1'>
                Search by name or email address
              </p>
            </div>

            {/* Role Filter */}
            <div className='flex gap-2'>
              <div className='flex-1'>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder='Filter by role' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Roles</SelectItem>
                    <SelectItem value='student'>Student</SelectItem>
                    <SelectItem value='staff'>Staff</SelectItem>
                    <SelectItem value='event_coordinator'>Event Coordinator</SelectItem>
                    <SelectItem value='institution_coordinator'>Institution Coordinator</SelectItem>
                    <SelectItem value='administrator'>Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search Input */}
            <div className='flex gap-2'>
              <div className='relative flex-1'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search by name or email...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className='pl-9'
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                {isSearching && (
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                )}
                Search
              </Button>
            </div>

            {/* Active Filters */}
            {(roleFilter !== 'all' || searchQuery) && (
              <div className='flex flex-wrap gap-2'>
                {roleFilter !== 'all' && (
                  <Badge variant='secondary' className='gap-1'>
                    Role: {roleFilter.replace('_', ' ')}
                    <X
                      className='h-3 w-3 cursor-pointer'
                      onClick={() => setRoleFilter('all')}
                    />
                  </Badge>
                )}
                {searchQuery && (
                  <Badge variant='secondary' className='gap-1'>
                    Search: &quot;{searchQuery}&quot;
                    <X
                      className='h-3 w-3 cursor-pointer'
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                    />
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && !selectedUser && (
            <div className='space-y-2'>
              <Label>Search Results ({searchResults.length})</Label>
              <div className='border rounded-lg divide-y max-h-[300px] overflow-y-auto'>
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className='w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3'
                  >
                    <div className='h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium flex-shrink-0'>
                      {user.full_name?.charAt(0) ||
                        user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2'>
                        <p className='font-medium truncate'>
                          {user.full_name || 'Unnamed User'}
                        </p>
                        <Badge
                          className={`${getRoleBadgeColor(user.role)} text-xs flex-shrink-0`}
                        >
                          {user.role.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className='text-sm text-muted-foreground truncate'>
                        {user.email}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected User */}
          {selectedUser && (
            <div className='space-y-4'>
              <div className='border rounded-lg p-4 bg-muted/50'>
                <div className='flex items-center gap-3'>
                  <div className='h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0'>
                    {selectedUser.full_name?.charAt(0) ||
                      selectedUser.email.charAt(0).toUpperCase()}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2'>
                      <p className='font-medium truncate'>
                        {selectedUser.full_name || 'Unnamed User'}
                      </p>
                      <Badge className={`${getRoleBadgeColor(selectedUser.role)} text-xs flex-shrink-0`}>
                        {selectedUser.role.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className='text-sm text-muted-foreground truncate'>
                      {selectedUser.email}
                    </p>
                  </div>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setSelectedUser(null)}
                    className='flex-shrink-0'
                  >
                    Change
                  </Button>
                </div>
              </div>

              {/* Permissions */}
              <div className='space-y-4'>
                <Label>Permissions</Label>

                {/* Owner Toggle */}
                <div className='flex items-start space-x-3 border rounded-lg p-4'>
                  <Checkbox
                    id='is_owner'
                    checked={permissions.is_owner}
                    onCheckedChange={() => togglePermission('is_owner')}
                  />
                  <div className='flex-1 space-y-1'>
                    <label
                      htmlFor='is_owner'
                      className='text-sm font-medium leading-none cursor-pointer'
                    >
                      Owner
                    </label>
                    <p className='text-sm text-muted-foreground'>
                      Full access to all features. Can manage and delete the
                      form.
                    </p>
                  </div>
                </div>

                {/* Individual Permissions */}
                <div className='space-y-3'>
                  {(
                    [
                      'can_edit_structure',
                      'can_view_responses',
                      'can_export_data',
                      'can_manage_collaborators'
                    ] as PersonalFormPermission[]
                  ).map((permission) => (
                    <div
                      key={permission}
                      className='flex items-start space-x-3 border rounded-lg p-4'
                    >
                      <Checkbox
                        id={permission}
                        checked={permissions[permission]}
                        onCheckedChange={() => togglePermission(permission)}
                        disabled={permissions.is_owner}
                      />
                      <div className='flex-1 space-y-1'>
                        <label
                          htmlFor={permission}
                          className='text-sm font-medium leading-none cursor-pointer'
                        >
                          {PERMISSION_LABELS[permission]}
                        </label>
                        <p className='text-sm text-muted-foreground'>
                          {PERMISSION_DESCRIPTIONS[permission]}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className='flex-shrink-0'>
          <Button variant='outline' onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={() => addMutation.mutate()}
            disabled={!selectedUser || addMutation.isPending}
          >
            {addMutation.isPending && (
              <Loader2 className='h-4 w-4 mr-2 animate-spin' />
            )}
            Add Collaborator
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
