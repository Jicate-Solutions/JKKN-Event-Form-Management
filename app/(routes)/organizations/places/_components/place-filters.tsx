'use client';

import { useCallback, useEffect, useState } from 'react';
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

interface PlaceFiltersProps {
  onFiltersChange: (filters: { search?: string; isActive?: boolean }) => void;
}

export function PlaceFilters({ onFiltersChange }: PlaceFiltersProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    const filters: { search?: string; isActive?: boolean } = {};
    if (debouncedSearch) filters.search = debouncedSearch;
    if (status !== 'all') filters.isActive = status === 'active';

    setTimeout(() => {
      onFiltersChange(filters);
    }, 0);
  }, [debouncedSearch, status, onFiltersChange]);

  return (
    <div className='flex flex-col sm:flex-row gap-4'>
      <div className='flex-1'>
        <div className='relative'>
          <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search places...'
            className='pl-8'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className='w-full sm:w-[180px]'>
          <SelectValue placeholder='Status' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Status</SelectItem>
          <SelectItem value='active'>Active</SelectItem>
          <SelectItem value='inactive'>Inactive</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
