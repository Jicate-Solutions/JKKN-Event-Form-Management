// lib/services/forms/form-collaborator-service.ts
import { getSupabaseClient } from '@/lib/supabase/client';
import { ErrorHandler } from '@/lib/utils/error-handler';

export type FormPermissionLevel = 'view' | 'edit' | 'manage_responses';

export interface FormCollaborator {
  id: string;
  form_id: string;
  user_id: string;
  permission_level: FormPermissionLevel;
  assigned_by: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    phone_number?: string;
  };
}

export interface AssignCollaboratorDto {
  form_id: string;
  user_id: string;
  permission_level?: FormPermissionLevel;
}

export class FormCollaboratorService {
  private static supabase = getSupabaseClient();

  /**
   * Assign a collaborator to a form
   * @param data Assignment data
   * @returns Void
   */
  static async assignCollaborator(
    data: AssignCollaboratorDto
  ): Promise<{ error: Error | null }> {
    try {
      const {
        data: { user }
      } = await this.supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await this.supabase.from('form_collaborators').insert({
        form_id: data.form_id,
        user_id: data.user_id,
        permission_level: data.permission_level || 'view',
        assigned_by: user.id
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      await ErrorHandler.handleError(error, 'assignCollaborator');
      return {
        error:
          error instanceof Error
            ? error
            : new Error('Failed to assign collaborator')
      };
    }
  }

  /**
   * Remove a collaborator from a form
   * @param formId Form ID
   * @param userId User ID to remove
   * @returns Void
   */
  static async removeCollaborator(
    formId: string,
    userId: string
  ): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase
        .from('form_collaborators')
        .delete()
        .eq('form_id', formId)
        .eq('user_id', userId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      await ErrorHandler.handleError(error, 'removeCollaborator');
      return {
        error:
          error instanceof Error
            ? error
            : new Error('Failed to remove collaborator')
      };
    }
  }

  /**
   * Update collaborator permission level
   * @param formId Form ID
   * @param userId User ID
   * @param permissionLevel New permission level
   * @returns Void
   */
  static async updateCollaboratorPermission(
    formId: string,
    userId: string,
    permissionLevel: FormPermissionLevel
  ): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase
        .from('form_collaborators')
        .update({ permission_level: permissionLevel })
        .eq('form_id', formId)
        .eq('user_id', userId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      await ErrorHandler.handleError(error, 'updateCollaboratorPermission');
      return {
        error:
          error instanceof Error
            ? error
            : new Error('Failed to update collaborator permission')
      };
    }
  }

  /**
   * Get all collaborators for a form
   * @param formId Form ID
   * @returns List of collaborators with user details
   */
  static async getFormCollaborators(
    formId: string
  ): Promise<{ data: FormCollaborator[] | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('form_collaborators')
        .select(
          `
          id,
          form_id,
          user_id,
          permission_level,
          assigned_by,
          created_at,
          updated_at,
          user:profiles!form_collaborators_user_id_fkey(
            id,
            full_name,
            email,
            avatar_url,
            phone_number
          )
        `
        )
        .eq('form_id', formId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform data: Supabase returns user as array, we need single object
      const transformedData: FormCollaborator[] = (data || []).map(
        (item: any) => ({
          ...item,
          user:
            Array.isArray(item.user) && item.user.length > 0
              ? item.user[0]
              : item.user
        })
      );

      return { data: transformedData, error: null };
    } catch (error) {
      await ErrorHandler.handleError(error, 'getFormCollaborators');
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to fetch form collaborators')
      };
    }
  }

  /**
   * Get user's permission level for a form
   * @param formId Form ID
   * @param userId User ID
   * @returns Permission level or null if no access
   */
  static async getUserPermission(
    formId: string,
    userId: string
  ): Promise<FormPermissionLevel | null> {
    try {
      const { data } = await this.supabase
        .from('form_collaborators')
        .select('permission_level')
        .eq('form_id', formId)
        .eq('user_id', userId)
        .maybeSingle();

      return data?.permission_level as FormPermissionLevel | null;
    } catch (error) {
      console.error('Error getting user permission:', error);
      return null;
    }
  }

  /**
   * Check if user has access to form
   * @param formId Form ID
   * @param userId User ID
   * @returns Boolean indicating if user has access
   */
  static async hasFormAccess(formId: string, userId: string): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('form_collaborators')
        .select('id')
        .eq('form_id', formId)
        .eq('user_id', userId)
        .maybeSingle();

      return !!data;
    } catch (error) {
      console.error('Error checking form access:', error);
      return false;
    }
  }

  /**
   * Check if user can edit form
   * @param formId Form ID
   * @param userId User ID
   * @returns Boolean indicating if user can edit
   */
  static async canEditForm(formId: string, userId: string): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('form_collaborators')
        .select('permission_level')
        .eq('form_id', formId)
        .eq('user_id', userId)
        .maybeSingle();

      return (
        data?.permission_level === 'edit' ||
        data?.permission_level === 'manage_responses'
      );
    } catch (error) {
      console.error('Error checking edit permission:', error);
      return false;
    }
  }

  /**
   * Check if user can manage responses
   * @param formId Form ID
   * @param userId User ID
   * @returns Boolean indicating if user can manage responses
   */
  static async canManageResponses(
    formId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('form_collaborators')
        .select('permission_level')
        .eq('form_id', formId)
        .eq('user_id', userId)
        .maybeSingle();

      return data?.permission_level === 'manage_responses';
    } catch (error) {
      console.error('Error checking manage responses permission:', error);
      return false;
    }
  }

  /**
   * Get all forms where user is a collaborator
   * @param userId User ID
   * @returns List of form IDs
   */
  static async getUserCollaboratedForms(
    userId: string
  ): Promise<{ data: string[] | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('form_collaborators')
        .select('form_id')
        .eq('user_id', userId);

      if (error) throw error;

      const formIds = data?.map((item) => item.form_id) || [];
      return { data: formIds, error: null };
    } catch (error) {
      await ErrorHandler.handleError(error, 'getUserCollaboratedForms');
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to fetch collaborated forms')
      };
    }
  }

  /**
   * Bulk assign collaborators to a form
   * @param formId Form ID
   * @param collaborators Array of user IDs with permissions
   * @returns Void
   */
  static async bulkAssignCollaborators(
    formId: string,
    collaborators: Array<{
      user_id: string;
      permission_level: FormPermissionLevel;
    }>
  ): Promise<{ error: Error | null }> {
    try {
      const {
        data: { user }
      } = await this.supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const insertData = collaborators.map((collab) => ({
        form_id: formId,
        user_id: collab.user_id,
        permission_level: collab.permission_level,
        assigned_by: user.id
      }));

      const { error } = await this.supabase
        .from('form_collaborators')
        .insert(insertData);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      await ErrorHandler.handleError(error, 'bulkAssignCollaborators');
      return {
        error:
          error instanceof Error
            ? error
            : new Error('Failed to bulk assign collaborators')
      };
    }
  }
}
