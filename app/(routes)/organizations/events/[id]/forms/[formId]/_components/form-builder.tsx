'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import {
  Form as FormRoot,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FormField as IFormField, FormFieldType } from '@/types/forms';
import { FieldTypeSelector } from './field-type-selector';
import { FieldEditor } from './field-editor';
import { FormService } from '@/lib/services/form-service';
import { OrganizationService } from '@/lib/services/organization/organization-service';
import { EventService } from '@/lib/services/organization/event-service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Form } from '@/types/forms';
import { Event } from '@/types/events';
import { Label } from '@/components/ui/label';
import { Upload, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { FieldSidebarEditor } from './field-sidebar-editor';
import { FieldCard } from './field-card';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

interface Institution {
  id: string;
  name: string;
}

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  banner_url: z.string().optional().nullable(),
  is_public: z.boolean().default(true),
  fields: z.array(z.any()).min(1, 'At least one field is required'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  submission_limit: z
    .number()
    .positive('Submission limit must be positive')
    .optional()
});

interface FormBuilderProps {
  eventId?: string;
  initialForm?: Form;
  isEditing?: boolean;
  template?: string;
  isTemplate?: boolean;
}

export function FormBuilder({
  eventId,
  initialForm,
  isEditing,
  template,
  isTemplate
}: FormBuilderProps) {
  const router = useRouter();
  const [fields, setFields] = useState<IFormField[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [templateData, setTemplateData] = useState<Form | null>(null);
  const [uploading, setUploading] = useState(false);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      banner_url: null,
      is_public: true,
      fields: [],
      status: 'draft',
      submission_limit: undefined
    }
  });

  useEffect(() => {
    if (initialForm?.banner_url) {
      setBannerUrl(initialForm.banner_url);
      setImagePreview(initialForm.banner_url);
    }
  }, [initialForm]);

  useEffect(() => {
    async function fetchData() {
      try {
        if (template && !initialForm) {
          const templateForm = await FormService.getTemplate(template);
          if (templateForm) {
            // Type assertion for fields - they should be FormField[] from template
            const templateFields = Array.isArray(templateForm.fields)
              ? (templateForm.fields as IFormField[])
              : [];

            form.reset({
              title: templateForm.title,
              description: templateForm.description || '',
              banner_url: templateForm.banner_url || '',
              is_public: true,
              fields: templateFields,
              status: 'draft',
              submission_limit: undefined
            });
            setFields(templateFields);
            if (templateForm.banner_url) {
              setBannerUrl(templateForm.banner_url);
              setImagePreview(templateForm.banner_url);
            }
          }
        } else if (initialForm && isEditing) {
          form.reset({
            title: initialForm.title,
            description: initialForm.description || '',
            banner_url: initialForm.banner_url || '',
            is_public: initialForm.is_public,
            fields: initialForm.fields,
            status: initialForm.status || 'published',
            submission_limit: initialForm.submission_limit
          });
          setFields(initialForm.fields);
          if (initialForm.banner_url) {
            setBannerUrl(initialForm.banner_url);
            setImagePreview(initialForm.banner_url);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load form data');
      }
    }
    fetchData();
  }, [initialForm, isEditing, form, template]);

  useEffect(() => {
    async function fetchEvent() {
      try {
        if (!eventId) return; // Skip if no eventId
        const eventData = await EventService.getEvent(eventId);
        if (!eventData) {
          throw new Error('Event not found');
        }
        setEvent(eventData);

        // Fetch institutions after getting event
        const { data: institutionsData } =
          await OrganizationService.getInstitutions();
        setInstitutions(institutionsData || []);
      } catch (error) {
        console.error('Error fetching event:', error);
        toast.error('Failed to load event details');
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [eventId]);

  const addField = (type: FormFieldType) => {
    const newField: IFormField = {
      id: uuidv4(),
      type,
      label: `New ${type} field`,
      required: false
    };
    const newFields = [...fields, newField];
    setFields(newFields);
    form.setValue('fields', newFields);
    // Select the newly added field
    setSelectedFieldId(newField.id);
  };

  const updateField = (id: string, updates: Partial<IFormField>) => {
    const newFields = fields.map((field) =>
      field.id === id ? { ...field, ...updates } : field
    );
    setFields(newFields);
    form.setValue('fields', newFields);
  };

  const removeField = (id: string) => {
    const newFields = fields.filter((field) => field.id !== id);
    setFields(newFields);
    form.setValue('fields', newFields);
    // Clear selection if the selected field was removed
    if (selectedFieldId === id) {
      setSelectedFieldId(null);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);

      if (isTemplate) {
        await FormService.createTemplate({
          title: values.title,
          description: values.description || '',
          category: 'Event Registration',
          fields: fields,
          banner_url: bannerUrl || undefined
        });
        toast.success('Template created successfully');
        router.push('/organizations/forms/templates');
        return;
      }

      // Existing form creation/update logic
      if (!event?.institution?.id) {
        throw new Error('Institution is required');
      }

      const supabase = createClientSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (isEditing && initialForm) {
        const updatePayload = {
          ...values,
          fields,
          banner_url: bannerUrl || undefined
        };
        await FormService.updateForm(initialForm.id, updatePayload);
        toast.success('Form updated successfully');
      } else {
        const createPayload = {
          ...values,
          banner_url: bannerUrl || undefined,
          institution_id: event.institution.id,
          event_id: eventId,
          fields,
          created_by: user.id
        };
        await FormService.createForm(createPayload);
        toast.success('Form created successfully');
      }

      router.push(`/organizations/events/${eventId}?tab=forms`);
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to save form'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      // File validations
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      setUploading(true);
      const supabase = createClientSupabaseClient();

      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `form-banners/${fileName}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('form-banners')
        .upload(filePath, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('form-banners')
        .getPublicUrl(filePath);

      // Show immediate preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        setImagePreview(preview);
      };
      reader.readAsDataURL(file);

      // Update form state
      setBannerUrl(data.publicUrl);
      form.setValue('banner_url', data.publicUrl);

      toast.success('Banner uploaded successfully');
    } catch (error) {
      console.error('Error uploading banner:', error);
      setImagePreview(null);
      setBannerUrl(null);
      form.setValue('banner_url', null);
      toast.error(
        error instanceof Error ? error.message : 'Failed to upload banner'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveBanner = async () => {
    try {
      if (bannerUrl) {
        const supabase = createClientSupabaseClient();

        // Extract filename from URL
        const fileName = bannerUrl.split('/').pop();
        if (!fileName) return;

        // Delete from storage with full path
        const filePath = `form-banners/${fileName}`;
        const { error } = await supabase.storage
          .from('form-banners')
          .remove([filePath]);

        if (error) throw error;
      }

      // Clear states
      setImagePreview(null);
      setBannerUrl(null);
      form.setValue('banner_url', null);
      toast.success('Banner removed successfully');
    } catch (error) {
      console.error('Error removing banner:', error);
      toast.error('Failed to remove banner');
    }
  };

  // Function to get the selected field
  const getSelectedField = () => {
    if (!selectedFieldId) return null;
    return fields.find((field) => field.id === selectedFieldId) || null;
  };

  // Function to close the sidebar
  const closeSidebar = () => {
    setSelectedFieldId(null);
  };

  return (
    <div className='space-y-8'>
      <FormRoot {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          {/* Display event and institution info */}
          {event?.institution && (
            <div className='grid gap-4 p-4 bg-muted rounded-lg'>
              <div>
                <label className='text-sm font-medium'>Institution</label>
                <Input
                  value={event.institution.name}
                  disabled
                  className='mt-1 bg-background'
                />
              </div>
              <div>
                <label className='text-sm font-medium'>Event</label>
                <Input
                  value={event.title}
                  disabled
                  className='mt-1 bg-background'
                />
              </div>
            </div>
          )}

          <div className='grid gap-6'>
            {/* Form basic settings */}
            <div className='grid gap-4'>
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
            </div>

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
              name='banner_url'
              render={({ field }) => (
                <FormItem className='flex items-center justify-between space-y-0'>
                  <FormLabel>Form Banner (Optional)</FormLabel>
                  <FormControl>
                    <div className='flex items-center gap-4'>
                      {(bannerUrl || imagePreview) && (
                        <div className='relative w-40 h-24 border rounded-md overflow-hidden'>
                          <Image
                            src={bannerUrl || imagePreview!}
                            alt='Form banner'
                            className='object-cover'
                            fill
                            sizes='(max-width: 160px) 100vw'
                            priority
                            onError={(e) => {
                              console.error('Error loading image:', e);
                              toast.error('Failed to load image preview');
                            }}
                          />
                          <Button
                            type='button'
                            variant='destructive'
                            size='sm'
                            className='absolute top-1 right-1 z-10'
                            onClick={handleRemoveBanner}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                      <div className='flex-1'>
                        <label
                          htmlFor='banner'
                          className={cn(
                            'flex items-center gap-2 p-4 border-2 border-dashed rounded-md cursor-pointer transition-colors',
                            uploading
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:border-primary'
                          )}
                        >
                          {uploading ? (
                            <div className='flex items-center gap-2'>
                              <Loader2 className='w-4 h-4 animate-spin' />
                              <span>Uploading...</span>
                            </div>
                          ) : (
                            <>
                              <Upload className='w-4 h-4' />
                              <span>Upload Banner</span>
                            </>
                          )}
                          <input
                            id='banner'
                            type='file'
                            accept='image/*'
                            className='hidden'
                            onChange={handleImageUpload}
                            disabled={uploading}
                          />
                        </label>
                        <p className='mt-1 text-xs text-muted-foreground'>
                          Max file size: 5MB. Supported formats: PNG, JPG, GIF
                        </p>
                      </div>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='is_public'
              render={({ field }) => (
                <FormItem className='flex items-center justify-between space-y-0'>
                  <FormLabel>Public Form</FormLabel>
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
              name='status'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select status' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='draft'>Draft</SelectItem>
                      <SelectItem value='published'>Published</SelectItem>
                      <SelectItem value='archived'>Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='submission_limit'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Submission Limit (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      placeholder='Enter maximum number of submissions'
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value ? parseInt(value, 10) : undefined);
                      }}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <p className='text-sm text-muted-foreground'>
                    Leave empty for unlimited submissions. Once limit is
                    reached, new submissions will be blocked.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Form Fields Section - Full width */}
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <h2 className='text-lg font-semibold'>Form Fields</h2>
              <FieldTypeSelector onSelect={addField} />
            </div>

            <Card>
              <CardContent className='p-4 space-y-4'>
                <DragDropContext
                  onDragEnd={(result) => {
                    if (!result.destination) return;

                    const items = Array.from(fields);
                    const [reorderedItem] = items.splice(
                      result.source.index,
                      1
                    );
                    items.splice(result.destination.index, 0, reorderedItem);

                    setFields(items);
                    form.setValue('fields', items);
                  }}
                >
                  <Droppable droppableId='fields-list'>
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className='space-y-4'
                      >
                        {fields.length === 0 ? (
                          <div className='border border-dashed border-gray-300 p-8 rounded-lg bg-muted/20 text-center'>
                            <p className='text-muted-foreground'>
                              No fields added yet. Use the &quot;Add Field&quot;
                              button to add form fields.
                            </p>
                          </div>
                        ) : (
                          fields.map((field, index) => (
                            <Draggable
                              key={field.id}
                              draggableId={field.id}
                              index={index}
                            >
                              {(provided) => (
                                <FieldCard
                                  field={field}
                                  isSelected={selectedFieldId === field.id}
                                  onClick={() => setSelectedFieldId(field.id)}
                                  ref={provided.innerRef}
                                  draggableProps={provided.draggableProps}
                                  dragHandleProps={provided.dragHandleProps}
                                />
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </CardContent>
            </Card>
          </div>

          <div className='flex justify-end gap-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={isSubmitting || fields.length === 0}
            >
              {isSubmitting ? 'Creating...' : 'Create Form'}
            </Button>
          </div>
        </form>
      </FormRoot>

      {/* Sliding Sidebar Drawer */}
      <Sheet
        open={!!selectedFieldId}
        onOpenChange={(open) => !open && closeSidebar()}
      >
        <SheetContent side='right' className='w-full sm:max-w-md p-0'>
          <SheetTitle className='sr-only'>
            Edit Field {getSelectedField()?.label || 'Field'}
          </SheetTitle>
          {getSelectedField() && (
            <FieldSidebarEditor
              field={getSelectedField()!}
              onUpdate={(updates) => updateField(selectedFieldId!, updates)}
              onRemove={() => removeField(selectedFieldId!)}
              onClose={closeSidebar}
              allFields={fields}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
