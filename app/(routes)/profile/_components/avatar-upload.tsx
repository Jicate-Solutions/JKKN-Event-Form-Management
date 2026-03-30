'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import { CameraIcon, Trash2 } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { createClientSupabaseClient } from '@/lib/supabase/client';

interface AvatarUploadProps {
  avatarUrl: string | null;
  initials: string;
  onUploadComplete: (url: string) => void;
  userId: string;
}

const ACCEPTED_IMAGE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp']
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function AvatarUpload({
  avatarUrl,
  initials,
  onUploadComplete,
  userId
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = createClientSupabaseClient();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      try {
        const file = acceptedFiles[0];
        if (!file) {
          toast.error('No file selected');
          return;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          toast.error('File size must be less than 5MB');
          return;
        }

        // Validate file type
        if (
          !ACCEPTED_IMAGE_TYPES[file.type as keyof typeof ACCEPTED_IMAGE_TYPES]
        ) {
          toast.error('File type not supported. Please use JPG, PNG or WebP');
          return;
        }

        setIsUploading(true);

        // Delete old avatar if exists
        if (avatarUrl) {
          try {
            const oldFilePath = avatarUrl.split('/').pop();
            if (oldFilePath) {
              await supabase.storage
                .from('avatars')
                .remove([`avatars/${oldFilePath}`]);
            }
          } catch (error) {
            console.error('Error deleting old avatar:', error);
            // Continue with upload even if delete fails
          }
        }

        // Create a unique file name
        const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        // Upload new file
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error('Failed to upload image');
        }

        // Get the public URL
        const { data: { publicUrl } = {} } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        if (!publicUrl) {
          throw new Error('Failed to get public URL');
        }

        // Update profile with new avatar URL
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            avatar_url: publicUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          throw updateError;
        }

        onUploadComplete(publicUrl);
        toast.success('Avatar updated successfully');
      } catch (error) {
        console.error('Error uploading avatar:', error);
        toast.error(
          error instanceof Error ? error.message : 'Failed to upload avatar'
        );
      } finally {
        setIsUploading(false);
      }
    },
    [avatarUrl, userId, supabase, onUploadComplete]
  );

  const handleDelete = async () => {
    try {
      setIsDeleting(true);

      if (!avatarUrl) {
        throw new Error('No avatar to delete');
      }

      // Delete the file from storage
      const filePath = avatarUrl.split('/').pop();
      if (filePath) {
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove([`avatars/${filePath}`]);

        if (deleteError) {
          throw deleteError;
        }
      }

      // Update profile to remove avatar_url
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      onUploadComplete('');
      toast.success('Avatar removed successfully');
    } catch (error) {
      console.error('Error deleting avatar:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove avatar'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxFiles: 1,
    multiple: false,
    disabled: isUploading,
    maxSize: MAX_FILE_SIZE
  });

  return (
    <div className='flex flex-col items-center gap-4'>
      <div {...getRootProps()} className='relative group cursor-pointer'>
        <input {...getInputProps()} />
        <Avatar className='h-24 w-24'>
          <AvatarImage
            src={avatarUrl || undefined}
            alt='Profile Picture'
            className='object-cover'
          />
          <AvatarFallback className='text-2xl bg-primary/10'>
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className='absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity'>
          {isUploading ? (
            <div className='h-5 w-5 animate-spin rounded-full border-2 border-primary border-r-transparent' />
          ) : (
            <CameraIcon className='h-8 w-8 text-white' />
          )}
        </div>
        {isDragActive && (
          <div className='absolute inset-0 flex items-center justify-center bg-black/60 rounded-full'>
            <p className='text-white text-xs'>Drop image here</p>
          </div>
        )}
      </div>

      {avatarUrl && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant='outline'
              size='sm'
              className='text-destructive'
              disabled={isDeleting}
            >
              <Trash2 className='h-4 w-4 mr-2' />
              Remove Avatar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Avatar?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove your current profile picture. Are you sure you
                want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                disabled={isDeleting}
              >
                {isDeleting ? 'Removing...' : 'Remove Avatar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <p className='text-xs text-muted-foreground mt-2'>
        Upload a JPG, PNG or WebP image (max 5MB)
      </p>
    </div>
  );
}
