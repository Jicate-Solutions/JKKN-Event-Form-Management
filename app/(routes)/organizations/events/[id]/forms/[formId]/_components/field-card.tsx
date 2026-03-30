'use client';

import { FormField } from '@/types/forms';
import { Card } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldCardProps {
  field: FormField;
  isSelected: boolean;
  onClick: () => void;
  dragHandleProps: any;
  draggableProps: any;
  ref: any;
}

export function FieldCard({
  field,
  isSelected,
  onClick,
  dragHandleProps,
  draggableProps,
  ref
}: FieldCardProps) {
  return (
    <Card
      ref={ref}
      className={cn(
        'p-3 flex items-center cursor-pointer transition-colors border',
        isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/10'
      )}
      onClick={onClick}
      {...draggableProps}
    >
      <div
        className='flex items-center cursor-grab'
        {...dragHandleProps}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className='h-4 w-4 text-muted-foreground mr-2' />
      </div>

      <div className='flex-1'>
        <div className='flex items-center gap-2'>
          <h3 className='font-medium text-sm'>{field.label}</h3>
          <div className='bg-muted text-muted-foreground px-1.5 py-0.5 rounded-sm text-xs'>
            {field.type}
          </div>
          {field.required && (
            <div className='bg-red-50 text-red-600 px-1.5 py-0.5 rounded-sm text-xs'>
              Required
            </div>
          )}
        </div>
        {field.placeholder && (
          <p className='text-xs text-muted-foreground mt-0.5 truncate max-w-md'>
            {field.placeholder}
          </p>
        )}
      </div>
    </Card>
  );
}
