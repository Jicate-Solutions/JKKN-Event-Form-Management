'use client';

import Link from 'next/link';
import { ContentLayout } from '@/components/layout/content-layout';
import { FormBuilder } from './_components/form-builder';
import { Card, CardContent } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';

export default function FormBuilderPage() {
  return (
    <ContentLayout title='Form Builder'>
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
              <Link href='/organizations/forms'>Forms</Link>
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
            Create a new form
          </p>
        </div>

        <Card>
          <CardContent className='p-6'>
            <FormBuilder />
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
