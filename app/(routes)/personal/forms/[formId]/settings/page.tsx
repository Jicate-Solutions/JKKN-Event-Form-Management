'use client';

// app/(routes)/personal/forms/[formId]/settings/page.tsx
// Form settings and configuration page

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Loader2, Save, Trash2, Shield, UserCog } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useState } from 'react';

const settingsSchema = z.object({
  status: z.enum(['draft', 'published', 'archived']),
  is_public: z.boolean(),
  submission_limit: z.number().positive('Must be a positive number').optional(),
  restrict_domain: z.boolean(),
  allowed_domains: z.array(z.string()).default([]),
  enable_user_autofetch: z.boolean(),
  require_institutional_profile: z.boolean(),
  allow_manual_entry_fallback: z.boolean()
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function FormSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const formId = params.formId as string;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch form details
  const { data: formData, isLoading } = useQuery({
    queryKey: ['personal-form', formId],
    queryFn: async () => {
      const response = await fetch(`/api/personal-forms/${formId}`);
      if (!response.ok) throw new Error('Failed to fetch form');
      return response.json();
    }
  });

  // Check permissions
  const { data: permissionsData, isLoading: permissionsLoading } = useQuery({
    queryKey: ['personal-form-permissions', formId],
    queryFn: async () => {
      const response = await fetch(
        `/api/personal-forms/${formId}/collaborators/me`
      );
      if (!response.ok) return null;
      return response.json();
    }
  });

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    values: formData ? {
      status: formData.status,
      is_public: formData.is_public ?? false,
      submission_limit: formData.submission_limit ?? undefined,
      restrict_domain: formData.restrict_domain ?? false,
      allowed_domains: formData.allowed_domains ?? [],
      enable_user_autofetch: formData.enable_user_autofetch ?? false,
      require_institutional_profile: formData.require_institutional_profile ?? false,
      allow_manual_entry_fallback: formData.allow_manual_entry_fallback ?? false
    } : undefined
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const response = await fetch(`/api/personal-forms/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update settings');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Settings saved successfully');
      queryClient.invalidateQueries({ queryKey: ['personal-form', formId] });
      // Invalidate all personal-forms queries (with any filters)
      queryClient.invalidateQueries({
        queryKey: ['personal-forms'],
        exact: false,
        refetchType: 'active'
      });

      // Redirect to form details page after successful save
      setTimeout(() => {
        router.push(`/personal/forms/${formId}`);
      }, 500);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/personal-forms/${formId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete form');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Form deleted successfully');
      router.push('/personal/forms');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const onSubmit = (data: SettingsFormData) => {
    updateMutation.mutate(data);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const canEdit =
    permissionsData?.is_owner || permissionsData?.can_edit_structure || false;
  const canDelete = permissionsData?.is_owner || false;

  // Show loading while fetching initial data (form + permissions)
  if (isLoading || permissionsLoading) {
    return (
      <ContentLayout title='Form Settings'>
        <div className='flex items-center justify-center py-12'>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        </div>
      </ContentLayout>
    );
  }

  if (!formData) {
    return (
      <ContentLayout title='Form Settings'>
        <div className='text-center py-12'>
          <p className='text-destructive'>Form not found</p>
        </div>
      </ContentLayout>
    );
  }

  // Only check permissions after permission data has loaded
  if (!permissionsLoading && !canEdit) {
    return (
      <ContentLayout title='Form Settings'>
        <div className='text-center py-12'>
          <p className='text-destructive'>
            You do not have permission to edit this form
          </p>
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title='Form Settings'>
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
              <Link href='/personal/forms'>My Forms</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/personal/forms/${formId}`}>{formData.title}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='max-w-5xl mx-auto space-y-6 mt-4'>
        {/* Header */}
        <div>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => router.push(`/personal/forms/${formId}`)}
            className='mb-4'
          >
            <ArrowLeft className='h-4 w-4 mr-2' />
            Back to Form
          </Button>

          <h1 className='text-2xl font-bold py-1'>Form Settings</h1>
          <p className='text-sm sm:text-base text-muted-foreground'>
            Configure form behavior and visibility
          </p>
        </div>

        {/* Settings Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            {/* Status and Visibility Card */}
            <Card>
              <CardHeader>
                <CardTitle>Status and Visibility</CardTitle>
                <CardDescription>
                  Control form status and public access
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-6'>
                <FormField
                  control={form.control}
                  name='status'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Form Status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select status' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='draft'>Draft</SelectItem>
                          <SelectItem value='published'>Published</SelectItem>
                          <SelectItem value='archived'>Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Only published forms can accept submissions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='is_public'
                  render={({ field }) => (
                    <FormItem className='flex items-center justify-between rounded-lg border p-4'>
                      <div className='space-y-0.5'>
                        <FormLabel>Public Form</FormLabel>
                        <FormDescription>
                          Allow anyone with the link to submit responses
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
              </CardContent>
            </Card>

            {/* Submission Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle>Submission Settings</CardTitle>
                <CardDescription>
                  Configure submission limits and restrictions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name='submission_limit'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Submission Limit</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          placeholder='Unlimited'
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(
                              value ? parseInt(value, 10) : undefined
                            );
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of submissions allowed. Leave empty for
                        unlimited submissions.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Access Restrictions Card */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Shield className='h-5 w-5' />
                  Access Restrictions
                </CardTitle>
                <CardDescription>
                  Restrict form access to specific email domains
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-6'>
                <FormField
                  control={form.control}
                  name='restrict_domain'
                  render={({ field }) => (
                    <FormItem className='flex items-center justify-between rounded-lg border p-4'>
                      <div className='space-y-0.5'>
                        <FormLabel>JKKN Domain Restriction</FormLabel>
                        <FormDescription>
                          Restrict form access to @jkkn.ac.in email addresses only
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
                          This form is restricted to <strong>@jkkn.ac.in</strong> email addresses. Only users with JKKN institutional email can access and submit this form.
                        </p>
                        <p className='mt-2 text-sm text-blue-700 dark:text-blue-400'>
                          <UserCog className='h-4 w-4 inline mr-1' />
                          User profile auto-fetch from MYJKKN will be automatically enabled for this form.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* User Profile Auto-Fetch Card */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <UserCog className='h-5 w-5' />
                  User Profile Auto-Fetch
                </CardTitle>
                <CardDescription>
                  Automatically fetch user profile data from MYJKKN application
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-6'>
                {/* Info Alert for Automatic Configuration */}
                {form.watch('restrict_domain') &&
                 form.watch('allowed_domains')?.some((d: string) => d.toLowerCase().includes('jkkn.ac.in')) && (
                  <div className='bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4'>
                    <div className='flex gap-3'>
                      <div className='flex-shrink-0'>
                        <svg className='h-5 w-5 text-blue-600 dark:text-blue-400' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'>
                          <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z' clipRule='evenodd' />
                        </svg>
                      </div>
                      <div className='flex-1'>
                        <h4 className='text-sm font-medium text-blue-800 dark:text-blue-300'>
                          Auto-Fetch Enabled Automatically
                        </h4>
                        <p className='mt-1 text-sm text-blue-700 dark:text-blue-400'>
                          Because this form is restricted to @jkkn.ac.in domain, user profile auto-fetch is automatically enabled. The system will fetch student/staff data from MYJKKN when users submit the form.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name='enable_user_autofetch'
                  render={({ field }) => (
                    <FormItem className='flex items-center justify-between rounded-lg border p-4'>
                      <div className='space-y-0.5'>
                        <FormLabel>Enable Auto-Fetch</FormLabel>
                        <FormDescription>
                          Automatically fetch institutional user data based on email address
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

                {form.watch('enable_user_autofetch') && (
                  <div className='rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4'>
                    <div className='flex gap-3'>
                      <div className='flex-shrink-0'>
                        <svg className='h-5 w-5 text-green-600 dark:text-green-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
                        </svg>
                      </div>
                      <div className='flex-1'>
                        <h4 className='text-sm font-medium text-green-800 dark:text-green-300'>
                          MYJKKN API Configured
                        </h4>
                        <p className='mt-1 text-sm text-green-700 dark:text-green-400'>
                          This form will use the system-wide MYJKKN API key to automatically fetch user profile data. No additional configuration needed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {form.watch('enable_user_autofetch') && (
                  <>
                    <div className='space-y-4 pt-4 border-t'>
                      <h4 className='text-sm font-semibold'>Auto-Fetch Behavior</h4>

                      <FormField
                        control={form.control}
                        name='require_institutional_profile'
                        render={({ field }) => (
                          <FormItem className='flex items-start justify-between rounded-lg border p-4'>
                            <div className='space-y-0.5 pr-4'>
                              <FormLabel>Require MYJKKN Profile</FormLabel>
                              <FormDescription>
                                Block submissions from users not found in MYJKKN database. Only registered students and staff can submit.
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

                      {!form.watch('require_institutional_profile') && (
                        <FormField
                          control={form.control}
                          name='allow_manual_entry_fallback'
                          render={({ field }) => (
                            <FormItem className='flex items-start justify-between rounded-lg border p-4'>
                              <div className='space-y-0.5 pr-4'>
                                <FormLabel>Allow Manual Entry Fallback</FormLabel>
                                <FormDescription>
                                  If user not found in MYJKKN, show manual entry form for profile details instead of blocking submission.
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
                      )}
                    </div>

                    <div className='rounded-lg bg-muted p-4 space-y-2'>
                      <p className='text-sm font-medium'>How it works:</p>
                      <ul className='text-sm text-muted-foreground space-y-1 list-disc list-inside'>
                        <li>Uses system-wide MYJKKN API key (managed automatically by the system)</li>
                        <li>System tries student database first, then staff database (sequential search)</li>
                        <li>Uses institutional email ({`college_email`} for students, {`institution_email`} for staff)</li>
                        <li>Profile data is cached for 24 hours to improve performance</li>
                        <li>
                          {form.watch('require_institutional_profile')
                            ? 'Only MYJKKN-registered users can submit this form'
                            : form.watch('allow_manual_entry_fallback')
                              ? 'Users not in MYJKKN can manually enter their details'
                              : 'Users not in MYJKKN can still submit without profile data'
                          }
                        </li>
                      </ul>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className='flex justify-end gap-4'>
              <Button
                type='button'
                variant='outline'
                onClick={() => router.push(`/personal/forms/${formId}`)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                )}
                <Save className='h-4 w-4 mr-2' />
                Save Settings
              </Button>
            </div>
          </form>
        </Form>

        {/* Danger Zone */}
        {canDelete && (
          <Card className='border-destructive'>
            <CardHeader>
              <CardTitle className='text-destructive'>Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that affect your form
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
              >
                <AlertDialogTrigger asChild>
                  <Button variant='destructive'>
                    <Trash2 className='h-4 w-4 mr-2' />
                    Delete Form
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Form?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete &quot;{formData.title}
                      &quot;? This action cannot be undone. All responses,
                      collaborators, and form data will be permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    >
                      {deleteMutation.isPending && (
                        <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                      )}
                      Delete Form
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}
      </div>
    </ContentLayout>
  );
}
