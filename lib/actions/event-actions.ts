'use server';

import {
  createAdminClient,
  bulkUpdateEventStatuses
} from '@/lib/supabase/server-compat';

/**
 * Updates all event statuses based on current time
 * This is a server action that can be called from the client
 * It uses the admin client with service role permissions to bypass RLS
 */
export async function updateEventStatuses() {
  try {
    // Create admin client to bypass RLS
    const supabase = createAdminClient();

    // Get current date/time
    const now = new Date().toISOString();

    // Find events that should be ongoing (started but not ended)
    const { data: ongoingEvents, error: ongoingError } = await supabase
      .from('events')
      .select('id')
      .lt('start_time', now)
      .gt('end_time', now)
      .neq('status', 'ongoing');

    if (ongoingError) {
      console.error('Error finding ongoing events:', ongoingError);
      throw ongoingError;
    }

    // Find events that should be completed (ended)
    const { data: completedEvents, error: completedError } = await supabase
      .from('events')
      .select('id')
      .lt('end_time', now)
      .neq('status', 'completed');

    if (completedError) {
      console.error('Error finding completed events:', completedError);
      throw completedError;
    }

    // Prepare event ID arrays for bulk updates
    const ongoingEventIds = ongoingEvents?.map((e) => e.id) || [];
    const completedEventIds = completedEvents?.map((e) => e.id) || [];

    // Use bulk update utilities
    const ongoingUpdates =
      ongoingEventIds.length > 0
        ? await bulkUpdateEventStatuses(ongoingEventIds, 'ongoing')
        : [];

    const completedUpdates =
      completedEventIds.length > 0
        ? await bulkUpdateEventStatuses(completedEventIds, 'completed')
        : [];

    return {
      success: true,
      ongoingUpdated: ongoingUpdates.length,
      completedUpdated: completedUpdates.length,
      total: ongoingUpdates.length + completedUpdates.length
    };
  } catch (error) {
    console.error('Error in updateEventStatuses server action:', error);
    return {
      success: false,
      error: 'Failed to update event statuses'
    };
  }
}

/**
 * Updates a specific event status
 * This is a server action that can be called from the client
 */
export async function updateEventStatus(
  eventId: string,
  status: 'upcoming' | 'ongoing' | 'completed'
) {
  try {
    // Use the updateEventStatus helper from server-compat.ts
    await import('@/lib/supabase/server-compat').then((admin) =>
      admin.updateEventStatus(eventId, status)
    );

    return {
      success: true,
      updated: true
    };
  } catch (error) {
    console.error(
      `Error updating event ${eventId} status to ${status}:`,
      error
    );
    return {
      success: false,
      error: `Failed to update event status to ${status}`
    };
  }
}
