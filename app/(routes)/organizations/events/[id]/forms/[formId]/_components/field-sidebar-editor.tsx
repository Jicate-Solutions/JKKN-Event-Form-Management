'use client';

import { FormField } from '@/types/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { ImageUpload } from '@/components/ui/image-upload';
import { StorageService } from '@/lib/storage/storage-service';
import { toast } from 'react-hot-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConditionalRulesEditor } from './conditional-rules-editor';
import { X, Plus, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import Image from 'next/image';

// Field options component for select, radio, checkbox fields
function FieldOptions({
  field,
  onUpdate
}: {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
}) {
  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between mb-2'>
        <Label>Options</Label>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => {
            const currentOptions = field.options || [];
            onUpdate({
              options: [...currentOptions, '']
            });
          }}
        >
          <Plus className='h-4 w-4 mr-1' /> Add Option
        </Button>
      </div>
      <div className='space-y-2'>
        {(field.options || []).map((option, index) => (
          <div key={index} className='flex items-center gap-2'>
            <Input
              value={option}
              onChange={(e) => {
                const newOptions = [...(field.options || [])];
                newOptions[index] = e.target.value;
                onUpdate({
                  options: newOptions
                });
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
                onUpdate({
                  options: newOptions
                });
              }}
              className='text-destructive h-9 w-9 p-0'
            >
              <X className='h-4 w-4' />
            </Button>
          </div>
        ))}
        {(field.options || []).length === 0 && (
          <div className='text-sm text-muted-foreground py-2 text-center'>
            No options added. Click &quot;Add Option&quot; to add one.
          </div>
        )}
      </div>
    </div>
  );
}

