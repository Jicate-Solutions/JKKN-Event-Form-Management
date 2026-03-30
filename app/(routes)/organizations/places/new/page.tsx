'use client';

import Link from 'next/link';
import { ContentLayout } from '@/components/layout/content-layout';
import { PlaceForm } from '../_components/place-form';
import { Card, CardContent } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';

export default function NewPlacePage() {
  return (
    <ContentLayout title='New Place'>
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
              <Link href='/organizations/places'>Places</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>New Place</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='space-y-6 mt-4'>
        <div>
          <h1 className='text-2xl font-bold py-1'>New Place</h1>
          <p className='text-sm sm:text-base text-muted-foreground'>
            Create a new event place or venue
          </p>
        </div>

        <Card>
          <CardContent className='p-6'>
            <PlaceForm />
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
} 