// app/(routes)/profile/_components/profile-form.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Profile } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AvatarUpload } from './avatar-upload';
import { Textarea } from '@/components/ui/textarea';
import { ChangePasswordForm } from './change-password';
import { createClientSupabaseClient } from '@/lib/supabase/client';

// Form Schema
const profileFormSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  bio: z.string().min(2, 'Bio must be at least 2 characters'),
  phone_number: z.union([z.string(), z.null()]),
  avatar_url: z.union([z.string(), z.null()])
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileFormProps {
  user: Profile;
  onComplete?: () => void;
}

export function ProfileForm({ user, onComplete }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientSupabaseClient();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: user.full_name || '',
      bio: user.bio || '',
      phone_number: user.phone_number || null,
      avatar_url: user.avatar_url || null
    }
  });

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      setIsLoading(true);

      // Check if profile is complete
      const isComplete = !!(data.full_name && data.bio && data.phone_number);

      const { error } = await supabase
        .from('profiles')
        .update({
          ...data,
          profile_complete: isComplete,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      onComplete?.();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate initials for avatar
  const initials = user.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : user.email[0].toUpperCase();

  return (
    <div className='space-y-6'>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          <Card>
            <CardContent className='pt-6'>
              <div className='flex flex-col items-center space-y-4'>
                <AvatarUpload
                  avatarUrl={form.watch('avatar_url') || null}
                  initials={initials}
                  onUploadComplete={(url) => form.setValue('avatar_url', url)}
                  userId={user.id}
                />
                <p className='text-sm text-muted-foreground'>
                  Click or drag and drop to change your avatar
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className='pt-6 space-y-4'>
              {/* Email (Read-only) */}
              <div className='space-y-2'>
                <FormLabel>Email</FormLabel>
                <Input value={user.email} disabled />
                <p className='text-sm text-muted-foreground'>
                  Your email is managed through your account settings
                </p>
              </div>

              {/* Bio */}
              <FormField
                control={form.control}
                name='bio'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea placeholder='Enter your bio' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Full Name */}
              <FormField
                control={form.control}
                name='full_name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Enter your full name' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone Number */}
              <FormField
                control={form.control}
                name='phone_number'
                render={({ field: { value, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Enter your phone number'
                        value={value || ''}
                        {...fieldProps}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className='flex justify-end space-x-4'>
            <Button
              type='button'
              variant='outline'
              onClick={onComplete}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Separate Password Change Section */}
      <Card>
        <CardContent className='pt-6'>
          <h3 className='text-lg font-medium mb-4'>Change Password</h3>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
