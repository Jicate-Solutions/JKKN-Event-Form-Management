'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Calendar } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { EventFilters } from '@/types/organizations';

interface EventFiltersProps {
  filters: EventFilters;
  onFilterChange: (filters: Partial<EventFilters>) => void;
  institutions: { id: string; name: string }[];
  places: { id: string; name: string }[];
  onReset?: () => void;
  disableInstitutionFilter?: boolean;
}

export function EventFilters({
  filters,
  onFilterChange,
  institutions,
  places,
  onReset,
  disableInstitutionFilter = false
}: EventFiltersProps) {
  const [search, setSearch] = useState(filters.search || '');
  const [status, setStatus] = useState((filters as any).status || 'all');
  const [startDate, setStartDate] = useState<Date | undefined>(
    filters.start_date ? new Date(filters.start_date) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    filters.end_date ? new Date(filters.end_date) : undefined
  );
  const debouncedSearch = useDebounce(search, 500);

  // Update filters when the debounced search changes
  useEffect(() => {
    onFilterChange({
      search: debouncedSearch || undefined
    });
  }, [debouncedSearch, onFilterChange]);

  // Handle status change
  const handleStatusChange = (value: string) => {
    setStatus(value);
    onFilterChange({
      status: value === 'all' ? undefined : value
    } as any);
  };

  // Handle date changes
  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    onFilterChange({
      start_date: date ? date.toISOString() : undefined
    });
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    onFilterChange({
      end_date: date ? date.toISOString() : undefined
    });
  };

  // Handle institution change
  const handleInstitutionChange = (value: string) => {
    onFilterChange({
      institution_id: value === 'all' ? undefined : value
    });
  };

  // Handle place change
  const handlePlaceChange = (value: string) => {
    onFilterChange({
      place_id: value === 'all' ? undefined : value
    });
  };

  const handleReset = () => {
    // Reset local state
    setSearch('');
    setStatus('all');
    setStartDate(undefined);
    setEndDate(undefined);

    // Call parent reset handler
    onReset?.();
  };

  return (
    <div className='space-y-4'>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <div className='relative'>
          <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search events...'
            className='pl-8'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select
          value={filters.institution_id || 'all'}
          onValueChange={handleInstitutionChange}
          disabled={disableInstitutionFilter}
        >
          <SelectTrigger
            className={
              disableInstitutionFilter ? 'opacity-70 cursor-not-allowed' : ''
            }
          >
            <SelectValue placeholder='Select Institution' />
          </SelectTrigger>
          <SelectContent>
            {!disableInstitutionFilter && (
              <SelectItem value='all'>All Institutions</SelectItem>
            )}
            {institutions.map((institution) => (
              <SelectItem key={institution.id} value={institution.id}>
                {institution.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.place_id || 'all'}
          onValueChange={handlePlaceChange}
        >
          <SelectTrigger>
            <SelectValue placeholder='Select Place' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Places</SelectItem>
            {places.map((place) => (
              <SelectItem key={place.id} value={place.id}>
                {place.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger>
            <SelectValue placeholder='Status' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Status</SelectItem>
            <SelectItem value='ongoing'>Ongoing</SelectItem>
            <SelectItem value='upcoming'>Upcoming</SelectItem>
            <SelectItem value='completed'>Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className='flex gap-4'>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              className={cn(
                'justify-start text-left font-normal',
                !startDate && 'text-muted-foreground'
              )}
            >
              <Calendar className='mr-2 h-4 w-4' />
              {startDate ? format(startDate, 'PPP') : 'Start Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0'>
            <CalendarComponent
              mode='single'
              selected={startDate}
              onSelect={handleStartDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              className={cn(
                'justify-start text-left font-normal',
                !endDate && 'text-muted-foreground'
              )}
            >
              <Calendar className='mr-2 h-4 w-4' />
              {endDate ? format(endDate, 'PPP') : 'End Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0'>
            <CalendarComponent
              mode='single'
              selected={endDate}
              onSelect={handleEndDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <Button
        variant='outline'
        size='sm'
        onClick={handleReset}
        className='ml-auto'
      >
        Reset Filters
      </Button>
    </div>
  );
}
