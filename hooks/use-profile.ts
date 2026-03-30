import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/auth';

export function useProfile() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClientSupabaseClient();

  const updateProfile = async (
    userId: string,
    profileData: Partial<Profile>
  ) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...profileData,
          profile_complete: true,
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
      console.error('Profile update error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update profile'
      );
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const updateAvatar = async (userId: string, file: File) => {
    try {
      setIsLoading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/avatar.${fileExt}`;

      // Upload avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl }
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // Update profile with avatar URL
      const { data, error } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      toast.success('Avatar updated successfully');
      router.refresh();
      return { data, error: null };
    } catch (error) {
      console.error('Avatar update error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update avatar'
      );
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAvatar = async (userId: string) => {
    try {
      setIsLoading(true);
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('avatars')
        .remove([`${userId}/avatar`]);

      if (storageError) throw storageError;

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      toast.success('Avatar removed successfully');
      router.refresh();
      return { error: null };
    } catch (error) {
      console.error('Avatar deletion error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete avatar'
      );
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const updateNotificationPreferences = async (
    userId: string,
    preferences: {
      email_notifications: boolean;
      push_notifications: boolean;
    }
  ) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .update({
          notification_preferences: preferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      toast.success('Notification preferences updated');
      return { data, error: null };
    } catch (error) {
      console.error('Notification preferences update error:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update notification preferences'
      );
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    updateProfile,
    updateAvatar,
    deleteAvatar,
    updateNotificationPreferences
  };
}
