'use client';

// app/(routes)/personal/forms/builder/[formId]/page.tsx
// Personal form builder/editor page

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
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
import { ImageUpload } from '@/components/ui/image-upload';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { FieldTypeSelector } from './_components/field-type-selector';
import { FieldEditor } from '@/app/(routes)/organizations/forms/builder/_components/field-editor';
import { FormField as IFormField, FormFieldType } from '@/types/forms';
import { StorageService } from '@/lib/storage/storage-service';
import {
  ArrowLeft,
  Loader2,
  Save,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Shield
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DomainInput } from '@/components/personal-forms/domain-input';

const formSchema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().optional(),
    banner_url: z.string().optional(),
    is_public: z.boolean().default(false),
    fields: z.array(z.any()),
    status: z.enum(['draft', 'published', 'archived']).default('draft'),
    submission_limit: z
      .number()
      .positive('Submission limit must be positive')
      .optional(),
    restrict_domain: z.boolean().default(false),
    allowed_domains: z.array(z.string()).default([])
  })
  .refine(
    (data) => {
      // Only require fields for published forms
      if (data.status === 'published') {
        return data.fields.length > 0;
      }
      return true;
    },
    {
      message: 'Published forms must have at least one field',
      path: ['fields']
    }
  );

type FormData = z.infer<typeof formSchema>;

