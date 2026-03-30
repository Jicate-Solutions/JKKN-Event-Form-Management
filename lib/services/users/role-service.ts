import { UserRole, ROLE_HIERARCHY, isUserRole } from '@/lib/constants/roles';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { Profile } from '@/types/auth';

export class RoleService {
  private static supabase = getSupabaseClient({ admin: true });

  static async updateUserRole(
    userId: string,
    newRole: UserRole,
    currentUserId: string
  ): Promise<{ data: Profile | null; error: Error | null }> {
    try {
      // Validate role
      if (!this.isValidRole(newRole)) {
        throw new Error('Invalid role specified');
      }

      // Check permissions
      const { allowed, error: permissionError } = await this.canModifyRole(
        currentUserId,
        userId,
        newRole
      );

      if (permissionError) throw permissionError;
      if (!allowed) throw new Error('Insufficient permissions to update role');

      // Update the role
      const { data, error } = await this.supabase
        .from('profiles')
        .update({
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data: data as unknown as Profile, error: null };
    } catch (error) {
      await ErrorHandler.handleError(error, 'updateUserRole');
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to update role')
      };
    }
  }

  static async canModifyRole(
    currentUserId: string,
    targetUserId: string,
    newRole: string
  ): Promise<{ allowed: boolean; error: Error | null }> {
    try {
      // Get current user's role
      const currentUserRole = await this.getUserRole(currentUserId);
      if (!currentUserRole || !this.isValidRole(currentUserRole)) {
        return { allowed: false, error: new Error('Current user not found') };
      }

      // Get target user's role
      const targetUserRole = await this.getUserRole(targetUserId);
      if (!targetUserRole || !this.isValidRole(targetUserRole)) {
        return { allowed: false, error: new Error('Target user not found') };
      }

      // Super admin can update any role
      if (currentUserRole === UserRole.SUPER_ADMIN) {
        return { allowed: true, error: null };
      }

      // Administrator can update any role except super_admin
      if (
        currentUserRole === UserRole.ADMINISTRATOR &&
        targetUserRole !== UserRole.SUPER_ADMIN &&
        newRole !== UserRole.SUPER_ADMIN
      ) {
        return { allowed: true, error: null };
      }

      return { allowed: false, error: null };
    } catch (error) {
      return {
        allowed: false,
        error:
          error instanceof Error ? error : new Error('Permission check failed')
      };
    }
  }

  static async getUserRole(userId: string): Promise<UserRole | null> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return this.isValidRole(data?.role) ? data.role : null;
    } catch (error) {
      await ErrorHandler.handleError(error, 'getUserRole');
      return null;
    }
  }

  static async getUsersWithRole(role: UserRole): Promise<Profile[]> {
    try {
      if (!this.isValidRole(role)) {
        throw new Error('Invalid role specified');
      }

      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('role', role);

      if (error) throw error;
      return data as unknown as Profile[];
    } catch (error) {
      await ErrorHandler.handleError(error, 'getUsersWithRole');
      return [];
    }
  }

  static isValidRole(role: unknown): role is UserRole {
    return typeof role === 'string' && isUserRole(role);
  }

  static hasRequiredRole(userRole: UserRole, requiredRole: UserRole): boolean {
    return (
      ROLE_HIERARCHY.indexOf(userRole) <= ROLE_HIERARCHY.indexOf(requiredRole)
    );
  }
}
