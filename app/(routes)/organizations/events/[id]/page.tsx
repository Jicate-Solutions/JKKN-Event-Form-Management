'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Event } from '@/types/organizations';
import { Form } from '@/types/forms';
import { FormResponse } from '@/types/form-responses';
import { EventService } from '@/lib/services/organization/event-service';
import { FormService } from '@/lib/services/form-service';
import { EventCoordinatorService } from '@/lib/services/organization/event-coordinator-service';
import { EventFormsList } from '../_components/event-forms-list';
import { EventCoordinatorsCard } from './_components/event-coordinators-card';
import { BeatLoader } from 'react-spinners';
import { ContentLayout } from '@/components/layout/content-layout';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { UserRole } from '@/lib/constants/roles';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CalendarDays,
  MapPin,
  Building,
  Clock,
  Users,
  FileText,
  CheckSquare,
  BarChart3,
  ClipboardList,
  Calendar,
  CreditCard
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export default function EventDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [forms, setForms] = useState<Form[]>([]);
  const [formResponses, setFormResponses] = useState<
    Record<string, FormResponse[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [coordinatorInstitutionId, setCoordinatorInstitutionId] = useState<
    string | null
  >(null);
  const [isEventCoordinator, setIsEventCoordinator] = useState(false);
  const [isEventOwner, setIsEventOwner] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [activeTab, setActiveTab] = useState(
    searchParams.get('tab') || 'overview'
  );
  const [departmentCoordinators, setDepartmentCoordinators] = useState<any[]>(
    []
  );
  const [formStatistics, setFormStatistics] = useState<{
    totalForms: number;
    totalResponses: number;
    responseRate: number;
    formStats: Array<{
      formId: string;
      formTitle: string;
      responses: number;
    }>;
    paymentStats?: {
      hasPaymentForms: boolean;
      totalAmount: number;
      pendingAmount: number;
      completedAmount: number;
      formWisePayments: Array<{
        formId: string;
        formTitle: string;
        totalAmount: number;
        pendingAmount: number;
        completedAmount: number;
      }>;
    };
  }>({
    totalForms: 0,
    totalResponses: 0,
    responseRate: 0,
    formStats: []
  });

  // Check user authorization
  const checkUserAuthorization = useCallback(async () => {
    try {
      const supabase = createClientSupabaseClient();

      // Get current user
      const { data: userProfile } = await supabase.auth.getUser();
      if (!userProfile?.user?.id) return null;

      // Get current user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userProfile.user.id)
        .single();

      if (!profile) return null;

      // Admin users can access any event
      if (
        profile.role === UserRole.SUPER_ADMIN ||
        profile.role === UserRole.ADMINISTRATOR
      ) {
        return true;
      }

      // Get the event details first to check institution and department
      const { data: eventData } = await supabase
        .from('events')
        .select('institution_id, department_id, coordinator_id, created_by')
        .eq('id', id as string)
        .single();

      if (!eventData) {
        throw new Error('Event not found');
      }

      // For institution coordinators, check their institution
      if (profile.role === UserRole.INSTITUTION_COORDINATOR) {
        const { data: coordinatorData } = await supabase
          .from('institution_coordinators')
          .select('institution_id')
          .eq('user_id', userProfile.user.id)
          .maybeSingle();

        if (coordinatorData?.institution_id) {
          setCoordinatorInstitutionId(coordinatorData.institution_id);
          // Return true if event belongs to coordinator's institution
          return eventData.institution_id === coordinatorData.institution_id
            ? true
            : null;
        }
      }

      // For event coordinators, check if they're assigned to the event's department or institution
      if (profile.role === UserRole.EVENT_COORDINATOR) {
        // FIRST: Check if user is directly assigned to this event via event_coordinators table
        const { data: eventCoordData, error: eventCoordError } = await supabase
          .from('event_coordinators')
          .select('*')
          .eq('event_id', id as string)
          .eq('user_id', userProfile.user.id)
          .maybeSingle();

        console.log('Event coordinator assignment check:', {
          isAssignedCoordinator: !!eventCoordData,
          data: eventCoordData,
          error: eventCoordError
        });

        if (eventCoordData) {
          console.log(
            'User is assigned as event coordinator via event_coordinators table'
          );
          return 'event_coordinator';
        }

        // Check if user is assigned to the department this event belongs to (if any)
        if (eventData.department_id) {
          console.log(
            'Checking department coordinator access for department:',
            eventData.department_id
          );

          const { data: deptCoordData, error: deptCoordError } = await supabase
            .from('department_coordinators')
            .select('*')
            .eq('user_id', userProfile.user.id)
            .eq('department_id', eventData.department_id)
            .maybeSingle();

          console.log('Department coordinator check result:', {
            isDeptCoordinator: !!deptCoordData,
            data: deptCoordData,
            error: deptCoordError
          });

          if (deptCoordData) {
            console.log('User is a department coordinator for this event');
            return 'event_coordinator';
          }
        } else if (eventData.institution_id) {
          // If event has no department, check if user coordinates any department
          // in the event's institution
          console.log(
            'Event has no department, checking if user is a department coordinator for any department in institution:',
            eventData.institution_id
          );

          const { data: userDeptCoords, error: userDeptError } = await supabase
            .from('department_coordinators')
            .select('department_id')
            .eq('user_id', userProfile.user.id);

          console.log('User department coordinates:', {
            count: userDeptCoords?.length || 0,
            data: userDeptCoords,
            error: userDeptError
          });

          if (userDeptCoords && userDeptCoords.length > 0) {
            // Get departments for this institution
            const { data: instDepts, error: instDeptsError } = await supabase
              .from('departments')
              .select('id')
              .eq('institution_id', eventData.institution_id);

            console.log('Institution departments:', {
              count: instDepts?.length || 0,
              data: instDepts,
              error: instDeptsError
            });

            if (instDepts && instDepts.length > 0) {
              // Check if user is coordinator for any department in this institution
              const instDeptIds = instDepts.map((d) => d.id);
              const userDeptIds = userDeptCoords
                .map((d) => d.department_id)
                .filter((id): id is string => id !== null);
              const hasOverlap = userDeptIds.some((id) =>
                instDeptIds.includes(id)
              );

              console.log('Department overlap check:', {
                instDeptIds,
                userDeptIds,
                hasOverlap
              });

              if (hasOverlap) {
                console.log(
                  "User is a department coordinator in this event's institution"
                );
                return 'event_coordinator';
              }
            }
          }
        }

        // Check if user is assigned to the institution this event belongs to
        if (eventData.institution_id) {
          const { data: instCoordData } = await supabase
            .from('institution_coordinators')
            .select('*')
            .eq('user_id', userProfile.user.id)
            .eq('institution_id', eventData.institution_id)
            .maybeSingle();

          if (instCoordData) {
            console.log('User is an institution coordinator for this event');
            return 'event_coordinator';
          }
        }

        // Check if user is the assigned event coordinator
        if (eventData.coordinator_id === userProfile.user.id) {
          console.log('User is the assigned event coordinator');
          return 'event_coordinator';
        }

        // Check if user is the event creator
        if (
          eventData.created_by &&
          eventData.created_by === (userProfile.user.id as string)
        ) {
          console.log('User is the event creator');
          return 'event_coordinator';
        }
      }

      // Non-admin users who aren't coordinators
      return null;
    } catch (error) {
      console.error('Error checking authorization:', error);
      return null;
    }
  }, [id]);

  // Fetch event forms
  const fetchEventForms = useCallback(async (eventId: string) => {
    try {
      const formsData = await FormService.getEventForms(eventId);
      setForms((formsData || []) as unknown as Form[]);
      return formsData;
    } catch (error) {
      console.error('Error fetching event forms:', error);
      return [];
    }
  }, []);

  // Fetch form responses
  const fetchFormResponses = useCallback(
    async (formId: string, user: { id: string; role?: string }) => {
      try {
        const responsesData = await FormService.getFormResponses(formId, user);
        return responsesData || [];
      } catch (error) {
        console.error(`Error fetching responses for form ${formId}:`, error);
        return [];
      }
    },
    []
  );

  // Generate statistics for forms and responses
  const calculateStatistics = useCallback(
    (eventForms: Form[], formResponsesData: Record<string, FormResponse[]>) => {
      let totalResponses = 0;
      const formStats = eventForms.map((form) => {
        const responses = formResponsesData[form.id]?.length || 0;
        totalResponses += responses;
        return {
          formId: form.id,
          formTitle: form.title,
          responses
        };
      });

      // Calculate payment statistics
      let hasPaymentForms = false;
      let totalAmount = 0;
      let pendingAmount = 0;
      let completedAmount = 0;

      const formWisePayments = eventForms
        .map((form) => {
          // Check if this form has payment fields
          const hasPaymentFields = form.fields?.some(
            (field) => field.type === 'payment'
          );

          if (hasPaymentFields) {
            hasPaymentForms = true;
          }

          const formResponses = formResponsesData[form.id] || [];

          // Calculate payment amounts for this form
          const formTotalAmount = formResponses.reduce(
            (sum, response) => sum + (response.payment_amount || 0),
            0
          );

          const formPendingAmount = formResponses
            .filter((response) => response.payment_status === 'pending')
            .reduce((sum, response) => sum + (response.payment_amount || 0), 0);

          const formCompletedAmount = formResponses
            .filter(
              (response) =>
                response.payment_status === 'completed' ||
                response.payment_status === 'paid'
            )
            .reduce((sum, response) => sum + (response.payment_amount || 0), 0);

          // Add to totals
          totalAmount += formTotalAmount;
          pendingAmount += formPendingAmount;
          completedAmount += formCompletedAmount;

          return {
            formId: form.id,
            formTitle: form.title,
            totalAmount: formTotalAmount,
            pendingAmount: formPendingAmount,
            completedAmount: formCompletedAmount
          };
        })
        .filter((form) => form.totalAmount > 0);

      return {
        totalForms: eventForms.length,
        totalResponses,
        responseRate:
          eventForms.length > 0 ? totalResponses / eventForms.length : 0,
        formStats,
        paymentStats: {
          hasPaymentForms,
          totalAmount,
          pendingAmount,
          completedAmount,
          formWisePayments
        }
      };
    },
    []
  );

  // Lazy load form responses only when needed
  const [responsesLoaded, setResponsesLoaded] = useState(false);
  const [loadingResponses, setLoadingResponses] = useState(false);

  const loadFormResponses = useCallback(
    async (eventForms: Form[], userInfo: { id: string; role?: string }) => {
      if (responsesLoaded || loadingResponses) return;

      setLoadingResponses(true);
      try {
        // OPTIMIZATION: Fetch all form responses in PARALLEL instead of sequentially
        const responsesPromises = eventForms.map((form) =>
          fetchFormResponses(form.id, userInfo).then((responses) => ({
            formId: form.id,
            responses
          }))
        );

        const responsesArray = await Promise.all(responsesPromises);

        // Convert array to object
        const responsesData: Record<string, FormResponse[]> = {};
        responsesArray.forEach(({ formId, responses }) => {
          responsesData[formId] = responses;
        });

        setFormResponses(responsesData);

        // Calculate statistics
        const stats = calculateStatistics(eventForms, responsesData);
        setFormStatistics(stats);

        setResponsesLoaded(true);
      } catch (error) {
        console.error('Error loading form responses:', error);
        toast.error('Failed to load form responses');
      } finally {
        setLoadingResponses(false);
      }
    },
    [responsesLoaded, loadingResponses, fetchFormResponses, calculateStatistics]
  );

  useEffect(() => {
    let mounted = true;

    async function fetchEventData() {
      if (!id) return;

      try {
        if (!mounted) return;
        setLoading(true);
        setUnauthorized(false);

        const supabase = createClientSupabaseClient();

        // Get current user
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (!mounted || !user?.id) return;

        // Get user profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        console.log('Current user details:', {
          userId: user.id,
          userRole: profileData?.role
        });

        // Store current user role
        if (profileData?.role) {
          setCurrentUserRole(profileData.role as UserRole);
        }

        // First check if user is authorized
        const authResult = await checkUserAuthorization();
        if (!mounted) return;

        console.log('Authorization check result:', {
          eventId: id,
          authResult
        });

        // If not authorized, show error and redirect
        if (authResult === null) {
          console.warn('Access denied - user not authorized for event:', id);
          toast.error("You don't have permission to view this event");
          setUnauthorized(true);
          setTimeout(() => {
            router.push('/organizations/events');
          }, 2000);
          return;
        }

        // User is authorized, continue loading data
        console.log('User authorized, loading event data');

        const userInfo = {
          id: user.id,
          role: profileData?.role
        };

        setCurrentUserId(user.id);

        // OPTIMIZATION: Fetch event data and owner status in parallel
        const [eventData, ownerStatus] = await Promise.all([
          EventService.getEvent(id as string),
          EventCoordinatorService.isEventOwner(id as string, user.id)
        ]);

        if (!mounted) return;

        console.log('Loaded event data:', {
          eventId: eventData.id,
          title: eventData.title
        });

        setEvent(eventData as Event);
        setIsEventOwner(ownerStatus);

        // OPTIMIZATION: Fetch department coordinators and event forms in parallel
        const [deptCoordsResult, eventForms] = await Promise.all([
          eventData.department_id
            ? supabase
                .from('department_coordinators')
                .select(
                  `
                  id,
                  user:profiles(id, full_name, email)
                `
                )
                .eq('department_id', eventData.department_id)
            : Promise.resolve({ data: null, error: null }),
          fetchEventForms(id as string)
        ]);

        if (!mounted) return;

        if (deptCoordsResult.data) {
          setDepartmentCoordinators(
            deptCoordsResult.data.map((coord: any) => coord.user)
          );
        }

        setForms(eventForms as unknown as Form[]);

        // Set coordinator status
        if (authResult === 'event_coordinator') {
          setIsEventCoordinator(true);
        }

        // OPTIMIZATION: Don't load form responses immediately
        // They will be loaded on demand when user switches to Statistics tab
        console.log('Event data loaded. Form responses will load on demand.');
      } catch (error) {
        console.error('Error fetching event data:', error);
        if (mounted) {
          toast.error('Failed to load event details');
          setUnauthorized(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchEventData();

    // Cleanup function
    return () => {
      mounted = false;
    };
  }, [id, checkUserAuthorization, router, fetchEventForms]);

  // Load responses when switching to statistics tab
  useEffect(() => {
    if (
      activeTab === 'statistics' &&
      !responsesLoaded &&
      !loadingResponses &&
      forms.length > 0 &&
      currentUserId
    ) {
      const userInfo = {
        id: currentUserId,
        role: currentUserRole || undefined
      };
      loadFormResponses(forms, userInfo);
    }
  }, [
    activeTab,
    responsesLoaded,
    loadingResponses,
    forms,
    currentUserId,
    currentUserRole,
    loadFormResponses
  ]);

  if (loading) {
    return (
      <ContentLayout title='Event Details'>
        <div className='flex justify-center items-center min-h-[400px]'>
          <BeatLoader color='#00e902' />
        </div>
      </ContentLayout>
    );
  }

  if (unauthorized) {
    return (
      <ContentLayout title='Unauthorized'>
        <div className='flex flex-col items-center justify-center min-h-[400px]'>
          <p className='text-destructive text-lg mb-4'>
            You don&apos;t have permission to view this event.
          </p>
          <Button variant='outline' asChild>
            <Link href='/organizations/events'>Return to Events</Link>
          </Button>
        </div>
      </ContentLayout>
    );
  }

  if (!event) return null;

  const isCoordinatorView = !!coordinatorInstitutionId;
  const formattedStartTime = format(new Date(event.start_time), 'PPp');
  const formattedEndTime = format(new Date(event.end_time), 'PPp');

  return (
    <ContentLayout title={event.title}>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href='/'>Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href='/organizations/events'>Events</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{event.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='space-y-6 mt-4'>
        {/* Hero section with event title and key details */}
        <div className='relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow'>
          <div className='absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 pointer-events-none'></div>
          <div className='relative p-6 md:p-8'>
            <div className='flex flex-col md:flex-row md:items-start md:justify-between gap-4'>
              <div className='space-y-4 max-w-3xl'>
                <div className='flex flex-wrap items-center gap-2'>
                  <h1 className='text-3xl font-bold'>{event.title}</h1>
                  <Badge
                    className={`ml-2 ${
                      event.status === 'upcoming'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100'
                        : event.status === 'ongoing'
                          ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
                    }`}
                  >
                    {event.status.charAt(0).toUpperCase() +
                      event.status.slice(1)}
                  </Badge>
                  {isCoordinatorView && (
                    <Badge variant='outline' className='ml-auto'>
                      Institution Coordinator View
                    </Badge>
                  )}
                  {isEventCoordinator && (
                    <Badge variant='outline' className='ml-auto bg-primary/10'>
                      You are the Event Coordinator
                    </Badge>
                  )}
                </div>

                {event.description && (
                  <div
                    className={cn(
                      'text-muted-foreground prose prose-sm max-w-none rich-text-content',
                      'prose-headings:mt-2 prose-headings:mb-2',
                      'prose-p:mt-0 prose-p:mb-2',
                      'prose-ul:mt-0 prose-ul:mb-2 prose-ul:list-disc prose-ul:ml-6',
                      'prose-ol:mt-0 prose-ol:mb-2 prose-ol:list-decimal prose-ol:ml-6',
                      'prose-li:mt-0 prose-li:mb-1 prose-li:pl-1',
                      'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
                      '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2',
                      '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2',
                      '[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mt-2 [&_ul]:mb-2',
                      '[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mt-2 [&_ol]:mb-2',
                      '[&_li]:mb-1 [&_li]:pl-1',
                      '[&_strong]:font-semibold',
                      '[&_em]:italic',
                      '[&_u]:underline'
                    )}
                    dangerouslySetInnerHTML={{ __html: event.description }}
                  />
                )}

                {event.coordinator && (
                  <div className='flex items-center gap-2 mt-2'>
                    <span className='text-sm'>Coordinator:</span>
                    <Badge
                      variant='outline'
                      className='flex items-center gap-1 font-normal'
                    >
                      <div className='h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary'>
                        {event.coordinator.full_name
                          ? event.coordinator.full_name.charAt(0).toUpperCase()
                          : 'C'}
                      </div>
                      <span>{event.coordinator.full_name || 'Unknown'}</span>
                    </Badge>
                  </div>
                )}

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-6'>
                  <div className='flex items-center gap-3'>
                    <div className='p-2 rounded-full bg-primary/10'>
                      <CalendarDays className='h-5 w-5 text-primary' />
                    </div>
                    <div>
                      <p className='text-sm font-medium'>Event Period</p>
                      <p className='text-sm text-muted-foreground'>
                        {formattedStartTime} - {formattedEndTime}
                      </p>
                    </div>
                  </div>

                  <div className='flex items-center gap-3'>
                    <div className='p-2 rounded-full bg-primary/10'>
                      <MapPin className='h-5 w-5 text-primary' />
                    </div>
                    <div>
                      <p className='text-sm font-medium'>Location</p>
                      <p className='text-sm text-muted-foreground'>
                        {event.place?.name || 'Not specified'}
                      </p>
                    </div>
                  </div>

                  <div className='flex items-center gap-3'>
                    <div className='p-2 rounded-full bg-primary/10'>
                      <Building className='h-5 w-5 text-primary' />
                    </div>
                    <div>
                      <p className='text-sm font-medium'>Institution</p>
                      <p className='text-sm text-muted-foreground'>
                        {event.institution?.name || 'Not specified'}
                      </p>
                    </div>
                  </div>

                  <div className='flex items-center gap-3'>
                    <div className='p-2 rounded-full bg-primary/10'>
                      <Users className='h-5 w-5 text-primary' />
                    </div>
                    <div>
                      <p className='text-sm font-medium'>Department</p>
                      <p className='text-sm text-muted-foreground'>
                        {event.department?.name || 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className='flex flex-wrap gap-2 md:flex-col md:min-w-40'>
                <Button className='w-full' asChild>
                  <Link href={`/organizations/events/${event.id}/forms/new`}>
                    <FileText className='mr-2 h-4 w-4' />
                    Create Form
                  </Link>
                </Button>
                <Button variant='outline' className='w-full' asChild>
                  <Link href={`/organizations/events/${event.id}/edit`}>
                    <Calendar className='mr-2 h-4 w-4' />
                    Edit Event
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats cards - engagement overview */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <Card className='relative overflow-hidden'>
            <CardContent className='p-6'>
              <div className='absolute top-0 right-0 p-3 opacity-10'>
                <FileText className='h-24 w-24 text-primary' />
              </div>
              <div className='relative space-y-2'>
                <p className='text-sm font-medium text-muted-foreground'>
                  Total Forms
                </p>
                <p className='text-3xl font-bold'>{forms.length}</p>
                <p className='text-xs text-muted-foreground'>
                  Registration forms for this event
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className='relative overflow-hidden'>
            <CardContent className='p-6'>
              <div className='absolute top-0 right-0 p-3 opacity-10'>
                <CheckSquare className='h-24 w-24 text-primary' />
              </div>
              <div className='relative space-y-2'>
                <p className='text-sm font-medium text-muted-foreground'>
                  Total Responses
                </p>
                {responsesLoaded ? (
                  <p className='text-3xl font-bold'>
                    {formStatistics.totalResponses}
                  </p>
                ) : (
                  <p className='text-xl text-muted-foreground'>
                    Click Statistics to load
                  </p>
                )}
                <p className='text-xs text-muted-foreground'>
                  Submissions received so far
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className='relative overflow-hidden'>
            <CardContent className='p-6'>
              <div className='absolute top-0 right-0 p-3 opacity-10'>
                <Users className='h-24 w-24 text-primary' />
              </div>
              <div className='relative space-y-2'>
                <p className='text-sm font-medium text-muted-foreground'>
                  Avg. Responses
                </p>
                {responsesLoaded ? (
                  <p className='text-3xl font-bold'>
                    {forms.length > 0
                      ? `${(formStatistics.totalResponses / forms.length).toFixed(1)}`
                      : '0'}
                  </p>
                ) : (
                  <p className='text-xl text-muted-foreground'>
                    Click Statistics to load
                  </p>
                )}
                <p className='text-xs text-muted-foreground'>
                  Per form average
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
          <TabsList className='grid w-full grid-cols-3 max-w-md mx-auto'>
            <TabsTrigger value='overview'>Overview</TabsTrigger>
            <TabsTrigger value='forms'>Forms ({forms.length})</TabsTrigger>
            <TabsTrigger value='statistics'>Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value='overview' className='space-y-6 mt-6'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              <div className='md:col-span-2 space-y-6'>
                <Card>
                  <CardHeader>
                    <CardTitle className='flex items-center'>
                      <Calendar className='mr-2 h-5 w-5' />
                      Event Details
                    </CardTitle>
                    <CardDescription>
                      Complete information about this event
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='space-y-4'>
                      <div className='grid grid-cols-2 gap-4'>
                        <div>
                          <p className='text-sm font-medium'>Start Time</p>
                          <p className='text-sm text-muted-foreground'>
                            {format(new Date(event.start_time), 'PPp')}
                          </p>
                        </div>
                        <div>
                          <p className='text-sm font-medium'>End Time</p>
                          <p className='text-sm text-muted-foreground'>
                            {format(new Date(event.end_time), 'PPp')}
                          </p>
                        </div>
                      </div>

                      {event.place && (
                        <div>
                          <p className='text-sm font-medium'>
                            Location Details
                          </p>
                          <p className='text-sm'>{event.place.name}</p>
                          {event.place.location && (
                            <p className='text-sm text-muted-foreground'>
                              {event.place.location}
                            </p>
                          )}
                        </div>
                      )}

                      <div>
                        <p className='text-sm font-medium'>
                          Organization Details
                        </p>
                        <div className='grid grid-cols-2 gap-4'>
                          <div>
                            <p className='text-sm'>Institution</p>
                            <p className='text-sm text-muted-foreground'>
                              {event.institution?.name || 'Not specified'}
                            </p>
                          </div>
                          <div>
                            <p className='text-sm'>Department</p>
                            <p className='text-sm text-muted-foreground'>
                              {event.department?.name || 'Not specified'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Event Coordinators Card */}
                <EventCoordinatorsCard
                  eventId={event.id}
                  eventInstitutionId={event.institution_id || null}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  coordinatorInstitutionId={coordinatorInstitutionId}
                  isOwner={isEventOwner}
                />
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className='flex items-center'>
                      <FileText className='mr-2 h-5 w-5' />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <Button className='w-full justify-start' asChild>
                      <Link
                        href={`/organizations/events/${event.id}/forms/new`}
                      >
                        <FileText className='mr-2 h-4 w-4' />
                        Create New Form
                      </Link>
                    </Button>

                    {forms.length > 0 && (
                      <Button
                        variant='outline'
                        className='w-full justify-start'
                        asChild
                      >
                        <Link
                          href={`/organizations/events/${event.id}/forms/${forms[0].id}/responses`}
                        >
                          <ClipboardList className='mr-2 h-4 w-4' />
                          View Responses
                        </Link>
                      </Button>
                    )}

                    <Button
                      variant='outline'
                      className='w-full justify-start'
                      asChild
                    >
                      <Link href={`/organizations/events/${event.id}/edit`}>
                        <Calendar className='mr-2 h-4 w-4' />
                        Edit Event Details
                      </Link>
                    </Button>

                    {forms.length > 0 && (
                      <Button
                        variant='outline'
                        className='w-full justify-start'
                        onClick={() => setActiveTab('statistics')}
                      >
                        <BarChart3 className='mr-2 h-4 w-4' />
                        View Statistics
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {forms.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center'>
                    <ClipboardList className='mr-2 h-5 w-5' />
                    Event Forms
                  </CardTitle>
                  <CardDescription>
                    {forms.length} form{forms.length !== 1 ? 's' : ''} available
                    for this event
                  </CardDescription>
                </CardHeader>
                <CardContent className='p-0'>
                  <div className='divide-y'>
                    {forms.slice(0, 5).map((form, index) => (
                      <div
                        key={form.id}
                        className={`flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${
                          index === 0 ? 'rounded-t-md' : ''
                        } ${index === Math.min(4, forms.length - 1) ? 'rounded-b-md' : ''}`}
                      >
                        <div className='space-y-1'>
                          <h3 className='font-medium'>{form.title}</h3>
                          <div className='flex items-center gap-2'>
                            {responsesLoaded ? (
                              <Badge variant='outline' className='text-xs'>
                                {formResponses[form.id]?.length || 0} responses
                              </Badge>
                            ) : (
                              <Badge variant='outline' className='text-xs'>
                                Responses not loaded
                              </Badge>
                            )}
                            {form.status === 'published' ? (
                              <Badge
                                variant='secondary'
                                className='bg-green-100 text-green-800 text-xs'
                              >
                                Active
                              </Badge>
                            ) : (
                              <Badge variant='outline' className='text-xs'>
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className='flex gap-2'>
                          <Button size='sm' variant='ghost' asChild>
                            <Link
                              href={`/organizations/events/${event.id}/forms/${form.id}/preview`}
                            >
                              Preview
                            </Link>
                          </Button>
                          <Button size='sm' asChild>
                            <Link
                              href={`/organizations/events/${event.id}/forms/${form.id}/responses`}
                            >
                              Responses
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                {forms.length > 5 && (
                  <CardFooter className='border-t p-4'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => setActiveTab('forms')}
                      className='w-full'
                    >
                      View all {forms.length} forms
                    </Button>
                  </CardFooter>
                )}
              </Card>
            )}
          </TabsContent>

          <TabsContent value='forms' className='mt-6'>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center'>
                  <FileText className='mr-2 h-5 w-5' />
                  All Forms
                </CardTitle>
                <CardDescription>Manage forms for this event</CardDescription>
              </CardHeader>
              <CardContent>
                <EventFormsList eventId={event.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='statistics' className='space-y-6 mt-6'>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center'>
                  <BarChart3 className='mr-2 h-5 w-5' />
                  Response Statistics
                </CardTitle>
                <CardDescription>
                  Detailed breakdown of form submissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingResponses ? (
                  <div className='flex flex-col items-center justify-center min-h-[400px] space-y-4'>
                    <BeatLoader color='#00e902' />
                    <p className='text-sm text-muted-foreground'>
                      Loading form responses...
                    </p>
                  </div>
                ) : !responsesLoaded ? (
                  <div className='flex flex-col items-center justify-center min-h-[400px] space-y-4'>
                    <BarChart3 className='h-16 w-16 text-muted-foreground/50' />
                    <p className='text-sm text-muted-foreground'>
                      Response statistics will load automatically
                    </p>
                  </div>
                ) : (
                  <div className='space-y-6'>
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                      <Card className='shadow-none border-2 border-primary/10'>
                        <CardContent className='pt-6'>
                          <div className='flex flex-col items-center justify-center text-center'>
                            <FileText className='h-10 w-10 text-primary mb-2 opacity-80' />
                            <p className='text-4xl font-bold'>
                              {formStatistics.totalForms}
                            </p>
                            <p className='text-sm text-muted-foreground mt-1'>
                              Total Forms
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className='shadow-none border-2 border-primary/10'>
                        <CardContent className='pt-6'>
                          <div className='flex flex-col items-center justify-center text-center'>
                            <CheckSquare className='h-10 w-10 text-primary mb-2 opacity-80' />
                            <p className='text-4xl font-bold'>
                              {formStatistics.totalResponses}
                            </p>
                            <p className='text-sm text-muted-foreground mt-1'>
                              Total Responses
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className='shadow-none border-2 border-primary/10'>
                        <CardContent className='pt-6'>
                          <div className='flex flex-col items-center justify-center text-center'>
                            <Users className='h-10 w-10 text-primary mb-2 opacity-80' />
                            <p className='text-4xl font-bold'>
                              {formStatistics.totalForms > 0
                                ? `${(formStatistics.totalResponses / formStatistics.totalForms).toFixed(1)}`
                                : '0'}
                            </p>
                            <p className='text-sm text-muted-foreground mt-1'>
                              Avg. Responses per Form
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Payment Statistics Section */}
                    {formStatistics.paymentStats?.hasPaymentForms && (
                      <div className='space-y-4 mt-6'>
                        <h3 className='text-lg font-medium'>
                          Payment Statistics
                        </h3>
                        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                          <Card className='shadow-none border-2 border-emerald-100 dark:border-emerald-900/30'>
                            <CardContent className='pt-6'>
                              <div className='flex flex-col items-center justify-center text-center'>
                                <CreditCard className='h-10 w-10 text-emerald-600 dark:text-emerald-400 mb-2 opacity-80' />
                                <p className='text-4xl font-bold text-emerald-600 dark:text-emerald-400'>
                                  ₹
                                  {formStatistics.paymentStats.totalAmount.toLocaleString()}
                                </p>
                                <p className='text-sm text-muted-foreground mt-1'>
                                  Total Amount
                                </p>
                              </div>
                            </CardContent>
                          </Card>

                          <Card className='shadow-none border-2 border-primary/10'>
                            <CardContent className='pt-6'>
                              <div className='flex flex-col items-center justify-center text-center'>
                                <CreditCard className='h-10 w-10 text-green-600 dark:text-green-400 mb-2 opacity-80' />
                                <p className='text-4xl font-bold text-green-600 dark:text-green-400'>
                                  ₹
                                  {formStatistics.paymentStats.completedAmount.toLocaleString()}
                                </p>
                                <p className='text-sm text-muted-foreground mt-1'>
                                  Completed Payments
                                </p>
                              </div>
                            </CardContent>
                          </Card>

                          <Card className='shadow-none border-2 border-primary/10'>
                            <CardContent className='pt-6'>
                              <div className='flex flex-col items-center justify-center text-center'>
                                <CreditCard className='h-10 w-10 text-amber-600 dark:text-amber-400 mb-2 opacity-80' />
                                <p className='text-4xl font-bold text-amber-600 dark:text-amber-400'>
                                  ₹
                                  {formStatistics.paymentStats.pendingAmount.toLocaleString()}
                                </p>
                                <p className='text-sm text-muted-foreground mt-1'>
                                  Pending Payments
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {formStatistics.paymentStats.formWisePayments.length >
                          0 && (
                          <div className='mt-6'>
                            <h3 className='text-lg font-medium mb-4'>
                              Form Payment Details
                            </h3>
                            <div className='rounded-md border'>
                              <Table>
                                <TableHeader>
                                  <TableRow className='bg-muted/50'>
                                    <TableHead className='font-medium'>
                                      Form Title
                                    </TableHead>
                                    <TableHead className='text-right font-medium'>
                                      Total Amount
                                    </TableHead>
                                    <TableHead className='text-right font-medium'>
                                      Completed
                                    </TableHead>
                                    <TableHead className='text-right font-medium'>
                                      Pending
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {formStatistics.paymentStats.formWisePayments.map(
                                    (payment) => (
                                      <TableRow
                                        key={payment.formId}
                                        className='hover:bg-muted/50'
                                      >
                                        <TableCell className='font-medium'>
                                          {payment.formTitle}
                                        </TableCell>
                                        <TableCell className='text-right'>
                                          ₹
                                          {payment.totalAmount.toLocaleString()}
                                        </TableCell>
                                        <TableCell className='text-right text-green-600 dark:text-green-400'>
                                          ₹
                                          {payment.completedAmount.toLocaleString()}
                                        </TableCell>
                                        <TableCell className='text-right text-amber-600 dark:text-amber-400'>
                                          ₹
                                          {payment.pendingAmount.toLocaleString()}
                                        </TableCell>
                                      </TableRow>
                                    )
                                  )}
                                  {formStatistics.paymentStats.formWisePayments
                                    .length === 0 && (
                                    <TableRow>
                                      <TableCell
                                        colSpan={4}
                                        className='text-center py-4 text-muted-foreground'
                                      >
                                        No payment data available
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <h3 className='text-lg font-medium mb-4'>
                        Form Response Details
                      </h3>
                      <div className='rounded-md border'>
                        <Table>
                          <TableHeader>
                            <TableRow className='bg-muted/50'>
                              <TableHead className='font-medium'>
                                Form Title
                              </TableHead>
                              <TableHead className='text-right font-medium'>
                                Responses
                              </TableHead>
                              <TableHead className='text-right font-medium'>
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {formStatistics.formStats.map((stat) => (
                              <TableRow
                                key={stat.formId}
                                className='hover:bg-muted/50'
                              >
                                <TableCell className='font-medium'>
                                  {stat.formTitle}
                                </TableCell>
                                <TableCell className='text-right'>
                                  {stat.responses}
                                </TableCell>
                                <TableCell className='text-right'>
                                  <Button variant='ghost' size='sm' asChild>
                                    <Link
                                      href={`/organizations/events/${event.id}/forms/${stat.formId}/responses`}
                                    >
                                      View Responses
                                    </Link>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                            {formStatistics.formStats.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={3}
                                  className='text-center py-4 text-muted-foreground'
                                >
                                  No forms created for this event yet
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ContentLayout>
  );
}
