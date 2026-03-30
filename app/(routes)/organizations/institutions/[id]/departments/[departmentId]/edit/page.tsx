'use client';

import { use } from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ContentLayout } from '@/components/layout/content-layout';
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
import { Department } from '@/types/organizations';
import { DepartmentService } from '@/lib/services/organization/department-service';
import { DepartmentForm } from '../../_components/department-form';

interface EditDepartmentPageProps {
  params: Promise<{ id: string; departmentId: string }>;
}

export default function EditDepartmentPage({
  params
}: EditDepartmentPageProps) {
  const { id, departmentId } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);

  useEffect(() => {
    async function fetchDepartment() {
      try {
        setLoading(true);
        setError(null);
        const data = await DepartmentService.getDepartment(departmentId);
        setDepartment(data);
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

  if (loading) {
    return (
      <ContentLayout title='Edit Department'>
        <div className='flex items-center justify-center min-h-[400px]'>
          <Loader2 className='h-8 w-8 animate-spin' />
        </div>
      </ContentLayout>
    );
  }

  if (error) {
    return (
      <ContentLayout title='Edit Department'>
        <div className='text-center py-8'>
          <p className='text-destructive mb-4'>{error}</p>
          <Button variant='outline' asChild>
            <Link href={`/organizations/institutions/${id}`}>
              Back to Institution
            </Link>
          </Button>
        </div>
      </ContentLayout>
    );
  }

  if (!department) {
    return (
      <ContentLayout title='Edit Department'>
        <div className='text-center py-8'>
          <p className='text-destructive mb-4'>Department not found</p>
          <Button variant='outline' asChild>
            <Link href={`/organizations/institutions/${id}`}>
              Back to Institution
            </Link>
          </Button>
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title='Edit Department'>
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
            <BreadcrumbLink asChild>
              <Link href={`/organizations/institutions/${id}`}>
                Institution Details
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit Department</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='space-y-6 mt-4'>
        <div>
          <h1 className='text-2xl font-bold py-1'>Edit Department</h1>
          <p className='text-sm sm:text-base text-muted-foreground'>
            Update department details
          </p>
        </div>

        <Card>
          <CardContent className='p-6'>
            <DepartmentForm
              institutionId={id}
              department={department}
              isEditing={true}
            />
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
