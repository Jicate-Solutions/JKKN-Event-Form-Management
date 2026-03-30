// app/(routes)/organizations/institutions/_components/department-contact-form.tsx

'use client';

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent } from '@/components/ui/card';

interface DepartmentContactFormProps {
  form: UseFormReturn<any>;
  department: string;
  label: string;
}

export function DepartmentContactForm({
  form,
  department,
  label
}: DepartmentContactFormProps) {
  return (
    <div className='space-y-4'>
      <h3 className='text-lg font-medium'>{label}</h3>
      <div className='grid gap-4 md:grid-cols-2'>
        <FormField
          control={form.control}
          name={`departments.${department}.contact_name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Name</FormLabel>
              <FormControl>
                <Input
                  placeholder='Enter contact name'
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`departments.${department}.designation`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Designation</FormLabel>
              <FormControl>
                <Input
                  placeholder='Enter designation'
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`departments.${department}.email`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type='email'
                  placeholder='Enter email'
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`departments.${department}.mobile`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mobile</FormLabel>
              <FormControl>
                <Input
                  placeholder='Enter mobile number'
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
