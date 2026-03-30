'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { ContentLayout } from '@/components/layout/content-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { PlaceList } from './_components/place-list';
import { PlaceService } from '@/lib/services/organization/place-service';
import { Place } from '@/types/organizations';
import { toast } from 'react-hot-toast';

export default function PlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    search?: string;
    isActive?: boolean;
  }>({});

  const fetchPlaces = useCallback(async () => {
    try {
      setLoading(true);
      const result = await PlaceService.getPlaces(filters);
      setPlaces(result.data);
    } catch (err) {
      console.error('Error fetching places:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch places');
      toast.error('Failed to load places');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  const handleFiltersChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
  }, []);

  return (
    <ContentLayout title='Places'>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href='/'>Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Places</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='space-y-6 mt-4'>
        <div className='flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center'>
          <div>
            <h1 className='text-2xl font-bold py-1'>Places</h1>
            <p className='text-sm sm:text-base text-muted-foreground'>
              Manage event places and venues
            </p>
          </div>
          <Button asChild>
            <Link href='/organizations/places/new'>
              <Plus className='mr-2 h-4 w-4' />
              Add Place
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className='p-6'>
            <PlaceList
              places={places}
              onRefresh={fetchPlaces}
              onFiltersChange={handleFiltersChange}
            />
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
