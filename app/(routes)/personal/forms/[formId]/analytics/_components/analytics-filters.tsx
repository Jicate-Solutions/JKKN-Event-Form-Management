'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import { subDays, format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

interface AnalyticsFiltersProps {
  currentFilters: {
    dateRange?: {
      start: Date;
      end: Date;
    };
    isAnonymous?: boolean;
    submittedBy?: string;
  };
  onApplyFilters: (filters: any) => void;
  onClose: () => void;
}

export function AnalyticsFilters({
  currentFilters,
  onApplyFilters,
  onClose
}: AnalyticsFiltersProps) {
  const [selectedDateRange, setSelectedDateRange] = useState<string>(
    currentFilters.dateRange ? 'custom' : 'all'
  );
  const [selectedAnonymous, setSelectedAnonymous] = useState<string>(
    currentFilters.isAnonymous === undefined
      ? 'all'
      : currentFilters.isAnonymous
        ? 'anonymous'
        : 'identified'
  );
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(
    currentFilters.dateRange
      ? {
          from: currentFilters.dateRange.start,
          to: currentFilters.dateRange.end
        }
      : undefined
  );

  const handleApply = () => {
    const filters: any = {};

    // Apply date range filter
    if (selectedDateRange !== 'all') {
      const today = new Date();
      switch (selectedDateRange) {
        case 'today':
          filters.dateRange = {
            start: new Date(today.setHours(0, 0, 0, 0)),
            end: new Date(today.setHours(23, 59, 59, 999))
          };
          break;
        case 'last7':
          filters.dateRange = {
            start: subDays(today, 7),
            end: today
          };
          break;
        case 'last30':
          filters.dateRange = {
            start: subDays(today, 30),
            end: today
          };
          break;
        case 'last90':
          filters.dateRange = {
            start: subDays(today, 90),
            end: today
          };
          break;
        case 'custom':
          if (customDateRange?.from && customDateRange?.to) {
            filters.dateRange = {
              start: customDateRange.from,
              end: customDateRange.to
            };
          }
          break;
      }
    }

    // Apply anonymous filter
    if (selectedAnonymous !== 'all') {
      filters.isAnonymous = selectedAnonymous === 'anonymous';
    }

    onApplyFilters(filters);
  };

  const handleReset = () => {
    setSelectedDateRange('all');
    setSelectedAnonymous('all');
    setCustomDateRange(undefined);
    onApplyFilters({});
  };

  return (
    <Card className='border-primary/50'>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle>Filter Analytics</CardTitle>
            <CardDescription>
              Refine your analytics view with custom filters
            </CardDescription>
          </div>
          <Button variant='ghost' size='sm' onClick={onClose}>
            <X className='h-4 w-4' />
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Date Range Filter */}
        <div className='space-y-3'>
          <Label className='text-base font-medium'>Date Range</Label>
          <RadioGroup
            value={selectedDateRange}
            onValueChange={setSelectedDateRange}
          >
            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='all' id='date-all' />
              <Label htmlFor='date-all' className='font-normal cursor-pointer'>
                All Time
              </Label>
            </div>
            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='today' id='date-today' />
              <Label
                htmlFor='date-today'
                className='font-normal cursor-pointer'
              >
                Today
              </Label>
            </div>
            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='last7' id='date-last7' />
              <Label
                htmlFor='date-last7'
                className='font-normal cursor-pointer'
              >
                Last 7 days
              </Label>
            </div>
            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='last30' id='date-last30' />
              <Label
                htmlFor='date-last30'
                className='font-normal cursor-pointer'
              >
                Last 30 days
              </Label>
            </div>
            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='last90' id='date-last90' />
              <Label
                htmlFor='date-last90'
                className='font-normal cursor-pointer'
              >
                Last 90 days
              </Label>
            </div>
            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='custom' id='date-custom' />
              <Label
                htmlFor='date-custom'
                className='font-normal cursor-pointer'
              >
                Custom Range
              </Label>
            </div>
          </RadioGroup>

          {/* Custom Date Range Picker */}
          {selectedDateRange === 'custom' && (
            <div className='mt-3'>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant='outline'
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !customDateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className='mr-2 h-4 w-4' />
                    {customDateRange?.from ? (
                      customDateRange.to ? (
                        <>
                          {format(customDateRange.from, 'LLL dd, y')} -{' '}
                          {format(customDateRange.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(customDateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-auto p-0' align='start'>
                  <Calendar
                    initialFocus
                    mode='range'
                    defaultMonth={customDateRange?.from}
                    selected={customDateRange}
                    onSelect={setCustomDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* Response Type Filter */}
        <div className='space-y-3'>
          <Label className='text-base font-medium'>Response Type</Label>
          <RadioGroup
            value={selectedAnonymous}
            onValueChange={setSelectedAnonymous}
          >
            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='all' id='type-all' />
              <Label htmlFor='type-all' className='font-normal cursor-pointer'>
                All Responses
              </Label>
            </div>
            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='identified' id='type-identified' />
              <Label
                htmlFor='type-identified'
                className='font-normal cursor-pointer'
              >
                Identified Users Only
              </Label>
            </div>
            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='anonymous' id='type-anonymous' />
              <Label
                htmlFor='type-anonymous'
                className='font-normal cursor-pointer'
              >
                Anonymous Only
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Action Buttons */}
        <div className='flex gap-3 pt-4'>
          <Button onClick={handleApply} className='flex-1'>
            Apply Filters
          </Button>
          <Button onClick={handleReset} variant='outline'>
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
