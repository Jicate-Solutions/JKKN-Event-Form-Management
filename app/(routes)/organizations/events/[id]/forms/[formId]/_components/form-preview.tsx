'use client';

import { Form as FormType, FormField } from '@/types/forms';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { useState, useCallback } from 'react';
import { FormFieldRenderer } from '@/components/form/form-field-renderer';
import { cn } from '@/lib/utils';

interface FormPreviewProps {
  form: FormType;
}

export function FormPreview({ form }: FormPreviewProps) {
  // State to track values for all form fields
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  // State to track field visibility
  const [fieldVisibility, setFieldVisibility] = useState<
    Record<string, boolean>
  >({});

  // Handle field value changes
  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldId]: value
    }));
  }, []);

  // Handle field visibility changes
  const handleVisibilityChange = useCallback(
    (fieldId: string, isVisible: boolean) => {
      setFieldVisibility((prev) => ({
        ...prev,
        [fieldId]: isVisible
      }));
    },
    []
  );

  return (
    <div className='space-y-6 p-4 border rounded-lg bg-background'>
      <h2 className='text-xl font-semibold'>{form.title}</h2>
      {form.description && (
        <div
          className={cn(
            'text-muted-foreground prose prose-sm max-w-none rich-text-content',
            'prose-headings:mt-2 prose-headings:mb-2',
            'prose-p:mt-0 prose-p:mb-2',
            'prose-ul:mt-0 prose-ul:mb-2 prose-ul:list-disc prose-ul:ml-6',
            'prose-ol:mt-0 prose-ol:mb-2 prose-ol:list-decimal prose-ol:ml-6',
            'prose-li:mt-0 prose-li:mb-1 prose-li:pl-1',
            'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
            '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2',
            '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2',
            '[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mt-2 [&_ul]:mb-2',
            '[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mt-2 [&_ol]:mb-2',
            '[&_li]:mb-1 [&_li]:pl-1',
            '[&_strong]:font-semibold',
            '[&_em]:italic',
            '[&_u]:underline'
          )}
          dangerouslySetInnerHTML={{ __html: form.description }}
        />
      )}

      {form.fields.map((field) => (
        <div key={field.id} className='space-y-2'>
          <FormFieldRenderer
            field={field}
            value={formValues[field.id]}
            onChange={handleFieldChange}
            allFields={form.fields}
            formValues={formValues}
            onVisibilityChange={handleVisibilityChange}
            preview={true}
            className='mt-1'
          />
        </div>
      ))}
    </div>
  );
}

function renderField(
  field: FormField,
  fieldId: string,
  conditionalValue?: string,
  onConditionalChange?: (fieldId: string, value: string) => void
) {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'number':
      return (
        <Input type={field.type} placeholder={field.placeholder} disabled />
      );

    case 'textarea':
      return <Textarea placeholder={field.placeholder} disabled />;

    case 'select':
      return (
        <Select disabled>
          <SelectTrigger>
            <SelectValue
              placeholder={field.placeholder || 'Select an option'}
            />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'checkbox':
      return (
        <div className='space-y-2'>
          {field.options?.map((option) => (
            <div key={option} className='flex items-center space-x-2'>
              <Checkbox id={option} disabled />
              <label htmlFor={option}>{option}</label>
            </div>
          ))}
        </div>
      );

    case 'radio':
      return (
        <RadioGroup disabled>
          {field.options?.map((option) => (
            <div key={option} className='flex items-center space-x-2'>
              <RadioGroupItem value={option} id={option} disabled />
              <Label htmlFor={option}>{option}</Label>
            </div>
          ))}
        </RadioGroup>
      );

    case 'conditional':
      const triggerValue = field.conditional_trigger_value || 'Yes';
      const showFollowUp = conditionalValue === triggerValue;

      return (
        <div className='space-y-4'>
          <div className='space-y-2'>
            {field.condition_options?.map((option) => (
              <div key={option} className='flex items-center space-x-2'>
                <input
                  type='radio'
                  name={fieldId}
                  id={`${fieldId}-${option}`}
                  value={option}
                  checked={conditionalValue === option}
                  onChange={() => onConditionalChange?.(fieldId, option)}
                  className='h-4 w-4 text-primary rounded-full'
                />
                <Label htmlFor={`${fieldId}-${option}`}>{option}</Label>
              </div>
            ))}
          </div>

          {/* Only show the follow-up field if selected value matches trigger value */}
          {showFollowUp && (
            <div className='pl-6 border-l-2 border-muted pt-2'>
              <Label>
                {field.conditional_label || 'Please provide details'}
              </Label>
              {field.conditional_input_type === 'textarea' ? (
                <Textarea
                  placeholder={field.conditional_placeholder || ''}
                  disabled
                  className='mt-1'
                />
              ) : (
                <Input
                  type={field.conditional_input_type || 'text'}
                  placeholder={field.conditional_placeholder || ''}
                  disabled
                  className='mt-1'
                />
              )}
            </div>
          )}
        </div>
      );

    case 'file':
      return <Input type='file' disabled />;

    case 'date':
      return <Input type='date' disabled />;

    case 'time':
      return <Input type='time' disabled />;

    default:
      return <Input placeholder={field.placeholder} disabled />;
  }
}
