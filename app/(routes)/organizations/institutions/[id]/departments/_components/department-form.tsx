'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'react-hot-toast';
import { Department } from '@/types/organizations';
import { DepartmentService } from '@/lib/services/organization/department-service';
import { UserService } from '@/lib/services/users/user-service';
import { UserRole } from '@/lib/constants/roles';
import { Profile } from '@/types/auth';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  coordinator_ids: z
    .array(z.string())
    .min(1, 'At least one coordinator is required'),
  is_active: z.boolean().default(true)
});

type FormValues = z.infer<typeof formSchema>;

interface DepartmentFormProps {
  institutionId: string;
  department?: Department;
  isEditing?: boolean;
}

export function DepartmentForm({
  institutionId,
  department,
  isEditing
}: DepartmentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coordinators, setCoordinators] = useState<Profile[]>([]);

  useEffect(() => {
    const fetchCoordinators = async () => {
      try {
        const response = await UserService.getUsers({
          role: UserRole.EVENT_COORDINATOR,
          isActive: true
        });
        setCoordinators(response.data);
      } catch (error) {
        console.error('Error fetching coordinators:', error);
        toast.error('Failed to load event coordinators');
      }
    };
    fetchCoordinators();
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: department?.name || '',
      coordinator_ids: department?.coordinators?.map((coord) => coord.id) || [],
      is_active: department?.is_active ?? true
    }
  });

  const handleCancel = () => {
    if (isEditing && department) {
      router.push(
        `/organizations/institutions/${institutionId}/departments/${department.id}`
      );
    } else {
      router.push(`/organizations/institutions/${institutionId}`);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      console.log('Form values:', values);

      if (isEditing && department) {
        await DepartmentService.updateDepartment(department.id, {
          ...values,
          institution_id: institutionId
        });
        toast.success('Department updated successfully');
        router.push(
          `/organizations/institutions/${institutionId}/departments/${department.id}`
        );
      } else {
        const result = await DepartmentService.createDepartment({
          ...values,
          institution_id: institutionId
        });
        console.log('Created department:', result);
        toast.success('Department created successfully');
        router.push(`/organizations/institutions/${institutionId}`);
      }
      router.refresh();
    } catch (error) {
      console.error('Error saving department:', error);
      toast.error('Failed to save department');
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
              <FormLabel>Department Name</FormLabel>
              <FormControl>
                <Input placeholder='Enter department name' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='coordinator_ids'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Coordinators</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange([...field.value, value]);
                }}
                value={field.value?.[0] || ''}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Select event coordinators' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {coordinators
                    .filter((c) => !field.value.includes(c.id))
                    .map((coordinator) => (
                      <SelectItem key={coordinator.id} value={coordinator.id}>
                        {coordinator.full_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {field.value?.length > 0 && (
                <div className='flex flex-wrap gap-2 mt-2'>
                  {field.value.map((id) => {
                    const coordinator = coordinators.find((c) => c.id === id);
                    return (
                      <Badge key={id} variant='secondary'>
                        {coordinator?.full_name}
                        <Button
                          variant='ghost'
                          size='sm'
                          className='ml-2 h-auto p-0'
                          onClick={() => {
                            field.onChange(field.value.filter((v) => v !== id));
                          }}
                        >
                          ×
                        </Button>
                      </Badge>
                    );
                  })}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='is_active'
          render={({ field }) => (
            <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
              <div className='space-y-0.5'>
                <FormLabel className='text-base'>Active Status</FormLabel>
                <div className='text-sm text-muted-foreground'>
                  Determine if this department is active
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

        <div className='flex justify-end space-x-4'>
          <Button
            type='button'
            variant='outline'
            onClick={handleCancel}
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
