'use client';

// app/(routes)/personal/forms/new/page.tsx
// Create new personal form page

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { ContentLayout } from '@/components/layout/content-layout';
import { Loader2, ArrowLeft, Shield, UserCog, Globe, Hash } from 'lucide-react';
import { toast } from 'react-hot-toast';

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  is_public: z.boolean().default(true),
  submission_limit: z
    .number()
    .positive('Must be a positive number')
    .optional()
    .nullable(),
  restrict_domain: z.boolean().default(false),
  allowed_domains: z.array(z.string()).default([])
});

type FormData = z.infer<typeof formSchema>;

export default function NewPersonalFormPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      is_public: true, // Default to public
      submission_limit: null,
      restrict_domain: false,
      allowed_domains: []
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        title: data.title,
        description: data.description,
        fields: [], // Start with empty fields
        status: 'draft',
        is_public: data.is_public ?? true,
        submission_limit: data.submission_limit,
        restrict_domain: data.restrict_domain,
        allowed_domains: data.allowed_domains
        // Auto-fetch is automatically enabled in backend for @jkkn.ac.in domain
      };

      const response = await fetch('/api/personal-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create form');
      }

      return response.json();
    },
    onSuccess: (createdForm) => {
      toast.success(
        'Form created successfully! Now add your form fields.'
      );
      // Invalidate all personal-forms queries (with any filters)
      queryClient.invalidateQueries({
        queryKey: ['personal-forms'],
        exact: false,
        refetchType: 'active'
      });
      // Redirect to form builder to add fields
      router.push(`/personal/forms/builder/${createdForm.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  return (
    <ContentLayout title='Create New Form'>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <NextLink href='/'>Home</NextLink>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <NextLink href='/personal/forms'>My Forms</NextLink>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Create New Form</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='space-y-6 mt-4'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold py-1'>Create New Form</h1>
            <p className='text-sm sm:text-base text-muted-foreground'>
              Start by giving your form a title and description
            </p>
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={() => router.push('/personal/forms')}
          >
            <ArrowLeft className='h-4 w-4 mr-2' />
            Back to Forms
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle>Form Details</CardTitle>
                <CardDescription>
                  Basic information about your form
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='title'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Form Title <span className='text-destructive'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g., Customer Feedback Survey'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='description'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='Describe the purpose of this form...'
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Globe className='h-5 w-5' />
                  Form Settings
                </CardTitle>
                <CardDescription>
                  Configure visibility and submission limits
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='is_public'
                  render={({ field }) => (
                    <FormItem className='flex items-center justify-between rounded-lg border p-4'>
                      <div className='space-y-0.5'>
                        <FormLabel>Public Form</FormLabel>
                        <FormDescription>
                          Allow anyone with the link to access and submit this
                          form
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='submission_limit'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Submission Limit</FormLabel>
                      <FormDescription>
                        Maximum number of responses allowed (leave empty for
                        unlimited)
                      </FormDescription>
                      <FormControl>
                        <Input
                          type='number'
                          placeholder='e.g., 100'
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(
                              value === '' ? null : parseInt(value)
                            );
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Shield className='h-5 w-5' />
                  Access Restrictions
                </CardTitle>
                <CardDescription>
                  Restrict form access to specific email domains (optional)
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='restrict_domain'
                  render={({ field }) => (
                    <FormItem className='flex items-center justify-between rounded-lg border p-4'>
                      <div className='space-y-0.5'>
                        <FormLabel>JKKN Domain Restriction</FormLabel>
                        <FormDescription>
                          Restrict form access to @jkkn.ac.in email addresses
                          only
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            // Automatically set allowed_domains when enabled
                            if (checked) {
                              form.setValue('allowed_domains', ['jkkn.ac.in']);
                            } else {
                              form.setValue('allowed_domains', []);
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch('restrict_domain') && (
                  <div className='rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4'>
                    <div className='flex gap-3'>
                      <div className='flex-shrink-0'>
                        <Shield className='h-5 w-5 text-blue-600 dark:text-blue-400' />
                      </div>
                      <div className='flex-1'>
                        <h4 className='text-sm font-medium text-blue-800 dark:text-blue-300'>
                          Domain Restricted to JKKN Institution
                        </h4>
                        <p className='mt-1 text-sm text-blue-700 dark:text-blue-400'>
                          This form is restricted to{' '}
                          <strong>@jkkn.ac.in</strong> email addresses. Only
                          users with JKKN institutional email can access and
                          submit this form.
                        </p>
                        <p className='mt-2 text-sm text-blue-700 dark:text-blue-400'>
                          <UserCog className='h-4 w-4 inline mr-1' />
                          User profile auto-fetch from MYJKKN will be
                          automatically enabled for this form.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Note: User Profile Auto-Fetch is automatically enabled for @jkkn.ac.in domain restriction */}

            <div className='flex justify-end gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                )}
                Create & Build Form
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </ContentLayout>
  );
}
