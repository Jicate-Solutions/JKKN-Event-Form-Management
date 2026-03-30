'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ContentLayout } from '@/components/layout/content-layout';
import { Card, CardContent } from '@/components/ui/card';
import { BeatLoader } from 'react-spinners';
import { FormService } from '@/lib/services/form-service';
import { EventService } from '@/lib/services/organization/event-service';
import { EventCoordinatorService } from '@/lib/services/organization/event-coordinator-service';
import { Form } from '@/types/forms';
import { Event } from '@/types/organizations';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { FormBuilder } from '../_components/form-builder';
import { FormCollaboratorsCard } from '../_components/form-collaborators-card';
import { createClientSupabaseClient } from '@/lib/supabase/client';

export default function EditEventFormPage() {
  const { id: eventId, formId } = useParams();
  const [form, setForm] = useState<Form | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isFormCreator, setIsFormCreator] = useState(false);
  const [isEventOwner, setIsEventOwner] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClientSupabaseClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();

        const [formData, eventData] = await Promise.all([
          FormService.getForm(formId as string),
          EventService.getEvent(eventId as string)
        ]);
        setForm(formData as unknown as Form);
        setEvent(eventData as Event);

        // Set current user and check ownership
        if (user?.id) {
          setCurrentUserId(user.id);

          // Check if user is form creator
          setIsFormCreator(formData.created_by === user.id);

          // Check if user is event owner
          const ownerStatus = await EventCoordinatorService.isEventOwner(
            eventId as string,
            user.id
          );
          setIsEventOwner(ownerStatus);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [eventId, formId]);

  if (loading) {
    return (
      <ContentLayout title='Edit Form'>
        <div className='flex justify-center items-center min-h-[400px]'>
          <BeatLoader color='#00e902' />
        </div>
      </ContentLayout>
    );
  }

  if (!form || !event) return null;

  return (
    <ContentLayout title={`Edit Form - ${form.title}`}>
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
            <BreadcrumbLink asChild>
              <Link href={`/organizations/events/${eventId}`}>
                {event.title}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/organizations/events/${eventId}`}>Forms</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit Form</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='space-y-6 mt-4'>
        <div>
          <h1 className='text-2xl font-bold py-1'>Edit Form</h1>
          <p className='text-sm sm:text-base text-muted-foreground'>
            Update form details and fields
          </p>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <div className='lg:col-span-2'>
            <Card>
              <CardContent className='p-6'>
                <FormBuilder
                  eventId={eventId as string}
                  initialForm={form}
                  isEditing={true}
                />
              </CardContent>
            </Card>
          </div>

          <div className='lg:col-span-1'>
            <FormCollaboratorsCard
              formId={formId as string}
              currentUserId={currentUserId}
              isFormCreator={isFormCreator}
              isEventOwner={isEventOwner}
            />
          </div>
        </div>
      </div>
    </ContentLayout>
  );
}
