'use client';

// app/(routes)/personal/forms/page.tsx
// Personal forms list page

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { ContentLayout } from '@/components/layout/content-layout';
import { DataTable } from '@/components/ui/data-table';
import { getPersonalFormColumns } from './_components/columns';
import { Plus, Search, Loader2, Copy, CheckCircle2, ExternalLink, Mail, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { PersonalFormWithCollaborators, PersonalFormFilters } from '@/types/personal-forms';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { QRCodeSVG } from 'qrcode.react';

export default function PersonalFormsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formToDelete, setFormToDelete] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareFormId, setShareFormId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Build filters
  const filters: PersonalFormFilters = {
    search: searchQuery || undefined,
    status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
    page: 1,
    limit: 50
  };

  // Fetch personal forms with automatic polling for real-time updates
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['personal-forms', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const response = await fetch(`/api/personal-forms?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch personal forms');
      return response.json();
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds for real-time response count
    refetchIntervalInBackground: false // Only when tab is active
  });

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    toast.loading('Refreshing forms...', { id: 'refresh-forms' });
    await refetch();
    toast.success('Forms refreshed!', { id: 'refresh-forms' });
    setIsRefreshing(false);
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (formId: string) => {
      console.log('[DELETE] Starting delete mutation for form:', formId);

      const response = await fetch(`/api/personal-forms/${formId}`, {
        method: 'DELETE'
      });

      console.log('[DELETE] Response status:', response.status);
      console.log('[DELETE] Response ok:', response.ok);

      if (!response.ok) {
        const error = await response.json();
        console.error('[DELETE] API Error:', error);
        throw new Error(error.error || 'Failed to delete form');
      }

      const result = await response.json();
      console.log('[DELETE] API Success:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('[DELETE] onSuccess triggered with data:', data);
      toast.success('Form deleted successfully');

      // Invalidate all personal-forms queries (with any filters)
      console.log('[DELETE] Invalidating queries...');
      queryClient.invalidateQueries({
        queryKey: ['personal-forms'],
        exact: false,
        refetchType: 'active'
      });

      console.log('[DELETE] Clearing formToDelete state');
      setFormToDelete(null);

      console.log('[DELETE] Delete flow completed successfully');
    },
    onError: (error: Error) => {
      console.error('[DELETE] onError triggered:', error.message);
      toast.error(error.message);
    }
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (formId: string) => {
      const response = await fetch('/api/personal-forms/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceFormId: formId,
          sourceType: 'personal'
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to duplicate form');
      }
      return response.json();
    },
    onSuccess: (newForm) => {
      toast.success('Form duplicated successfully');
      // Invalidate all personal-forms queries (with any filters)
      queryClient.invalidateQueries({
        queryKey: ['personal-forms'],
        exact: false,
        refetchType: 'active'
      });
      router.push(`/personal/forms/builder/${newForm.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const forms = (data?.data || []) as PersonalFormWithCollaborators[];

  // Share handlers
  const handleShare = (formId: string) => {
    setShareFormId(formId);
    setShareDialogOpen(true);
  };

  const shareForm = forms.find((f) => f.id === shareFormId);
  const publicUrl = shareFormId
    ? `${window.location.origin}/forms/public/personal/${shareFormId}`
    : '';

  const copyPublicLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyEmailTemplate = async () => {
    const emailText = `Hello,\n\nYou're invited to fill out this form: ${shareForm?.title}\n\n${publicUrl}\n\nThank you!`;
    await navigator.clipboard.writeText(emailText);
    setEmailCopied(true);
    toast.success('Email template copied');
    setTimeout(() => setEmailCopied(false), 2000);
  };

  // Define columns
  const columns = getPersonalFormColumns({
    onDelete: setFormToDelete,
    onDuplicate: (formId) => duplicateMutation.mutate(formId),
    onShare: handleShare,
    pageIndex: 0,
    pageSize: 50
  });

  return (
    <ContentLayout title="My Forms">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>My Forms</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="space-y-6 mt-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold py-1">My Forms</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Create and manage your personal forms
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="default"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh forms and response counts"
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
            <Button onClick={() => router.push('/personal/forms/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Form
            </Button>
          </div>
        </div>

        {/* Table Card */}
        <Card>
          <CardContent className="p-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search forms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <p className="text-destructive">Failed to load forms</p>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && forms.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <h3 className="text-lg font-medium mb-2">No forms yet</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first personal form
                </p>
                <Button onClick={() => router.push('/personal/forms/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Form
                </Button>
              </div>
            )}

            {/* Data Table */}
            {!isLoading && !error && forms.length > 0 && (
              <DataTable
                columns={columns}
                data={forms}
                searchKey="title"
                searchPlaceholder="Search forms..."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!formToDelete} onOpenChange={() => setFormToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this form? This action cannot be undone.
              All responses and collaborators will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                console.log('[DELETE BUTTON] Delete button clicked');
                console.log('[DELETE BUTTON] formToDelete:', formToDelete);
                console.log('[DELETE BUTTON] deleteMutation.isPending:', deleteMutation.isPending);
                if (formToDelete) {
                  console.log('[DELETE BUTTON] Calling deleteMutation.mutate...');
                  deleteMutation.mutate(formToDelete);
                } else {
                  console.error('[DELETE BUTTON] No formToDelete value!');
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                <Input
                  value={publicUrl}
                  readOnly
                  className='flex-1'
                />
                <Button
                  type='button'
                  size='sm'
                  onClick={copyPublicLink}
                >
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
    </ContentLayout>
  );
}
