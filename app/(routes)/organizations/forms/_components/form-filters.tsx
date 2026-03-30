'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search } from 'lucide-react';
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

interface FormFiltersProps {
  filters?: {
    search?: string;
    status?: string;
    institution_id?: string;
    isPublic?: boolean;
  };
  onFilterChange?: (filters: any) => void;
  onReset?: () => void;
}

export function FormFilters({
  filters = {},
  onFilterChange,
  onReset
}: FormFiltersProps) {
  const [search, setSearch] = useState(filters.search || '');
  const [status, setStatus] = useState(filters.status || 'all');
  const [visibility, setVisibility] = useState(
    filters.isPublic === undefined
      ? 'all'
      : filters.isPublic
      ? 'public'
      : 'private'
  );
  const debouncedSearch = useDebounce(search, 500);

  const handleFiltersChange = useCallback(() => {
    const newFilters: Record<string, any> = {};
    if (debouncedSearch) newFilters.search = debouncedSearch;
    if (status !== 'all') newFilters.status = status;
    if (visibility !== 'all') newFilters.isPublic = visibility === 'public';
    onFilterChange?.(newFilters);
  }, [debouncedSearch, status, visibility, onFilterChange]);

  useEffect(() => {
    handleFiltersChange();
  }, [handleFiltersChange]);

  const handleReset = () => {
    setSearch('');
    setStatus('all');
    setVisibility('all');
    onReset?.();
  };

  return (
    <div className='space-y-4'>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <div className='relative'>
          <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search forms...'
            className='pl-8'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder='Status' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Status</SelectItem>
            <SelectItem value='draft'>Draft</SelectItem>
            <SelectItem value='published'>Published</SelectItem>
            <SelectItem value='archived'>Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select value={visibility} onValueChange={setVisibility}>
          <SelectTrigger>
            <SelectValue placeholder='Visibility' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Visibility</SelectItem>
            <SelectItem value='public'>Public</SelectItem>
            <SelectItem value='private'>Private</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant='outline'
          size='sm'
          onClick={handleReset}
          className='ml-auto'
        >
          Reset Filters
        </Button>
      </div>
    </div>
  );
}
