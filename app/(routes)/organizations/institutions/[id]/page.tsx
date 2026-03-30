'use client';

import { use } from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ContentLayout } from '@/components/layout/content-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, PenSquare, Plus } from 'lucide-react';
import { OrganizationService } from '@/lib/services/organization/organization-service';
import { DepartmentService } from '@/lib/services/organization/department-service';
import { Institution, Department } from '@/types/organizations';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { toast } from 'react-hot-toast';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { DepartmentList } from './departments/_components/department-list';

interface InstitutionDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default function InstitutionDetailsPage({
  params
}: InstitutionDetailsPageProps) {
  const supabase = createClientSupabaseClient();
  const { id } = use(params);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [institutionResult, departmentsResult] = await Promise.all([
        OrganizationService.getInstitution(id),
        DepartmentService.getDepartments({ institution_id: id })
      ]);

      // Get coordinator details through institution_coordinators table
      const { data: coordinator, error: coordError } = await supabase
        .from('institution_coordinators')
        .select(
          `
          profiles:user_id (
            id,
            full_name,
            email,
            phone_number
          )
        `
        )
        .eq('institution_id', id)
        .single();

      // Add logging to debug
      console.log('Coordinator data:', coordinator);

      if (coordError) {
        console.error('Error fetching coordinator:', coordError);
      }

      setInstitution({
        ...institutionResult.institution,
        coordinator: coordinator?.profiles as unknown as {
          id: string;
          full_name: string;
          email: string;
          phone_number?: string;
        }
      });
      setDepartments(departmentsResult.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  return (
    <ContentLayout title='Institution Details'>
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
              <Link href='/organizations/institutions'>Institutions</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Institution Details</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='space-y-6 mt-4'>
        {/* Institution Header */}
        <div className='flex justify-between items-center'>
          <div>
            <h1 className='text-2xl font-bold text-black py-1'>
              {institution?.name}
            </h1>
            <p className='text-sm sm:text-base text-muted-foreground'>
              Institution Details
            </p>
          </div>
          <Button asChild>
            <Link href={`/organizations/institutions/${id}/edit`}>
              <PenSquare className='mr-2 h-4 w-4' />
              Edit Institution
            </Link>
          </Button>
        </div>

        {/* Institution Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Institution Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 md:grid-cols-2'>
              <div>
                <h3 className='font-semibold'>Name</h3>
                <p className='text-muted-foreground'>{institution?.name}</p>
              </div>
              <div>
                <h3 className='font-semibold'>Status</h3>
                <Badge
                  variant={institution?.is_active ? 'default' : 'secondary'}
                >
                  {institution?.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            {/* Coordinator Details Section */}
            {institution?.coordinator && (
              <div className='mt-6 border-t pt-6'>
                <h3 className='text-lg font-semibold mb-4'>
                  Institution Coordinator
                </h3>
                <div className='grid gap-4 md:grid-cols-2'>
                  <div>
                    <h4 className='font-medium text-muted-foreground'>Name</h4>
                    <p>{institution.coordinator.full_name}</p>
                  </div>
                  <div>
                    <h4 className='font-medium text-muted-foreground'>Email</h4>
                    <p>{institution.coordinator.email}</p>
                  </div>
                  {institution.coordinator.phone_number && (
                    <div>
                      <h4 className='font-medium text-muted-foreground'>
                        Phone
                      </h4>
                      <p>{institution.coordinator.phone_number}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <div className='flex flex-col gap-2'>
                <p className='text-base text-muted-foreground'>
                  <span className='font-medium text-black'>Created: </span>
                  {institution?.created_at &&
                    new Date(institution.created_at).toLocaleDateString()}
                </p>
                <p className='text-base text-muted-foreground'>
                  <span className='font-medium text-black'>Last Updated: </span>
                  {institution?.updated_at &&
                    new Date(institution.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Departments Section */}
        <Card className='py-8 px-4'>
          {loading ? (
            <div className='flex justify-center py-8'>
              <Loader2 className='h-8 w-8 animate-spin' />
            </div>
          ) : (
            <DepartmentList
              institutionId={id}
              departments={departments}
              onRefresh={fetchData}
            />
          )}
        </Card>
      </div>
    </ContentLayout>
  );
}
