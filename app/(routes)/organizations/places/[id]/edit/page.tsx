'use client';

import { use } from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ContentLayout } from '@/components/layout/content-layout';
import { PlaceForm } from '../../_components/place-form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { Place } from '@/types/organizations';
import { PlaceService } from '@/lib/services/organization/place-service';

interface EditPlacePageProps {
  params: Promise<{ id: string }>;
}

export default function EditPlacePage({ params }: EditPlacePageProps) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [place, setPlace] = useState<Place | null>(null);

  useEffect(() => {
    async function fetchPlace() {
      try {
        setLoading(true);
        setError(null);
        const data = await PlaceService.getPlace(id);
        setPlace(data);
      } catch (err) {
        console.error('Error fetching place:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to fetch place'
        );
      } finally {
        setLoading(false);
      }
    }

    fetchPlace();
  }, [id]);

  if (loading) {
    return (
      <ContentLayout title='Edit Place'>
        <div className='flex items-center justify-center min-h-[400px]'>
          <Loader2 className='h-8 w-8 animate-spin' />
        </div>
      </ContentLayout>
    );
  }

  if (error) {
    return (
      <ContentLayout title='Edit Place'>
        <div className='text-center py-8'>
          <p className='text-destructive mb-4'>{error}</p>
          <Button variant='outline' asChild>
            <Link href='/organizations/places'>Back to Places</Link>
          </Button>
        </div>
      </ContentLayout>
    );
  }

  if (!place) {
    return (
      <ContentLayout title='Edit Place'>
        <div className='text-center py-8'>
          <p className='text-destructive mb-4'>Place not found</p>
          <Button variant='outline' asChild>
            <Link href='/organizations/places'>Back to Places</Link>
          </Button>
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title='Edit Place'>
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
            <BreadcrumbPage>Edit Place</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='space-y-6 mt-4'>
        <div>
          <h1 className='text-2xl font-bold py-1'>Edit Place</h1>
          <p className='text-sm sm:text-base text-muted-foreground'>
            Update place details
          </p>
        </div>

        <Card>
          <CardContent className='p-6'>
            <PlaceForm place={place} isEditing={true} />
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
} 