import { NextResponse } from 'next/server';
import {
  createAdminClient,
  bulkUpdateEventStatuses
} from '@/lib/supabase/server-compat';

/**
 * Updates event statuses based on start and end times
 * This endpoint can be called by a scheduled job or manually to ensure event statuses are up-to-date
 */
export async function POST(request: Request) {
  try {
    // Get admin client
    const supabase = createAdminClient();

    // Fetch events that need status updates
    const now = new Date().toISOString();

    // Get upcoming events that should now be ongoing
    const { data: shouldBeOngoing, error: ongoingError } = await supabase
      .from('events')
      .select('id, start_time, end_time, status')
      .lt('start_time', now)
      .gt('end_time', now)
      .neq('status', 'ongoing');

    if (ongoingError) throw ongoingError;

    // Get events that should now be completed
    const { data: shouldBeCompleted, error: completedError } = await supabase
      .from('events')
      .select('id, start_time, end_time, status')
      .lt('end_time', now)
      .neq('status', 'completed');

    if (completedError) throw completedError;

    // Prepare the event IDs for bulk updates
    const ongoingIds = shouldBeOngoing ? shouldBeOngoing.map((e) => e.id) : [];
    const completedIds = shouldBeCompleted
      ? shouldBeCompleted.map((e) => e.id)
      : [];

    // Perform bulk updates
    const results = [];

    if (ongoingIds.length > 0) {
      const ongoingResults = await bulkUpdateEventStatuses(
        ongoingIds,
        'ongoing'
      );
      results.push(
        ...ongoingResults.map((event) => ({
          id: event.id,
          status: 'ongoing',
          success: true
        }))
      );
    }

    if (completedIds.length > 0) {
      const completedResults = await bulkUpdateEventStatuses(
        completedIds,
        'completed'
      );
      results.push(
        ...completedResults.map((event) => ({
          id: event.id,
          status: 'completed',
          success: true
        }))
      );
    }

    // Return the update results
    return NextResponse.json({
      success: true,
      updated: results.length,
      details: results
    });
  } catch (error) {
    console.error('Error updating event statuses:', error);
    return NextResponse.json(
      { error: 'Failed to update event statuses' },
      { status: 500 }
    );
  }
}
