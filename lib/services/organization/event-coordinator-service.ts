// lib/services/organization/event-coordinator-service.ts
import { getSupabaseClient } from '@/lib/supabase/client';
import { ErrorHandler } from '@/lib/utils/error-handler';

export interface EventCoordinator {
  id: string;
  event_id: string;
  user_id: string;
  role: 'owner' | 'coordinator';
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

export interface AssignCoordinatorDto {
  event_id: string;
  user_id: string;
  role?: 'coordinator';
}

export class EventCoordinatorService {
  private static supabase = getSupabaseClient();

  /**
   * Assign a coordinator to an event
   * @param data Assignment data
   * @returns Void
   */
  static async assignCoordinator(
    data: AssignCoordinatorDto
  ): Promise<{ error: Error | null }> {
    try {
      const {
        data: { user }
      } = await this.supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await this.supabase.from('event_coordinators').insert({
        event_id: data.event_id,
        user_id: data.user_id,
        role: data.role || 'coordinator',
        assigned_by: user.id
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      await ErrorHandler.handleError(error, 'assignCoordinator');
      return {
        error:
          error instanceof Error
            ? error
            : new Error('Failed to assign coordinator')
      };
    }
  }

  /**
   * Remove a coordinator from an event
   * Note: Cannot remove owner
   * @param eventId Event ID
   * @param userId User ID to remove
   * @returns Void
   */
  static async removeCoordinator(
    eventId: string,
    userId: string
  ): Promise<{ error: Error | null }> {
    try {
      // Check if trying to remove owner
      const { data: existingCoord } = await this.supabase
        .from('event_coordinators')
        .select('role')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single();

      if (existingCoord?.role === 'owner') {
        throw new Error('Cannot remove event owner');
      }

      const { error } = await this.supabase
        .from('event_coordinators')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      await ErrorHandler.handleError(error, 'removeCoordinator');
      return {
        error:
          error instanceof Error
            ? error
            : new Error('Failed to remove coordinator')
      };
    }
  }

  /**
   * Update coordinator role
   * Note: Cannot change owner role
   * Note: This method is kept for backward compatibility but role changes are no longer supported in the UI
   * @param eventId Event ID
   * @param userId User ID
   * @param newRole New role
   * @returns Void
   */
  static async updateCoordinatorRole(
    eventId: string,
    userId: string,
    newRole: 'coordinator'
  ): Promise<{ error: Error | null }> {
    try {
      // Check if trying to modify owner
      const { data: existingCoord } = await this.supabase
        .from('event_coordinators')
        .select('role')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single();

      if (existingCoord?.role === 'owner') {
        throw new Error('Cannot modify owner role');
      }

      const { error } = await this.supabase
        .from('event_coordinators')
        .update({ role: newRole })
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      await ErrorHandler.handleError(error, 'updateCoordinatorRole');
      return {
        error:
          error instanceof Error
            ? error
            : new Error('Failed to update coordinator role')
      };
    }
  }

  /**
   * Get all coordinators for an event
   * @param eventId Event ID
   * @returns List of coordinators with user details
   */
  static async getEventCoordinators(
    eventId: string
  ): Promise<{ data: EventCoordinator[] | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('event_coordinators')
        .select(
          `
          id,
          event_id,
          user_id,
          role,
          assigned_by,
          created_at,
          updated_at,
          user:profiles!event_coordinators_user_id_fkey(
            id,
            full_name,
            email,
            avatar_url,
            phone_number
          )
        `
        )
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform data: Supabase returns user as array, we need single object
      const transformedData: EventCoordinator[] = (data || []).map(
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
      await ErrorHandler.handleError(error, 'getEventCoordinators');
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to fetch event coordinators')
      };
    }
  }

  /**
   * Check if user is event owner
   * @param eventId Event ID
   * @param userId User ID
   * @returns Boolean indicating if user is owner
   */
  static async isEventOwner(eventId: string, userId: string): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('event_coordinators')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('role', 'owner')
        .maybeSingle();

      return !!data;
    } catch (error) {
      console.error('Error checking event owner:', error);
      return false;
    }
  }

  /**
   * Check if user has any access to event
   * @param eventId Event ID
   * @param userId User ID
   * @returns Boolean indicating if user has access
   */
  static async hasEventAccess(
    eventId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('event_coordinators')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();

      return !!data;
    } catch (error) {
      console.error('Error checking event access:', error);
      return false;
    }
  }

  /**
   * Get user's role for an event
   * @param eventId Event ID
   * @param userId User ID
   * @returns Role or null if no access
   */
  static async getUserEventRole(
    eventId: string,
    userId: string
  ): Promise<'owner' | 'coordinator' | null> {
    try {
      const { data } = await this.supabase
        .from('event_coordinators')
        .select('role')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();

      return data?.role as 'owner' | 'coordinator' | null;
    } catch (error) {
      console.error('Error getting user event role:', error);
      return null;
    }
  }

  /**
   * Get all events where user is a coordinator
   * @param userId User ID
   * @returns List of event IDs
   */
  static async getUserCoordinatedEvents(
    userId: string
  ): Promise<{ data: string[] | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('event_coordinators')
        .select('event_id')
        .eq('user_id', userId);

      if (error) throw error;

      const eventIds = data?.map((item) => item.event_id) || [];
      return { data: eventIds, error: null };
    } catch (error) {
      await ErrorHandler.handleError(error, 'getUserCoordinatedEvents');
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to fetch coordinated events')
      };
    }
  }

  /**
   * Get events owned by user
   * @param userId User ID
   * @returns List of event IDs
   */
  static async getUserOwnedEvents(
    userId: string
  ): Promise<{ data: string[] | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('event_coordinators')
        .select('event_id')
        .eq('user_id', userId)
        .eq('role', 'owner');

      if (error) throw error;

      const eventIds = data?.map((item) => item.event_id) || [];
      return { data: eventIds, error: null };
    } catch (error) {
      await ErrorHandler.handleError(error, 'getUserOwnedEvents');
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to fetch owned events')
      };
    }
  }
}
