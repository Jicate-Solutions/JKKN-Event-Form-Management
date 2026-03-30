// lib/services/user-service.ts
import { Profile, ProfileUpdate } from '@/types/auth';
import { UserRole } from '@/lib/constants/roles';
import {
  UserFilters,
  UserListResponse,
  UserStats,
  CreateUserRequest,
  RoleUpdateResponse
} from '@/types/users';
import { toast } from 'react-hot-toast';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ErrorHandler } from '@/lib/utils/error-handler';

export class UserService {
  private static supabase = getSupabaseClient();

  // User Creation - Server-side only
  static async createUser(
    userData: CreateUserRequest
  ): Promise<{ data: Profile | null; error: Error | null }> {
    if (typeof window !== 'undefined') {
      return {
        data: null,
        error: new Error('This operation is only available server-side')
      };
    }

    try {
      const adminClient = getSupabaseClient({ admin: true });
      // Create auth user with admin client
      const { data: authData, error: authError } =
        await adminClient.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            full_name: userData.full_name,
            role: userData.role,
            phone_number: userData.phone_number
          }
        });

      if (authError) throw authError;

      // Create profile
      const profileData = {
        id: authData.user.id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        phone_number: userData.phone_number,
        is_active: true,
        profile_complete: false,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await adminClient
        .from('profiles')
        .upsert(profileData, { onConflict: 'email' })
        .select()
        .single();

      if (error) {
        // Cleanup: delete auth user if profile creation fails
        await adminClient.auth.admin.deleteUser(authData.user.id);
        throw error;
      }

      return { data: data as unknown as Profile, error: null };
    } catch (error) {
      await ErrorHandler.handleError(error, 'createUser');
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to create user')
      };
    }
  }

  // User Retrieval
  static async getUsers(filters: UserFilters = {}): Promise<UserListResponse> {
    try {
      let query = this.supabase
        .from('profiles')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.role) {
        query = query.eq('role', filters.role);
      }

      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters.search) {
        query = query.or(
          `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
        );
      }

      // Apply sorting
      if (filters.sortBy) {
        query = query.order(filters.sortBy, {
          ascending: filters.sortOrder === 'asc'
        });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const start = (page - 1) * limit;
      const end = start + limit - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: (data || []) as unknown as Profile[],
        metadata: {
          total: count || 0,
          page,
          limit,
          totalPages: count ? Math.ceil(count / limit) : 0
        }
      };
    } catch (error) {
      await ErrorHandler.handleError(error, 'getUsers');
      throw error;
    }
  }

  static async getUserById(
    userId: string
  ): Promise<{ data: Profile | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { data: data as unknown as Profile, error: null };
    } catch (error) {
      await ErrorHandler.handleError(error, 'getUserById');
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to get user')
      };
    }
  }

  // User Updates
  static async updateUser(
    userId: string,
    userData: Partial<ProfileUpdate>
  ): Promise<{ data: Profile | null; error: Error | null }> {
    try {
      const { error: fetchError } = await this.supabase
        .from('profiles')
        .select()
        .eq('id', userId)
        .single();

      if (fetchError) throw new Error('User not found');

      const { data, error } = await this.supabase
        .from('profiles')
        .update({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data: data as unknown as Profile, error: null };
    } catch (error) {
      await ErrorHandler.handleError(error, 'updateUser');
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to update user')
      };
    }
  }

  static async updateUserRole(
    userId: string,
    newRole: UserRole
  ): Promise<RoleUpdateResponse> {
    if (typeof window !== 'undefined') {
      throw new Error('This operation is only available server-side');
    }

    try {
      const adminClient = getSupabaseClient({ admin: true });
      const currentUser = await this.getCurrentUserProfile();
      if (!currentUser.data) throw new Error('No authenticated user');

      const { data, error } = await adminClient
        .from('profiles')
        .update({
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        user: data as unknown as Profile
      };
    } catch (error) {
      await ErrorHandler.handleError(error, 'updateUserRole');
      throw error;
    }
  }

  // User Status Management
  static async deactivateUser(
    userId: string
  ): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase
        .from('profiles')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      toast.success('User deactivated successfully');
      return { error: null };
    } catch (error) {
      await ErrorHandler.handleError(error, 'deactivateUser');
      return {
        error:
          error instanceof Error
            ? error
            : new Error('Failed to deactivate user')
      };
    }
  }

  // Statistics
  static async getUserStats(): Promise<{
    data: UserStats | null;
    error: Error | null;
  }> {
    try {
      // Get total count efficiently using count
      const { count: totalCount, error: totalError } = await this.supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (totalError) throw totalError;

      // Get active count
      const { count: activeCount, error: activeError } = await this.supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (activeError) throw activeError;

      // Get inactive count
      const { count: inactiveCount, error: inactiveError } = await this.supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', false);

      if (inactiveError) throw inactiveError;

      // Get counts by role
      const rolePromises = Object.values(UserRole).map(async (role) => {
        const { count } = await this.supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', role);
        return { role, count: count || 0 };
      });

      const roleCounts = await Promise.all(rolePromises);

      const stats: UserStats = {
        total: totalCount || 0,
        active: activeCount || 0,
        inactive: inactiveCount || 0,
        byRole: roleCounts.reduce(
          (acc, { role, count }) => ({ ...acc, [role]: count }),
          {} as Record<UserRole, number>
        ),
        byInstitution: {}
      };

      return { data: stats, error: null };
    } catch (error) {
      await ErrorHandler.handleError(error, 'getUserStats');
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to get user stats')
      };
    }
  }

  // Current User
  static async getCurrentUserProfile(): Promise<{
    data: Profile | null;
    error: Error | null;
  }> {
    try {
      const {
        data: { session },
        error: sessionError
      } = await this.supabase.auth.getSession();

      if (sessionError || !session?.user) {
        return { data: null, error: new Error('No authenticated session') };
      }

      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      return { data: data as unknown as Profile, error: null };
    } catch (error) {
      await ErrorHandler.handleError(error, 'getCurrentUserProfile');
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get current user profile')
      };
    }
  }

  // Permission Checks
  static async checkIsAdmin(): Promise<boolean> {
    try {
      const { data: profile } = await this.getCurrentUserProfile();
      return (
        profile?.role === UserRole.SUPER_ADMIN ||
        profile?.role === UserRole.ADMINISTRATOR ||
        profile?.role === UserRole.INSTITUTION_COORDINATOR
      );
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }
}
