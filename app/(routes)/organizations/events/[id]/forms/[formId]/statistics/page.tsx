'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FormService } from '@/lib/services/form-service';
import { Form } from '@/types/forms';
import { FormResponse } from '@/types/form-responses';
import { ContentLayout } from '@/components/layout/content-layout';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { BeatLoader } from 'react-spinners';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ArrowDownToLine, BarChart2 } from 'lucide-react';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatisticsFieldsGrid } from './components/statistics-fields-grid';
import { StatisticsOverview } from './components/statistics-overview';
import { ExportStats } from './components/export-stats';

export default function FormStatisticsPage() {
  const { id: eventId, formId } = useParams<{
    id: string;
    formId: string;
  }>();
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; role?: string }>(
    { id: '' }
  );

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Get current user
        const supabase = createClientSupabaseClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();

        // Fetch the user's profile to get their role
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user?.id || '')
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
        }

        const userRole = profileData?.role;

        // Store user info in state for later use
        setCurrentUser({
          id: user?.id || '',
          role: userRole
        });

        // Fetch form and responses data
        const [formData, responsesData] = await Promise.all([
          FormService.getForm(formId as string),
          FormService.getFormResponses(formId as string, {
            id: user?.id || '',
            role: userRole
          })
        ]);

        // Fetch user details for each response
        const enrichedResponses = await Promise.all(
          responsesData.map(async (response) => {
            try {
              const { data: userData } = await supabase
                .from('profiles')
                .select('full_name, email, avatar_url, role')
                .eq('email', response.user_email)
                .single();

              return {
                ...response,
                user: userData
              };
            } catch (error) {
              console.error(
                `Error fetching user data for ${response.user_email}:`,
                error
              );
              return response;
            }
          })
        );

        setForm(formData as unknown as Form);
        setResponses(enrichedResponses);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [formId, eventId]);

  if (loading) {
    return (
      <ContentLayout title='Form Statistics'>
        <div className='flex justify-center items-center min-h-[400px]'>
          <BeatLoader color='#00e902' />
        </div>
      </ContentLayout>
    );
  }

  if (!form) {
    return (
      <ContentLayout title='Form Not Found'>
        <div className='py-8 text-center'>
          <p className='text-muted-foreground mb-4'>
            The requested form could not be found.
          </p>
          <Button variant='outline' onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title={`${form.title} - Statistics`}>
      <Breadcrumb className='mb-6'>
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
            <BreadcrumbLink asChild>
              <Link
                href={`/organizations/events/${eventId}/forms/${formId}/responses`}
              >
                Form Responses
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Statistics</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='flex items-center justify-between mb-6'>
        <div>
          <div className='flex items-center gap-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() =>
                router.push(
                  `/organizations/events/${eventId}/forms/${formId}/responses`
                )
              }
              className='hover:bg-transparent p-0 h-auto'
            >
              <ChevronLeft className='h-4 w-4 mr-1' />
              Back to Responses
            </Button>
          </div>
          <h1 className='text-2xl font-bold mt-2'>{form.title}</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Total Responses: {responses.length}
          </p>
        </div>

        <div className='flex gap-2'>
          <ExportStats form={form} responses={responses} />
        </div>
      </div>

      <Tabs defaultValue='overview' className='space-y-6'>
        <TabsList>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='fields'>Field Statistics</TabsTrigger>
          <TabsTrigger value='demographics'>Demographics</TabsTrigger>
        </TabsList>

        <div className='statistics-container'>
          <TabsContent value='overview' className='space-y-6'>
            <StatisticsOverview form={form} responses={responses} />
          </TabsContent>

          <TabsContent value='fields' className='space-y-6'>
            <StatisticsFieldsGrid form={form} responses={responses} />
          </TabsContent>

          <TabsContent value='demographics' className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle>Response Demographics</CardTitle>
                <CardDescription>
                  Breakdown of responses by user demographics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Demographic charts will be implemented here */}
                <div className='text-muted-foreground text-center py-8'>
                  Demographic data visualization coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </ContentLayout>
  );
}
