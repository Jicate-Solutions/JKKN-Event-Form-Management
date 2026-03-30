// app/(routes)/profile/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BeatLoader } from 'react-spinners';
import { Building2, Mail, Phone, Box, UserCog } from 'lucide-react';
import { ContentLayout } from '@/components/layout/content-layout';
import { useAuth } from '@/providers/auth-provider';
import { ROLE_LABELS } from '@/lib/constants/profile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileForm } from './_components/profile-form';
import { format } from 'date-fns';
import Breadcrumbs from '@/components/layout/breadcrumb';

export default function ProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  if (loading) {
    return (
      <ContentLayout title='Profile'>
        <div className='flex items-center justify-center min-h-[400px]'>
          <BeatLoader color='#000000' />
        </div>
      </ContentLayout>
    );
  }

  if (!user) {
    return (
      <ContentLayout title='Profile'>
        <div className='text-center py-8'>
          <p className='text-muted-foreground mb-4'>
            Please sign in to view your profile.
          </p>
          <Link href='/auth/login' className='text-primary hover:underline'>
            Sign In
          </Link>
        </div>
      </ContentLayout>
    );
  }

  // Generate initials for avatar
  const initials = user.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : user.email[0].toUpperCase();

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPpp');
  };

  const handleProfileUpdate = async () => {
    await refreshUser();
    setIsEditing(false);
  };

  return (
    <ContentLayout title='Profile'>
      <Breadcrumbs
        items={[
          { label: 'Home', link: '/' },
          { label: 'Profile', link: '#' }
        ]}
      />

      <div className='space-y-6 mt-5'>
        {isEditing ? (
          <ProfileForm user={user} onComplete={handleProfileUpdate} />
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className='flex flex-col md:flex-row justify-between md:items-center gap-4'>
                  <div className='flex flex-col md:flex-row items-start md:items-center gap-4'>
                    <Avatar className='h-24 w-24'>
                      <AvatarImage
                        src={user.avatar_url || undefined}
                        alt={user.full_name || user.email}
                      />
                      <AvatarFallback className='text-2xl bg-primary/10'>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className='text-2xl'>
                        {user.full_name || 'No name set'}
                      </CardTitle>
                      <div className='mt-1.5 flex items-center gap-2'>
                        <Badge variant='secondary'>
                          {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                <div className='space-y-6'>
                  <div>
                    <h3 className='text-lg font-semibold mb-4'>
                      Personal Information
                    </h3>
                    <div className='grid gap-4 md:grid-cols-2'>
                      <div className='flex items-center gap-2 text-muted-foreground'>
                        <UserCog className='h-4 w-4 shrink-0' />
                        <span className='truncate'>
                          {user.bio || 'No bio set'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />
                  {/* Contact Information */}
                  <div>
                    <h3 className='text-lg font-semibold mb-4'>
                      Contact Information
                    </h3>
                    <div className='grid gap-4 md:grid-cols-2'>
                      <div className='flex items-center gap-2 text-muted-foreground'>
                        <Mail className='h-4 w-4 shrink-0' />
                        <span className='truncate'>{user.email}</span>
                      </div>
                      <div className='flex items-center gap-2 text-muted-foreground'>
                        <Phone className='h-4 w-4 shrink-0' />
                        <span>
                          {user.phone_number || 'No phone number set'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Account Details */}
                  <div>
                    <h3 className='text-lg font-semibold mb-4'>
                      Account Details
                    </h3>
                    <div className='grid gap-4 md:grid-cols-2'>
                      <div>
                        <div className='flex items-center gap-2 text-muted-foreground mb-1'>
                          <Building2 className='h-4 w-4' />
                          <span>Member Since</span>
                        </div>
                        <p className='text-sm ml-6'>
                          {formatDate(user.created_at)}
                        </p>
                      </div>
                      {user.last_login && (
                        <div>
                          <div className='flex items-center gap-2 text-muted-foreground mb-1'>
                            <Box className='h-4 w-4' />
                            <span>Last Login</span>
                          </div>
                          <p className='text-sm ml-6'>
                            {formatDate(user.last_login)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ContentLayout>
  );
}
