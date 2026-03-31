import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  FormField,
  ConditionalRule,
  ConditionalRuleState
} from '@/types/forms';
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
import { cn } from '@/lib/utils';
import { Upload, File as FileIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface FormFieldRendererProps {
  field: FormField;
  value?: any;
  onChange?: (fieldId: string, value: any) => void;
  disabled?: boolean;
  preview?: boolean;
  className?: string;
  allFields?: FormField[];
  formValues?: Record<string, any>;
  onVisibilityChange?: (fieldId: string, isVisible: boolean) => void;
  formId?: string; // Form ID for file uploads
  formType?: 'personal' | 'organization'; // Type of form for proper file upload routing
}

// Helper component to render field label with required indicator
const FieldLabel: React.FC<{
  label: string;
  required?: boolean;
  htmlFor?: string;
}> = ({ label, required, htmlFor }) => (
  <Label htmlFor={htmlFor}>
    {label}
    {required && <span className='text-destructive ml-1'>*</span>}
  </Label>
);

// Helper to evaluate a conditional rule
const evaluateConditionalRule = (
  rule: ConditionalRule,
  formValues: Record<string, any>
): boolean => {
  const sourceFieldValue = formValues[rule.source_field_id];
  const ruleValue = rule.value;

  // Debug flag - set to true to enable conditional logic debugging
  const DEBUG_CONDITIONAL_LOGIC = false;

  if (DEBUG_CONDITIONAL_LOGIC) {
    console.log(`🔍 Evaluating rule:`, {
      source_field_id: rule.source_field_id,
      state: rule.state,
      value: ruleValue,
      sourceFieldValue,
      action: rule.action,
      target_field_ids: rule.target_field_ids
    });
  }

  let result = false;

  switch (rule.state) {
    case 'is_empty':
      result =
        sourceFieldValue === undefined ||
        sourceFieldValue === null ||
        sourceFieldValue === '' ||
        (Array.isArray(sourceFieldValue) && sourceFieldValue.length === 0);
      break;

    case 'is_filled':
      result =
        sourceFieldValue !== undefined &&
        sourceFieldValue !== null &&
        sourceFieldValue !== '' &&
        (!Array.isArray(sourceFieldValue) || sourceFieldValue.length > 0);
      break;

    case 'is_equal':
      result = sourceFieldValue === ruleValue;
      break;

    case 'is_not_equal':
      result = sourceFieldValue !== ruleValue;
      break;

    case 'contains':
      result =
        typeof sourceFieldValue === 'string' &&
        sourceFieldValue.includes(ruleValue || '');
      break;

    case 'not_contains':
      result =
        typeof sourceFieldValue === 'string' &&
        !sourceFieldValue.includes(ruleValue || '');
      break;

    case 'greater_than':
      result = Number(sourceFieldValue) > Number(ruleValue);
      break;

    case 'less_than':
      result = Number(sourceFieldValue) < Number(ruleValue);
      break;

    case 'age_greater_than_or_equal': {
      // Calculate age from a date field value and compare
      if (sourceFieldValue) {
        const birthDate = new Date(sourceFieldValue);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        result = age >= Number(ruleValue);
      }
      break;
    }

    case 'age_less_than': {
      // Calculate age from a date field value and compare
      if (sourceFieldValue) {
        const birthDate = new Date(sourceFieldValue);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        result = age < Number(ruleValue);
      }
      break;
    }

    case 'before':
      result = new Date(sourceFieldValue) < new Date(ruleValue || '');
      break;

    case 'after':
      result = new Date(sourceFieldValue) > new Date(ruleValue || '');
      break;

    case 'equal_to_date':
      // Compare only the date part
      result =
        new Date(sourceFieldValue).toDateString() ===
        new Date(ruleValue || '').toDateString();
      break;

    case 'not_equal_to_date':
      result =
        new Date(sourceFieldValue).toDateString() !==
        new Date(ruleValue || '').toDateString();
      break;

    case 'equal_to_day':
      // Compare day of week (0-6, where 0 is Sunday)
      result =
        new Date(sourceFieldValue).getDay() === parseInt(ruleValue || '0', 10);
      break;

    case 'not_equal_to_day':
      result =
        new Date(sourceFieldValue).getDay() !== parseInt(ruleValue || '0', 10);
      break;

    default:
      result = false;
  }

  if (DEBUG_CONDITIONAL_LOGIC) {
    console.log(`📝 Rule result: ${result}`);
  }

  return result;
};

export function FormFieldRenderer({
  field,
  value,
  onChange,
  disabled = false,
  preview = false,
  className,
  allFields = [],
  formValues = {},
  onVisibilityChange,
  formId,
  formType = 'personal'
}: FormFieldRendererProps) {
  const [conditionalValue, setConditionalValue] = useState<any>(null);
  const [showConditionalField, setShowConditionalField] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [fileName, setFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  // Default accepted file types if none specified
  const defaultAcceptedTypes = '.pdf,.jpg,.jpeg,.png,.gif';

  // Refs to prevent infinite loops
  const prevVisibilityRef = React.useRef(true);
  const initializedRef = React.useRef(false);

  // Effect to check if conditional field should be shown (original conditional type)
  useEffect(() => {
    if (field.type === 'conditional' && value) {
      setShowConditionalField(value === field.conditional_trigger_value);
    }
  }, [field, value]);

  // New effect to handle advanced conditional logic visibility
  useEffect(() => {
    // First check if this field has its own conditional rules
    let shouldBeVisible = true;
    let hasOwnRules = false;

    if (field.conditional_rules && field.conditional_rules.length > 0) {
      hasOwnRules = true;

      // Process each rule on this field
      for (const rule of field.conditional_rules) {
        const conditionMet = evaluateConditionalRule(rule, formValues);

        // Apply the rule's action if condition is met
        if (conditionMet) {
          if (rule.action === 'hide') {
            shouldBeVisible = false;
            break; // If any rule says to hide, we hide
          } else if (rule.action === 'show') {
            shouldBeVisible = true;
            // Don't break here, as later rules might hide it
          }
        } else {
          // If condition is not met and action is 'show', then hide
          if (rule.action === 'show') {
            shouldBeVisible = false;
          }
          // If condition is not met and action is 'hide', keep visible
        }
      }
    }

    // CRITICAL FIX: Also check if OTHER fields have rules that affect THIS field
    // This handles the "hide_multiple" and "show_multiple" actions
    allFields.forEach((otherField) => {
      if (otherField.id === field.id || !otherField.conditional_rules) return;

      otherField.conditional_rules.forEach((rule) => {
        // Check if this rule targets the current field
        const targetsThisField =
          rule.target_field_ids && rule.target_field_ids.includes(field.id);

        if (targetsThisField) {
          const conditionMet = evaluateConditionalRule(rule, formValues);

          if (conditionMet) {
            if (rule.action === 'hide' || rule.action === 'hide_multiple') {
              shouldBeVisible = false;
            } else if (
              rule.action === 'show' ||
              rule.action === 'show_multiple'
            ) {
              shouldBeVisible = true;
            }
          } else {
            // If condition is not met and action is 'show', then hide
            if (rule.action === 'show' || rule.action === 'show_multiple') {
              shouldBeVisible = false;
            }
            // If condition is not met and action is 'hide', keep visible
          }
        }
      });
    });

    // If no rules affect this field at all, default to visible
    if (
      !hasOwnRules &&
      !allFields.some((f) =>
        f.conditional_rules?.some((r) => r.target_field_ids?.includes(field.id))
      )
    ) {
      shouldBeVisible = true;
    }

    // Only update and notify if visibility actually changed to prevent loops
    if (prevVisibilityRef.current !== shouldBeVisible) {
      prevVisibilityRef.current = shouldBeVisible;
      setIsVisible(shouldBeVisible);

      if (onVisibilityChange) {
        onVisibilityChange(field.id, shouldBeVisible);
      }
    }
  }, [
    field.id,
    field.conditional_rules,
    formValues,
    onVisibilityChange,
    allFields
  ]);

  // Skip rendering if the field should be hidden
  if (!isVisible) {
    return null;
  }

  const handleChange = (val: any) => {
    if (onChange) {
      if (field.type === 'conditional') {
        // For conditional fields, value is an object with main and conditional values
        onChange(field.id, val);

        // Check if we should show the conditional field
        setShowConditionalField(val === field.conditional_trigger_value);
      } else {
        onChange(field.id, val);
      }
    }
  };

  const handleConditionalFieldChange = (val: any) => {
    if (onChange) {
      // Update the conditionalValue state
      setConditionalValue(val);

      // Pass both values back to the parent
      onChange(`${field.id}_conditional`, val);
    }
  };

  // For preview mode, just render the field without interactive elements
  if (preview) {
    return renderPreview();
  }

  // For interactive mode with form controls
  return renderField();

  function renderPreview() {
    switch (field.type) {
      case 'image':
        return (
          <div className={cn('space-y-2', className)}>
            {field.label && <Label>{field.label}</Label>}
            <Card className='w-full overflow-hidden'>
              <CardContent className='p-0'>
                <div className='relative w-full h-[200px]'>
                  {field.image_url ? (
                    <Image
                      src={field.image_url}
                      alt={field.label || 'Form image'}
                      fill
                      className='object-contain'
                      sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                    />
                  ) : (
                    <div className='flex items-center justify-center h-full bg-muted/20'>
                      <p className='text-muted-foreground text-sm'>
                        No image available
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'conditional':
        return (
          <div className={cn('space-y-2', className)}>
            {field.label && <Label>{field.label}</Label>}
            <RadioGroup disabled={true}>
              {field.condition_options?.map((option) => (
                <div key={option} className='flex items-center space-x-2'>
                  <RadioGroupItem value={option} id={option} />
                  <Label htmlFor={option}>{option}</Label>
                </div>
              ))}
            </RadioGroup>

            {/* Show conditional field in preview if trigger is the first option */}
            {field.conditional_trigger_value ===
              field.condition_options?.[0] && (
              <div className='pl-6 pt-2 border-l-2 border-muted'>
                <Label>{field.conditional_label}</Label>
                <Input
                  placeholder={field.conditional_placeholder || ''}
                  disabled={true}
                />
              </div>
            )}
          </div>
        );

      case 'text':
      case 'email':
      case 'number':
        return (
          <div className={cn('space-y-2', className)}>
            {field.label && <Label>{field.label}</Label>}
            <Input
              type={field.type}
              placeholder={field.placeholder}
              disabled={true}
            />
          </div>
        );

      case 'file':
        return (
          <div className={cn('space-y-2', className)}>
            {field.label && <Label>{field.label}</Label>}
            <Input type='file' accept={field.accept} disabled={true} />
            {field.accept && (
              <p className='text-xs text-muted-foreground'>
                Accepted file types: {field.accept}
              </p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div className={cn('space-y-2', className)}>
            {field.label && <Label>{field.label}</Label>}
            <Textarea placeholder={field.placeholder} disabled={true} />
          </div>
        );

      case 'select':
        return (
          <div className={cn('space-y-2', className)}>
            {field.label && <Label>{field.label}</Label>}
            <Select disabled={true}>
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
          </div>
        );

      default:
        return (
          <div className={cn('space-y-2', className)}>
            {field.label && <Label>{field.label}</Label>}
            <Input placeholder={field.placeholder} disabled={true} />
          </div>
        );
    }
  }

  function renderField() {
    switch (field.type) {
      case 'conditional':
        return (
          <div className={cn('space-y-4', className)} data-field-id={field.id}>
            {field.label && <FieldLabel label={field.label} required={field.required} />}
            <RadioGroup
              value={value || ''}
              onValueChange={handleChange}
              disabled={disabled}
            >
              {field.condition_options?.map((option) => (
                <div key={option} className='flex items-center space-x-2'>
                  <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                  <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>

            {/* Show conditional input field when the trigger value is selected */}
            {showConditionalField && (
              <div className='pl-6 border-l-2 border-primary-foreground/20 pt-2'>
                <Label>
                  {field.conditional_label || 'Please provide details'}
                </Label>
                {field.conditional_input_type === 'textarea' ? (
                  <Textarea
                    value={conditionalValue || ''}
                    onChange={(e) =>
                      handleConditionalFieldChange(e.target.value)
                    }
                    placeholder={field.conditional_placeholder || ''}
                    disabled={disabled}
                    className='mt-1'
                  />
                ) : (
                  <Input
                    type={field.conditional_input_type || 'text'}
                    value={conditionalValue || ''}
                    onChange={(e) =>
                      handleConditionalFieldChange(e.target.value)
                    }
                    placeholder={field.conditional_placeholder || ''}
                    disabled={disabled}
                    className='mt-1'
                  />
                )}
              </div>
            )}
          </div>
        );

      case 'image':
        return (
          <div className={cn('space-y-2', className)} data-field-id={field.id}>
            {field.label && <Label>{field.label}</Label>}
            <Card className='w-full overflow-hidden'>
              <CardContent className='p-0'>
                <div className='relative w-full h-[200px]'>
                  {field.image_url ? (
                    <Image
                      src={field.image_url}
                      alt={field.label || 'Form image'}
                      fill
                      className='object-contain'
                      sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                    />
                  ) : (
                    <div className='flex items-center justify-center h-full bg-muted/20'>
                      <p className='text-muted-foreground text-sm'>
                        No image available
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'text':
      case 'email':
      case 'number':
        return (
          <div className={cn('space-y-2', className)} data-field-id={field.id}>
            {field.label && <FieldLabel label={field.label} required={field.required} />}
            <Input
              type={field.type}
              value={value || ''}
              onChange={(e) => handleChange(field.uppercase ? e.target.value.toUpperCase() : e.target.value)}
              placeholder={field.placeholder}
              disabled={disabled}
              style={field.uppercase ? { textTransform: 'uppercase' } : undefined}
            />
          </div>
        );

      case 'file':
        const acceptedTypes = field.accept || defaultAcceptedTypes;

        return (
          <div className={cn('space-y-2', className)} data-field-id={field.id}>
            {field.label && <FieldLabel label={field.label} required={field.required} />}
            <div className='flex flex-col gap-2'>
              <div
                className={cn(
                  'relative border-2 border-dashed rounded-lg p-4',
                  'hover:border-primary/50 transition-colors',
                  disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                )}
              >
                <input
                  type='file'
                  className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Validate file type
                      const fileType = file.type.toLowerCase();
                      const fileExtension =
                        '.' + file.name.split('.').pop()?.toLowerCase();
                      const acceptedExtensions = acceptedTypes.split(',');

                      if (
                        acceptedExtensions.some(
                          (ext) =>
                            fileExtension === ext ||
                            (fileType === 'application/pdf' &&
                              ext === '.pdf') ||
                            (fileType.startsWith('image/') &&
                              ext.match(/\.(jpg|jpeg|png|gif)$/))
                        )
                      ) {
                        // Upload file to server
                        if (formId) {
                          try {
                            setIsUploading(true);
                            setFileName(file.name);

                            const formData = new FormData();
                            formData.append('file', file);

                            const uploadUrl = formType === 'personal'
                              ? `/api/personal-forms/${formId}/upload`
                              : `/api/organizations/forms/${formId}/upload`;

                            const response = await fetch(uploadUrl, {
                              method: 'POST',
                              body: formData
                            });

                            if (!response.ok) {
                              const error = await response.json();
                              throw new Error(error.error || 'Failed to upload file');
                            }

                            const data = await response.json();

                            // Pass file metadata to parent
                            handleChange({
                              url: data.url,
                              name: data.name
                            });

                            toast.success('File uploaded successfully');
                          } catch (error: any) {
                            console.error('File upload error:', error);
                            toast.error(error.message || 'Failed to upload file');
                            setFileName('');
                            handleChange(null);
                          } finally {
                            setIsUploading(false);
                          }
                        } else {
                          // Fallback: pass file directly if no formId (for builder preview)
                          setFileName(file.name);
                          handleChange(file);
                        }
                      } else {
                        // Alert user about invalid file type
                        toast.error(
                          `Please upload a valid file type. Accepted types: ${acceptedTypes}`
                        );
                      }
                    }
                  }}
                  accept={acceptedTypes}
                  disabled={disabled || isUploading}
                />
                <div className='flex flex-col items-center justify-center gap-2'>
                  <div className='p-2 rounded-full bg-primary/10'>
                    {isUploading ? (
                      <Loader2 className='w-5 h-5 text-primary animate-spin' />
                    ) : (
                      <Upload className='w-5 h-5 text-primary' />
                    )}
                  </div>
                  <div className='text-center'>
                    <p className='text-sm font-medium'>
                      {isUploading
                        ? 'Uploading...'
                        : fileName
                        ? fileName
                        : 'Click to upload or drag and drop'}
                    </p>
                    <p className='text-xs text-muted-foreground mt-1'>
                      Accepted files: {acceptedTypes}
                    </p>
                  </div>
                </div>
              </div>
              {fileName && !isUploading && (
                <div className='flex items-center gap-2 p-2 border rounded-md bg-muted/20'>
                  <FileIcon className='w-4 h-4 text-primary' />
                  <span className='text-sm flex-1 truncate'>{fileName}</span>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      setFileName('');
                      handleChange(null);
                    }}
                    disabled={disabled}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          </div>
        );

      case 'textarea':
        return (
          <div className={cn('space-y-2', className)} data-field-id={field.id}>
            {field.label && <FieldLabel label={field.label} required={field.required} />}
            <Textarea
              value={value || ''}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={field.placeholder}
              disabled={disabled}
            />
          </div>
        );

      case 'select':
        return (
          <div className={cn('space-y-2', className)} data-field-id={field.id}>
            {field.label && <FieldLabel label={field.label} required={field.required} />}
            <Select
              value={value || ''}
              onValueChange={handleChange}
              disabled={disabled}
            >
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
          </div>
        );

      case 'checkbox':
        return (
          <div className={cn('space-y-2', className)} data-field-id={field.id}>
            {field.label && <FieldLabel label={field.label} required={field.required} />}
            <div className='space-y-2'>
              {field.options?.map((option) => (
                <div key={option} className='flex items-center space-x-2'>
                  <Checkbox
                    id={`${field.id}-${option}`}
                    checked={(value || []).includes(option)}
                    onCheckedChange={(checked) => {
                      const currentValues = Array.isArray(value) ? value : [];
                      if (checked) {
                        handleChange([...currentValues, option]);
                      } else {
                        handleChange(
                          currentValues.filter((v: string) => v !== option)
                        );
                      }
                    }}
                    disabled={disabled}
                  />
                  <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'radio':
        return (
          <div className={cn('space-y-2', className)} data-field-id={field.id}>
            {field.label && <FieldLabel label={field.label} required={field.required} />}
            <RadioGroup
              value={value || ''}
              onValueChange={handleChange}
              disabled={disabled}
            >
              {field.options?.map((option) => (
                <div key={option} className='flex items-center space-x-2'>
                  <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                  <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'date': {
        const isDobField = field.label.toLowerCase().includes('birth') || field.label.toLowerCase().includes('dob');
        let calculatedAge: number | null = null;
        if (isDobField && value) {
          const birthDate = new Date(value);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          if (age >= 0 && age < 150) {
            calculatedAge = age;
          }
        }
        return (
          <div className={cn('space-y-2', className)} data-field-id={field.id}>
            {field.label && <FieldLabel label={field.label} required={field.required} />}
            <Input
              type='date'
              value={value || ''}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={field.placeholder}
              disabled={disabled}
            />
            {isDobField && calculatedAge !== null && (
              <div className='flex items-center gap-2 px-3 py-2 rounded-md bg-primary/10 border border-primary/20'>
                <span className='text-sm font-medium text-primary'>
                  Age: {calculatedAge} {calculatedAge === 1 ? 'year' : 'years'}
                </span>
              </div>
            )}
          </div>
        );
      }

      case 'time':
        return (
          <div className={cn('space-y-2', className)} data-field-id={field.id}>
            {field.label && <FieldLabel label={field.label} required={field.required} />}
            <Input
              type='time'
              value={value || ''}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={field.placeholder}
              disabled={disabled}
            />
          </div>
        );

      case 'signature':
        return (
          <div className={cn('space-y-2', className)} data-field-id={field.id}>
            {field.label && <FieldLabel label={field.label} required={field.required} />}
            <div className='border rounded-md p-4'>
              <div className='relative h-40 w-full border-2 border-dashed border-muted-foreground/25 rounded-md'>
                {value ? (
                  <div className='relative w-full h-full'>
                    <Image
                      src={value}
                      alt='Signature'
                      fill
                      className='object-contain'
                    />
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='absolute top-2 right-2'
                      onClick={() => handleChange('')}
                      disabled={disabled}
                    >
                      Clear
                    </Button>
                  </div>
                ) : (
                  <div className='flex items-center justify-center h-full text-muted-foreground'>
                    <p className='text-sm'>Click to sign</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'payment':
        return (
          <div className={cn('space-y-2', className)} data-field-id={field.id}>
            {field.label && <FieldLabel label={field.label} required={field.required} />}
            <div className='p-4 border rounded-md bg-muted/10'>
              <div className='flex justify-between items-center mb-2'>
                <span className='text-sm text-muted-foreground'>Amount:</span>
                <span className='font-medium'>
                  {field.payment_currency === 'INR'
                    ? '₹'
                    : field.payment_currency === 'USD'
                      ? '$'
                      : field.payment_currency === 'EUR'
                        ? '€'
                        : field.payment_currency === 'GBP'
                          ? '£'
                          : field.payment_currency === 'MYR'
                            ? 'RM'
                            : ''}
                  {field.payment_amount?.toFixed(2) || '0.00'}
                </span>
              </div>
              {field.payment_description && (
                <div className='text-sm mb-3 text-muted-foreground'>
                  {field.payment_description}
                </div>
              )}
              <p className='text-xs text-muted-foreground mt-2'>
                You&apos;ll be redirected to the payment gateway after form
                submission.
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className={cn('space-y-2', className)} data-field-id={field.id}>
            {field.label && <FieldLabel label={field.label} required={field.required} />}
            <Input
              value={value || ''}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={field.placeholder}
              disabled={disabled}
            />
          </div>
        );
    }
  }
}
