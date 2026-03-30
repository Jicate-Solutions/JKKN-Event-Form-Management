'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ExportAnalyticsProps {
  formId: string;
  formTitle: string;
  filters?: {
    dateRange?: {
      start: Date;
      end: Date;
    };
    isAnonymous?: boolean;
  };
}

export function ExportAnalytics({
  formId,
  formTitle,
  filters
}: ExportAnalyticsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      setIsExporting(true);
      toast.loading(`Exporting analytics as ${format.toUpperCase()}...`, {
        id: 'export'
      });

      // Build query params
      const params = new URLSearchParams({ format });

      if (filters?.dateRange) {
        params.append('startDate', filters.dateRange.start.toISOString());
        params.append('endDate', filters.dateRange.end.toISOString());
      }

      if (filters?.isAnonymous !== undefined) {
        params.append('isAnonymous', String(filters.isAnonymous));
      }

      const response = await fetch(
        `/api/personal-forms/${formId}/analytics/export?${params}`
      );

      if (!response.ok) {
        throw new Error('Failed to export analytics');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formTitle}_analytics_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Analytics exported successfully!', { id: 'export' });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export analytics', { id: 'export' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' size='sm' disabled={isExporting}>
          {isExporting ? (
            <>
              <Loader2 className='h-4 w-4 mr-2 animate-spin' />
              Exporting...
            </>
          ) : (
            <>
              <Download className='h-4 w-4 mr-2' />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileText className='h-4 w-4 mr-2' />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')}>
          <FileSpreadsheet className='h-4 w-4 mr-2' />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
