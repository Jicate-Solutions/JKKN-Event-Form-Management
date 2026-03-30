'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Profile } from '@/types/auth';
import { UserService } from '@/lib/services/users/user-service';
import { ContentLayout } from '@/components/layout/content-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { format } from 'date-fns';
import { Pencil, UserX } from 'lucide-react';
import { BeatLoader } from 'react-spinners';
import { ROLE_LABELS } from '../roles/_components/roles-list';

export default function UserDetailsPage({
  params
}: {
  params: Promise<{ userId: string }>;
}) {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = use(params);

  useEffect(() => {
    const checkAccessAndFetchUser = async () => {
      try {
        // Check admin access
        const isAdmin = await UserService.checkIsAdmin();
        if (!isAdmin) {
          router.push('/unauthorized');
          return;
        }

        // Fetch user details
        const { data: userData, error: userError } =
          await UserService.getUserById(userId);
        if (userError) throw userError;
        setUser(userData);
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    checkAccessAndFetchUser();
  }, [userId, router]);

  const handleDeactivate = async () => {
    if (!user || !confirm('Are you sure you want to deactivate this user?')) {
      return;
    }

    try {
      await UserService.deactivateUser(user.id);
      // Refresh user data
      const userData = await UserService.getUserById(userId);
      setUser(userData.data);
    } catch (err) {
      console.error('Error deactivating user:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to deactivate user'
      );
    }
  };

  if (error) {
    return (
      <ContentLayout title='User Details'>
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

  if (isLoading) {
    return (
      <ContentLayout title='User Details'>
        <div className='flex justify-center items-center min-h-[400px]'>
          <BeatLoader color='#00e902' />
        </div>
      </ContentLayout>
    );
  }

  if (!user) {
    return (
      <ContentLayout title='User Details'>
        <div className='text-center py-8'>
          <p>User not found</p>
          <Button variant='outline' asChild className='mt-4'>
            <Link href='/users'>Back to Users</Link>
          </Button>
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title='User Details'>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href='/'>Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href='/users'>Users</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{user.full_name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='space-y-6 mt-5'>
        <div className='flex justify-between items-start'>
          <div>
            <h1 className='text-3xl font-bold'>{user.full_name}</h1>
            <p className='text-muted-foreground'>{user.email}</p>
          </div>
          <div className='flex items-center gap-4'>
            <Button variant='outline' asChild>
              <Link href={`/users/${user.id}/edit`}>
                <Pencil className='mr-2 h-4 w-4' />
                Edit User
              </Link>
            </Button>
            {user.is_active && user.role !== 'super_admin' && (
              <Button variant='destructive' onClick={handleDeactivate}>
                <UserX className='mr-2 h-4 w-4' />
                Deactivate
              </Button>
            )}
          </div>
        </div>

        <div className='grid gap-6 md:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex flex-col items-start gap-2'>
                <Avatar className='h-20 w-20'>
                  <AvatarImage src={user.avatar_url || ''} />
                  <AvatarFallback>
                    {(user.full_name || 'User')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className='flex items-center gap-2'>
                  <Badge>{ROLE_LABELS[user.role]}</Badge>
                </div>
              </div>

              <div className='grid gap-4'>
                <div>
                  <p className='text-sm font-medium'>Phone Number</p>
                  <p className='text-sm text-muted-foreground'>
                    {user.phone_number || 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className='text-sm font-medium'>Bio</p>
                  <p className='text-sm text-muted-foreground'>
                    {user.bio || 'No bio provided'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='grid gap-4'>
                <div>
                  <p className='text-sm font-medium'>Profile Status</p>
                  <Badge
                    variant={user.profile_complete ? 'default' : 'secondary'}
                  >
                    {user.profile_complete ? 'Complete' : 'Incomplete'}
                  </Badge>
                </div>
                <div>
                  <p className='text-sm font-medium'>Member Since</p>
                  <p className='text-sm text-muted-foreground'>
                    {format(new Date(user.created_at), 'PPP')}
                  </p>
                </div>
                <div>
                  <p className='text-sm font-medium'>Last Updated</p>
                  <p className='text-sm text-muted-foreground'>
                    {format(new Date(user.updated_at), 'PPP')}
                  </p>
                </div>
                <div>
                  <p className='text-sm font-medium'>Status</p>
                  <Badge
                    variant={user.is_active ? 'default' : 'secondary'}
                    className=''
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ContentLayout>
  );
}
