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
  Form,
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { ImageUpload } from '@/components/ui/image-upload';
import { StorageService } from '@/lib/storage/storage-service';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

interface Institution {
  id: string;
  name: string;
}

interface Event {
  id: string;
  title: string;
}

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  banner_url: z.string().optional(),
  isPublic: z.boolean().default(false),
  institution_id: z.string().min(1, 'Institution is required'),
  event_id: z.string().optional(),
  fields: z.array(z.any()).min(1, 'At least one field is required'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  submission_limit: z
    .number()
    .positive('Submission limit must be positive')
    .optional()
});

export function FormBuilder() {
  const router = useRouter();
  const [fields, setFields] = useState<IFormField[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      banner_url: '',
      isPublic: false,
      institution_id: '',
      event_id: '',
      fields: [],
      status: 'draft',
      submission_limit: undefined
    }
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [institutionsData, eventsData] = await Promise.all([
          OrganizationService.getInstitutions(),
          EventService.getEvents()
        ]);
        setInstitutions(institutionsData.data);
        setEvents(eventsData.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load form data');
      }
    }
    fetchData();
  }, []);

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
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      console.log('Form submission started');
      console.log('Form values:', values);
      console.log('Form fields:', fields);

      if (fields.length === 0) {
        toast.error('Please add at least one field');
        return;
      }

      setIsSubmitting(true);
      const supabase = createClientSupabaseClient();

      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const formData = {
        title: values.title,
        description: values.description,
        banner_url: values.banner_url,
        is_public: values.isPublic,
        institution_id: values.institution_id,
        event_id: values.event_id === 'none' ? undefined : values.event_id,
        fields,
        status: 'draft' as const,
        submission_limit: values.submission_limit,
        created_by: user.id
      };

      console.log('Submitting form data:', formData);
      const result = await FormService.createForm(formData);
      console.log('Form creation result:', result);

      toast.success('Form created successfully');
      router.push(`/organizations/events/${values.event_id}?tab=forms`);
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to create form'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBannerUpload = async (file: File) => {
    try {
      setIsSubmitting(true);
      const { publicUrl, error } = await StorageService.uploadFormBanner(file);

      if (error) throw error;
      if (!publicUrl) throw new Error('Failed to get upload URL');

      form.setValue('banner_url', publicUrl);
      toast.success('Banner uploaded successfully');
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast.error('Failed to upload banner');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='space-y-8'>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-6'
          onKeyDown={(e) => {
            // Prevent form submission when pressing Enter inside textareas and inputs
            if (e.key === 'Enter' && e.target instanceof HTMLTextAreaElement) {
              // Don't prevent default for textareas
              e.stopPropagation();
            }
          }}
        >
          <div className='grid gap-6'>
            <div className='grid gap-4 sm:grid-cols-2'>
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
                name='institution_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Institution</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select Institution' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {institutions.map((institution) => (
                          <SelectItem
                            key={institution.id}
                            value={institution.id}
                          >
                            {institution.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
              name='event_id'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event (Optional)</FormLabel>
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select Event' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='none'>None</SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='isPublic'
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
                  }}
                >
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
                                ref={provided.innerRef}
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
              </CardContent>
            </Card>
          </div>

          <div className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Form Banner</CardTitle>
                <CardDescription>
                  Upload a banner image for your form
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
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
      </Form>
    </div>
  );
}
