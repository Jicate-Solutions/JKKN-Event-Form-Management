'use client';

import { useCallback, useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { UserFilters } from '@/types/users';
import { UserRole } from '@/lib/constants/roles';
import { useDebounce } from '@/hooks/use-debounce';

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  administrator: 'Administrator',
  institution_coordinator: 'Institution Coordinator',
  event_coordinator: 'Event Coordinator',
  staff: 'Staff',
  student: 'Student',
  public: 'Public'
};

interface UserFiltersProps {
  filters: UserFilters;
  onFilterChange: (filters: Partial<UserFilters>) => void;
}

export function UserFiltersComponent({
  filters,
  onFilterChange
}: UserFiltersProps) {
  const [search, setSearch] = useState(filters.search || '');
  const [role, setRole] = useState<string>(filters.role || 'all');
  const [isActive, setIsActive] = useState<boolean | undefined>(
    filters.isActive
  );
  const debouncedSearch = useDebounce(search, 500);

  // Memoize the filter change handler
  const handleFilterChange = useCallback(() => {
    const newFilters: Partial<UserFilters> = {};
    if (debouncedSearch) newFilters.search = debouncedSearch;
    if (role !== 'all') newFilters.role = role as UserRole;
    if (isActive !== undefined) newFilters.isActive = isActive;
    onFilterChange(newFilters);
  }, [debouncedSearch, role, isActive, onFilterChange]);

  // Use the memoized handler in useEffect
  useEffect(() => {
    handleFilterChange();
  }, [handleFilterChange]);

  return (
    <div className='space-y-4 mb-6'>
      <div className='grid gap-4 md:grid-cols-3'>
        {/* Search */}
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='Search users...'
            onChange={(e) => setSearch(e.target.value)}
            defaultValue={search}
            className='pl-9'
          />
        </div>

        {/* Role Filter */}
        <Select value={role} onValueChange={(value) => setRole(value)}>
          <SelectTrigger>
            <SelectValue placeholder='Filter by role' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Roles</SelectItem>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={
            isActive === undefined ? 'all' : isActive ? 'active' : 'inactive'
          }
          onValueChange={(value) =>
            setIsActive(value === 'all' ? undefined : value === 'active')
          }
        >
          <SelectTrigger>
            <SelectValue placeholder='Filter by status' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Status</SelectItem>
            <SelectItem value='active'>Active</SelectItem>
            <SelectItem value='inactive'>Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
