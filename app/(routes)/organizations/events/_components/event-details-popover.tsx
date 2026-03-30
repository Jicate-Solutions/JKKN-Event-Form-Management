'use client';

import { format } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Event } from '@/types/organizations';
import { cn } from '@/lib/utils';

interface EventDetailsPopoverProps {
  event: Event;
  children: React.ReactNode;
}

export function EventDetailsPopover({ event, children }: EventDetailsPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <h3 className="font-semibold">{event.title}</h3>
          {event.description && (
            <div
              className={cn(
                'text-sm text-muted-foreground prose prose-sm max-w-none rich-text-content',
                'prose-headings:mt-1 prose-headings:mb-1',
                'prose-p:mt-0 prose-p:mb-1',
                'prose-ul:mt-0 prose-ul:mb-1 prose-ul:list-disc prose-ul:ml-4',
                'prose-ol:mt-0 prose-ol:mb-1 prose-ol:list-decimal prose-ol:ml-4',
                'prose-li:mt-0 prose-li:mb-0.5 prose-li:pl-1',
                'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
                '[&_h2]:text-sm [&_h2]:font-medium [&_h2]:mt-1 [&_h2]:mb-1',
                '[&_h3]:text-xs [&_h3]:font-medium [&_h3]:mt-1 [&_h3]:mb-1',
                '[&_ul]:list-disc [&_ul]:ml-4 [&_ul]:mt-1 [&_ul]:mb-1',
                '[&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:mt-1 [&_ol]:mb-1',
                '[&_li]:mb-0.5 [&_li]:pl-1',
                '[&_strong]:font-medium',
                '[&_em]:italic',
                '[&_u]:underline',
                // Add line clamping for popover
                'line-clamp-3 overflow-hidden'
              )}
              dangerouslySetInnerHTML={{ __html: event.description }}
            />
          )}
          <div className="text-sm">
            <p>
              <span className="font-medium">Start:</span>{' '}
              {format(new Date(event.start_time), 'PPp')}
            </p>
            <p>
              <span className="font-medium">End:</span>{' '}
              {format(new Date(event.end_time), 'PPp')}
            </p>
            {event.place && (
              <p>
                <span className="font-medium">Location:</span> {event.place.name}
              </p>
            )}
            {event.department && (
              <p>
                <span className="font-medium">Department:</span>{' '}
                {event.department.name}
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
} 