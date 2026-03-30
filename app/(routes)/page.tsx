'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ContentLayout } from '@/components/layout/content-layout';
import { BeatLoader } from 'react-spinners';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  LineChart,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  Users2,
  ShieldCheck,
  GraduationCap,
  UserCog,
  Calendar,
  FormInput,
  FileSpreadsheet,
  CreditCard,
  BadgeCheck,
  BadgeX,
  Clock,
  Building,
  MapPin,
  Users,
  ChevronRight,
  CalendarDays,
  Plus,
  Crown,
  Star
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import Breadcrumbs from '@/components/layout/breadcrumb';
import { format, subMonths, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatsCard } from '@/components/dashboard/stats-card';
import Link from 'next/link';
import { useDashboardStats } from '@/lib/hooks/use-dashboard-stats';

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884d8',
  '#82ca9d'
];

// Define complete Event interface to include all needed properties
interface DashboardEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  status: string;
  location?: string;
  forms_count?: number;
  registered_count?: number;
  coordinator_id?: string;
  created_by?: string;
  institution?: {
    id: string;
    name: string;
  };
  place?: {
    id: string;
    name: string;
  };
  department?: {
    id: string;
    name: string;
  };
  coordinator?: {
    id: string;
    full_name: string;
    email: string;
  };
}

