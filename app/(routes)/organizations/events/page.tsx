'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Calendar as CalendarIcon, List, RefreshCw } from 'lucide-react';
import { ContentLayout } from '@/components/layout/content-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { BeatLoader } from 'react-spinners';
import { EventList } from './_components/event-list';
import { EventFilters } from './_components/event-filters';
import { EventService } from '@/lib/services/organization/event-service';
import { EventCoordinatorService } from '@/lib/services/organization/event-coordinator-service';
import { OrganizationService } from '@/lib/services/organization/organization-service';
import { PlaceService } from '@/lib/services/organization/place-service';
import { UserService } from '@/lib/services/users/user-service';
import type {
  Event,
  EventFilters as EventFilterType
} from '@/types/organizations';
import { UserRole } from '@/lib/constants/roles';
import { toast } from 'react-hot-toast';
import { EventCalendar } from './_components/event-calendar';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import React from 'react';
import { updateEventStatuses } from '@/lib/actions/event-actions';

// Extend the EventFilters type to include our additional properties
type ExtendedEventFilters = EventFilterType & {
  department_ids?: string[];
  created_by?: string;
  pageSize?: number;
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState({
    institutions: [] as { id: string; name: string }[],
    places: [] as { id: string; name: string }[]
  });
  const [filters, setFilters] = useState<ExtendedEventFilters>({
    page: 1,
    limit: 10,
    pageSize: 10
  });
  const [total, setTotal] = useState(0);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [coordinatorInstitution, setCoordinatorInstitution] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isEventCoordinator, setIsEventCoordinator] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [eventAccessFilter, setEventAccessFilter] = useState<
    'all' | 'owned' | 'coordinating'
  >('all');
  const router = useRouter();
  const initialized = React.useRef(false);

  // Memoize filters to a string to stabilize fetchData's dependency
  const filtersString = useMemo(() => JSON.stringify(filters), [filters]);

  // Setup user authentication and permissions first
  useEffect(() => {
    async function initializeAuth() {
      try {
        setAuthLoading(true);
        const supabase = createClientSupabaseClient();

        // Get current user
        const { data: userProfile } = await supabase.auth.getUser();
        if (!userProfile?.user?.id) {
          setError('User not authenticated');
          setAuthLoading(false);
          return false;
        }

        // Get current user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userProfile.user.id)
          .single();

        if (!profile) {
          setError('User profile not found');
          setAuthLoading(false);
          return false;
        }

        setCurrentUserRole(profile.role as UserRole);
        setUserId(userProfile.user.id);

        const newFilters: ExtendedEventFilters = {
          page: 1,
          limit: 10,
          pageSize: 10
        };

        // Check user role and set appropriate filters
        if (
          profile.role === UserRole.SUPER_ADMIN ||
          profile.role === UserRole.ADMINISTRATOR
        ) {
          // Super admins and administrators can see all events - no specific filters
          console.log('Admin user, showing all events');
        }
        // Check if user is an institution coordinator
        else if (profile.role === UserRole.INSTITUTION_COORDINATOR) {
          const { data: coordinatorData } = await supabase
            .from('institution_coordinators')
            .select('institution_id')
            .eq('user_id', userProfile.user.id)
            .maybeSingle();

          if (coordinatorData?.institution_id) {
            // Get institution details
            const { data: institution } = await supabase
              .from('institutions')
              .select('id, name')
              .eq('id', coordinatorData.institution_id)
              .single();

            if (institution) {
              console.log(
                'Institution coordinator, showing events for:',
                institution.name
              );
              newFilters.institution_id = institution.id;
              setCoordinatorInstitution(institution);
            }
          }
        }
        // Check if user is an event coordinator - use new event_coordinators table
        else if (profile.role === UserRole.EVENT_COORDINATOR) {
          // Check if user has any event coordinator records in event_coordinators table
          const { data: coordinatedEvents } =
            await EventCoordinatorService.getUserCoordinatedEvents(
              userProfile.user.id
            );

          if (coordinatedEvents && coordinatedEvents.length > 0) {
            console.log(
              'Event coordinator with access to events:',
              coordinatedEvents
            );
            setIsEventCoordinator(true);
            // Don't set a specific filter - we'll handle this in fetchData
          } else {
            // If not a coordinator, only show events created by the user
            console.log('Regular user, showing only created events');
            newFilters.created_by = userProfile.user.id;
          }
        } else {
          // Regular users can only see events they created
          console.log('Regular user, showing only created events');
          newFilters.created_by = userProfile.user.id;
        }

        // Update filters without triggering re-renders yet
        setFilters(newFilters);

        // Auth process complete
        setAuthLoading(false);
        return true;
      } catch (error) {
        console.error('Error initializing auth:', error);
        setError('Authentication failed. Please try again.');
        setAuthLoading(false);
        return false;
      }
    }

    if (!initialized.current) {
      initializeAuth();
      initialized.current = true;
    }
  }, []);

  // Fetch filter options separately from data
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        // Fetch institutions and places for filters in parallel
        const [institutionsData, placesData] = await Promise.all([
          OrganizationService.getInstitutionNames(true),
          PlaceService.getPlaces({})
        ]);

        setFilterOptions({
          institutions: institutionsData,
          places: placesData.data.map(({ id, name }) => ({ id, name }))
        });
      } catch (error) {
        console.error('Error loading filter options:', error);
        // Not setting error state here as it's not critical
      }
    }

    loadFilterOptions();
  }, []);

  // Update event statuses in the background
  useEffect(() => {
    async function updateStatuses() {
      try {
        const result = await updateEventStatuses();
        console.log('Background event status update:', result);
      } catch (error) {
        console.error('Background status update failed:', error);
      }
    }

    // Only run after authentication is complete
    if (!authLoading && currentUserRole) {
      updateStatuses();
    }
  }, [authLoading, currentUserRole]);

  // Main data fetching function
  const fetchData = useCallback(async () => {
    if (authLoading || !userId) return;

    try {
      setLoading(true);
      setError(null);

      // Use the filters state directly, not filtersString for the actual query
      const currentFilters: ExtendedEventFilters = { ...filters };

      // For event coordinators, filter by accessible events from event_coordinators table
      if (isEventCoordinator) {
        // Get events user has access to
        const { data: accessibleEventIds } = await (eventAccessFilter ===
        'owned'
          ? EventCoordinatorService.getUserOwnedEvents(userId)
          : eventAccessFilter === 'coordinating'
            ? (async () => {
                const { data: allEvents } =
                  await EventCoordinatorService.getUserCoordinatedEvents(
                    userId
                  );
                const { data: ownedEvents } =
                  await EventCoordinatorService.getUserOwnedEvents(userId);
                // Filter out owned events to get only coordinating events
                const ownedSet = new Set(ownedEvents || []);
                return {
                  data: allEvents?.filter((id) => !ownedSet.has(id)) || []
                };
              })()
            : EventCoordinatorService.getUserCoordinatedEvents(userId));

        if (!accessibleEventIds || accessibleEventIds.length === 0) {
          // No accessible events
          setEvents([]);
          setTotal(0);
        } else {
          // Fetch all accessible events
          let allEvents: Event[] = [];

          // Fetch events in batches to avoid too many individual requests
          const batchSize = 50;
          for (let i = 0; i < accessibleEventIds.length; i += batchSize) {
            const batchIds = accessibleEventIds.slice(i, i + batchSize);

            const supabase = createClientSupabaseClient();
            const { data: batchEvents, error: batchError } = await supabase
              .from('events')
              .select(
                `
                *,
                place:places(*),
                institution:institutions(*),
                department:departments(*),
                coordinator:profiles!events_coordinator_id_fkey(id, full_name, email)
              `
              )
              .in('id', batchIds)
              .order('start_time', { ascending: false });

            if (batchError) throw batchError;

            allEvents = [...allEvents, ...(batchEvents || [])] as Event[];
          }

          // Apply additional filters
          let filteredEvents = allEvents;

          if (currentFilters.search) {
            const searchLower = currentFilters.search.toLowerCase();
            filteredEvents = filteredEvents.filter(
              (e) =>
                e.title?.toLowerCase().includes(searchLower) ||
                e.description?.toLowerCase().includes(searchLower)
            );
          }

          if (currentFilters.status) {
            filteredEvents = filteredEvents.filter(
              (e) => e.status === currentFilters.status
            );
          }

          if (currentFilters.institution_id) {
            filteredEvents = filteredEvents.filter(
              (e) => e.institution_id === currentFilters.institution_id
            );
          }

          if (currentFilters.department_id) {
            filteredEvents = filteredEvents.filter(
              (e) => e.department_id === currentFilters.department_id
            );
          }

          if (currentFilters.place_id) {
            filteredEvents = filteredEvents.filter(
              (e) => e.place_id === currentFilters.place_id
            );
          }

          if (currentFilters.start_date) {
            filteredEvents = filteredEvents.filter(
              (e) =>
                new Date(e.start_time) >= new Date(currentFilters.start_date!)
            );
          }

          if (currentFilters.end_date) {
            filteredEvents = filteredEvents.filter(
              (e) => new Date(e.end_time) <= new Date(currentFilters.end_date!)
            );
          }

          // Apply pagination
          const page = currentFilters.page || 1;
          const limit = currentFilters.limit || 10;
          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;

          setTotal(filteredEvents.length);
          setEvents(filteredEvents.slice(startIndex, endIndex));
        }
      } else {
        // For admins and institution coordinators, use standard filtering
        const { data: eventsData, total: totalCount } =
          await EventService.getEvents(currentFilters);
        setEvents(eventsData);
        setTotal(totalCount);
      }
    } catch (error) {
      console.error('Error fetching events data:', error);
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [authLoading, userId, isEventCoordinator, eventAccessFilter, filters]);

  // Fetch data when filters change (via filtersString) or auth completes
  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, fetchData]);

  const handleFilterChange = useCallback(
    (newFilters: Partial<ExtendedEventFilters>) => {
      // Skip during authentication
      if (authLoading) return;

      // For institution coordinators, always keep their institution filter
      if (
        coordinatorInstitution &&
        'institution_id' in newFilters &&
        newFilters.institution_id !== coordinatorInstitution.id &&
        newFilters.institution_id !== undefined
      ) {
        // Don't allow changing the institution filter
        toast.error('You can only view events for your institution');
        return;
      }

      setFilters((prev: ExtendedEventFilters) => {
        // Always ensure institution coordinators can only see their institution's events
        const updatedFilters: ExtendedEventFilters = {
          ...prev,
          ...newFilters,
          page: newFilters.page || 1
        };

        // Force institution filter for institution coordinators
        if (coordinatorInstitution) {
          updatedFilters.institution_id = coordinatorInstitution.id;
        }

        return updatedFilters;
      });
    },
    [coordinatorInstitution, authLoading]
  );

  const handleEventSelect = useCallback(
    (event: Event) => {
      // Navigate to event details page
      router.push(`/organizations/events/${event.id}`);
    },
    [router]
  );

  const handleRangeChange = useCallback((start: Date, end: Date) => {
    setCurrentDate(start);
    setFilters((prev) => ({
      ...prev,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      page: 1,
      limit: 100
    }));
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      limit: pageSize,
      pageSize
    }));
  }, []);

  const handleViewChange = useCallback((newView: 'list' | 'calendar') => {
    setView(newView);
    setFilters((prev) => ({
      ...prev,
      page: 1,
      limit: newView === 'calendar' ? 100 : prev.pageSize || 10,
      pageSize: newView === 'calendar' ? 100 : prev.pageSize || 10
    }));
  }, []);

  const handleResetFilters = useCallback(() => {
    // For institution coordinators, keep the institution filter when resetting
    const resetFilters: ExtendedEventFilters = {
      page: 1,
      limit: view === 'calendar' ? 100 : 10,
      pageSize: view === 'calendar' ? 100 : 10
    };

    // Preserve institution filter if needed
    if (coordinatorInstitution?.id) {
      resetFilters.institution_id = coordinatorInstitution.id;
    }

    setFilters(resetFilters);
    setCurrentDate(new Date());
  }, [view, coordinatorInstitution]);

  // Check if user is authorized to view this page
  const isAuthorized =
    currentUserRole === UserRole.SUPER_ADMIN ||
    currentUserRole === UserRole.ADMINISTRATOR ||
    currentUserRole === UserRole.INSTITUTION_COORDINATOR ||
    currentUserRole === UserRole.EVENT_COORDINATOR;

  if (!isAuthorized && !authLoading) {
    return (
      <ContentLayout title='Events'>
        <div className='text-center py-8'>
          <p className='text-destructive'>
            You don&apos;t have permission to access this page.
          </p>
          <Button variant='outline' asChild className='mt-4'>
            <Link href='/'>Return to Dashboard</Link>
          </Button>
        </div>
      </ContentLayout>
    );
  }

  if (error) {
    return (
      <ContentLayout title='Events'>
        <div className='text-center py-8'>
          <p className='text-destructive'>{error}</p>
          <Button variant='outline' onClick={fetchData} className='mt-4'>
            Try Again
          </Button>
        </div>
      </ContentLayout>
    );
  }

  const title = coordinatorInstitution
    ? `${coordinatorInstitution.name} Events`
    : isEventCoordinator
      ? eventAccessFilter === 'owned'
        ? 'My Owned Events'
        : eventAccessFilter === 'coordinating'
          ? 'Events I Coordinate'
          : 'My Events'
      : 'Events';

  return (
    <ContentLayout title={title}>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href='/'>Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Events</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='space-y-6 mt-4 w- '>
        <div className='flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start'>
          <div>
            <h1 className='text-2xl font-bold py-1'>Events</h1>
            {coordinatorInstitution ? (
              <div>
                <p className='text-muted-foreground'>
                  Manage events for{' '}
                  <span className='font-semibold text-primary'>
                    {coordinatorInstitution.name}
                  </span>
                </p>
                <Badge variant='outline' className='mt-2'>
                  Institution Coordinator View
                </Badge>
              </div>
            ) : isEventCoordinator ? (
              <div>
                <p className='text-muted-foreground'>
                  {eventAccessFilter === 'owned'
                    ? 'Events you created and own - full control'
                    : eventAccessFilter === 'coordinating'
                      ? 'Events where you are assigned as coordinator'
                      : 'All events you have access to'}
                </p>
                <Badge variant='outline' className='mt-2 bg-primary/10'>
                  Event Coordinator View
                </Badge>
              </div>
            ) : (
              <p className='text-sm sm:text-base text-muted-foreground'>
                Manage your events and schedules
              </p>
            )}
          </div>
          <div className='flex flex-col sm:flex-row gap-2'>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={async () => {
                  try {
                    toast.loading('Updating event statuses...', {
                      id: 'status-update'
                    });
                    const result = await updateEventStatuses();
                    if (result.success) {
                      toast.success(`Updated ${result.total} event statuses`, {
                        id: 'status-update'
                      });
                      // Refresh data after status update
                      fetchData();
                    } else {
                      toast.error('Failed to update event statuses', {
                        id: 'status-update'
                      });
                    }
                  } catch (error) {
                    console.error('Error updating statuses:', error);
                    toast.error('Error updating statuses', {
                      id: 'status-update'
                    });
                  }
                }}
              >
                <RefreshCw className='mr-2 h-4 w-4' />
                Refresh
              </Button>
              <Button
                variant={view === 'list' ? 'default' : 'outline'}
                size='sm'
                onClick={() => handleViewChange('list')}
              >
                <List className='mr-2 h-4 w-4' />
                List
              </Button>
              <Button
                variant={view === 'calendar' ? 'default' : 'outline'}
                size='sm'
                onClick={() => handleViewChange('calendar')}
              >
                <CalendarIcon className='mr-2 h-4 w-4' />
                Calendar
              </Button>
            </div>
            <Button className='w-full sm:w-auto' asChild>
              <Link href='/organizations/events/new'>
                <Plus className='mr-2 h-4 w-4' />
                Add Event
              </Link>
            </Button>
          </div>
        </div>

        {/* Event Access Filter Tabs (for Event Coordinators) */}
        {isEventCoordinator && (
          <Tabs
            value={eventAccessFilter}
            onValueChange={(value: any) => setEventAccessFilter(value)}
          >
            <TabsList className='grid w-full max-w-md grid-cols-3'>
              <TabsTrigger value='all'>All Events</TabsTrigger>
              <TabsTrigger value='owned'>Owned</TabsTrigger>
              <TabsTrigger value='coordinating'>Coordinating</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <Card>
          <CardContent className='p-6'>
            <EventFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              institutions={filterOptions.institutions}
              places={filterOptions.places}
              onReset={handleResetFilters}
              disableInstitutionFilter={!!coordinatorInstitution}
            />

            {loading && !events.length ? (
              <div className='flex justify-center items-center p-8'>
                <BeatLoader color='#00e902' />
              </div>
            ) : (
              <div className='mt-6'>
                {view === 'list' ? (
                  <EventList
                    events={events}
                    loading={loading}
                    error={error}
                    total={total}
                    page={filters.page || 1}
                    pageSize={filters.pageSize || 10}
                    onPageChange={(page) => handleFilterChange({ page })}
                    onPageSizeChange={handlePageSizeChange}
                    onRefresh={fetchData}
                  />
                ) : (
                  <EventCalendar
                    events={events}
                    loading={loading}
                    error={error}
                    onEventSelect={handleEventSelect}
                    onRangeChange={handleRangeChange}
                    defaultDate={currentDate}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
