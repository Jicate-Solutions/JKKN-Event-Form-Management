'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ContentLayout } from '@/components/layout/content-layout';
import { EventForm } from '../_components/event-form';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BeatLoader } from 'react-spinners';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { UserRole } from '@/lib/constants/roles';

export default function NewEventPage() {
  const [loading, setLoading] = useState(true);
  const [coordinatorInstitution, setCoordinatorInstitution] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isCoordinator, setIsCoordinator] = useState(false);

  // Get current user profile
  const getCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClientSupabaseClient();

      // Get current user
      const { data: userProfile } = await supabase.auth.getUser();
      if (!userProfile?.user?.id) return;

      // Get current user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userProfile.user.id)
        .single();

      if (!profile) return;

      // Check if user is an institution coordinator
      if (profile.role === UserRole.INSTITUTION_COORDINATOR) {
        setIsCoordinator(true);
        const { data: coordinatorData } = await supabase
          .from('institution_coordinators')
          .select('institution_id')
          .eq('user_id', userProfile.user.id)
          .maybeSingle();

        if (coordinatorData?.institution_id) {
          // Get institution details
          const { data: institution } = await supabase
            .from('institutions')
            .select('id, name')
            .eq('id', coordinatorData.institution_id)
            .single();

          if (institution) {
            setCoordinatorInstitution(institution);
          }
        }
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getCurrentUser();
  }, [getCurrentUser]);

  if (loading) {
    return (
      <ContentLayout title='New Event'>
        <div className='flex justify-center items-center min-h-[400px]'>
          <BeatLoader color='#00e902' />
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout
      title={
        coordinatorInstitution
          ? `New ${coordinatorInstitution.name} Event`
          : 'New Event'
      }
    >
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
              <Link href='/organizations/events'>Events</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>New Event</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='space-y-6 mt-4'>
        <div>
          <div className='flex items-center gap-4'>
            <h1 className='text-2xl font-bold py-1'>New Event</h1>
            {isCoordinator && coordinatorInstitution && (
              <Badge variant='outline'>Institution Coordinator</Badge>
            )}
          </div>
          <p className='text-sm sm:text-base text-muted-foreground'>
            {coordinatorInstitution
              ? `Create a new event for ${coordinatorInstitution.name}`
              : 'Create a new event'}
          </p>
        </div>

        <Card>
          <CardContent className='p-6'>
            <EventForm
              coordinatorInstitution={coordinatorInstitution}
              isCoordinator={isCoordinator}
            />
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
