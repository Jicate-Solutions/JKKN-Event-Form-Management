'use client';

import { CameraIcon, X } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value?: string;
  onChange: (value: string) => void;
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  onUpload,
  disabled
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    },
    []
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        await onUpload(file);
      }
    },
    [disabled, onUpload]
  );

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;

      const file = e.target.files?.[0];
      if (file) {
        await onUpload(file);
      }
    },
    [disabled, onUpload]
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onChange('');
    },
    [onChange]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative rounded-lg border-2 border-dashed transition-colors',
        isDragging && 'border-primary/50 bg-primary/5',
        !value && 'hover:border-primary/50',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
        id="image-upload"
      />
      <label
        htmlFor="image-upload"
        className={cn(
          'flex min-h-[200px] cursor-pointer items-center justify-center p-4',
          disabled && 'cursor-not-allowed'
        )}
      >
        {value ? (
          <div className="relative aspect-video w-full">
            <Image
              src={value}
              alt="Upload"
              fill
              className="object-cover rounded"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -right-2 -top-2"
              onClick={handleRemove}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <CameraIcon className="h-8 w-8 mb-2" />
            <p className="text-sm">
              Drag & drop or click to upload banner image
            </p>
          </div>
        )}
      </label>
    </div>
  );
} 