// app/(routes)/organizations/institutions/_components/institution-form.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Institution } from '@/types/organizations';
import { OrganizationService } from '@/lib/services/organization/organization-service';
import { UserService } from '@/lib/services/users/user-service';
import { UserRole } from '@/lib/constants/roles';
import { Profile } from '@/types/auth';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  coordinator_id: z.string().min(1, 'Institution coordinator is required'),
  is_active: z.boolean().default(true)
});

type FormValues = z.infer<typeof formSchema>;

interface InstitutionFormProps {
  institution?: Institution;
  isEditing?: boolean;
}

export function InstitutionForm({
  institution,
  isEditing
}: InstitutionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeExists, setCodeExists] = useState(false);
  const [coordinators, setCoordinators] = useState<Profile[]>([]);

  // Fetch institution coordinators
  useEffect(() => {
    const fetchCoordinators = async () => {
      try {
        const response = await UserService.getUsers({
          role: UserRole.INSTITUTION_COORDINATOR,
          isActive: true
        });
        setCoordinators(response.data);
      } catch (error) {
        console.error('Error fetching coordinators:', error);
        toast.error('Failed to load institution coordinators');
      }
    };
    fetchCoordinators();
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: institution?.name || '',
      coordinator_id: institution?.coordinator_id || '',
      is_active: institution?.is_active ?? true
    }
  });

  useEffect(() => {
    const checkDuplicate = async (value: string, field: string) => {
      if (!value || (isEditing && field === 'name')) return;
      const exists = await OrganizationService.checkCodeExists(
        value,
        isEditing ? institution?.id : undefined
      );
      setCodeExists(exists);
    };

    const subscription = form.watch((value, { name }) => {
      const fieldValue = value[name as keyof FormValues];
      if (name === 'name' && fieldValue && typeof fieldValue === 'string') {
        checkDuplicate(fieldValue, name);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, isEditing, institution?.id]);

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);

      if (isEditing && institution) {
        await OrganizationService.updateInstitution(institution.id, values);
        toast.success('Institution updated successfully');
      } else {
        await OrganizationService.createInstitution(values);
        toast.success('Institution created successfully');
      }

      router.push('/organizations/institutions');
      router.refresh();
    } catch (error) {
      console.error('Error saving institution:', error);
      toast.error('Failed to save institution');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        <Card>
          <CardContent className='p-6 space-y-6'>
            <h2 className='text-xl font-semibold'>Institution Information</h2>
            <div className='grid gap-6'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Institution Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Enter institution name' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Coordinator field */}
              <FormField
                control={form.control}
                name='coordinator_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Institution Coordinator</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select a coordinator' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {coordinators.map((coordinator) => (
                          <SelectItem
                            key={coordinator.id}
                            value={coordinator.id}
                          >
                            {coordinator.full_name}
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
                name='is_active'
                render={({ field }) => (
                  <FormItem className='flex items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <FormLabel>Active Status</FormLabel>
                      <div className='text-sm text-muted-foreground'>
                        Determine if this institution is active
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
            </div>
          </CardContent>
        </Card>

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
