'use client';

import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ContentLayout } from '@/components/layout/content-layout';
import { Card, CardContent } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { FormBuilder } from '../[formId]/_components/form-builder';

export default function NewEventFormPage() {
  const { id: eventId } = useParams();
  const searchParams = useSearchParams();
  const template = searchParams.get('template');

  return (
    <ContentLayout title='New Form'>
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
                Event Details
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>New Form</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='space-y-6 mt-4'>
        <div>
          <h1 className='text-2xl font-bold py-1'>New Form</h1>
          <p className='text-sm sm:text-base text-muted-foreground'>
            Create a new form for this event
          </p>
        </div>

        <Card>
          <CardContent className='p-6'>
            <FormBuilder
              eventId={eventId as string}
              template={template || undefined}
            />
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
