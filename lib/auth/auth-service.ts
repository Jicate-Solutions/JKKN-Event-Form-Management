// lib/auth/auth-service.ts
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { Profile, ProfileUpdate } from '@/types/auth';
import { toast } from 'react-hot-toast';
import { UserRole } from '@/lib/constants/roles';
import { RoleService } from '@/lib/services/users/role-service';
import { User } from '@supabase/supabase-js';

const supabase = createClientSupabaseClient();

export class AuthService {
  // Session Management
  // DEPRECATED: Use getUser() for authentication verification
  // getSession() only reads from local storage and can be tampered with
  static async getSession() {
    try {
      const {
        data: { session },
        error
      } = await supabase.auth.getSession();
      if (error) throw error;
      return { session, error: null };
    } catch (error) {
      console.error('Get session error:', error);
      return { session: null, error };
    }
  }

  // Get authenticated user (verifies with Supabase Auth server)
  static async getAuthenticatedUser() {
    try {
      const {
        data: { user },
        error
      } = await supabase.auth.getUser();
      if (error) throw error;
      return { user, error: null };
    } catch (error) {
      console.error('Get authenticated user error:', error);
      return { user: null, error };
    }
  }

  static async refreshSession() {
    try {
      // Use getUser() to verify authentication
      const { user, error } = await this.getAuthenticatedUser();
      if (error) throw error;

      if (!user) {
        window.location.href = '/auth/login';
        return null;
      }

      // Update last login
      await supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      // Get session after verification
      const {
        data: { session }
      } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error('Session refresh error:', error);
      toast.error('Session expired. Please sign in again.');
      window.location.href = '/auth/login';
      return null;
    }
  }

  // Authentication
  static async signInWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      return { data: null, error };
    }
  }

  static async signOut() {
    try {
      // First check if there's an authenticated user
      const { user, error: userError } = await this.getAuthenticatedUser();

      if (userError || !user) {
        // If no user exists or there's an error, just redirect to login
        if (typeof window !== 'undefined') {
          localStorage.clear();
          window.location.href = '/auth/login';
        }
        return true;
      }

      if (typeof window !== 'undefined') {
        localStorage.clear();
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast.success('Signed out successfully');
      window.location.href = '/auth/login';
      return true;
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out. Please try again.');

      // Even if there's an error, try to redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }

      throw error;
    }
  }

  // User Management
  static async getCurrentUser() {
    try {
      // Use getUser() to get verified user
      const { user, error } = await this.getAuthenticatedUser();
      if (error) throw error;
      return user || null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  static async getUserProfile(): Promise<Profile | null> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return profile as unknown as Profile;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  static async updateUserProfile(
    profileData: Partial<ProfileUpdate>
  ): Promise<Profile | null> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        toast.error('No authenticated user');
        throw new Error('No authenticated user');
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Profile;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // Role-Based Authorization
  static async getUserRole(): Promise<UserRole | null> {
    try {
      const profile = await this.getUserProfile();
      if (!profile?.role || !RoleService.isValidRole(profile.role)) return null;
      return profile.role;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  static async hasRole(requiredRole: UserRole): Promise<boolean> {
    try {
      const userRole = await this.getUserRole();
      if (!userRole) return false;
      return RoleService.hasRequiredRole(userRole, requiredRole);
    } catch (error) {
      console.error('Error checking role:', error);
      return false;
    }
  }

  static async canManageRoles(): Promise<boolean> {
    try {
      const userRole = await this.getUserRole();
      if (!userRole) return false;
      return [UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR].includes(userRole);
    } catch (error) {
      console.error('Error checking role management permission:', error);
      return false;
    }
  }

  static async canManageUsers(): Promise<boolean> {
    try {
      const userRole = await this.getUserRole();
      if (!userRole) return false;
      return [
        UserRole.SUPER_ADMIN,
        UserRole.ADMINISTRATOR,
        UserRole.STAFF
      ].includes(userRole);
    } catch (error) {
      console.error('Error checking user management permission:', error);
      return false;
    }
  }

  // Avatar Management
  static async uploadAvatar(file: File): Promise<{
    path: string | null;
    error: Error | null;
  }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()
        .toString(36)
        .slice(2)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      return { path: urlData.publicUrl, error: null };
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return {
        path: null,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  static async deleteAvatar(): Promise<{ error: Error | null }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();

      if (profile?.avatar_url) {
        const fileName = profile.avatar_url.split('/').pop();
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove([`avatars/${fileName}`]);

        if (deleteError) throw deleteError;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (updateError) throw updateError;

      return { error: null };
    } catch (error) {
      console.error('Error deleting avatar:', error);
      return {
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  static async handleFirstTimeLogin(user: User): Promise<void> {
    try {
      const supabase = createClientSupabaseClient();

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        if (!user.email) {
          throw new Error('User email is missing.');
        }
        // Create new profile with public role
        const profileData = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          role: UserRole.PUBLIC, // Default role
          is_active: true,
          profile_complete: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase.from('profiles').insert(profileData);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error in handleFirstTimeLogin:', error);
      throw error;
    }
  }

  // Add role-specific checks
  static async canAccessInstitution(
    userId: string,
    institutionId: string
  ): Promise<boolean> {
    try {
      const profile = await this.getUserProfile();
      if (!profile) return false;

      // Super admin and administrator can access all institutions
      if (
        [UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR].includes(profile.role)
      ) {
        return true;
      }

      // Check institution-specific access for coordinators
      if (profile.role === UserRole.INSTITUTION_COORDINATOR) {
        const { data } = await supabase
          .from('institution_coordinators')
          .select('institution_id')
          .eq('user_id', userId)
          .eq('institution_id', institutionId)
          .single();

        return !!data;
      }

      return false;
    } catch (error) {
      console.error('Error checking institution access:', error);
      return false;
    }
  }
}
