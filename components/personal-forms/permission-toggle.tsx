'use client';

// components/personal-forms/permission-toggle.tsx
// Toggle component for individual collaborator permissions

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { PersonalFormPermission } from '@/types/personal-forms';
import toast from 'react-hot-toast';

interface PermissionToggleProps {
  formId: string;
  collaboratorId: string;
  permission: PersonalFormPermission;
  enabled: boolean;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function PermissionToggle({
  formId,
  collaboratorId,
  permission,
  enabled,
  label,
  description,
  disabled = false
}: PermissionToggleProps) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (newValue: boolean) => {
      const response = await fetch(
        `/api/personal-forms/${formId}/collaborators/${collaboratorId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            [permission]: newValue
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update permission');
      }

      return response.json();
    },
    onMutate: async (newValue) => {
      // Optimistic update
      setIsEnabled(newValue);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['personal-form-collaborators', formId]
      });
      toast.success('Permission updated successfully');
    },
    onError: (error: Error, newValue) => {
      // Revert on error
      setIsEnabled(!newValue);
      toast.error(error.message);
    }
  });

  const handleToggle = (checked: boolean) => {
    if (disabled) return;
    updateMutation.mutate(checked);
  };

  return (
    <div className='flex items-center justify-between space-x-2 p-3 rounded-lg border bg-card'>
      <div className='flex-1 space-y-0.5'>
        <Label
          htmlFor={`${collaboratorId}-${permission}`}
          className='text-sm font-medium'
        >
          {label}
        </Label>
        {description && (
          <p className='text-xs text-muted-foreground'>{description}</p>
        )}
      </div>
      <div className='flex items-center gap-2'>
        {updateMutation.isPending && (
          <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />
        )}
        <Switch
          id={`${collaboratorId}-${permission}`}
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={disabled || updateMutation.isPending}
        />
      </div>
    </div>
  );
}
