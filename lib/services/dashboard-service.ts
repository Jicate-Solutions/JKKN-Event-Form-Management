import { createClientSupabaseClient } from '@/lib/supabase/client';
import { format, subMonths, parseISO, startOfDay, endOfDay } from 'date-fns';
import { EventCoordinatorService } from './organization/event-coordinator-service';

// Return types
export interface UserStats {
  totalUsers: number;
  adminCount: number;
  studentCount: number;
  newUsersThisMonth: number;
  roleDistribution: {
    name: string;
    count: number;
    color?: string;
  }[];
}

export interface Event {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status?: string | null;
  location?: string;
  description?: string;
  institution?: {
    name: string;
  };
  place?: {
    id: string;
    name: string;
  };
  forms_count?: number;
  registered_count?: number;
}

export interface EventStats {
  totalEvents: number;
  upcomingEvents: Event[];
  pastEvents: number;
  activeEvents: number;
  institutionWiseCount: { name: string; count: number }[];
  eventsByMonth: { month: string; count: number }[];
  coordinatedEvents: Event[];
  isEventCoordinator: boolean;
  ownedEvents: Event[];
  coordinatingEvents: Event[];
}

export interface FormResponse {
  id: string;
  form_id?: string;
  response_data: Record<string, any>;
  user_email: string;
  submitted_at: string;
  submission_id?: string;
  payment_status?: string;
  payment_amount?: number;
  payment_id?: string;
  payment_updated_at?: string;
  form?: {
    title: string;
  };
}

export interface FormStats {
  totalForms: number;
  totalResponses: number;
  pendingPayments: number;
  completedPayments: number;
  totalPaymentAmount: number;
  todayCompletedPayments: number;
  todayPaymentAmount: number;
  recentResponses: FormResponse[];
  responsesByMonth: { month: string; count: number }[];
  paymentStatusDistribution: { name: string; value: number; color: string }[];
  formWisePayments: {
    formId: string;
    formTitle: string;
    totalAmount: number;
    completedCount: number;
    pendingCount: number;
    failedCount: number;
  }[];
  formWiseTotalStats: {
    totalCompletedCount: number;
    totalPendingCount: number;
    totalAmount: number;
  };
}

export interface DashboardStats {
  users: UserStats;
  events: EventStats;
  forms: FormStats;
}

// Helper functions
export function calculateEventsByMonth(
  events: any[]
): { month: string; count: number }[] {
  const monthCounts = events.reduce((acc: Record<string, number>, event) => {
    try {
      if (!event.start_time) return acc;
      const date = new Date(event.start_time);
      if (isNaN(date.getTime())) return acc;

      const month = format(date, 'MMM yyyy');
      acc[month] = (acc[month] || 0) + 1;
    } catch (error) {
      // Error silently handled
    }
    return acc;
  }, {});

  return Object.entries(monthCounts)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([month, count]) => ({
      month,
      count: count as number
    }));
}

export function calculateResponsesByMonth(
  responses: FormResponse[]
): { month: string; count: number }[] {
  const monthCounts = responses.reduce(
    (acc: Record<string, number>, response) => {
      try {
        if (!response.submitted_at) return acc;
        const date = new Date(response.submitted_at);
        if (isNaN(date.getTime())) return acc;

        const month = format(date, 'MMM yyyy');
        acc[month] = (acc[month] || 0) + 1;
      } catch (error) {
        // Error silently handled
      }
      return acc;
    },
    {}
  );

  return Object.entries(monthCounts)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([month, count]) => ({
      month,
      count: count as number
    }));
}

