'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Profile } from '@/types/auth';
import { UserRole } from '@/lib/constants/roles';
import { UserService } from '@/lib/services/users/user-service';
import { ContentLayout } from '@/components/layout/content-layout';
import { Card, CardContent } from '@/components/ui/card';
import { BeatLoader } from 'react-spinners';
import { RolesList } from './_components/roles-list';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { useRoles } from '@/hooks/use-roles';
import { ROLE_LABELS } from '@/lib/constants/roles';
import { toast } from 'react-hot-toast';
import {
  Shield,
  ShieldAlert,
  Users,
  GraduationCap,
  UserCog,
  User
} from 'lucide-react';
import Breadcrumbs from '@/components/layout/breadcrumb';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

// Role icons mapping
const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  [UserRole.SUPER_ADMIN]: <ShieldAlert className='w-8 h-8 text-primary' />,
  [UserRole.ADMINISTRATOR]: <Shield className='w-8 h-8 text-primary' />,
  [UserRole.STAFF]: <UserCog className='w-8 h-8 text-primary' />,
  [UserRole.STUDENT]: <Users className='w-8 h-8 text-primary' />,
  [UserRole.INSTITUTION_COORDINATOR]: (
    <Users className='w-8 h-8 text-primary' />
  ),
  [UserRole.EVENT_COORDINATOR]: <Users className='w-8 h-8 text-primary' />,
  [UserRole.PUBLIC]: <User className='w-8 h-8 text-primary' />
};

export default function RolesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [currentUserRole, setCurrentUserRole] = useState<
    UserRole | undefined
  >();
  const { canManageRoles } = useRoles(currentUserRole);
  const [roleStats, setRoleStats] = useState<Record<UserRole, number>>(
    {} as Record<UserRole, number>
  );

  const fetchUsers = useCallback(async (search?: string, role?: UserRole) => {
    try {
      const response = await UserService.getUsers({
        search,
        role,
        limit: 100
      });
      return response.data;
    } catch (err) {
      console.error('Error fetching users:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializePage = async () => {
      try {
        const { data: profile } = await UserService.getCurrentUserProfile();
        if (!mounted) return;

        if (
          !profile ||
          !['super_admin', 'administrator', 'institution_coordinator'].includes(
            profile.role
          )
        ) {
          router.push('/unauthorized');
          return;
        }

        setCurrentUserRole(profile.role);

        // Get all users stats for accurate role counts
        const { data: stats } = await UserService.getUserStats();
        if (mounted && stats) {
          setRoleStats(stats.byRole);
        }

        // Get paginated users for display
        const userData = await fetchUsers();
        if (mounted) {
          setUsers(userData);
          setError(null);
        }
      } catch (error) {
        console.error('Error initializing page:', error);
        if (mounted) {
          setError('Failed to load users');
          router.push('/unauthorized');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializePage();
    return () => {
      mounted = false;
    };
  }, [router, fetchUsers]);

  const handleSearch = useCallback(
    async (value: string) => {
      setSearchQuery(value);
      setIsLoading(true);
      try {
        const role =
          selectedRole !== 'all' ? (selectedRole as UserRole) : undefined;
        const data = await fetchUsers(value, role);
        setUsers(data);
        setError(null);
      } catch (err) {
        setError('Failed to search users');
      } finally {
        setIsLoading(false);
      }
    },
    [fetchUsers, selectedRole]
  );

  const handleRoleFilterChange = async (role: string) => {
    setSelectedRole(role);
    setIsLoading(true);
    try {
      const roleFilter = role !== 'all' ? (role as UserRole) : undefined;
      const data = await fetchUsers(searchQuery, roleFilter);
      setUsers(data);
      setError(null);
    } catch (err) {
      setError('Failed to filter users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: UserRole) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update role');
      }

      // Update stats after role change
      const { data: stats } = await UserService.getUserStats();
      if (stats) {
        setRoleStats(stats.byRole);
      }

      // Refresh the user list with current filters
      const roleFilter =
        selectedRole !== 'all' ? (selectedRole as UserRole) : undefined;
      const data = await fetchUsers(searchQuery, roleFilter);
      setUsers(data);
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update role'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUserRole || !canManageRoles) {
    return (
      <ContentLayout title='Roles & Permissions'>
        <div className='flex justify-center items-center min-h-[400px]'>
          <BeatLoader color='#00e902' />
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title='Roles & Permissions'>
      <Breadcrumbs
        items={[
          { label: 'Home', link: '/' },
          { label: 'Users', link: '/users' },
          { label: 'Roles & Permissions', link: '#' }
        ]}
      />

      <div className='space-y-6 mt-5'>
        <div>
          <h1 className='text-3xl font-bold'>Roles & Permissions</h1>
          <p className='text-muted-foreground'>
            Manage user roles and permissions. Only super admins and
            administrators can modify roles.
          </p>
        </div>

        {/* Role user counts */}
        <div className='grid gap-4 md:grid-cols-3'>
          {Object.values(UserRole).map((role) => {
            // Use the stats from getUserStats instead of filtering the paginated users
            const count = roleStats[role] || 0;
            return (
              <Card key={role} className='hover:shadow-md transition-shadow'>
                <CardContent className='p-6'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <h3 className='font-semibold text-lg mb-2'>
                        {ROLE_LABELS[role]}
                      </h3>
                      <div className='flex items-baseline gap-1'>
                        <p className='text-3xl font-bold text-primary'>
                          {count}
                        </p>
                        <p className='text-sm text-muted-foreground ml-1'>
                          users
                        </p>
                      </div>
                    </div>
                    <div className='p-4 bg-primary/5 rounded-full'>
                      {ROLE_ICONS[role]}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardContent className='p-6'>
            {/* Search and filters */}
            <div className='mb-6 flex flex-col sm:flex-row gap-4'>
              <div className='relative flex-1'>
                <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  placeholder='Search users...'
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className='pl-9'
                />
              </div>
              <Select
                value={selectedRole}
                onValueChange={handleRoleFilterChange}
              >
                <SelectTrigger className='w-full sm:w-[180px]'>
                  <SelectValue placeholder='Filter by role' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Roles</SelectItem>
                  {Object.entries(ROLE_LABELS).map(([role, label]) => (
                    <SelectItem key={role} value={role}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error ? (
              <div className='text-center text-red-500 py-4'>{error}</div>
            ) : isLoading ? (
              <div className='flex justify-center py-8'>
                <BeatLoader color='#00e902' />
              </div>
            ) : (
              <RolesList
                users={users}
                onRoleUpdate={handleRoleUpdate}
                currentUserRole={currentUserRole as UserRole}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
