import Link from 'next/link';
import { ContentLayout } from '@/components/layout/content-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';

export default function UserDetailsLoading() {
  return (
    <ContentLayout title='User Details'>
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
            <BreadcrumbPage>
              <Skeleton className='h-4 w-[100px]' />
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='space-y-6 mt-5'>
        <div className='flex justify-between items-start'>
          <div>
            <Skeleton className='h-8 w-[200px] mb-2' />
            <Skeleton className='h-4 w-[150px]' />
          </div>
          <div className='flex items-center gap-4'>
            <Skeleton className='h-10 w-[100px]' />
            <Skeleton className='h-10 w-[120px]' />
          </div>
        </div>

        <div className='grid gap-6 md:grid-cols-2'>
          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-[150px]' />
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center gap-4'>
                <Skeleton className='h-20 w-20 rounded-full' />
                <div>
                  <Skeleton className='h-5 w-[80px] mb-2' />
                  <Skeleton className='h-5 w-[100px]' />
                </div>
              </div>

              <div className='grid gap-2'>
                <div>
                  <Skeleton className='h-4 w-[100px] mb-1' />
                  <Skeleton className='h-4 w-[150px]' />
                </div>
                <div>
                  <Skeleton className='h-4 w-[60px] mb-1' />
                  <Skeleton className='h-4 w-[200px]' />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-[150px]' />
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-2'>
                <div>
                  <Skeleton className='h-4 w-[120px] mb-1' />
                  <Skeleton className='h-5 w-[100px]' />
                </div>
                <div>
                  <Skeleton className='h-4 w-[100px] mb-1' />
                  <Skeleton className='h-4 w-[150px]' />
                </div>
                <div>
                  <Skeleton className='h-4 w-[100px] mb-1' />
                  <Skeleton className='h-4 w-[150px]' />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ContentLayout>
  );
}
