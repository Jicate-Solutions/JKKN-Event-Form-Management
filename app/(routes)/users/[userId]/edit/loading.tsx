import { ContentLayout } from '@/components/layout/content-layout';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import Link from 'next/link';

export default function EditUserLoading() {
  return (
    <ContentLayout title='Edit User'>
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
              <Link href='/users'>Users</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit User</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='space-y-6'>
        <div>
          <Skeleton className='h-10 w-[200px]' />
          <Skeleton className='h-4 w-[300px] mt-2' />
        </div>

        <div className='space-y-8'>
          <div className='grid gap-6 md:grid-cols-2'>
            {/* Form field skeletons */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className='space-y-2'>
                <Skeleton className='h-4 w-[100px]' />
                {i < 4 ? (
                  <Skeleton className='h-10 w-full' />
                ) : (
                  <div className='flex flex-row items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <Skeleton className='h-5 w-[120px]' />
                      <Skeleton className='h-4 w-[200px]' />
                    </div>
                    <Skeleton className='h-6 w-12' />
                  </div>
                )}
                {i === 1 && <Skeleton className='h-4 w-[200px]' />}
              </div>
            ))}
          </div>

          <div className='flex gap-4'>
            <Skeleton className='h-10 w-[120px]' />
            <Skeleton className='h-10 w-[100px]' />
          </div>
        </div>
      </div>
    </ContentLayout>
  );
}
