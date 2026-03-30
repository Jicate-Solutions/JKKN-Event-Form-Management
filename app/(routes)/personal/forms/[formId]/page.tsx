'use client';

// app/(routes)/personal/forms/[formId]/page.tsx
// Personal form details and overview page

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
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Edit,
  Users,
  BarChart,
  BarChart3,
  Settings,
  ExternalLink,
  Globe,
  Lock,
  Loader2,
  Copy,
  CheckCircle2,
  Share2,
  QrCode,
  Mail
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function PersonalFormDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.formId as string;
  const [copied, setCopied] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  // Public URL - single source of truth
  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/forms/public/personal/${formId}`;

  // Fetch form details
  const { data: form, isLoading } = useQuery({
    queryKey: ['personal-form', formId],
    queryFn: async () => {
      const response = await fetch(`/api/personal-forms/${formId}`);
      if (!response.ok) throw new Error('Failed to fetch form');
      return response.json();
    }
  });

  // Fetch responses count
  const { data: responsesData } = useQuery({
    queryKey: ['personal-form-responses', formId],
    queryFn: async () => {
      const response = await fetch(
        `/api/personal-forms/${formId}/responses?page=1&limit=1`
      );
      if (!response.ok) throw new Error('Failed to fetch responses');
      return response.json();
    }
  });

  // Fetch collaborators
  const { data: collaboratorsData } = useQuery({
    queryKey: ['personal-form-collaborators', formId],
    queryFn: async () => {
      const response = await fetch(
        `/api/personal-forms/${formId}/collaborators`
      );
      if (!response.ok) throw new Error('Failed to fetch collaborators');
      return response.json();
    }
  });

  const copyPublicLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyEmailTemplate = async () => {
    const emailText = `Hello,\n\nYou're invited to fill out this form: ${form?.title}\n\n${publicUrl}\n\nThank you!`;
    await navigator.clipboard.writeText(emailText);
    setEmailCopied(true);
    toast.success('Email template copied');
    setTimeout(() => setEmailCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    );
  }

  if (!form) {
    return (
      <div className='text-center py-12'>
        <p className='text-destructive'>Form not found</p>
      </div>
    );
  }

  const statusColors = {
    draft: 'bg-gray-500',
    published: 'bg-green-500',
    archived: 'bg-orange-500'
  };

  const responseCount = responsesData?.total || 0;
  const collaboratorCount = collaboratorsData?.collaborators?.length || 0;
  const fieldCount = form.fields?.length || 0;

  return (
    <ContentLayout title='Form Details'>
      <div className='flex items-center justify-between gap-2'>
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
              <BreadcrumbPage>Form Details</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Button
          variant='ghost'
          size='sm'
          className='bg-primary text-white hover:bg-primary/80 hover:text-white'
          onClick={() => router.push('/personal/forms')}
        >
          <ArrowLeft className='h-4 w-4 mr-2' />
          Back to Forms
        </Button>
      </div>

      <div className='max-w-5xl mx-auto space-y-6 mt-8'>
        {/* Header */}
        <div>
          <div className='flex flex-col items-start justify-start gap-6'>
            <div className='flex-1'>
              <div className='flex items-center justify-between gap-2'>
                <h1 className='text-3xl font-bold tracking-tight'>
                  {form.title}
                </h1>
                {/* Status Badges */}
                <div className='flex flex-wrap gap-2'>
                  <Badge
                    variant='outline'
                    className={`${statusColors[form.status as keyof typeof statusColors]} text-white border-0`}
                  >
                    {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
                  </Badge>

                  <Badge variant='outline' className='flex items-center gap-1'>
                    {form.is_public ? (
                      <>
                        <Globe className='h-3 w-3' />
                        Public
                      </>
                    ) : (
                      <>
                        <Lock className='h-3 w-3' />
                        Private
                      </>
                    )}
                  </Badge>
                </div>

                {form.submission_limit && (
                  <Badge variant='secondary'>
                    Limit: {responseCount}/{form.submission_limit}
                  </Badge>
                )}
              </div>

              {form.description && (
                <p
                  className='text-muted-foreground mt-2'
                  dangerouslySetInnerHTML={{ __html: form.description }}
                />
              )}
            </div>

            <div className='flex flex-wrap gap-2'>
              <Button
                variant='outline'
                className='bg-red-500 text-white hover:bg-red-600 hover:text-white'
                size='sm'
                onClick={() => router.push(`/personal/forms/builder/${formId}`)}
              >
                <Edit className='h-4 w-4 mr-2' />
                Edit Form
              </Button>
              <Button
                variant='outline'
                size='sm'
                className='bg-blue-500 text-white hover:bg-blue-600 hover:text-white'
                onClick={() =>
                  router.push(`/personal/forms/${formId}/responses`)
                }
              >
                <BarChart className='h-4 w-4 mr-2' />
                Responses
              </Button>
              <Button
                variant='outline'
                size='sm'
                className='bg-green-500 text-white hover:bg-green-600 hover:text-white'
                onClick={() =>
                  router.push(`/personal/forms/${formId}/analytics`)
                }
              >
                <BarChart3 className='h-4 w-4 mr-2' />
                Analytics
              </Button>
              {form.status === 'published' && (
                <Button
                  variant='outline'
                  size='sm'
                  className='bg-purple-500 text-white hover:bg-purple-600 hover:text-white'
                  onClick={() => setShareDialogOpen(true)}
                >
                  <Share2 className='h-4 w-4 mr-2' />
                  Share
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className='grid gap-4 md:grid-cols-3'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Responses
              </CardTitle>
              <BarChart className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{responseCount}</div>
              <p className='text-xs text-muted-foreground'>
                {form.submission_limit
                  ? `${form.submission_limit - responseCount} remaining`
                  : 'Unlimited submissions'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Form Fields</CardTitle>
              <Edit className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{fieldCount}</div>
              <p className='text-xs text-muted-foreground'>
                Active form fields
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Collaborators
              </CardTitle>
              <Users className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{collaboratorCount}</div>
              <p className='text-xs text-muted-foreground'>
                Active collaborators
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Public Link Card */}
        <Card>
          <CardHeader>
            <CardTitle>Public Submission Link</CardTitle>
            <CardDescription>
              Share this link to allow anyone to submit the form
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex gap-2'>
              <code className='flex-1 px-3 py-2 bg-muted rounded-md text-sm overflow-x-auto'>
                {publicUrl}
              </code>
              <Button
                variant='outline'
                size='sm'
                onClick={copyPublicLink}
                className='shrink-0'
              >
                {copied ? (
                  <>
                    <CheckCircle2 className='h-4 w-4 mr-2' />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className='h-4 w-4 mr-2' />
                    Copy
                  </>
                )}
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => window.open(publicUrl, '_blank')}
              >
                <ExternalLink className='h-4 w-4' />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Form Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Form Information</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              {form.creator && (
                <>
                  <div>
                    <p className='text-sm font-medium text-muted-foreground'>
                      Created By
                    </p>
                    <p className='text-sm font-medium'>
                      {form.creator.full_name}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {form.creator.email}
                    </p>
                  </div>
                </>
              )}

              <div>
                <p className='text-sm font-medium text-muted-foreground'>
                  Created
                </p>
                <p className='text-sm'>
                  {formatDistanceToNow(new Date(form.created_at), {
                    addSuffix: true
                  })}
                </p>
              </div>

              <div>
                <p className='text-sm font-medium text-muted-foreground'>
                  Last Updated
                </p>
                <p className='text-sm'>
                  {formatDistanceToNow(new Date(form.updated_at), {
                    addSuffix: true
                  })}
                </p>
              </div>

              <div>
                <p className='text-sm font-medium text-muted-foreground'>
                  Form ID
                </p>
                <p className='text-sm font-mono'>{form.id}</p>
              </div>

              {form.slug && (
                <div>
                  <p className='text-sm font-medium text-muted-foreground'>
                    Slug
                  </p>
                  <p className='text-sm font-mono'>{form.slug}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
              <Button
                variant='outline'
                className='justify-start'
                onClick={() => router.push(`/personal/forms/builder/${formId}`)}
              >
                <Edit className='h-4 w-4 mr-2' />
                Edit Fields
              </Button>

              <Button
                variant='outline'
                className='justify-start'
                onClick={() =>
                  router.push(`/personal/forms/${formId}/responses`)
                }
              >
                <BarChart className='h-4 w-4 mr-2' />
                View Responses
              </Button>

              <Button
                variant='outline'
                className='justify-start'
                onClick={() =>
                  router.push(`/personal/forms/${formId}/collaborators`)
                }
              >
                <Users className='h-4 w-4 mr-2' />
                Manage Collaborators
              </Button>

              <Button
                variant='outline'
                className='justify-start'
                onClick={() =>
                  router.push(`/personal/forms/${formId}/settings`)
                }
              >
                <Settings className='h-4 w-4 mr-2' />
                Form Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Share Dialog */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className='sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col'>
            <DialogHeader>
              <DialogTitle>Share Form</DialogTitle>
              <DialogDescription>
                Share this form with others using the link or QR code below.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 overflow-y-auto pr-2'>
              {/* Public Link */}
              <div className='space-y-2'>
                <Label>Public Form Link</Label>
                <div className='flex gap-2'>
                  <Input value={publicUrl} readOnly className='flex-1' />
                  <Button type='button' size='sm' onClick={copyPublicLink}>
                    {copied ? (
                      <CheckCircle2 className='h-4 w-4' />
                    ) : (
                      <Copy className='h-4 w-4' />
                    )}
                  </Button>
                </div>
              </div>

              {/* QR Code */}
              <div className='space-y-2'>
                <Label>QR Code</Label>
                <div className='flex justify-center p-4 bg-white dark:bg-gray-100 rounded-lg border'>
                  <QRCodeSVG
                    value={publicUrl}
                    size={200}
                    level='H'
                    includeMargin={true}
                  />
                </div>
                <p className='text-xs text-muted-foreground text-center'>
                  Scan this QR code to access the form
                </p>
              </div>

              {/* Email Template */}
              <div className='space-y-2'>
                <Label>Email Template</Label>
                <div className='flex gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    className='flex-1 justify-start'
                    onClick={copyEmailTemplate}
                  >
                    <Mail className='h-4 w-4 mr-2' />
                    {emailCopied ? 'Copied!' : 'Copy Email Template'}
                  </Button>
                </div>
              </div>

              {/* Open in new tab */}
              <Button
                type='button'
                variant='secondary'
                className='w-full'
                onClick={() => window.open(publicUrl, '_blank')}
              >
                <ExternalLink className='h-4 w-4 mr-2' />
                Open Form in New Tab
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ContentLayout>
  );
}
