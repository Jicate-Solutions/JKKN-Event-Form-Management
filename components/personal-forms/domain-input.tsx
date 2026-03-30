// components/personal-forms/domain-input.tsx
// Component for managing allowed email domains for personal forms

'use client';

import React, { useState } from 'react';
import { X, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  isValidDomain,
  normalizeDomain,
  formatDomainsForDisplay
} from '@/lib/utils/domain-validation';

interface DomainInputProps {
  value: string[];
  onChange: (domains: string[]) => void;
  disabled?: boolean;
}

export function DomainInput({ value = [], onChange, disabled = false }: DomainInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAddDomain = () => {
    if (!inputValue.trim()) {
      setError('Please enter a domain');
      return;
    }

    const normalized = normalizeDomain(inputValue);

    // Validate domain format
    if (!isValidDomain(normalized)) {
      setError(
        'Invalid domain format. Use format like "example.com" or "jkkn.ac.in" (without @)'
      );
      return;
    }

    // Check for duplicates
    if (value.some((d) => d.toLowerCase() === normalized)) {
      setError('This domain is already added');
      return;
    }

    // Add domain
    onChange([...value, normalized]);
    setInputValue('');
    setError(null);
  };

  const handleRemoveDomain = (domainToRemove: string) => {
    onChange(value.filter((d) => d !== domainToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDomain();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="e.g., jkkn.ac.in"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={error ? 'border-red-500' : ''}
          />
        </div>
        <Button
          type="button"
          onClick={handleAddDomain}
          disabled={disabled || !inputValue.trim()}
          size="default"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {value.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Allowed Domains ({value.length})</Label>
          <div className="flex flex-wrap gap-2">
            {value.map((domain) => (
              <Badge
                key={domain}
                variant="secondary"
                className="px-3 py-1.5 text-sm flex items-center gap-2"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <span>@{domain}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDomain(domain)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5 transition-colors"
                    aria-label={`Remove ${domain}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Only users with {formatDomainsForDisplay(value)} email addresses will be able to
            access this form.
          </p>
        </div>
      )}

      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No domains added yet. Add domains to restrict access to specific email addresses.
        </p>
      )}
    </div>
  );
}
