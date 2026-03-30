'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserService } from '@/lib/services/users/user-service';
import { UserStats, UserFilters } from '@/types/users';
import { Profile } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { UserFiltersComponent } from './_components/user-filters';
import { ContentLayout } from '@/components/layout/content-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BeatLoader } from 'react-spinners';
import { Plus, Download } from 'lucide-react';
import { UserList } from './_components/user-list';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { UserRole } from '@/lib/constants/roles';
import { ROLE_LABELS } from '@/lib/constants/roles';
import Breadcrumbs from '@/components/layout/breadcrumb';
import { PaginationState } from '@tanstack/react-table';

export default function UsersPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    limit: 10
  });
  const [pageCount, setPageCount] = useState(0);

  // Fetch users and stats
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch users with filters
      const response = await UserService.getUsers(filters);
      setUsers(response.data);
      setPageCount(response.metadata.totalPages);

      // Fetch stats
      const { data: statsData, error: statsError } =
        await UserService.getUserStats();
      if (statsError) throw statsError;
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Check admin access
  useEffect(() => {
    const checkAccess = async () => {
      const isAdmin = await UserService.checkIsAdmin();
      if (!isAdmin) {
        router.push('/unauthorized');
      }
    };
    checkAccess();
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [filters, fetchData]);

  // Memoize the update callback
  const handleFilterChange = useCallback((newFilters: Partial<UserFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const handlePaginationChange = useCallback((pagination: PaginationState) => {
    setFilters((prev) => ({
      ...prev,
      page: pagination.pageIndex + 1, // TanStack uses 0-based index
      limit: pagination.pageSize
    }));
  }, []);

  const handleExport = async () => {
    try {
      // Fetch ALL users for export (remove limit to get all users)
      // First get the total count
      const statsResponse = await UserService.getUserStats();
      const totalUsers = statsResponse.data?.total || 0;

      // Fetch all users in batches if more than 1000
      let allUsers: Profile[] = [];
      const BATCH_SIZE = 1000;
      const totalPages = Math.ceil(totalUsers / BATCH_SIZE);

      for (let page = 1; page <= totalPages; page++) {
        const response = await UserService.getUsers({
          page,
          limit: BATCH_SIZE
        });
        allUsers = [...allUsers, ...response.data];
      }

      const users = allUsers;

      // Prepare CSV data
      const csvData = users.map((user) => ({
        full_name: user.full_name || '',
        email: user.email,
        phone: user.phone_number || '',
        bio: user.bio || '',
        role: ROLE_LABELS[user.role as UserRole],
        status: user.is_active ? 'Active' : 'Inactive',
        created_at: format(new Date(user.created_at), 'yyyy-MM-dd')
      }));

      // Convert to CSV string
      const headers = [
        'Full Name',
        'Email',
        'Phone',
        'Bio',
        'Role',
        'Status',
        'Created At'
      ];
      const csvString = [
        headers.join(','),
        ...csvData.map((row) => Object.values(row).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `users_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success('Users exported successfully');
    } catch (error) {
      console.error('Error exporting users:', error);
      toast.error('Failed to export users');
    }
  };

  if (error) {
    return (
      <ContentLayout title='Users'>
        <div className='text-center py-8'>
          <p className='text-destructive'>{error}</p>
          <Button
            variant='outline'
            onClick={() => window.location.reload()}
            className='mt-4'
          >
            Try Again
          </Button>
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title='Users'>
      <Breadcrumbs
        items={[
          { label: 'Home', link: '/' },
          { label: 'Users', link: '#' }
        ]}
      />

      <div className='space-y-6 mt-5'>
        <div className='flex justify-between items-start'>
          <div>
            <h1 className='text-3xl font-bold'>Users</h1>
            <p className='text-muted-foreground'>
              Manage and monitor user accounts
            </p>
          </div>
          <div className='flex items-center gap-4'>
            <Button variant='outline' onClick={handleExport}>
              <Download className='mr-2 h-4 w-4' />
              Export
            </Button>
            <Button asChild>
              <Link href='/users/new'>
                <Plus className='mr-2 h-4 w-4' />
                Add User
              </Link>
            </Button>
          </div>
        </div>

        {stats && (
          <div className='grid gap-4 md:grid-cols-3'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Active Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{stats.active}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Inactive Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{stats.inactive}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardContent className='p-6'>
            <UserFiltersComponent
              filters={filters}
              onFilterChange={handleFilterChange}
            />

            {isLoading ? (
              <div className='flex justify-center items-center p-8'>
                <BeatLoader color='#00e902' />
              </div>
            ) : (
              <UserList
                users={users}
                pageCount={pageCount}
                currentPage={filters.page || 1}
                pageSize={filters.limit || 10}
                onPaginationChange={handlePaginationChange}
                onRefresh={fetchData}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
