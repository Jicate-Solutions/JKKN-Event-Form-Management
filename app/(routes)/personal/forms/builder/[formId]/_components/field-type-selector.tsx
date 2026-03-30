'use client';

// app/(routes)/personal/forms/builder/[formId]/_components/field-type-selector.tsx
// Field type selector for personal forms (excludes payment fields)

import { Plus } from 'lucide-react';
import { FormFieldType } from '@/types/forms';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface FieldTypeSelectorProps {
  onSelect: (type: FormFieldType) => void;
}

// Personal forms exclude payment fields
const FIELD_TYPES: { type: FormFieldType; label: string }[] = [
  { type: 'text', label: 'Text Field' },
  { type: 'number', label: 'Number Field' },
  { type: 'email', label: 'Email Field' },
  { type: 'textarea', label: 'Text Area' },
  { type: 'select', label: 'Dropdown Select' },
  { type: 'checkbox', label: 'Checkbox Group' },
  { type: 'radio', label: 'Radio Group' },
  { type: 'date', label: 'Date Picker' },
  { type: 'time', label: 'Time Picker' },
  { type: 'file', label: 'File Upload' },
  { type: 'image', label: 'Image Field' },
  { type: 'signature', label: 'Signature' }
  // Note: 'payment' type is intentionally excluded for personal forms
];

export function FieldTypeSelector({ onSelect }: FieldTypeSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Field
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        className="w-56 p-0"
        sideOffset={8}
        collisionPadding={16}
        avoidCollisions={true}
      >
        <div className="max-h-[320px] overflow-y-auto overscroll-contain p-1">
          {FIELD_TYPES.map(({ type, label }) => (
            <DropdownMenuItem
              key={type}
              onClick={() => onSelect(type)}
              className="cursor-pointer"
            >
              {label}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
