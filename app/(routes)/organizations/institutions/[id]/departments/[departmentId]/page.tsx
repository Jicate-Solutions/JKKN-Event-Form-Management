'use client';

import { use } from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ContentLayout } from '@/components/layout/content-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PenSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { Department } from '@/types/organizations';
import { DepartmentService } from '@/lib/services/organization/department-service';
import { createClientSupabaseClient } from '@/lib/supabase/client';

interface DepartmentDetailsPageProps {
  params: Promise<{ id: string; departmentId: string }>;
}

interface DepartmentWithCoordinators {
  id: string;
  name: string;
  institution_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department_coordinators: {
    id: string;
    user_id: string;
    profiles: {
      id: string;
      full_name: string;
      email: string;
      phone_number?: string;
    };
  }[];
}

export default function DepartmentDetailsPage({
  params
}: DepartmentDetailsPageProps) {
  const { id, departmentId } = use(params);
  const [department, setDepartment] =
    useState<DepartmentWithCoordinators | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientSupabaseClient();

  useEffect(() => {
    async function fetchDepartment() {
      try {
        setLoading(true);
        const { data: department, error } = await supabase
          .from('departments')
          .select(
            `
            *,
            department_coordinators (
              id,
              user_id,
              profiles:user_id (
                id,
                full_name,
                email,
                phone_number
              )
            )
          `
          )
          .eq('id', departmentId)
          .single();

        if (error) throw error;
        setDepartment(department as unknown as DepartmentWithCoordinators);
      } catch (err) {
        console.error('Error fetching department:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to fetch department'
        );
      } finally {
        setLoading(false);
      }
    }

    fetchDepartment();
  }, [departmentId]);

  return (
    <ContentLayout title='Department Details'>
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
              <Link href={`/organizations/institutions/${id}`}>
                Institutions
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{department?.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='space-y-6 mt-4'>
        <div className='flex justify-between items-center'>
          <div>
            <h1 className='text-2xl font-bold py-1'>{department?.name}</h1>
            <p className='text-sm sm:text-base text-muted-foreground'>
              Department Details
            </p>
          </div>
          <Button asChild>
            <Link
              href={`/organizations/institutions/${id}/departments/${departmentId}/edit`}
            >
              <PenSquare className='mr-2 h-4 w-4' />
              Edit Department
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Department Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 md:grid-cols-2'>
              <div>
                <h3 className='font-semibold'>Name</h3>
                <p className='text-muted-foreground'>{department?.name}</p>
              </div>
              <div>
                <h3 className='font-semibold'>Status</h3>
                <Badge
                  variant={department?.is_active ? 'default' : 'secondary'}
                >
                  {department?.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            {/* Event Coordinators Section */}
            {department?.department_coordinators &&
              department.department_coordinators.length > 0 && (
                <div className='mt-6 border-t pt-6'>
                  <h3 className='text-lg font-semibold mb-4'>
                    Event Coordinators
                  </h3>
                  <div className='grid gap-6'>
                    {department.department_coordinators.map(({ profiles }) => (
                      <div key={profiles.id} className='border rounded-lg p-4'>
                        <div className='grid gap-4 md:grid-cols-2'>
                          <div>
                            <h4 className='font-medium text-muted-foreground'>
                              Name
                            </h4>
                            <p>{profiles.full_name}</p>
                          </div>
                          <div>
                            <h4 className='font-medium text-muted-foreground'>
                              Email
                            </h4>
                            <p>{profiles.email}</p>
                          </div>
                          {profiles.phone_number && (
                            <div>
                              <h4 className='font-medium text-muted-foreground'>
                                Phone
                              </h4>
                              <p>{profiles.phone_number}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
