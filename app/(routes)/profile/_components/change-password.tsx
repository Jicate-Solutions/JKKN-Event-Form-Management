'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BeatLoader } from 'react-spinners';
import { createClientSupabaseClient } from '@/lib/supabase/client';

export function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientSupabaseClient();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (newPassword !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update password'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='space-y-4 mt-4'>
      <div className='space-y-2'>
        <Label htmlFor='current-password'>Current Password</Label>
        <Input
          id='current-password'
          type='password'
          name='current-password'
          required
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='new-password'>New Password</Label>
        <Input
          id='new-password'
          type='password'
          name='new-password'
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='confirm-password'>Confirm New Password</Label>
        <Input
          id='confirm-password'
          type='password'
          name='confirm-password'
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      <Button
        type='button'
        onClick={handlePasswordChange}
        disabled={isLoading}
        className='w-fit'
      >
        {isLoading ? (
          <BeatLoader size={8} color='#FFFFFF' />
        ) : (
          'Change Password'
        )}
      </Button>
    </div>
  );
}
