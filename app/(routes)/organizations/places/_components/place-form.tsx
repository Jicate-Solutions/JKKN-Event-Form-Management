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
import { CreatePlaceDto, Place, UpdatePlaceDto } from '@/types/organizations';
import { PlaceService } from '@/lib/services/organization/place-service';

const placeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  location: z.string().optional(),
  capacity: z.string().optional(),
  is_active: z.boolean().default(true)
});

type FormValues = z.infer<typeof placeSchema>;

interface PlaceFormProps {
  place?: Place;
  isEditing?: boolean;
}

export function PlaceForm({ place, isEditing }: PlaceFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameExists, setNameExists] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(placeSchema),
    defaultValues: {
      name: place?.name || '',
      description: place?.description || '',
      location: place?.location || '',
      capacity: place?.capacity?.toString() || '',
      is_active: place?.is_active ?? true
    }
  });

  useEffect(() => {
    const checkDuplicate = async (value: string) => {
      if (!value || (isEditing && value === place?.name)) return;
      const exists = await PlaceService.checkNameExists(
        value,
        isEditing ? place?.id : undefined
      );
      setNameExists(exists);
    };

    const subscription = form.watch((value, { name }) => {
      if (name === 'name' && value.name) {
        checkDuplicate(value.name);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, isEditing, place]);

  const onSubmit = async (values: FormValues) => {
    if (nameExists) {
      form.setError('name', {
        type: 'manual',
        message: 'A place with this name already exists'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const data = {
        ...values,
        capacity: values.capacity ? parseInt(values.capacity) : null
      };

      if (isEditing && place) {
        await PlaceService.updatePlace(
          place.id,
          data as unknown as UpdatePlaceDto
        );
        toast.success('Place updated successfully');
      } else {
        await PlaceService.createPlace(data as unknown as CreatePlaceDto);
        toast.success('Place created successfully');
      }
      router.push('/organizations/places');
      router.refresh();
    } catch (error) {
      console.error('Error saving place:', error);
      toast.error('Failed to save place');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Place Name</FormLabel>
              <FormControl>
                <Input placeholder='Enter place name' {...field} />
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
                <Textarea placeholder='Enter place description' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='grid gap-6 sm:grid-cols-2'>
          <FormField
            control={form.control}
            name='location'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder='Enter location' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='capacity'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacity</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    placeholder='Enter capacity'
                    {...field}
                  />
                </FormControl>
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
                <div className='text-sm text-muted-foreground'>
                  Determine if this place is active
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
