'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'react-hot-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Event } from '@/types/organizations';
import { EventService } from '@/lib/services/organization/event-service';
import { OrganizationService } from '@/lib/services/organization/organization-service';
import { PlaceService } from '@/lib/services/organization/place-service';
import { format } from 'date-fns';
import { DepartmentService } from '@/lib/services/organization/department-service';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card';

const eventSchema = z
  .object({
    title: z.string().min(2, 'Title must be at least 2 characters'),
    description: z.string().optional(),
    start_time: z.string().min(1, 'Start time is required'),
    end_time: z.string().min(1, 'End time is required'),
    place_id: z.string().min(1, 'Place is required'),
    institution_id: z.string().min(1, 'Institution is required'),
    department_id: z.string().optional(),
    is_active: z.boolean().default(true),
    has_registration_form: z.boolean().default(false)
  })
  .refine(
    (data) => {
      const start = new Date(data.start_time);
      const end = new Date(data.end_time);
      return end > start;
    },
    {
      message: 'End time must be after start time',
      path: ['end_time']
    }
  );

type FormValues = z.infer<typeof eventSchema>;

interface EventFormProps {
  event?: Event;
  isEditing?: boolean;
  coordinatorInstitution?: {
    id: string;
    name: string;
  } | null;
  isCoordinator?: boolean;
}

