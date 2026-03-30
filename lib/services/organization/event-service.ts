import { createClientSupabaseClient } from '@/lib/supabase/client';
import {
  createAdminClient,
  updateEventStatus as adminUpdateEventStatus,
  withAdminClient
} from '@/lib/supabase/server-compat';
import type { Event, EventFilters } from '@/types/organizations';
import { toast } from 'react-hot-toast';
import { UserRole } from '@/lib/constants/roles';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export class EventService {
  private static supabase = createClientSupabaseClient();

  // Helper method to get admin client (works in both client and server)
  private static getAdminClient() {
    try {
      return createAdminClient();
    } catch (error) {
      // Fallback to client-side with warning
      console.warn(
        "Couldn't use admin client, operations requiring elevated permissions may fail"
      );
      return this.supabase;
    }
  }

  // Helper method to transform event data from DB to Event type
  private static transformEvent(event: any): Event {
    return {
      ...event,
      description: event.description ?? undefined,
      department_id: event.department_id ?? undefined,
      coordinator_id: event.coordinator_id ?? undefined,
      is_active: event.is_active ?? true,
      has_registration_form: event.has_registration_form ?? false,
      place: event.place
        ? {
            ...event.place,
            description: event.place.description ?? undefined,
            capacity: event.place.capacity ?? undefined,
            location: event.place.location ?? undefined,
            is_active: event.place.is_active ?? true,
            created_by: event.place.created_by ?? undefined
          }
        : undefined,
      institution: event.institution
        ? {
            ...event.institution,
            coordinator_id: event.institution.coordinator_id ?? undefined,
            is_active: event.institution.is_active ?? true
          }
        : undefined,
      department: event.department
        ? {
            ...event.department,
            institution_id: event.department.institution_id!,
            is_active: event.department.is_active ?? true
          }
        : undefined,
      coordinator: event.coordinator ?? undefined
    } as Event;
  }

  static async createEvent(
    data: Omit<
      Event,
      'id' | 'created_at' | 'updated_at' | 'created_by' | 'coordinator_id'
    >
  ): Promise<Event> {
    try {
      const {
        data: { user }
      } = await this.supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      // Check if the institution has a designated coordinator
      let coordinatorId = user.id; // Default to the event creator

      if (data.institution_id) {
        const { data: institutionData, error: institutionError } =
          await this.supabase
            .from('institutions')
            .select('coordinator_id')
            .eq('id', data.institution_id)
            .maybeSingle();

        if (!institutionError && institutionData?.coordinator_id) {
          // If institution has a coordinator, use that coordinator
          coordinatorId = institutionData.coordinator_id;
        }
      }

      const { data: newEvents, error } = await this.supabase
        .from('events')
        .insert([
          {
            ...data,
            created_by: user.id,
            coordinator_id: coordinatorId
          }
        ])
        .select(
          `
          *,
          place:places(*),
          institution:institutions(*),
          department:departments(*)
        `
        );

      console.log('Creating event with data:', {
        department_id: data.department_id,
        institution_id: data.institution_id,
        full_data: {
          ...data,
          created_by: user.id,
          coordinator_id: coordinatorId
        }
      });

      if (error) throw error;

      if (!newEvents || newEvents.length === 0) {
        throw new Error('Failed to create event, no data returned');
      }

      return this.transformEvent(newEvents[0]);
    } catch (error) {
      console.error('Error creating event:', error);
      if (error instanceof Error && error.message.includes('already booked')) {
        toast.error(
          'This place is already booked for the selected time period'
        );
      }
      throw error;
    }
  }

  static async getEvents(
    filters: EventFilters = {}
  ): Promise<{ data: Event[]; total: number }> {
    try {
      let query = this.supabase.from('events').select(
        `
          *,
          place:places(*),
          institution:institutions(*),
          department:departments(*)
        `,
        { count: 'exact' }
      );

      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      if (filters.institution_id) {
        query = query.eq('institution_id', filters.institution_id);
      }

      if (filters.department_id) {
        query = query.eq('department_id', filters.department_id);
      }

      if (filters.place_id) {
        query = query.eq('place_id', filters.place_id);
      }

      // Filter by coordinator_id if provided
      if (filters.coordinator_id) {
        query = query.eq('coordinator_id', filters.coordinator_id);
      }

      if (filters.start_date) {
        query = query.gte('start_time', filters.start_date);
      }

      if (filters.end_date) {
        query = query.lte('end_time', filters.end_date);
      }

      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      // Add status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Pagination
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      query = query.range(from, to).order('start_time', { ascending: true });

      const { data, error, count } = await query;

      if (error) throw error;

      // Transform and update status for each event based on current date
      if (data && data.length > 0) {
        const updatedEvents = await Promise.all(
          data.map(async (event) => {
            const currentStatus = this.getEventStatus(
              event.start_time,
              event.end_time
            );

            // If status needs to be updated
            if (currentStatus !== event.status) {
              try {
                // Try to update the event status with admin client
                const updated = await withAdminClient(
                  async (client: SupabaseClient<Database>) => {
                    const { data, error } = await client
                      .from('events')
                      .update({ status: currentStatus })
                      .eq('id', event.id)
                      .select('*')
                      .single();

                    if (error) throw error;
                    return data;
                  },
                  this.supabase // Fallback to regular client
                ).catch(() => null);

                if (updated) {
                  return this.transformEvent({ ...event, ...updated });
                }
              } catch (updateError) {
                console.error(
                  `Error updating event status for event ${event.id}:`,
                  updateError
                );
              }
            }

            // If update fails or isn't needed, return event with calculated status
            return this.transformEvent({ ...event, status: currentStatus });
          })
        );

        return {
          data: updatedEvents,
          total: count || 0
        };
      }

      return {
        data: data?.map((e) => this.transformEvent(e)) || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  }

  static async checkPlaceAvailability(
    placeId: string,
    startTime: string,
    endTime: string,
    excludeEventId?: string
  ): Promise<boolean> {
    try {
      let query = this.supabase
        .from('events')
        .select('id')
        .eq('place_id', placeId)
        .lt('start_time', endTime)
        .gt('end_time', startTime);

      if (excludeEventId) {
        query = query.neq('id', excludeEventId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.length === 0;
    } catch (error) {
      console.error('Error checking place availability:', error);
      return false;
    }
  }

  static getEventStatus(
    startDate: string,
    endDate: string
  ): 'upcoming' | 'ongoing' | 'completed' {
    const now = new Date();
    const eventStart = new Date(startDate);
    const eventEnd = new Date(endDate);

    // Compare with full date-time values, not just dates
    // This ensures accurate status calculation based on exact times
    if (now < eventStart) {
      return 'upcoming';
    } else if (now > eventEnd) {
      return 'completed';
    } else {
      return 'ongoing';
    }
  }

  static async getEvent(id: string): Promise<Event> {
    try {
      const { data: events, error } = await this.supabase
        .from('events')
        .select(
          `
          *,
          place:places(*),
          institution:institutions(*),
          department:departments(*),
          coordinator:profiles(id, full_name, email)
        `
        )
        .eq('id', id);

      if (error) throw error;

      // Handle case when no event is found
      if (!events || events.length === 0) {
        throw new Error(`Event with ID ${id} not found`);
      }

      const event = events[0];

      // Update status based on start and end dates
      const status = this.getEventStatus(event.start_time, event.end_time);
      if (status !== event.status) {
        try {
          // Try to update the event status using admin client helpers
          const updated = await adminUpdateEventStatus(
            id,
            status,
            this.supabase
          ).catch(() => null);

          if (updated) {
            // Merge updated data with previously fetched relations
            return this.transformEvent({
              ...updated,
              place: event.place,
              institution: event.institution,
              department: event.department,
              coordinator: event.coordinator
            });
          }
        } catch (updateError) {
          console.error(
            `Error updating event status for event ${id}:`,
            updateError
          );
        }
      }

      // If update fails or isn't needed, return event with calculated status if different
      return this.transformEvent(
        status !== event.status ? { ...event, status } : event
      );
    } catch (error) {
      console.error('Error fetching event:', error);
      throw error;
    }
  }

  static async updateEvent(
    eventId: string,
    data: Partial<Event>
  ): Promise<Event> {
    try {
      // Get current user info
      const {
        data: { user }
      } = await this.supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      // Check if institution_id is being updated
      if (data.institution_id) {
        // Get current event to compare
        const { data: currentEvent, error: eventError } = await this.supabase
          .from('events')
          .select('institution_id, created_by, coordinator_id')
          .eq('id', eventId)
          .maybeSingle();

        if (eventError) throw eventError;

        // Skip coordinator update if event not found
        if (!currentEvent) {
          throw new Error(`Event with ID ${eventId} not found`);
        }

        // Log the event data before update
        console.log('Updating event with data:', {
          current_event: currentEvent,
          update_data: data,
          department_id: data.department_id
        });

        // Only update coordinator if institution changed
        if (currentEvent.institution_id !== data.institution_id) {
          // Check if new institution has a coordinator
          const { data: institutionData, error: institutionError } =
            await this.supabase
              .from('institutions')
              .select('coordinator_id')
              .eq('id', data.institution_id)
              .maybeSingle();

          if (!institutionError && institutionData?.coordinator_id) {
            // Use institution's coordinator
            data.coordinator_id = institutionData.coordinator_id ?? undefined;
          } else {
            // Use event creator as fallback
            data.coordinator_id = currentEvent.created_by ?? undefined;
          }
        }
      }

      // Check user's permission to update the event
      const { data: userProfile } = await this.supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin =
        userProfile?.role === UserRole.SUPER_ADMIN ||
        userProfile?.role === UserRole.ADMINISTRATOR;

      // Determine if we need to use admin client
      let needsAdminClient = false;

      // Status updates or admin users should use admin client
      if (data.status !== undefined || isAdmin) {
        needsAdminClient = true;
      } else {
        // Get the event to check if current user is creator or coordinator
        const { data: eventData } = await this.supabase
          .from('events')
          .select('created_by, coordinator_id')
          .eq('id', eventId)
          .maybeSingle();

        // If user is neither creator nor coordinator, use admin client
        if (
          eventData &&
          eventData.created_by !== user.id &&
          eventData.coordinator_id !== user.id
        ) {
          needsAdminClient = true;
        }
      }

      // Now perform the update with the appropriate client approach
      if (needsAdminClient) {
        // Use admin client with withAdminClient helper
        return await withAdminClient(
          async (client: SupabaseClient<Database>) => {
            const { data: updatedEvents, error } = await client
              .from('events')
              .update(data)
              .eq('id', eventId)
              .select('*');

            if (error) throw error;

            // No need to throw error if no rows returned
            if (!updatedEvents || updatedEvents.length === 0) {
              // Check if the event exists
              const { data: existingEvent, error: checkError } = await client
                .from('events')
                .select('id')
                .eq('id', eventId)
                .single();

              if (checkError) {
                throw new Error(`Event with ID ${eventId} not found`);
              }

              // Event exists but no update occurred - fetch current state
              const { data: currentState, error: fetchError } = await client
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

              if (fetchError) throw fetchError;
              return this.transformEvent(currentState);
            }

            return this.transformEvent(updatedEvents[0]);
          },
          this.supabase
        );
      } else {
        // Use regular client
        const { data: updatedEvents, error } = await this.supabase
          .from('events')
          .update(data)
          .eq('id', eventId)
          .select('*');

        if (error) throw error;

        if (!updatedEvents || updatedEvents.length === 0) {
          // Check if the event exists
          const { data: existingEvent, error: checkError } = await this.supabase
            .from('events')
            .select('id')
            .eq('id', eventId)
            .single();

          if (checkError) {
            throw new Error(`Event with ID ${eventId} not found`);
          }

          // Event exists but no update occurred - fetch current state
          const { data: currentState, error: fetchError } = await this.supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

          if (fetchError) throw fetchError;
          return this.transformEvent(currentState);
        }

        return this.transformEvent(updatedEvents[0]);
      }
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  static async deleteEvent(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }
}
