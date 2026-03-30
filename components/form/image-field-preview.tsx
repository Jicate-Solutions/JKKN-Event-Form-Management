import React from 'react';
import Image from 'next/image';
import { FormField } from '@/types/forms';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ImageFieldPreviewProps {
  field: FormField;
  className?: string;
}

export function ImageFieldPreview({ field, className }: ImageFieldPreviewProps) {
  if (!field.image_url) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-4 flex items-center justify-center h-[200px] bg-muted/20">
          <p className="text-muted-foreground text-sm">No image available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full overflow-hidden', className)}>
      <CardContent className="p-0">
        <div className="relative w-full h-[200px]">
          <Image
            src={field.image_url}
            alt={field.label || 'Form image'}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        {field.label && (
          <div className="p-2 bg-background/80 text-center">
            <p className="text-sm font-medium">{field.label}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
