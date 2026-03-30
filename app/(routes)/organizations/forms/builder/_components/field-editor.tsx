'use client';

import { GripVertical, Trash2, Plus, X } from 'lucide-react';
import { FormField } from '@/types/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField as FormFieldUI,
  FormItem,
  FormLabel
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { ImageUpload } from '@/components/ui/image-upload';
import { StorageService } from '@/lib/storage/storage-service';
import { toast } from 'react-hot-toast';

interface FieldEditorProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
  onRemove: () => void;
}

export function FieldEditor({ field, onUpdate, onRemove }: FieldEditorProps) {
  const form = useForm({
    defaultValues: field
  });
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = (key: keyof FormField, value: any) => {
    onUpdate({ [key]: value });
  };

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploading(true);
      // We're using a temporary formId here since the form hasn't been created yet
      // The actual image will be properly stored when the form is submitted
      const tempFormId = 'temp';
      const { publicUrl, error } = await StorageService.uploadFormFieldImage(
        file,
        tempFormId,
        field.id
      );

      if (error) throw error;
      if (!publicUrl) throw new Error('Failed to get upload URL');

      handleChange('image_url', publicUrl);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <div className='flex items-center space-x-2'>
          <GripVertical className='h-5 w-5 text-muted-foreground cursor-move' />
          <CardTitle className='text-sm font-medium'>
            {field.type.charAt(0).toUpperCase() + field.type.slice(1)} Field
          </CardTitle>
        </div>
        <Button
          variant='ghost'
          size='sm'
          className='text-destructive'
          onClick={onRemove}
        >
          <Trash2 className='h-4 w-4' />
        </Button>
      </CardHeader>
      <CardContent>
        <div className='grid gap-4'>
          <FormFieldUI
            control={form.control}
            name='label'
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>Label</FormLabel>
                <FormControl>
                  <Input
                    {...formField}
                    value={field.label}
                    onChange={(e) => handleChange('label', e.target.value)}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {field.type !== 'image' && (
            <FormFieldUI
              control={form.control}
              name='placeholder'
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel>Placeholder</FormLabel>
                  <FormControl>
                    <Input
                      {...formField}
                      value={field.placeholder || ''}
                      onChange={(e) =>
                        handleChange('placeholder', e.target.value)
                      }
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}

          {field.type === 'image' && (
            <FormFieldUI
              control={form.control}
              name='image_url'
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel>Upload Image</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.image_url || ''}
                      onChange={(value) => handleChange('image_url', value)}
                      onUpload={handleImageUpload}
                      disabled={isUploading}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}

          {(field.type === 'select' ||
            field.type === 'radio' ||
            field.type === 'checkbox') && (
            <FormFieldUI
              control={form.control}
              name='options'
              render={({ field: formField }) => (
                <FormItem>
                  <div className='flex items-center justify-between mb-2'>
                    <FormLabel>Options</FormLabel>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        const currentOptions = field.options || [];
                        handleChange('options', [...currentOptions, '']);
                      }}
                    >
                      <Plus className='h-4 w-4 mr-1' /> Add Option
                    </Button>
                  </div>
                  <FormControl>
                    <div className='space-y-2'>
                      {(field.options || []).map((option, index) => (
                        <div key={index} className='flex items-center gap-2'>
                          <Input
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(field.options || [])];
                              newOptions[index] = e.target.value;
                              handleChange('options', newOptions);
                            }}
                            placeholder={`Option ${index + 1}`}
                            className='flex-1'
                          />
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => {
                              const newOptions = [...(field.options || [])];
                              newOptions.splice(index, 1);
                              handleChange('options', newOptions);
                            }}
                            className='text-destructive h-9 w-9 p-0'
                          >
                            <X className='h-4 w-4' />
                          </Button>
                        </div>
                      ))}
                      {(field.options || []).length === 0 && (
                        <div className='text-sm text-muted-foreground py-2 text-center'>
                          No options added. Click &quot;Add Option&quot; to add
                          one.
                        </div>
                      )}
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          )}

          {field.type === 'conditional' && (
            <>
              <FormFieldUI
                control={form.control}
                name='condition_options'
                render={({ field: formField }) => (
                  <FormItem>
                    <div className='flex items-center justify-between mb-2'>
                      <FormLabel>Condition Options (e.g., Yes/No)</FormLabel>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          const currentOptions = field.condition_options || [];
                          handleChange('condition_options', [
                            ...currentOptions,
                            ''
                          ]);
                        }}
                      >
                        <Plus className='h-4 w-4 mr-1' /> Add Option
                      </Button>
                    </div>
                    <FormControl>
                      <div className='space-y-2'>
                        {(field.condition_options || []).length === 0 && (
                          // Initialize with Yes/No options if none exist
                          <div className='text-sm text-muted-foreground py-2 text-center'>
                            <Button
                              type='button'
                              variant='outline'
                              onClick={() => {
                                handleChange('condition_options', [
                                  'Yes',
                                  'No'
                                ]);
                                handleChange(
                                  'conditional_trigger_value',
                                  'Yes'
                                );
                              }}
                            >
                              Initialize with Yes/No
                            </Button>
                          </div>
                        )}
                        {(field.condition_options || []).map(
                          (option, index) => (
                            <div
                              key={index}
                              className='flex items-center gap-2'
                            >
                              <Input
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [
                                    ...(field.condition_options || [])
                                  ];
                                  newOptions[index] = e.target.value;
                                  handleChange('condition_options', newOptions);
                                }}
                                placeholder={`Option ${index + 1}`}
                                className='flex-1'
                              />
                              <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                onClick={() => {
                                  const newOptions = [
                                    ...(field.condition_options || [])
                                  ];
                                  newOptions.splice(index, 1);
                                  handleChange('condition_options', newOptions);
                                }}
                                className='text-destructive h-9 w-9 p-0'
                              >
                                <X className='h-4 w-4' />
                              </Button>
                            </div>
                          )
                        )}
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormFieldUI
                control={form.control}
                name='conditional_trigger_value'
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>
                      Trigger Value (which option shows the follow-up field)
                    </FormLabel>
                    <FormControl>
                      <Input
                        value={field.conditional_trigger_value || ''}
                        onChange={(e) =>
                          handleChange(
                            'conditional_trigger_value',
                            e.target.value
                          )
                        }
                        placeholder='Yes'
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormFieldUI
                control={form.control}
                name='conditional_label'
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>Follow-up Question Label</FormLabel>
                    <FormControl>
                      <Input
                        value={field.conditional_label || ''}
                        onChange={(e) =>
                          handleChange('conditional_label', e.target.value)
                        }
                        placeholder='Please provide details'
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormFieldUI
                control={form.control}
                name='conditional_input_type'
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>Follow-up Input Type</FormLabel>
                    <FormControl>
                      <div className='flex gap-2'>
                        <Button
                          type='button'
                          variant={
                            field.conditional_input_type === 'text'
                              ? 'default'
                              : 'outline'
                          }
                          onClick={() =>
                            handleChange('conditional_input_type', 'text')
                          }
                          className='flex-1'
                        >
                          Text
                        </Button>
                        <Button
                          type='button'
                          variant={
                            field.conditional_input_type === 'textarea'
                              ? 'default'
                              : 'outline'
                          }
                          onClick={() =>
                            handleChange('conditional_input_type', 'textarea')
                          }
                          className='flex-1'
                        >
                          Textarea
                        </Button>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormFieldUI
                control={form.control}
                name='conditional_placeholder'
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>Follow-up Placeholder</FormLabel>
                    <FormControl>
                      <Input
                        value={field.conditional_placeholder || ''}
                        onChange={(e) =>
                          handleChange(
                            'conditional_placeholder',
                            e.target.value
                          )
                        }
                        placeholder='Enter details here...'
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </>
          )}

          <FormFieldUI
            control={form.control}
            name='required'
            render={({ field: formField }) => (
              <FormItem className='flex items-center justify-between space-y-0'>
                <FormLabel>Required Field</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.required}
                    onCheckedChange={(checked) =>
                      handleChange('required', checked)
                    }
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
