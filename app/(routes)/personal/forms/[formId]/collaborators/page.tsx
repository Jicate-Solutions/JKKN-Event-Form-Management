'use client';

// app/(routes)/personal/forms/[formId]/collaborators/page.tsx
// Manage collaborators for personal forms

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
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
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, UserPlus, Shield } from 'lucide-react';
import { AddCollaboratorDialog } from '@/components/personal-forms/add-collaborator-dialog';
import { CollaboratorList } from '@/components/personal-forms/collaborator-list';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

export default function CollaboratorsPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.formId as string;
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Fetch form details
  const { data: form, isLoading: formLoading } = useQuery({
    queryKey: ['personal-form', formId],
    queryFn: async () => {
      const response = await fetch(`/api/personal-forms/${formId}`);
      if (!response.ok) throw new Error('Failed to fetch form');
      return response.json();
    }
  });

  // Fetch collaborators
  const {
    data: collaboratorsData,
    isLoading: collaboratorsLoading,
    refetch
  } = useQuery({
    queryKey: ['personal-form-collaborators', formId],
    queryFn: async () => {
      const response = await fetch(
        `/api/personal-forms/${formId}/collaborators`
      );
      if (!response.ok) throw new Error('Failed to fetch collaborators');
      return response.json();
    }
  });

  // Check if current user can manage collaborators
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

  const isLoading = formLoading || collaboratorsLoading || permissionsLoading;
  const collaborators = collaboratorsData || [];
  const canManageCollaborators =
    permissionsData?.is_owner ||
    permissionsData?.can_manage_collaborators ||
    false;

  if (isLoading) {
    return (
      <ContentLayout title='Manage Collaborators'>
        <div className='flex items-center justify-center py-12'>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        </div>
      </ContentLayout>
    );
  }

  if (!form) {
    return (
      <ContentLayout title='Manage Collaborators'>
        <div className='text-center py-12'>
          <p className='text-destructive'>Form not found</p>
        </div>
      </ContentLayout>
    );
  }

  const owners = collaborators.filter((c: any) => c.is_owner);
  const nonOwners = collaborators.filter((c: any) => !c.is_owner);

  return (
    <ContentLayout title='Manage Collaborators'>
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
              <Link href={`/personal/forms/${formId}`}>Form Details</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Collaborators</BreadcrumbPage>
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
            Back to Form Details
          </Button>

          <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4'>
            <div>
              <h1 className='text-3xl font-bold tracking-tight'>
                Manage Collaborators
              </h1>
              <p className='text-muted-foreground mt-1'>
                Control who can access and edit {form.title}
              </p>
            </div>

            {canManageCollaborators && (
              <Button onClick={() => setShowAddDialog(true)}>
                <UserPlus className='h-4 w-4 mr-2' />
                Add Collaborator
              </Button>
            )}
          </div>
        </div>

        {/* Permission Info Card */}
        <Card className='border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900'>
          <CardHeader>
            <div className='flex items-center gap-2'>
              <Shield className='h-5 w-5 text-blue-600 dark:text-blue-400' />
              <CardTitle className='text-blue-900 dark:text-blue-100'>
                Permission Levels
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className='space-y-2 text-sm'>
            <div className='grid gap-2 sm:grid-cols-2'>
              <div>
                <p className='font-medium text-blue-900 dark:text-blue-100'>
                  Edit Structure
                </p>
                <p className='text-blue-700 dark:text-blue-300'>
                  Modify form fields and settings
                </p>
              </div>
              <div>
                <p className='font-medium text-blue-900 dark:text-blue-100'>
                  View Responses
                </p>
                <p className='text-blue-700 dark:text-blue-300'>
                  Access submitted form data
                </p>
              </div>
              <div>
                <p className='font-medium text-blue-900 dark:text-blue-100'>
                  Export Data
                </p>
                <p className='text-blue-700 dark:text-blue-300'>
                  Download responses as CSV/Excel
                </p>
              </div>
              <div>
                <p className='font-medium text-blue-900 dark:text-blue-100'>
                  Manage Collaborators
                </p>
                <p className='text-blue-700 dark:text-blue-300'>
                  Add or remove collaborators
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Owners Section */}
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle>Form Owners</CardTitle>
                <CardDescription>
                  Owners have full control over the form
                </CardDescription>
              </div>
              <Badge variant='secondary'>{owners.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {owners.length > 0 ? (
              <CollaboratorList formId={formId} creatorId={form.created_by} showOnlyOwners={true} />
            ) : (
              <p className='text-sm text-muted-foreground text-center py-4'>
                No owners found
              </p>
            )}
          </CardContent>
        </Card>

        {/* Collaborators Section */}
        {nonOwners.length > 0 && (
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle>Collaborators</CardTitle>
                  <CardDescription>
                    Users with specific permissions
                  </CardDescription>
                </div>
                <Badge variant='secondary'>{nonOwners.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CollaboratorList formId={formId} creatorId={form.created_by} showOnlyOwners={false} />
            </CardContent>
          </Card>
        )}

        {/* Access Info */}
        <Card>
          <CardHeader>
            <CardTitle>Your Access Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex flex-wrap gap-2'>
              {permissionsData?.is_owner && (
                <Badge className='bg-purple-500'>Owner</Badge>
              )}
              {permissionsData?.can_edit_structure && (
                <Badge variant='secondary'>Edit Structure</Badge>
              )}
              {permissionsData?.can_view_responses && (
                <Badge variant='secondary'>View Responses</Badge>
              )}
              {permissionsData?.can_export_data && (
                <Badge variant='secondary'>Export Data</Badge>
              )}
              {permissionsData?.can_manage_collaborators && (
                <Badge variant='secondary'>Manage Collaborators</Badge>
              )}
              {!permissionsData && (
                <p className='text-sm text-muted-foreground'>
                  You do not have access to this form
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add Collaborator Dialog */}
        {canManageCollaborators && (
          <AddCollaboratorDialog
            formId={formId}
            open={showAddDialog}
            onClose={() => {
              refetch();
              setShowAddDialog(false);
            }}
          />
        )}
      </div>
    </ContentLayout>
  );
}
