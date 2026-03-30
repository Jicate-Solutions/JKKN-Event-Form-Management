'use client';

import { useState, useCallback, useMemo } from 'react';
import { Calendar, Views, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { Card, CardContent } from '@/components/ui/card';
import { Event } from '@/types/organizations';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/calendar.css';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  format
} from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  ExternalLink,
  Info,
  MapPin,
  Calendar as CalendarIcon,
  Users,
  Building
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const localizer = momentLocalizer(moment);

interface EventCalendarProps {
  events: Event[];
  loading?: boolean;
  error?: string | null;
  onEventSelect?: (event: Event) => void;
  onRangeChange?: (start: Date, end: Date) => void;
  defaultDate?: Date;
}

export function EventCalendar({
  events,
  loading,
  error,
  onEventSelect,
  onRangeChange,
  defaultDate = new Date()
}: EventCalendarProps) {
  const { theme } = useTheme();
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [date, setDate] = useState(defaultDate);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Transform events for calendar display
  const calendarEvents = useMemo(() => {
    return events.map((event) => ({
      id: event.id,
      title: event.title,
      start: new Date(event.start_time),
      end: new Date(event.end_time),
      resource: event
    }));
  }, [events]);

  // Generate event style based on institution/department
  const eventStyleGetter = useCallback((event: any) => {
    const institutionColors: Record<string, string> = {
      // Add color mapping for institutions
    };

    return {
      className: cn(
        'rounded-md border relative group',
        institutionColors[event.resource.institution_id] || 'bg-primary/20'
      ),
      style: {
        border: '1px solid var(--primary)',
        cursor: 'pointer'
      }
    };
  }, []);

  // Custom event component
  const EventComponent = useCallback(({ event }: any) => {
    return (
      <div className='flex items-center justify-between w-full px-1 group'>
        <span className='truncate'>{event.title}</span>
        <Badge
          variant='outline'
          className='hidden group-hover:flex items-center gap-1 text-xs'
        >
          <Info className='h-3 w-3' />
          <span>View</span>
        </Badge>
      </div>
    );
  }, []);

  // Handle event click
  const handleEventClick = useCallback((event: any) => {
    setSelectedEvent(event.resource);
    setDialogOpen(true);
  }, []);

  // Handle view details button click
  const handleViewDetails = useCallback(() => {
    if (selectedEvent && onEventSelect) {
      onEventSelect(selectedEvent);
      setDialogOpen(false);
    }
  }, [selectedEvent, onEventSelect]);

  // Handle view change
  const handleViewChange = useCallback((newView: string) => {
    setView(newView as 'month' | 'week' | 'day');
  }, []);

  // Update onNavigate handler
  const handleNavigate = useCallback(
    (newDate: Date) => {
      setDate(newDate);
      // Only trigger range change if the callback exists
      if (onRangeChange) {
        const start = startOfMonth(newDate);
        const end = endOfMonth(newDate);
        onRangeChange(start, end);
      }
    },
    [onRangeChange]
  );

  return (
    <>
      <Card>
        <CardContent className='p-4'>
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor='start'
            endAccessor='end'
            style={{ minHeight: 600, height: '100%', width: '100%' }}
            views={['month', 'week', 'day']}
            view={view}
            date={date}
            onView={handleViewChange}
            eventPropGetter={eventStyleGetter}
            components={{
              event: EventComponent
            }}
            tooltipAccessor={(event) => `
              ${event.title}
              Location: ${event.resource.place?.name || 'No location'}
              Department: ${event.resource.department?.name || 'No department'}
              
              Click to view event details
            `}
            onSelectEvent={handleEventClick}
            onNavigate={handleNavigate}
            defaultDate={defaultDate}
          />
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            <DialogDescription>Event details</DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className='space-y-4 py-4'>
              <div className='flex items-start gap-2'>
                <CalendarIcon className='h-5 w-5 text-muted-foreground shrink-0 mt-0.5' />
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>Date & Time</p>
                  <p className='text-sm text-muted-foreground'>
                    {format(new Date(selectedEvent.start_time), 'PPP')} -{' '}
                    {format(new Date(selectedEvent.end_time), 'PPP')}
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    {format(new Date(selectedEvent.start_time), 'p')} -{' '}
                    {format(new Date(selectedEvent.end_time), 'p')}
                  </p>
                </div>
              </div>

              {selectedEvent.place && (
                <div className='flex items-start gap-2'>
                  <MapPin className='h-5 w-5 text-muted-foreground shrink-0 mt-0.5' />
                  <div>
                    <p className='text-sm font-medium'>Location</p>
                    <p className='text-sm text-muted-foreground'>
                      {selectedEvent.place.name}
                    </p>
                  </div>
                </div>
              )}

              {selectedEvent.department && (
                <div className='flex items-start gap-2'>
                  <Users className='h-5 w-5 text-muted-foreground shrink-0 mt-0.5' />
                  <div>
                    <p className='text-sm font-medium'>Department</p>
                    <p className='text-sm text-muted-foreground'>
                      {selectedEvent.department.name}
                    </p>
                  </div>
                </div>
              )}

              {selectedEvent.status && (
                <div className='flex items-start gap-2'>
                  <Badge
                    variant={
                      selectedEvent.status === 'ongoing' ? 'default' : 'outline'
                    }
                  >
                    {selectedEvent.status.charAt(0).toUpperCase() +
                      selectedEvent.status.slice(1)}
                  </Badge>
                </div>
              )}
            </div>
          )}

          <DialogFooter className='sm:justify-between'>
            <Button variant='ghost' onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button className='gap-1' onClick={handleViewDetails}>
              <ExternalLink className='h-4 w-4' />
              View Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
