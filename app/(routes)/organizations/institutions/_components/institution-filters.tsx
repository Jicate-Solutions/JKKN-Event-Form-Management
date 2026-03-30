// app/(routes)/organizations/institutions/_components/institution-filters.tsx
'use client';

import { useEffect, useState } from 'react';
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
import type { InstitutionFilters } from '@/types/organizations';

interface InstitutionFiltersProps {
  filters: InstitutionFilters;
  onFilterChange: (filters: Partial<InstitutionFilters>) => void;
}

export function InstitutionFilters({
  filters,
  onFilterChange
}: InstitutionFiltersProps) {
  const [search, setSearch] = useState(filters.search || '');
  const [status, setStatus] = useState(
    filters.isActive === undefined
      ? 'all'
      : filters.isActive
      ? 'active'
      : 'inactive'
  );
  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    const newFilters: Partial<InstitutionFilters> = {};

    // Only add search if it's not empty
    if (debouncedSearch.trim()) {
      newFilters.search = debouncedSearch;
    }

    // Add status filter
    if (status !== 'all') {
      newFilters.isActive = status === 'active';
    }

    // Reset page when filters change
    newFilters.page = 1;

    onFilterChange(newFilters);
  }, [debouncedSearch, status, onFilterChange]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (!e.target.value.trim()) {
      // Clear search filter when input is empty
      onFilterChange({ search: undefined, page: 1 });
    }
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    if (value === 'all') {
      // Clear status filter when 'all' is selected
      onFilterChange({ isActive: undefined, page: 1 });
    }
  };

  return (
    <div className='flex flex-col sm:flex-row gap-4'>
      <div className='flex-1'>
        <div className='relative'>
          <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search institutions...'
            className='pl-8'
            value={search}
            onChange={handleSearchChange}
          />
        </div>
      </div>
      <Select value={status} onValueChange={handleStatusChange}>
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