// Conditional field editor component
function ConditionalFieldEditor({
  field,
  onUpdate
}: {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
}) {
  const conditionOptions = field.condition_options || ['Yes', 'No'];
  const conditionalInputType = field.conditional_input_type || 'text';
  const conditionalLabel = field.conditional_label || '';
  const conditionalPlaceholder = field.conditional_placeholder || '';
  const conditionalTriggerValue = field.conditional_trigger_value || 'Yes';

  return (
    <div className='space-y-4'>
      <div className='grid gap-2'>
        <Label>Yes/No Options</Label>
        <div className='grid gap-2 grid-cols-2'>
          {conditionOptions.map((option, index) => (
            <div key={index} className='flex items-center gap-2'>
              <Input
                value={option}
                onChange={(e) => {
                  const newOptions = [...conditionOptions];
                  newOptions[index] = e.target.value;
                  onUpdate({
                    condition_options: newOptions
                  });
                }}
                placeholder={`Option ${index + 1}`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className='grid gap-2'>
        <Label>Show Follow-up When Answer Is</Label>
        <Select
          value={conditionalTriggerValue}
          onValueChange={(value) => {
            onUpdate({
              conditional_trigger_value: value
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder='Select condition' />
          </SelectTrigger>
          <SelectContent>
            {conditionOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='grid gap-2'>
        <Label>Follow-up Question Type</Label>
        <Select
          value={conditionalInputType}
          onValueChange={(value) => {
            onUpdate({
              conditional_input_type: value
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder='Select input type' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='text'>Text Field</SelectItem>
            <SelectItem value='textarea'>Text Area</SelectItem>
            <SelectItem value='number'>Number Field</SelectItem>
            <SelectItem value='email'>Email Field</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className='grid gap-2'>
        <Label>Follow-up Question Label</Label>
        <Input
          value={conditionalLabel}
          onChange={(e) => {
            onUpdate({
              conditional_label: e.target.value
            });
          }}
          placeholder='Enter follow-up question label'
        />
      </div>

      <div className='grid gap-2'>
        <Label>Follow-up Placeholder</Label>
        <Input
          value={conditionalPlaceholder}
          onChange={(e) => {
            onUpdate({
              conditional_placeholder: e.target.value
            });
          }}
          placeholder='Enter placeholder text'
        />
      </div>
    </div>
  );
}

interface FieldSidebarEditorProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
  onRemove: () => void;
  onClose: () => void;
  allFields?: FormField[];
}

export function FieldSidebarEditor({
  field,
  onUpdate,
  onRemove,
  onClose,
  allFields = []
}: FieldSidebarEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const handleChange = (key: keyof FormField, value: any) => {
    onUpdate({ [key]: value });
  };

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploading(true);
      // We're using a temporary formId here since the form hasn't been created yet
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
    <div className='h-full flex flex-col'>
      <div className='flex items-center justify-between p-6 border-b sticky top-0 bg-background z-10'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <span className='bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium capitalize'>
              {field.type} Field
            </span>
            {field.required && (
              <span className='bg-red-50 text-red-600 px-2 py-0.5 rounded text-xs font-medium'>
                Required
              </span>
            )}
          </div>
          <h3 className='text-lg font-medium'>
            {field.label || 'Untitled Field'}
          </h3>
        </div>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={onRemove}
          className='text-destructive'
        >
          <Trash2 className='h-4 w-4 mr-1' /> Delete
        </Button>
      </div>

      <div className='p-6 overflow-y-auto flex-grow'>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className='w-full mb-4'>
            <TabsTrigger value='basic' className='flex-1'>
              Basic Settings
            </TabsTrigger>
            <TabsTrigger value='conditional' className='flex-1'>
              Conditional Logic
            </TabsTrigger>
            {field.type === 'payment' && (
              <TabsTrigger value='payment' className='flex-1'>
                Payment
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value='basic'>
            <div className='space-y-4'>
              <div className='grid gap-2'>
                <Label>Field Type</Label>
                <div className='p-2 border rounded-md bg-muted/20'>
                  <p className='text-sm font-medium capitalize'>{field.type}</p>
                </div>
              </div>

              <div className='grid gap-2'>
                <Label>Label</Label>
                <Input
                  value={field.label}
                  onChange={(e) => handleChange('label', e.target.value)}
                  placeholder='Field label'
                />
              </div>

              <div className='grid gap-2'>
                <Label>Placeholder</Label>
                <Input
                  value={field.placeholder || ''}
                  onChange={(e) => handleChange('placeholder', e.target.value)}
                  placeholder='Field placeholder'
                />
              </div>

              {(field.type === 'select' ||
                field.type === 'radio' ||
                field.type === 'checkbox') && (
                <FieldOptions field={field} onUpdate={onUpdate} />
              )}

              {field.type === 'conditional' && (
                <ConditionalFieldEditor field={field} onUpdate={onUpdate} />
              )}

              {field.type === 'file' && (
                <div className='grid gap-2'>
                  <Label>Accepted File Types</Label>
                  <Input
                    value={field.accept || ''}
                    onChange={(e) => handleChange('accept', e.target.value)}
                    placeholder='.pdf,.doc,.docx'
                  />
                  <p className='text-xs text-muted-foreground'>
                    Comma-separated list of file extensions (e.g., .pdf,.doc)
                  </p>
                </div>
              )}

              {field.type === 'image' && (
                <div className='space-y-4'>
                  <div className='grid gap-2'>
                    <Label>Image</Label>
                    {field.image_url ? (
                      <div className='space-y-2'>
                        <div className='relative w-full h-[150px] rounded-md overflow-hidden border'>
                          <Image
                            src={field.image_url}
                            alt={field.label || 'Form image'}
                            className='object-contain w-full h-full'
                            width={100}
                            height={100}
                          />
                        </div>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => handleChange('image_url', null)}
                          className='w-full'
                        >
                          Remove Image
                        </Button>
                      </div>
                    ) : (
                      <ImageUpload
                        value=''
                        onChange={(url) => handleChange('image_url', url)}
                        onUpload={handleImageUpload}
                        disabled={isUploading}
                      />
                    )}
                  </div>
                </div>
              )}

              <div className='flex items-center justify-between'>
                <Label>Required</Label>
                <Switch
                  checked={field.required}
                  onCheckedChange={(checked) =>
                    handleChange('required', checked)
                  }
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value='conditional'>
            <ConditionalRulesEditor
              field={field}
              allFields={allFields}
              onUpdate={onUpdate}
            />
          </TabsContent>

          {field.type === 'payment' && (
            <TabsContent value='payment'>
              <div className='space-y-4'>
                <div className='grid gap-2'>
                  <Label>Amount</Label>
                  <Input
                    type='number'
                    value={field.payment_amount || ''}
                    onChange={(e) =>
                      handleChange('payment_amount', parseFloat(e.target.value))
                    }
                    placeholder='0.00'
                  />
                </div>

                <div className='grid gap-2'>
                  <Label>Currency</Label>
                  <Select
                    value={field.payment_currency || 'USD'}
                    onValueChange={(value) =>
                      handleChange('payment_currency', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select currency' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='USD'>USD ($)</SelectItem>
                      <SelectItem value='EUR'>EUR (€)</SelectItem>
                      <SelectItem value='GBP'>GBP (£)</SelectItem>
                      <SelectItem value='MYR'>MYR (RM)</SelectItem>
                      <SelectItem value='INR'>INR (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='grid gap-2'>
                  <Label>Description</Label>
                  <Textarea
                    value={field.payment_description || ''}
                    onChange={(e) =>
                      handleChange('payment_description', e.target.value)
                    }
                    placeholder='Payment description'
                  />
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
