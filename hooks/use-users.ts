import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import type { CreateUserRequest } from '@/types/users';
import type { Profile } from '@/types/auth';

export function useUsers() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClientSupabaseClient();

  const createUser = async (userData: CreateUserRequest) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      toast.success('User created successfully');
      router.refresh();
      return { data: data.data, error: null };
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to create user'
      );
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update role');
      }

      toast.success('Role updated successfully');
      router.refresh();
      return { data, error: null };
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update role'
      );
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserProfile = async (
    userId: string,
    userData: Partial<Profile>
  ) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      toast.success('Profile updated successfully');
      router.refresh();
      return { data, error: null };
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update profile'
      );
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const deactivateUser = async (userId: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User deactivated successfully');
      router.refresh();
      return { error: null };
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to deactivate user'
      );
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    createUser,
    updateUserRole,
    updateUserProfile,
    deactivateUser
  };
}