const DashboardPage = () => {
  const [coordinatorInstitution, setCoordinatorInstitution] = useState<
    string | null
  >(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { data: stats, error: statsError, isLoading } = useDashboardStats();

  // Fetch user data and institution info
  useEffect(() => {
    const fetchUserData = async () => {
      const supabase = createClientSupabaseClient();
      const { data: userProfile } = await supabase.auth.getUser();

      if (!userProfile?.user?.id) return;

      // Set the user ID for later use
      setUserId(userProfile.user.id);

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userProfile.user.id)
        .single();

      const isInstitutionCoordinator =
        currentProfile?.role === 'institution_coordinator';

      if (isInstitutionCoordinator) {
        const { data: coordinatorData } = await supabase
          .from('institution_coordinators')
          .select('institution_id')
          .eq('user_id', userProfile.user.id)
          .maybeSingle();

        if (coordinatorData?.institution_id) {
          const { data: institutionData } = await supabase
            .from('institutions')
            .select('name')
            .eq('id', coordinatorData.institution_id)
            .single();

          setCoordinatorInstitution(institutionData?.name || null);
        }
      }
    };

    fetchUserData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (statsError) {
    return (
      <ContentLayout title='Dashboard'>
        <div className='flex flex-col items-center justify-center min-h-[400px]'>
          <p className='text-destructive text-lg mb-4'>
            {statsError instanceof Error
              ? statsError.message
              : 'Failed to load dashboard data'}
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout
      title={
        coordinatorInstitution
          ? `${coordinatorInstitution} Dashboard`
          : 'Dashboard'
      }
    >
      <Breadcrumbs
        items={[
          { label: 'Home', link: '/' },
          { label: 'Dashboard', link: '#' }
        ]}
      />

      <div className='space-y-6 mt-4'>
        <div>
          <h1 className='text-2xl py-1 font-bold'>Dashboard</h1>
          {coordinatorInstitution ? (
            <div>
              <p className='text-muted-foreground'>
                Overview for{' '}
                <span className='font-semibold text-primary'>
                  {coordinatorInstitution}
                </span>
              </p>
              <Badge variant='outline' className='mt-2'>
                Institution Coordinator View
              </Badge>
            </div>
          ) : (
            <p className='text-muted-foreground'>
              Overview of system metrics and activities
            </p>
          )}
        </div>

        {isLoading ? (
          <div className='flex justify-center items-center min-h-[400px]'>
            <BeatLoader color='#000000' />
          </div>
        ) : stats ? (
          <div className='space-y-6'>
            {/* Event Coordinator Section - Events I Own */}
            {stats.events.isEventCoordinator &&
              stats.events.ownedEvents.length > 0 && (
                <Card className='border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20'>
                  <CardHeader className='pb-2 flex flex-row items-center justify-between'>
                    <div>
                      <CardTitle className='text-xl font-bold flex items-center gap-2'>
                        <Crown className='h-5 w-5 text-amber-600 dark:text-amber-400' />
                        Events I Own
                      </CardTitle>
                      <CardDescription>
                        You created and own {stats.events.ownedEvents.length}{' '}
                        event
                        {stats.events.ownedEvents.length !== 1 ? 's' : ''} -
                        full control
                      </CardDescription>
                    </div>
                    <Badge
                      variant='outline'
                      className='bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700'
                    >
                      Owner
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-4'>
                      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                        {stats.events.ownedEvents
                          .filter(
                            (event) => new Date(event.start_time) > new Date()
                          )
                          .slice(0, 6)
                          .map((event) => (
                            <Card
                              key={event.id}
                              className='overflow-hidden border-amber-200 dark:border-amber-800'
                            >
                              <CardHeader className='p-4 pb-2 bg-amber-50/50 dark:bg-amber-950/20'>
                                <CardTitle className='text-md font-medium truncate'>
                                  {event.title}
                                </CardTitle>
                                <CardDescription>
                                  {format(new Date(event.start_time), 'PPP')}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className='p-4 pt-2'>
                                <div className='space-y-2 text-sm'>
                                  {event.institution && (
                                    <div className='flex items-center gap-2'>
                                      <Building className='h-4 w-4 text-muted-foreground' />
                                      <span>{event.institution.name}</span>
                                    </div>
                                  )}
                                  {(event as any).place && (
                                    <div className='flex items-center gap-2'>
                                      <MapPin className='h-4 w-4 text-muted-foreground' />
                                      <span>{(event as any).place.name}</span>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                              <CardFooter className='p-4 pt-0 flex justify-end'>
                                <Button size='sm' asChild>
                                  <Link
                                    href={`/organizations/events/${event.id}`}
                                  >
                                    View Details
                                    <ChevronRight className='ml-1 h-4 w-4' />
                                  </Link>
                                </Button>
                              </CardFooter>
                            </Card>
                          ))}
                      </div>
                      <div className='flex justify-center'>
                        <Button variant='outline' asChild>
                          <Link href='/organizations/events?filter=owned'>
                            View All Owned Events
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Event Coordinator Section - Events I Coordinate */}
            {stats.events.isEventCoordinator &&
              stats.events.coordinatingEvents.length > 0 && (
                <Card className='border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20'>
                  <CardHeader className='pb-2 flex flex-row items-center justify-between'>
                    <div>
                      <CardTitle className='text-xl font-bold flex items-center gap-2'>
                        <UserCog className='h-5 w-5 text-blue-600 dark:text-blue-400' />
                        Events I Coordinate
                      </CardTitle>
                      <CardDescription>
                        You are assigned as coordinator for{' '}
                        {stats.events.coordinatingEvents.length} event
                        {stats.events.coordinatingEvents.length !== 1
                          ? 's'
                          : ''}
                      </CardDescription>
                    </div>
                    <Badge
                      variant='outline'
                      className='bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700'
                    >
                      Coordinator
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-4'>
                      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                        {stats.events.coordinatingEvents
                          .filter(
                            (event) => new Date(event.start_time) > new Date()
                          )
                          .slice(0, 6)
                          .map((event) => (
                            <Card
                              key={event.id}
                              className='overflow-hidden border-blue-200 dark:border-blue-800'
                            >
                              <CardHeader className='p-4 pb-2 bg-blue-50/50 dark:bg-blue-950/20'>
                                <CardTitle className='text-md font-medium truncate'>
                                  {event.title}
                                </CardTitle>
                                <CardDescription>
                                  {format(new Date(event.start_time), 'PPP')}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className='p-4 pt-2'>
                                <div className='space-y-2 text-sm'>
                                  {event.institution && (
                                    <div className='flex items-center gap-2'>
                                      <Building className='h-4 w-4 text-muted-foreground' />
                                      <span>{event.institution.name}</span>
                                    </div>
                                  )}
                                  {(event as any).place && (
                                    <div className='flex items-center gap-2'>
                                      <MapPin className='h-4 w-4 text-muted-foreground' />
                                      <span>{(event as any).place.name}</span>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                              <CardFooter className='p-4 pt-0 flex justify-end'>
                                <Button size='sm' asChild>
                                  <Link
                                    href={`/organizations/events/${event.id}`}
                                  >
                                    View Details
                                    <ChevronRight className='ml-1 h-4 w-4' />
                                  </Link>
                                </Button>
                              </CardFooter>
                            </Card>
                          ))}
                      </div>
                      <div className='flex justify-center'>
                        <Button variant='outline' asChild>
                          <Link href='/organizations/events?filter=coordinating'>
                            View All Coordinating Events
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

            <Tabs defaultValue='overview' className='w-full'>
              <TabsList className='grid w-full grid-cols-3'>
                <TabsTrigger value='overview'>Overview</TabsTrigger>
                <TabsTrigger value='events'>Events & Forms</TabsTrigger>
                <TabsTrigger value='payments'>Payments & Users</TabsTrigger>
              </TabsList>

              <TabsContent value='overview' className='space-y-6 mt-4'>
                {/* Quick Stats Row */}
                <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                  <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                      <CardTitle className='text-sm font-medium'>
                        Total Events
                      </CardTitle>
                      <Calendar className='h-4 w-4 text-muted-foreground' />
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold'>
                        {stats.events.totalEvents}
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        {stats.events.activeEvents} currently active
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                      <CardTitle className='text-sm font-medium'>
                        Forms & Responses
                      </CardTitle>
                      <FormInput className='h-4 w-4 text-muted-foreground' />
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold'>
                        {stats.forms.totalForms}
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        {stats.forms.totalResponses} total submissions
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                      <CardTitle className='text-sm font-medium'>
                        Payment Collection
                      </CardTitle>
                      <CreditCard className='h-4 w-4 text-muted-foreground' />
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold'>
                        {formatCurrency(stats.forms.totalPaymentAmount)}
                      </div>
                      <div className='flex justify-between text-xs text-muted-foreground'>
                        <span>
                          {stats.forms.completedPayments} total successful
                        </span>
                        <span className='font-medium text-green-600'>
                          Today:{' '}
                          {formatCurrency(stats.forms.todayPaymentAmount)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                      <CardTitle className='text-sm font-medium'>
                        Users
                      </CardTitle>
                      <Users2 className='h-4 w-4 text-muted-foreground' />
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold'>
                        {stats.users.totalUsers}
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        {stats.users.newUsersThisMonth} new this month
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts Row */}
                <div className='grid gap-4 md:grid-cols-2'>
                  <Card>
                    <CardHeader>
                      <CardTitle>Events Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='h-[300px]'>
                        <ResponsiveContainer width='100%' height='100%'>
                          <LineChart data={stats.events.eventsByMonth}>
                            <CartesianGrid strokeDasharray='3 3' />
                            <XAxis dataKey='month' />
                            <YAxis />
                            <Tooltip />
                            <Line
                              type='monotone'
                              dataKey='count'
                              stroke='#3b82f6'
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Form Responses</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='h-[300px]'>
                        <ResponsiveContainer width='100%' height='100%'>
                          <LineChart data={stats.forms.responsesByMonth}>
                            <CartesianGrid strokeDasharray='3 3' />
                            <XAxis dataKey='month' />
                            <YAxis />
                            <Tooltip />
                            <Line
                              type='monotone'
                              dataKey='count'
                              stroke='#8884d8'
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Upcoming Events */}
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between'>
                    <div>
                      <CardTitle>Upcoming Events</CardTitle>
                      <CardDescription>
                        {stats.events.isEventCoordinator
                          ? 'Events you coordinate or created'
                          : coordinatorInstitution
                            ? `Upcoming events for ${coordinatorInstitution}`
                            : 'Events relevant to you'}
                      </CardDescription>
                    </div>
                    <Button variant='outline' size='sm' asChild>
                      <Link href='/organizations/events'>
                        View All
                        <ChevronRight className='ml-1 h-4 w-4' />
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      // Choose which events to display based on role
                      let eventsToDisplay = [];

                      if (stats.events.isEventCoordinator) {
                        // For event coordinators, show both assigned events AND events they created
                        eventsToDisplay = [
                          ...stats.events.coordinatedEvents,
                          ...stats.events.upcomingEvents.filter((event) => {
                            // Filter to include events the user coordinates or created
                            return (
                              (event as DashboardEvent).coordinator_id ===
                                userId ||
                              (event as DashboardEvent).created_by === userId
                            );
                          })
                        ];

                        // Remove duplicates (in case an event is both created and coordinated by the user)
                        const uniqueIds = new Set();
                        eventsToDisplay = eventsToDisplay.filter((event) => {
                          if (uniqueIds.has(event.id)) return false;
                          uniqueIds.add(event.id);
                          return true;
                        });

                        // Filter to only show upcoming or ongoing events
                        eventsToDisplay = eventsToDisplay.filter((event) => {
                          const endDate = parseISO(event.end_time);
                          return endOfDay(endDate) >= new Date();
                        });
                      } else if (coordinatorInstitution) {
                        // For institution coordinators, show filtered institution events
                        eventsToDisplay = stats.events.upcomingEvents.filter(
                          (event) =>
                            event.institution?.name === coordinatorInstitution
                        );
                      } else {
                        // For admins or regular users, show all upcoming events
                        eventsToDisplay = stats.events.upcomingEvents;
                      }

                      // Sort events by start date (earliest first)
                      eventsToDisplay = eventsToDisplay
                        .sort(
                          (a, b) =>
                            new Date(a.start_time).getTime() -
                            new Date(b.start_time).getTime()
                        )
                        .slice(0, 5); // Show only the first 5

                      if (eventsToDisplay.length > 0) {
                        return (
                          <div className='space-y-5'>
                            {eventsToDisplay.map((event) => {
                              // Ensure we have valid date objects
                              const startDate = parseISO(event.start_time);
                              const endDate = parseISO(event.end_time);
                              const today = new Date();

                              const isOngoing =
                                startOfDay(startDate) <= today &&
                                endOfDay(endDate) >= today;

                              const daysUntil = Math.ceil(
                                (startDate.getTime() - today.getTime()) /
                                  (1000 * 60 * 60 * 24)
                              );

                              return (
                                <div
                                  key={event.id}
                                  className='border rounded-lg overflow-hidden'
                                >
                                  <div
                                    className={`px-4 py-3 flex justify-between items-center ${
                                      isOngoing
                                        ? 'bg-blue-50 border-b border-blue-100'
                                        : 'bg-slate-50 border-b'
                                    }`}
                                  >
                                    <div className='flex items-center'>
                                      <CalendarDays
                                        className={`h-5 w-5 mr-2 ${
                                          isOngoing
                                            ? 'text-blue-600'
                                            : 'text-slate-600'
                                        }`}
                                      />
                                      <span className='font-medium'>
                                        {isOngoing
                                          ? 'Ongoing'
                                          : daysUntil <= 0
                                            ? 'Starting today'
                                            : `In ${daysUntil} days`}
                                      </span>
                                    </div>
                                    {(event as DashboardEvent)
                                      .coordinator_id === userId ? (
                                      <Badge
                                        variant='secondary'
                                        className='bg-primary/10 text-primary'
                                      >
                                        You Coordinate
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant='outline'
                                        className={
                                          isOngoing
                                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                                            : ''
                                        }
                                      >
                                        {isOngoing ? 'Active Now' : 'Upcoming'}
                                      </Badge>
                                    )}
                                  </div>

                                  <div className='p-4'>
                                    <h3 className='font-medium text-lg'>
                                      {event.title}
                                    </h3>

                                    <div className='mt-3 space-y-2'>
                                      <div className='flex items-start text-sm'>
                                        <Building className='h-4 w-4 mr-2 text-slate-500 mt-0.5' />
                                        <span>
                                          {event.institution?.name ||
                                            'No institution'}
                                        </span>
                                      </div>

                                      <div className='flex items-start text-sm'>
                                        <Calendar className='h-4 w-4 mr-2 text-slate-500 mt-0.5' />
                                        <div>
                                          <div>
                                            {format(startDate, 'MMMM d, yyyy')}{' '}
                                            at {format(startDate, 'h:mm a')}
                                          </div>
                                          <div className='text-slate-500'>
                                            to {format(endDate, 'MMMM d, yyyy')}{' '}
                                            at {format(endDate, 'h:mm a')}
                                          </div>
                                        </div>
                                      </div>

                                      {event.place && (
                                        <div className='flex items-start text-sm'>
                                          <MapPin className='h-4 w-4 mr-2 text-slate-500 mt-0.5' />
                                          <span>{event.place.name}</span>
                                        </div>
                                      )}
                                    </div>

                                    <div className='flex items-center justify-between mt-4'>
                                      <div className='flex items-center space-x-4'>
                                        <div className='flex items-center text-sm'>
                                          <FormInput className='h-4 w-4 mr-1 text-slate-500' />
                                          <span>
                                            {event.forms_count || 0} forms
                                          </span>
                                        </div>
                                        <div className='flex items-center text-sm'>
                                          <Users className='h-4 w-4 mr-1 text-slate-500' />
                                          <span>
                                            {event.registered_count || 0}{' '}
                                            registrations
                                          </span>
                                        </div>
                                      </div>

                                      <Button
                                        size='sm'
                                        variant='outline'
                                        asChild
                                      >
                                        <Link
                                          href={`/organizations/events/${event.id}`}
                                        >
                                          View Event
                                        </Link>
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      } else {
                        return (
                          <div className='text-center py-12 border rounded-lg bg-slate-50'>
                            <Calendar className='h-12 w-12 text-slate-400 mx-auto mb-3' />
                            <h3 className='text-lg font-medium mb-1'>
                              No upcoming events
                            </h3>
                            <p className='text-slate-500 mb-4'>
                              {stats.events.isEventCoordinator
                                ? 'You don&apos;t have any events assigned or created that are upcoming'
                                : coordinatorInstitution
                                  ? `No upcoming events for ${coordinatorInstitution}`
                                  : 'No upcoming events found'}
                            </p>
                            <Button size='sm' asChild>
                              <Link href='/organizations/events/new'>
                                <Plus className='mr-1 h-4 w-4' />
                                Create Event
                              </Link>
                            </Button>
                          </div>
                        );
                      }
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value='events' className='space-y-6 mt-4'>
                {/* Event Statistics */}
                <div className='grid gap-4 md:grid-cols-3'>
                  <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                      <CardTitle className='text-sm font-medium'>
                        Total Events
                      </CardTitle>
                      <Calendar className='h-4 w-4 text-muted-foreground' />
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold'>
                        {stats.events.totalEvents}
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        All events in system
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                      <CardTitle className='text-sm font-medium'>
                        Active Events
                      </CardTitle>
                      <BadgeCheck className='h-4 w-4 text-muted-foreground' />
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold'>
                        {stats.events.activeEvents}
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        {stats.events.activeEvents === 1
                          ? 'Currently running event'
                          : 'Currently running events'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                      <CardTitle className='text-sm font-medium'>
                        Past Events
                      </CardTitle>
                      <Clock className='h-4 w-4 text-muted-foreground' />
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold'>
                        {stats.events.pastEvents}
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        Completed events
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Event Charts */}
                <div className='grid gap-4 md:grid-cols-2'>
                  <Card>
                    <CardHeader>
                      <CardTitle>Events by Institution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='h-[300px]'>
                        <ResponsiveContainer width='100%' height='100%'>
                          <BarChart
                            data={stats.events.institutionWiseCount.slice(
                              0,
                              10
                            )}
                          >
                            <CartesianGrid strokeDasharray='3 3' />
                            <XAxis dataKey='name' />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey='count' fill='#3b82f6' />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Forms and Responses</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='grid grid-cols-2 gap-4'>
                        <div className='flex flex-col items-center justify-center border rounded-lg p-4'>
                          <div className='text-3xl font-bold'>
                            {stats.forms.totalForms}
                          </div>
                          <p className='text-sm text-muted-foreground'>
                            Total Forms
                          </p>
                        </div>
                        <div className='flex flex-col items-center justify-center border rounded-lg p-4'>
                          <div className='text-3xl font-bold'>
                            {stats.forms.totalResponses}
                          </div>
                          <p className='text-sm text-muted-foreground'>
                            Total Responses
                          </p>
                        </div>
                      </div>
                      {stats.forms.responsesByMonth.length > 0 && (
                        <div className='h-[200px] mt-4'>
                          <ResponsiveContainer width='100%' height='100%'>
                            <LineChart data={stats.forms.responsesByMonth}>
                              <CartesianGrid strokeDasharray='3 3' />
                              <XAxis dataKey='month' />
                              <YAxis />
                              <Tooltip />
                              <Line
                                type='monotone'
                                dataKey='count'
                                stroke='#8884d8'
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Form Submissions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Form Submissions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.forms.recentResponses.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Form</TableHead>
                            <TableHead>Submitted</TableHead>
                            <TableHead>Payment</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stats.forms.recentResponses.map((response) => (
                            <TableRow key={response.id}>
                              <TableCell className='font-medium'>
                                {response.user_email}
                              </TableCell>
                              <TableCell>
                                {response.form?.title || 'Unknown'}
                              </TableCell>
                              <TableCell>
                                {format(new Date(response.submitted_at), 'PPp')}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    response.payment_status === 'completed' ||
                                    response.payment_status === 'paid'
                                      ? 'bg-green-100 text-green-800'
                                      : response.payment_status === 'pending'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-slate-600'
                                  }
                                >
                                  {!response.payment_status
                                    ? 'N/A'
                                    : response.payment_status.toLowerCase() ===
                                        'paid'
                                      ? 'Completed'
                                      : response.payment_status
                                          .charAt(0)
                                          .toUpperCase() +
                                        response.payment_status.slice(1)}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className='text-center py-6 text-muted-foreground'>
                        No recent form submissions
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value='payments' className='space-y-6 mt-4'>
                {/* Payment Stats */}
                <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                  <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                      <CardTitle className='text-sm font-medium'>
                        Total Collection
                      </CardTitle>
                      <CreditCard className='h-4 w-4 text-muted-foreground' />
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold'>
                        {formatCurrency(stats.forms.totalPaymentAmount)}
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        Successfully collected
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                      <CardTitle className='text-sm font-medium'>
                        Today&apos;s Collection
                      </CardTitle>
                      <BadgeCheck className='h-4 w-4 text-muted-foreground' />
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold'>
                        {formatCurrency(stats.forms.todayPaymentAmount)}
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        Collected today
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                      <CardTitle className='text-sm font-medium'>
                        Completed Payments
                      </CardTitle>
                      <BadgeCheck className='h-4 w-4 text-muted-foreground' />
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold'>
                        {stats.forms.completedPayments}
                      </div>
                      <div className='flex justify-between text-xs text-muted-foreground'>
                        <span>Total successful</span>
                        <span className='font-medium'>
                          Today: {stats.forms.todayCompletedPayments}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                      <CardTitle className='text-sm font-medium'>
                        Pending Payments
                      </CardTitle>
                      <Clock className='h-4 w-4 text-muted-foreground' />
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold'>
                        {stats.forms.pendingPayments}
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        Awaiting completion
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Payment and User Charts */}
                <div className='grid gap-4 md:grid-cols-2'>
                  <Card>
                    <CardHeader>
                      <CardTitle>Payment Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='h-[300px]'>
                        <ResponsiveContainer width='100%' height='100%'>
                          <PieChart>
                            <Pie
                              data={stats.forms.paymentStatusDistribution}
                              cx='50%'
                              cy='50%'
                              labelLine={true}
                              outerRadius={100}
                              fill='#8884d8'
                              dataKey='value'
                              nameKey='name'
                              label={(entry) => entry.name}
                            >
                              {stats.forms.paymentStatusDistribution.map(
                                (entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                  />
                                )
                              )}
                            </Pie>
                            <Tooltip formatter={(value) => [value, 'Count']} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>User Role Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='h-[300px]'>
                        <ResponsiveContainer width='100%' height='100%'>
                          <PieChart>
                            <Pie
                              data={stats.users.roleDistribution}
                              cx='50%'
                              cy='50%'
                              labelLine={true}
                              outerRadius={100}
                              fill='#8884d8'
                              dataKey='count'
                              nameKey='name'
                              label={(entry) => entry.name}
                            >
                              {stats.users.roleDistribution.map(
                                (entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                  />
                                )
                              )}
                            </Pie>
                            <Tooltip formatter={(value) => [value, 'Users']} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Form-wise Payment Collection */}
                <Card>
                  <CardHeader>
                    <CardTitle>Form-wise Payment Collection</CardTitle>
                    <CardDescription>
                      Payment collection breakdown by individual forms
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {stats.forms.formWisePayments.length > 0 ? (
                      <div className='space-y-6'>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Form</TableHead>
                              <TableHead>Successful Payments</TableHead>
                              <TableHead>Pending</TableHead>
                              <TableHead className='text-right'>
                                Amount Collected
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stats.forms.formWisePayments.map((formStats) => (
                              <TableRow key={formStats.formId}>
                                <TableCell className='font-medium'>
                                  {formStats.formTitle}
                                </TableCell>
                                <TableCell>
                                  {formStats.completedCount}
                                </TableCell>
                                <TableCell>{formStats.pendingCount}</TableCell>
                                <TableCell className='text-right font-medium'>
                                  {formatCurrency(formStats.totalAmount)}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className='bg-slate-50'>
                              <TableCell className='font-bold'>TOTAL</TableCell>
                              <TableCell className='font-bold'>
                                {stats.forms.formWiseTotalStats
                                  .totalCompletedCount ||
                                  stats.forms.completedPayments}
                              </TableCell>
                              <TableCell className='font-bold'>
                                {stats.forms.formWiseTotalStats
                                  .totalPendingCount ||
                                  stats.forms.pendingPayments}
                              </TableCell>
                              <TableCell className='text-right font-bold'>
                                {formatCurrency(
                                  stats.forms.formWiseTotalStats.totalAmount ||
                                    stats.forms.totalPaymentAmount
                                )}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>

                        <div className='h-[300px]'>
                          <ResponsiveContainer width='100%' height='100%'>
                            <BarChart
                              data={stats.forms.formWisePayments}
                              margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 70
                              }}
                            >
                              <CartesianGrid strokeDasharray='3 3' />
                              <XAxis
                                dataKey='formTitle'
                                angle={-45}
                                textAnchor='end'
                                tick={{ fontSize: 12 }}
                                height={70}
                              />
                              <YAxis />
                              <Tooltip
                                formatter={(value, name) => [
                                  name === 'totalAmount'
                                    ? formatCurrency(value as number)
                                    : value,
                                  name === 'totalAmount'
                                    ? 'Collection'
                                    : name === 'completedCount'
                                      ? 'Paid'
                                      : 'Pending'
                                ]}
                              />
                              <Legend />
                              <Bar
                                dataKey='totalAmount'
                                name='Amount Collected'
                                fill='#10b981'
                              />
                              <Bar
                                dataKey='completedCount'
                                name='Paid Submissions'
                                fill='#3b82f6'
                              />
                              <Bar
                                dataKey='pendingCount'
                                name='Pending'
                                fill='#f59e0b'
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : (
                      <div className='text-center py-8 text-muted-foreground'>
                        No payment data available for forms
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* User Stats */}
                <div className='grid gap-4 md:grid-cols-4'>
                  <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                      <CardTitle className='text-sm font-medium'>
                        Total Users
                      </CardTitle>
                      <Users2 className='h-4 w-4 text-muted-foreground' />
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold'>
                        {stats.users.totalUsers}
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        All registered users
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                      <CardTitle className='text-sm font-medium'>
                        Admins
                      </CardTitle>
                      <ShieldCheck className='h-4 w-4 text-muted-foreground' />
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold'>
                        {stats.users.adminCount}
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        System administrators
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                      <CardTitle className='text-sm font-medium'>
                        Students
                      </CardTitle>
                      <GraduationCap className='h-4 w-4 text-muted-foreground' />
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold'>
                        {stats.users.studentCount}
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        Registered students
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                      <CardTitle className='text-sm font-medium'>
                        Staff
                      </CardTitle>
                      <UserCog className='h-4 w-4 text-muted-foreground' />
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold'>
                        {stats.users.roleDistribution.find((r) =>
                          r.name.toLowerCase().includes('staff')
                        )?.count || 0}
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        Staff members
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </div>
    </ContentLayout>
  );
};

export default DashboardPage;