export default function PersonalFormBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const formId = params.formId as string;

  const [fields, setFields] = useState<IFormField[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [lastAddedFieldId, setLastAddedFieldId] = useState<string | null>(null);
  const fieldRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Fetch existing form
  const { data: formData, isLoading } = useQuery({
    queryKey: ['personal-form', formId],
    queryFn: async () => {
      const response = await fetch(`/api/personal-forms/${formId}`);
      if (!response.ok) throw new Error('Failed to fetch form');
      return response.json();
    }
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      banner_url: '',
      is_public: false,
      fields: [],
      status: 'draft',
      submission_limit: undefined,
      restrict_domain: false,
      allowed_domains: []
    }
  });

  // Populate form when data loads
  useEffect(() => {
    if (formData) {
      const loadedFields = formData.fields || [];
      console.log('Loading form data:', formData);
      console.log('Form status from API:', formData.status);

      form.reset({
        title: formData.title,
        description: formData.description || '',
        banner_url: formData.banner_url || '',
        is_public: formData.is_public,
        status: formData.status || 'draft',
        submission_limit: formData.submission_limit,
        restrict_domain: formData.restrict_domain || false,
        allowed_domains: formData.allowed_domains || [],
        fields: loadedFields
      });
      setFields(loadedFields);

      // Log the form state after reset
      console.log('Form status after reset:', form.getValues('status'));
    }
  }, [formData]);

  // Auto-scroll to newly added field
  useEffect(() => {
    if (lastAddedFieldId && fieldRefs.current[lastAddedFieldId]) {
      // Wait for the DOM to update
      setTimeout(() => {
        const element = fieldRefs.current[lastAddedFieldId];
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
          // Clear the last added field ID after scrolling
          setLastAddedFieldId(null);
        }
      }, 100);
    }
  }, [lastAddedFieldId, fields]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log('Sending to API:', data);
      const response = await fetch(`/api/personal-forms/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update form');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Form saved successfully');
      queryClient.invalidateQueries({ queryKey: ['personal-form', formId] });
      // Invalidate all personal-forms queries (with any filters)
      queryClient.invalidateQueries({
        queryKey: ['personal-forms'],
        exact: false,
        refetchType: 'active'
      });
      router.push('/personal/forms');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const addField = (type: FormFieldType) => {
    const newField: IFormField = {
      id: uuidv4(),
      type,
      label: `New ${type} field`,
      required: false
    };

    // Add appropriate default properties based on field type
    if (type === 'conditional') {
      newField.condition_options = ['Yes', 'No'];
      newField.conditional_trigger_value = 'Yes';
      newField.conditional_label = 'Please provide details';
      newField.conditional_input_type = 'text';
      newField.conditional_placeholder = 'Enter your answer';
    } else if (type === 'select' || type === 'checkbox' || type === 'radio') {
      newField.options = ['Option 1', 'Option 2', 'Option 3'];
    }

    const newFields = [...fields, newField];
    setFields(newFields);
    form.setValue('fields', newFields);
    form.clearErrors('fields'); // Clear any validation errors when adding field

    // Set the last added field ID to trigger scroll
    setLastAddedFieldId(newField.id);
  };

  const updateField = (id: string, updates: Partial<IFormField>) => {
    const newFields = fields.map((field) =>
      field.id === id ? { ...field, ...updates } : field
    );
    setFields(newFields);
    form.setValue('fields', newFields);
    form.clearErrors('fields'); // Clear errors when updating
  };

  const removeField = (id: string) => {
    const newFields = fields.filter((field) => field.id !== id);
    setFields(newFields);
    form.setValue('fields', newFields);
    // Re-validate after removing field in case we go below minimum
    form.trigger('fields');
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setFields(items);
    form.setValue('fields', items);
  };

  const handleBannerUpload = async (file: File) => {
    try {
      setIsUploading(true);
      const { publicUrl, error } = await StorageService.uploadFormBanner(file);

      if (error) throw error;
      if (!publicUrl) throw new Error('Failed to get upload URL');

      form.setValue('banner_url', publicUrl);
      toast.success('Banner uploaded successfully');
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast.error('Failed to upload banner');
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = (data: FormData) => {
    // Validation is handled by schema - only published forms require fields
    console.log('Form submitted with data:', data);
    console.log('Local fields state:', fields);
    console.log('Form state fields:', data.fields);

    updateMutation.mutate(data);
  };

  const onError = (errors: any) => {
    console.log('Form validation errors:', errors);
    // Show first error as toast
    const firstError = Object.values(errors)[0] as any;
    if (firstError?.message) {
      toast.error(firstError.message);
    }
  };

  if (isLoading) {
    return (
      <ContentLayout title='Form Builder'>
        <div className='flex items-center justify-center py-12'>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        </div>
      </ContentLayout>
    );
  }

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
              <Link href='/personal/forms'>My Forms</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Form Builder</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='space-y-6 mt-4'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold py-1'>Form Builder</h1>
            <p className='text-sm sm:text-base text-muted-foreground'>
              Design your form by adding and configuring fields
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

        {/* Form Builder */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, onError)}
            className='space-y-6'
          >
            {/* Basic Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Form Information</CardTitle>
                <CardDescription>Basic details about your form</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='title'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder='Enter form title' />
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
                        <RichTextEditor
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder='Enter form description'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='status'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Form Status</FormLabel>
                      <Select
                        key={`status-${formData?.id}-${field.value}`}
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Clear fields error when status changes (draft doesn't require fields)
                          if (value !== 'published') {
                            form.clearErrors('fields');
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select status'>
                              {field.value === 'draft' && 'Draft'}
                              {field.value === 'published' && 'Published'}
                              {field.value === 'archived' && 'Archived'}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='draft'>
                            <div className='flex items-center gap-2'>
                              <div className='w-2 h-2 rounded-full bg-gray-500' />
                              <span>Draft</span>
                            </div>
                          </SelectItem>
                          <SelectItem value='published'>
                            <div className='flex items-center gap-2'>
                              <div className='w-2 h-2 rounded-full bg-green-500' />
                              <span>Published</span>
                            </div>
                          </SelectItem>
                          <SelectItem value='archived'>
                            <div className='flex items-center gap-2'>
                              <div className='w-2 h-2 rounded-full bg-orange-500' />
                              <span>Archived</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Only published forms can accept submissions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className='grid gap-4 sm:grid-cols-2'>
                  <FormField
                    control={form.control}
                    name='is_public'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between space-y-0 rounded-lg border p-4'>
                        <div className='space-y-0.5'>
                          <FormLabel>Public Form</FormLabel>
                          <p className='text-sm text-muted-foreground'>
                            Allow anyone with the link to submit
                          </p>
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
                        <p className='text-sm text-muted-foreground'>
                          Leave empty for unlimited
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Public Link Status Alert */}
                {(() => {
                  const isPublic = form.watch('is_public');
                  const status = form.watch('status');
                  const wasPublic =
                    formData?.is_public && formData?.status === 'published';

                  if (isPublic && status === 'published') {
                    return (
                      <Alert className='border-green-500/50 bg-green-50 dark:bg-green-950/20'>
                        <CheckCircle2 className='h-4 w-4 text-green-600 dark:text-green-400' />
                        <AlertTitle className='text-green-900 dark:text-green-100'>
                          Public Link Active
                        </AlertTitle>
                        <AlertDescription className='text-green-800 dark:text-green-200'>
                          Your form is publicly accessible. Anyone with the link
                          can submit responses.
                        </AlertDescription>
                      </Alert>
                    );
                  } else if (isPublic && status !== 'published') {
                    return (
                      <Alert variant='destructive'>
                        <AlertTriangle className='h-4 w-4' />
                        <AlertTitle>Public Link Not Working</AlertTitle>
                        <AlertDescription>
                          Your form is set to Public but status is &quot;
                          {status}&quot;. Change status to &quot;Published&quot;
                          for the public link to work.
                        </AlertDescription>
                      </Alert>
                    );
                  } else if (!isPublic && status === 'published' && wasPublic) {
                    return (
                      <Alert variant='destructive'>
                        <AlertTriangle className='h-4 w-4' />
                        <AlertTitle>Warning: Public Access Disabled</AlertTitle>
                        <AlertDescription>
                          This form was previously public. Turning off
                          &quot;Public Form&quot; will break existing shared
                          links!
                        </AlertDescription>
                      </Alert>
                    );
                  } else if (isPublic && status !== 'published') {
                    return (
                      <Alert>
                        <Globe className='h-4 w-4' />
                        <AlertTitle>Public Link Requirements</AlertTitle>
                        <AlertDescription>
                          For the public link to work, both &quot;Public
                          Form&quot; must be ON and &quot;Form Status&quot; must
                          be &quot;Published&quot;.
                        </AlertDescription>
                      </Alert>
                    );
                  }
                  return null;
                })()}
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
                        <FormLabel>Domain Restriction</FormLabel>
                        <FormDescription>
                          Only allow submissions from specific email domains
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

                {form.watch('restrict_domain') && (
                  <FormField
                    control={form.control}
                    name='allowed_domains'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Allowed Domains</FormLabel>
                        <FormControl>
                          <DomainInput
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormDescription>
                          Add email domains that can access this form (e.g.,
                          jkkn.ac.in, example.org)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Fields Card */}
            <Card>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <div>
                    <CardTitle>Form Fields</CardTitle>
                    <CardDescription>
                      Add and configure fields for your form
                    </CardDescription>
                  </div>
                  <FieldTypeSelector onSelect={addField} />
                </div>
              </CardHeader>
              <CardContent>
                {fields.length === 0 ? (
                  <div className='text-center py-12 border-2 border-dashed rounded-lg'>
                    <p className='text-muted-foreground mb-4'>
                      No fields yet. Click &quot;Add Field&quot; to get started.
                    </p>
                  </div>
                ) : (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId='fields'>
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className='space-y-4'
                        >
                          {fields.map((field, index) => (
                            <Draggable
                              key={field.id}
                              draggableId={field.id}
                              index={index}
                            >
                              {(provided) => (
                                <div
                                  ref={(el) => {
                                    provided.innerRef(el);
                                    fieldRefs.current[field.id] = el;
                                  }}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <FieldEditor
                                    field={field}
                                    onUpdate={(updates) =>
                                      updateField(field.id, updates)
                                    }
                                    onRemove={() => removeField(field.id)}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
              </CardContent>
            </Card>

            {/* Banner Card */}
            <Card>
              <CardHeader>
                <CardTitle>Form Banner</CardTitle>
                <CardDescription>
                  Upload a banner image for your form (optional)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name='banner_url'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ImageUpload
                          value={field.value}
                          onChange={(url) => field.onChange(url)}
                          onUpload={handleBannerUpload}
                          disabled={isUploading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Actions */}
            <div className='flex justify-end gap-4'>
              <Button
                type='button'
                variant='outline'
                onClick={() => router.push('/personal/forms')}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                )}
                <Save className='h-4 w-4 mr-2' />
                Save Form
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </ContentLayout>
  );
}