export function EventForm({
  event,
  isEditing,
  coordinatorInstitution,
  isCoordinator = false
}: EventFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [institutions, setInstitutions] = useState<
    { id: string; name: string }[]
  >([]);
  const [places, setPlaces] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: event?.title || '',
      description: event?.description || '',
      start_time: event?.start_time
        ? format(new Date(event.start_time), "yyyy-MM-dd'T'HH:mm")
        : '',
      end_time: event?.end_time
        ? format(new Date(event.end_time), "yyyy-MM-dd'T'HH:mm")
        : '',
      place_id: event?.place_id || '',
      institution_id: coordinatorInstitution?.id || event?.institution_id || '',
      department_id: event?.department_id || '',
      is_active: event?.is_active ?? true,
      has_registration_form: event?.has_registration_form ?? false
    }
  });

  useEffect(() => {
    async function fetchData() {
      try {
        let institutionsPromise;

        // For coordinators, only fetch their institution
        if (coordinatorInstitution) {
          institutionsPromise = Promise.resolve({
            data: [coordinatorInstitution],
            metadata: { total: 1 }
          });
        } else {
          institutionsPromise = OrganizationService.getInstitutions();
        }

        const [institutionsResult, placesResult] = await Promise.all([
          institutionsPromise,
          PlaceService.getPlaces()
        ]);

        setInstitutions(institutionsResult.data);
        setPlaces(placesResult.data);

        // If coordinator has an institution, set it in the form
        if (coordinatorInstitution && !form.getValues('institution_id')) {
          form.setValue('institution_id', coordinatorInstitution.id);
        }

        // If we have an institution_id (either from event or form), fetch departments
        const currentInstitutionId = form.getValues('institution_id');
        if (currentInstitutionId) {
          const departmentsResult = await DepartmentService.getDepartments({
            institution_id: currentInstitutionId
          });
          setDepartments(departmentsResult.data);
        }
      } catch (error) {
        console.error('Error fetching form data:', error);
        toast.error('Failed to load form data');
      }
    }

    fetchData();
  }, [coordinatorInstitution]);

  useEffect(() => {
    // Then, add a separate effect for watching institution changes
    const subscription = form.watch((value, { name, type }) => {
      if (name === 'institution_id') {
        const institutionId = value.institution_id;
        if (institutionId) {
          DepartmentService.getDepartments({ institution_id: institutionId })
            .then((result) => {
              setDepartments(result.data);
              // Clear department selection when institution changes
              form.setValue('department_id', '');
            })
            .catch((error) => {
              console.error('Error fetching departments:', error);
              toast.error('Failed to load departments');
            });
        } else {
          // Clear departments when no institution is selected
          setDepartments([]);
          form.setValue('department_id', '');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);

      // Clean up empty values
      const cleanedValues = {
        ...values,
        department_id: values.department_id || undefined // Remove empty string
      };

      // Log cleaned values to verify department_id handling
      console.log('Event form submission:', {
        original: values,
        cleaned: cleanedValues,
        department_id: {
          original: values.department_id,
          cleaned: cleanedValues.department_id
        }
      });

      // Calculate the event status based on the new dates
      const status = EventService.getEventStatus(
        values.start_time,
        values.end_time
      );

      console.log('Event dates:', {
        start: values.start_time,
        end: values.end_time,
        calculatedStatus: status,
        currentDate: new Date().toISOString()
      });

      if (isEditing && event) {
        const updatedEvent = await EventService.updateEvent(event.id, {
          ...cleanedValues,
          status // Include the recalculated status
        });
        console.log('Updated event:', updatedEvent);
        toast.success('Event updated successfully');
      } else {
        await EventService.createEvent({
          ...cleanedValues,
          status // Include the calculated status for new events
        } as Omit<
          Event,
          'id' | 'created_at' | 'updated_at' | 'created_by' | 'coordinator_id'
        >);
        toast.success('Event created successfully');
      }

      router.push('/organizations/events');
      router.refresh();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPublicFormUrl = (formId: string) => {
    return `/forms/public/auth?formId=${formId}`;
  };

  const handleShareForm = (formId: string) => {
    const publicFormUrl = getPublicFormUrl(formId);
    // Copy to clipboard or redirect as needed
    window.location.href = publicFormUrl;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <FormField
          control={form.control}
          name='title'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Title</FormLabel>
              <FormControl>
                <Input placeholder='Enter event title' {...field} />
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
                <Textarea placeholder='Enter event description' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='grid gap-6 sm:grid-cols-2'>
          <FormField
            control={form.control}
            name='start_time'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input type='datetime-local' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='end_time'
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <Input type='datetime-local' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className='grid gap-6 sm:grid-cols-2'>
          <FormField
            control={form.control}
            name='institution_id'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Institution</FormLabel>
                <Select
                  disabled={isSubmitting || !!coordinatorInstitution}
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger
                      className={coordinatorInstitution ? 'opacity-70' : ''}
                    >
                      <SelectValue placeholder='Select Institution' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {institutions.map((institution) => (
                      <SelectItem key={institution.id} value={institution.id}>
                        {institution.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {coordinatorInstitution && (
                  <p className='text-xs text-muted-foreground mt-1'>
                    Limited to your institution as coordinator
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='department_id'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department (Optional)</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Select Department' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departments.length > 0 ? (
                      departments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className='relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none text-muted-foreground'>
                        No departments available
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className='grid gap-6 sm:grid-cols-2'>
          <FormField
            control={form.control}
            name='place_id'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Place</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Select Place' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {places.map((place) => (
                      <SelectItem key={place.id} value={place.id}>
                        {place.name}
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
          name='is_active'
          render={({ field }) => (
            <FormItem className='flex items-center justify-between rounded-lg border p-4'>
              <div className='space-y-0.5'>
                <FormLabel>Active Status</FormLabel>
                <div className='text-sm text-muted-foreground '>
                  Determine if this event is active
                </div>
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
          name='has_registration_form'
          render={({ field }) => (
            <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
              <div className='space-y-0.5'>
                <FormLabel>Registration Form</FormLabel>
                <div className='text-sm text-muted-foreground'>
                  Enable to create a registration form for this event
                </div>
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

        {form.watch('has_registration_form') && (
          <Card>
            <CardHeader>
              <CardTitle>Registration Form</CardTitle>
              <CardDescription>
                Configure the registration form for this event
              </CardDescription>
            </CardHeader>
            <CardContent>{/* Add form builder component here */}</CardContent>
          </Card>
        )}

        <div className='flex justify-end gap-4'>
          <Button
            type='button'
            variant='outline'
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type='submit' disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
