import { createClientSupabaseClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKETS = {
  AVATARS: 'avatars',
  LOGOS: 'institution-logos',
  FORM_UPLOADS: 'form-uploads',
  FORM_BANNERS: 'form-banners',
  FORM_FIELD_IMAGES: 'form-field-images'
} as const;

const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif'],
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export class StorageService {
  private static supabase = createClientSupabaseClient();

  private static async validateFile(file: File): Promise<void> {
    // Validate file type
    if (!ALLOWED_FILE_TYPES.IMAGES.includes(file.type)) {
      throw new Error(
        'Invalid file type. Please upload a JPEG, PNG or GIF image.'
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size must be less than 5MB');
    }
  }

  // Avatar methods remain the same
  static async uploadAvatar(file: File): Promise<{
    publicUrl: string | null;
    error: Error | null;
  }> {
    try {
      await this.validateFile(file);

      const {
        data: { session },
        error: sessionError
      } = await this.supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Authentication required');
      }

      await this.deleteOldAvatar(session.user.id);

      // Ensure the bucket exists
      // await this.ensureBucketExists(BUCKETS.AVATARS);

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      const { error: uploadError } = await this.supabase.storage
        .from(BUCKETS.AVATARS)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = this.supabase.storage
        .from(BUCKETS.AVATARS)
        .getPublicUrl(filePath);

      const { error: updateError } = await this.supabase
        .from('profiles')
        .update({
          avatar_url: urlData.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      return {
        publicUrl: urlData.publicUrl,
        error: null
      };
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return {
        publicUrl: null,
        error: error instanceof Error ? error : new Error('Upload failed')
      };
    }
  }

  private static async deleteOldAvatar(userId: string): Promise<void> {
    try {
      const { data: existingFiles } = await this.supabase.storage
        .from(BUCKETS.AVATARS)
        .list(`${userId}`);

      if (existingFiles && existingFiles.length > 0) {
        const filesToRemove = existingFiles.map((f) => `${userId}/${f.name}`);
        await this.supabase.storage.from(BUCKETS.AVATARS).remove(filesToRemove);
      }
    } catch (error) {
      console.error('Error deleting old avatar:', error);
    }
  }

  static async deleteAvatar(userId: string): Promise<{ error: Error | null }> {
    try {
      await this.deleteOldAvatar(userId);

      const { error: updateError } = await this.supabase
        .from('profiles')
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      return { error: null };
    } catch (error) {
      console.error('Error deleting avatar:', error);
      return {
        error: error instanceof Error ? error : new Error('Delete failed')
      };
    }
  }

  // New methods for institution logos
  static async uploadInstitutionLogo(
    file: File,
    institutionId: string
  ): Promise<{
    publicUrl: string | null;
    error: Error | null;
  }> {
    try {
      await this.validateFile(file);

      const {
        data: { session },
        error: sessionError
      } = await this.supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Authentication required');
      }

      await this.deleteOldInstitutionLogo(institutionId);

      // Ensure the bucket exists
      // await this.ensureBucketExists(BUCKETS.LOGOS);

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${institutionId}/${fileName}`;

      const { error: uploadError } = await this.supabase.storage
        .from(BUCKETS.LOGOS)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = this.supabase.storage
        .from(BUCKETS.LOGOS)
        .getPublicUrl(filePath);

      return {
        publicUrl: urlData.publicUrl,
        error: null
      };
    } catch (error) {
      console.error('Error uploading institution logo:', error);
      return {
        publicUrl: null,
        error: error instanceof Error ? error : new Error('Upload failed')
      };
    }
  }

  private static async deleteOldInstitutionLogo(
    institutionId: string
  ): Promise<void> {
    try {
      const { data: existingFiles } = await this.supabase.storage
        .from(BUCKETS.LOGOS)
        .list(`${institutionId}`);

      if (existingFiles && existingFiles.length > 0) {
        const filesToRemove = existingFiles.map(
          (f) => `${institutionId}/${f.name}`
        );
        await this.supabase.storage.from(BUCKETS.LOGOS).remove(filesToRemove);
      }
    } catch (error) {
      console.error('Error deleting old institution logo:', error);
    }
  }

  static async deleteInstitutionLogo(
    institutionId: string
  ): Promise<{ error: Error | null }> {
    try {
      await this.deleteOldInstitutionLogo(institutionId);
      return { error: null };
    } catch (error) {
      console.error('Error deleting institution logo:', error);
      return {
        error: error instanceof Error ? error : new Error('Delete failed')
      };
    }
  }

  static async uploadStaffImage(
    file: File,
    staffId: string
  ): Promise<{ publicUrl: string | null; error: Error | null }> {
    try {
      await this.validateFile(file);

      const {
        data: { session },
        error: sessionError
      } = await this.supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Authentication required');
      }

      // Remove existing staff image if any
      await this.deleteExistingStaffImage(staffId);

      // Ensure the bucket exists
      // await this.ensureBucketExists('staff-images');

      // Create a unique filename
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${staffId}/${fileName}`;

      // Upload the new file
      const { error: uploadError } = await this.supabase.storage
        .from('staff-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false // Don't overwrite existing files
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('staff-images')
        .getPublicUrl(filePath);

      return {
        publicUrl: urlData.publicUrl,
        error: null
      };
    } catch (error) {
      console.error('Error uploading staff image:', error);
      return {
        publicUrl: null,
        error: error instanceof Error ? error : new Error('Upload failed')
      };
    }
  }

  private static async deleteExistingStaffImage(
    staffId: string
  ): Promise<void> {
    try {
      const { data: existingFiles } = await this.supabase.storage
        .from('staff-images')
        .list(staffId);

      if (existingFiles && existingFiles.length > 0) {
        const filesToRemove = existingFiles.map((f) => `${staffId}/${f.name}`);
        await this.supabase.storage.from('staff-images').remove(filesToRemove);
      }
    } catch (error) {
      console.error('Error deleting existing staff image:', error);
    }
  }

  static async deleteStaffImage(
    staffId: string
  ): Promise<{ error: Error | null }> {
    try {
      await this.deleteExistingStaffImage(staffId);
      return { error: null };
    } catch (error) {
      console.error('Error deleting staff image:', error);
      return {
        error: error instanceof Error ? error : new Error('Delete failed')
      };
    }
  }

  static async uploadFormFile(
    file: File,
    eventId: string,
    formId: string
  ): Promise<{ publicUrl: string | null; error: Error | null }> {
    try {
      // Validate file type
      if (
        ![
          ...ALLOWED_FILE_TYPES.IMAGES,
          ...ALLOWED_FILE_TYPES.DOCUMENTS
        ].includes(file.type)
      ) {
        throw new Error(
          'Invalid file type. Please upload an image or document.'
        );
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      const {
        data: { session },
        error: sessionError
      } = await this.supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Authentication required');
      }

      // Ensure the bucket exists
      // await this.ensureBucketExists(BUCKETS.FORM_UPLOADS);

      // Create path: form-uploads/eventId/formId/userId/timestamp_filename
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${eventId}/${formId}/${session.user.id}/${fileName}`;

      const { error: uploadError } = await this.supabase.storage
        .from(BUCKETS.FORM_UPLOADS)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false // Don't overwrite existing files
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = this.supabase.storage
        .from(BUCKETS.FORM_UPLOADS)
        .getPublicUrl(filePath);

      return {
        publicUrl: urlData.publicUrl,
        error: null
      };
    } catch (error) {
      console.error('Error uploading form file:', error);
      return {
        publicUrl: null,
        error: error instanceof Error ? error : new Error('Upload failed')
      };
    }
  }

  /**
   * Upload file for personal form with organized folder structure
   * Structure: form-uploads/personal-forms/{sanitized-form-name}/{userId}/timestamp_filename
   */
  static async uploadPersonalFormFile(
    file: File,
    formName: string,
    formId: string,
    customClient?: SupabaseClient // Optional: server Supabase client for API routes
  ): Promise<{ publicUrl: string | null; fileName: string; error: Error | null }> {
    try {
      // Validate file type
      if (
        ![
          ...ALLOWED_FILE_TYPES.IMAGES,
          ...ALLOWED_FILE_TYPES.DOCUMENTS
        ].includes(file.type)
      ) {
        throw new Error(
          'Invalid file type. Please upload an image or document.'
        );
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      // Use custom client if provided (for server-side), otherwise use default client
      const supabaseClient = customClient || this.supabase;

      const {
        data: { session },
        error: sessionError
      } = await supabaseClient.auth.getSession();

      // For personal forms, allow both authenticated and anonymous uploads
      const userId = session?.user?.id || 'anonymous';

      // Sanitize form name for folder structure
      // Remove special characters, replace spaces with hyphens, lowercase
      const sanitizedFormName = formName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .substring(0, 50); // Limit length

      // Create organized path: form-uploads/personal-forms/{formName}/{userId}/{timestamp_filename}
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-z0-9.\-_]/gi, '_');
      const fileName = `${timestamp}_${sanitizedFileName}`;
      const filePath = `personal-forms/${sanitizedFormName}/${userId}/${fileName}`;

      console.log('Uploading file to:', filePath);

      const { error: uploadError } = await supabaseClient.storage
        .from(BUCKETS.FORM_UPLOADS)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false // Don't overwrite existing files
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabaseClient.storage
        .from(BUCKETS.FORM_UPLOADS)
        .getPublicUrl(filePath);

      console.log('File uploaded successfully:', urlData.publicUrl);

      return {
        publicUrl: urlData.publicUrl,
        fileName: file.name, // Return original filename
        error: null
      };
    } catch (error) {
      console.error('Error uploading personal form file:', error);
      return {
        publicUrl: null,
        fileName: '',
        error: error instanceof Error ? error : new Error('Upload failed')
      };
    }
  }

  static async uploadFormBanner(
    file: File
  ): Promise<{ publicUrl: string | null; error: Error | null }> {
    try {
      // Validate file type
      if (!ALLOWED_FILE_TYPES.IMAGES.includes(file.type)) {
        throw new Error('Invalid file type. Please upload an image.');
      }

      // Validate file size (5MB max for banners)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      const {
        data: { session },
        error: sessionError
      } = await this.supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Authentication required');
      }

      // Ensure the bucket exists
      // await this.ensureBucketExists(BUCKETS.FORM_BANNERS);

      // Create path: form-banners/timestamp_filename
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `form-banners/${fileName}`;

      const { error: uploadError } = await this.supabase.storage
        .from(BUCKETS.FORM_BANNERS)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = this.supabase.storage
        .from(BUCKETS.FORM_BANNERS)
        .getPublicUrl(filePath);

      return {
        publicUrl: urlData.publicUrl,
        error: null
      };
    } catch (error) {
      console.error('Error uploading form banner:', error);
      return {
        publicUrl: null,
        error: error instanceof Error ? error : new Error('Upload failed')
      };
    }
  }

  static async uploadFormFieldImage(
    file: File,
    formId: string,
    fieldId: string
  ): Promise<{ publicUrl: string | null; error: Error | null }> {
    try {
      // Validate file type
      if (!ALLOWED_FILE_TYPES.IMAGES.includes(file.type)) {
        throw new Error(`Invalid file type: ${file.type}. Allowed types: ${ALLOWED_FILE_TYPES.IMAGES.join(', ')}`);
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 5MB limit`);
      }

      const {
        data: { session },
        error: sessionError
      } = await this.supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error(`Authentication error: ${sessionError.message}`);
      }
      
      if (!session) {
        throw new Error('Authentication required: No active session found');
      }

      // Use the form-banners bucket which already has working permissions
      // Create a simple path to avoid RLS issues
      const fileName = `field_image_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const filePath = fileName;

      console.log(`Attempting to upload file to path: ${filePath}`);
      
      const { error: uploadError } = await this.supabase.storage
        .from(BUCKETS.FORM_BANNERS) // Use form-banners bucket instead of form-field-images
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error details:', JSON.stringify(uploadError));
        throw uploadError;
      }

      const { data: urlData } = this.supabase.storage
        .from(BUCKETS.FORM_BANNERS) // Use form-banners bucket for consistency
        .getPublicUrl(filePath);

      return {
        publicUrl: urlData.publicUrl,
        error: null
      };
    } catch (error) {
      console.error('Error uploading form field image:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      } else {
        console.error('Unknown error type:', typeof error);
      }
      return {
        publicUrl: null,
        error: error instanceof Error ? error : new Error('Upload failed')
      };
    }
  }
}