// Main dashboard service functions
export const DashboardService = {
  async getUserStats(): Promise<UserStats> {
    const supabase = createClientSupabaseClient();
    const now = new Date();

    // First get the total count for efficiency
    const { count: totalUserCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    // Get role counts
    const { data: roleCounts } = await supabase
      .from('profiles')
      .select('role')
      .in('role', ['administrator', 'super_admin', 'student', 'staff']);

    // Get new users in last month
    const { data: newUsers } = await supabase
      .from('profiles')
      .select('id')
      .gte('created_at', subMonths(now, 1).toISOString());

    // Calculate role distribution
    const roleMap: Record<string, number> = {};
    roleCounts?.forEach((profile) => {
      if (!profile.role) return;
      roleMap[profile.role] = (roleMap[profile.role] || 0) + 1;
    });

    // Role colors
    const roleColors: Record<string, string> = {
      administrator: '#0088FE',
      super_admin: '#00C49F',
      student: '#FFBB28',
      staff: '#8884d8'
    };

    return {
      totalUsers: totalUserCount || 0,
      adminCount:
        (roleMap['administrator'] || 0) + (roleMap['super_admin'] || 0),
      studentCount: roleMap['student'] || 0,
      newUsersThisMonth: newUsers?.length || 0,
      roleDistribution: Object.entries(roleMap).map(([name, count], index) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
        count,
        color:
          roleColors[name] ||
          `#${Math.floor(Math.random() * 16777215).toString(16)}`
      }))
    };
  },

  async getEventStats(): Promise<EventStats> {
    const supabase = createClientSupabaseClient();
    const now = new Date();

    // Get current user to check for coordinator role
    const {
      data: { user }
    } = await supabase.auth.getUser();

    // Get events data
    const { data: events } = await supabase
      .from('events')
      .select(
        `
        *,
        institution:institutions(id, name),
        place:places(id, name)
      `
      )
      .order('start_time', { ascending: true });

    if (!events)
      return {
        totalEvents: 0,
        upcomingEvents: [],
        pastEvents: 0,
        activeEvents: 0,
        institutionWiseCount: [],
        eventsByMonth: [],
        coordinatedEvents: [],
        isEventCoordinator: false,
        ownedEvents: [],
        coordinatingEvents: []
      };

    // Check if user is an event coordinator using the new event_coordinators table
    let coordinatedEvents: Event[] = [];
    let ownedEvents: Event[] = [];
    let coordinatingEvents: Event[] = [];
    let isEventCoordinator = false;

    if (user?.id) {
      // Get all events user has access to (owned + coordinating)
      const { data: coordinatedEventIds } =
        await EventCoordinatorService.getUserCoordinatedEvents(user.id);

      // Get events user owns
      const { data: ownedEventIds } =
        await EventCoordinatorService.getUserOwnedEvents(user.id);

      if (coordinatedEventIds && coordinatedEventIds.length > 0) {
        isEventCoordinator = true;

        // Fetch full event details for coordinated events
        const { data: coordinatedEventsData } = await supabase
          .from('events')
          .select(
            `
            *,
            institution:institutions(id, name),
            place:places(id, name)
          `
          )
          .in('id', coordinatedEventIds)
          .order('start_time', { ascending: true });

        coordinatedEvents = (coordinatedEventsData as Event[]) || [];
      }

      if (ownedEventIds && ownedEventIds.length > 0) {
        // Fetch full event details for owned events
        const { data: ownedEventsData } = await supabase
          .from('events')
          .select(
            `
            *,
            institution:institutions(id, name),
            place:places(id, name)
          `
          )
          .in('id', ownedEventIds)
          .order('start_time', { ascending: true });

        ownedEvents = (ownedEventsData as Event[]) || [];
      }

      // Calculate coordinating events (all coordinated - owned)
      const ownedEventIdSet = new Set(ownedEventIds || []);
      coordinatingEvents = coordinatedEvents.filter(
        (event) => !ownedEventIdSet.has(event.id)
      );
    }

    // Process events
    const enhancedEvents = events.map((event) => ({ ...event })) as Event[];

    // Calculate upcoming events (events that haven't ended yet)
    const upcomingEvents = enhancedEvents
      .filter((event) => {
        if (!event.end_time) return false;
        try {
          const endDate = parseISO(event.end_time);
          const endOfDayDate = endOfDay(endDate);
          return endOfDayDate >= now;
        } catch (error) {
          return false;
        }
      })
      .sort((a, b) => {
        try {
          const aDate = parseISO(a.start_time);
          const bDate = parseISO(b.start_time);
          return aDate.getTime() - bDate.getTime();
        } catch (error) {
          return 0;
        }
      });

    // Calculate past events
    const pastEvents = enhancedEvents.filter((event) => {
      try {
        const endDate = parseISO(event.end_time);
        return endDate < now;
      } catch (error) {
        return false;
      }
    }).length;

    // Calculate active events
    const activeEvents = enhancedEvents.filter((event) => {
      try {
        const startDate = parseISO(event.start_time);
        const endDate = parseISO(event.end_time);
        const startOfDayDate = startOfDay(startDate);
        const endOfDayDate = endOfDay(endDate);
        return startOfDayDate <= now && endOfDayDate >= now;
      } catch (error) {
        return false;
      }
    }).length;

    // Calculate institution-wise count
    const institutionWiseCount = events.reduce(
      (acc: Record<string, number>, event) => {
        const name = event.institution?.name || 'Unknown';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      },
      {}
    );

    return {
      totalEvents: enhancedEvents.length,
      upcomingEvents: upcomingEvents.slice(0, 5),
      pastEvents,
      activeEvents,
      institutionWiseCount: Object.entries(institutionWiseCount)
        .map(([name, count]) => ({ name, count: count as number }))
        .sort((a, b) => b.count - a.count),
      eventsByMonth: calculateEventsByMonth(enhancedEvents),
      coordinatedEvents: coordinatedEvents || [],
      isEventCoordinator,
      ownedEvents: ownedEvents || [],
      coordinatingEvents: coordinatingEvents || []
    };
  },

  async getFormStats(): Promise<FormStats> {
    const supabase = createClientSupabaseClient();
    const now = new Date();
    const todayStart = startOfDay(now);

    // Get forms data
    const { data: forms } = await supabase.from('forms').select('*');

    // Get form responses with pagination for efficiency
    const { data: formResponses, count: totalFormResponses } = await supabase
      .from('form_responses')
      .select(
        `
        *,
        form:forms(id, title)
      `,
        { count: 'exact' }
      )
      .order('submitted_at', { ascending: false })
      .limit(500); // Limit to a reasonable amount

    // Calculate payment stats
    const pendingPayments = (formResponses || []).filter(
      (response) => response.payment_status === 'pending'
    ).length;

    const completedPayments = (formResponses || []).filter(
      (response) =>
        response.payment_status === 'completed' ||
        response.payment_status === 'paid'
    ).length;

    const totalPaymentAmount = (formResponses || [])
      .filter(
        (response) =>
          (response.payment_status === 'completed' ||
            response.payment_status === 'paid') &&
          response.payment_amount &&
          response.payment_amount > 0
      )
      .reduce(
        (sum, response) => sum + (Number(response.payment_amount) || 0),
        0
      );

    // Calculate today's payment stats
    const todayCompletedPayments = (formResponses || []).filter(
      (response) =>
        (response.payment_status === 'completed' ||
          response.payment_status === 'paid') &&
        new Date(
          (response.payment_updated_at || response.submitted_at) as string
        ) >= todayStart
    ).length;

    const todayPaymentAmount = (formResponses || [])
      .filter(
        (response) =>
          (response.payment_status === 'completed' ||
            response.payment_status === 'paid') &&
          response.payment_amount &&
          response.payment_amount > 0 &&
          new Date(
            (response.payment_updated_at || response.submitted_at) as string
          ) >= todayStart
      )
      .reduce(
        (sum, response) => sum + (Number(response.payment_amount) || 0),
        0
      );

    // Calculate payment status distribution
    const paymentStatusCounts = (formResponses || []).reduce(
      (acc: Record<string, number>, response) => {
        let status = response.payment_status || 'unknown';
        if (status.toLowerCase() === 'paid') {
          status = 'completed';
        }
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {}
    );

    // Payment status colors
    const paymentStatusColors: Record<string, string> = {
      completed: '#00C49F',
      paid: '#00C49F',
      pending: '#FFBB28',
      failed: '#FF8042',
      unknown: '#8884d8'
    };

    // Form-wise payment collection
    const formWisePayments = new Map<
      string,
      {
        formId: string;
        formTitle: string;
        totalAmount: number;
        completedCount: number;
        pendingCount: number;
        failedCount: number;
      }
    >();

    // Process form responses to calculate payment stats per form
    (formResponses || []).forEach((response) => {
      if (!response.form?.id && !response.form_id) return;

      const formId = response.form?.id || response.form_id;
      const formTitle = response.form?.title || 'Unknown Form';

      if (!formWisePayments.has(formId)) {
        formWisePayments.set(formId, {
          formId,
          formTitle,
          totalAmount: 0,
          completedCount: 0,
          pendingCount: 0,
          failedCount: 0
        });
      }

      const formStats = formWisePayments.get(formId)!;

      // Calculate payment info
      if (
        (response.payment_status === 'completed' ||
          response.payment_status === 'paid') &&
        response.payment_amount &&
        response.payment_amount > 0
      ) {
        formStats.totalAmount += Number(response.payment_amount);
        formStats.completedCount++;
      } else if (response.payment_status === 'pending') {
        formStats.pendingCount++;
      } else if (response.payment_status === 'failed') {
        formStats.failedCount++;
      }
    });

    // Convert map to array and sort by total amount
    const formPaymentStats = Array.from(formWisePayments.values())
      .filter(
        (stats) =>
          stats.totalAmount > 0 ||
          stats.completedCount > 0 ||
          stats.pendingCount > 0
      )
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Calculate total stats from formWisePayments
    const formWiseTotalStats = {
      totalCompletedCount: 0,
      totalPendingCount: 0,
      totalAmount: 0
    };

    formPaymentStats.forEach((stats) => {
      formWiseTotalStats.totalCompletedCount += stats.completedCount;
      formWiseTotalStats.totalPendingCount += stats.pendingCount;
      formWiseTotalStats.totalAmount += stats.totalAmount;
    });

    return {
      totalForms: forms?.length || 0,
      totalResponses: totalFormResponses || 0,
      pendingPayments,
      completedPayments,
      totalPaymentAmount,
      todayCompletedPayments,
      todayPaymentAmount,
      recentResponses: (formResponses || []).slice(0, 10) as FormResponse[],
      responsesByMonth: calculateResponsesByMonth(
        (formResponses || []) as FormResponse[]
      ),
      paymentStatusDistribution: Object.entries(paymentStatusCounts).map(
        ([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          color:
            paymentStatusColors[name] ||
            `#${Math.floor(Math.random() * 16777215).toString(16)}`
        })
      ),
      formWisePayments: formPaymentStats,
      formWiseTotalStats
    };
  },

  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const [users, events, forms] = await Promise.all([
        this.getUserStats(),
        this.getEventStats(),
        this.getFormStats()
      ]);

      return { users, events, forms };
    } catch (error) {
      throw new Error('Failed to fetch dashboard data');
    }
  }
};
