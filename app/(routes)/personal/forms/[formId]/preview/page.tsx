'use client';

// app/(routes)/personal/forms/[formId]/preview/page.tsx
// Preview page for personal forms (read-only view)

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { Loader2, ArrowLeft, Eye } from 'lucide-react';
import { FormFieldRenderer } from '@/components/form/form-field-renderer';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface PersonalForm {
  id: string;
  title: string;
  description?: string;
  banner_url?: string;
  fields: any[];
  status: string;
  is_public: boolean;
  submission_limit?: number;
  created_at: string;
}

export default function PersonalFormPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.formId as string;

  const [form, setForm] = useState<PersonalForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Fetch form data
  useEffect(() => {
    async function fetchForm() {
      try {
        const response = await fetch(`/api/personal-forms/${formId}`);
        if (!response.ok) {
          throw new Error('Form not found');
        }

        const data = await response.json();
        setForm(data);

        // Initialize form data with empty values for preview
        const initialData: Record<string, any> = {};
        data.fields?.forEach((field: any) => {
          initialData[field.id] = '';
        });
        setFormData(initialData);
      } catch (error) {
        console.error('Error fetching form:', error);
        toast.error('Failed to load form');
      } finally {
        setLoading(false);
      }
    }

    fetchForm();
  }, [formId]);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value
    }));
  };

  if (loading) {
    return (
      <ContentLayout title='Form Preview'>
        <div className='flex items-center justify-center py-12'>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        </div>
      </ContentLayout>
    );
  }

  if (!form) {
    return (
      <ContentLayout title='Form Preview'>
        <div className='text-center py-12'>
          <p className='text-destructive'>Form not found</p>
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title='Form Preview'>
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
            <BreadcrumbPage>Preview</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='max-w-5xl mx-auto space-y-6 mt-4'>
        {/* Back Button */}
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
        </div>

        {/* Preview Notice */}
        <Card className='bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'>
          <CardContent className='pt-6'>
            <div className='flex items-center gap-2'>
              <Eye className='h-5 w-5 text-blue-600 dark:text-blue-400' />
              <p className='text-blue-900 dark:text-blue-100 font-medium'>
                Preview Mode
              </p>
            </div>
            <p className='text-sm text-blue-700 dark:text-blue-300 mt-2'>
              This is how your form will appear to respondents. You can interact
              with the fields, but no data will be saved.
            </p>
          </CardContent>
        </Card>

        {/* Form Header */}
        <Card>
          {form.banner_url && (
            <div className='relative w-full h-48 overflow-hidden rounded-t-lg'>
              <Image
                src={form.banner_url}
                alt={form.title}
                fill
                className='object-cover'
              />
            </div>
          )}
          <CardHeader>
            <div className='flex items-start justify-between'>
              <div className='flex-1'>
                <CardTitle className='text-3xl mb-2'>{form.title}</CardTitle>
                {form.description && (
                  <CardDescription
                    className='text-base'
                    dangerouslySetInnerHTML={{ __html: form.description }}
                  />
                )}
              </div>
              <div className='flex flex-col gap-2 ml-4'>
                <Badge
                  variant='secondary'
                  className={
                    form.status === 'published'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                      : form.status === 'draft'
                        ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100'
                        : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100'
                  }
                >
                  {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
                </Badge>
                {form.is_public ? (
                  <Badge variant='outline'>Public</Badge>
                ) : (
                  <Badge variant='outline'>Private</Badge>
                )}
              </div>
            </div>

            {form.submission_limit && (
              <div className='mt-4 p-3 bg-muted rounded-lg'>
                <p className='text-sm text-muted-foreground'>
                  Submission limit: {form.submission_limit}
                </p>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Form Fields */}
        <Card>
          <CardContent className='pt-6 space-y-6'>
            {form.fields && form.fields.length > 0 ? (
              form.fields.map((field) => (
                <div key={field.id}>
                  <FormFieldRenderer
                    field={field}
                    value={formData[field.id]}
                    onChange={(fieldId, value) =>
                      handleFieldChange(fieldId, value)
                    }
                    formValues={formData}
                  />
                </div>
              ))
            ) : (
              <div className='text-center py-8 text-muted-foreground'>
                <p>No fields added to this form yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Footer */}
        <Card className='bg-muted/50'>
          <CardContent className='pt-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium'>Preview Mode</p>
                <p className='text-xs text-muted-foreground'>
                  Changes made here will not be saved
                </p>
              </div>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  onClick={() =>
                    router.push(`/personal/forms/builder/${formId}`)
                  }
                >
                  Edit Form
                </Button>
                <Button
                  onClick={() => router.push(`/personal/forms/${formId}`)}
                >
                  Back to Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className='text-center text-sm text-muted-foreground py-4'>
          <p>JKKN Event Form Management System</p>
        </div>
      </div>
    </ContentLayout>
  );
}
