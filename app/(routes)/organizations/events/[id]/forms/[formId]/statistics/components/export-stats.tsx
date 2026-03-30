'use client';

import { useState } from 'react';
import { Form } from '@/types/forms';
import { FormResponse } from '@/types/form-responses';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  ArrowDownToLine,
  FileSpreadsheet,
  FileText,
  ImageIcon
} from 'lucide-react';
import { FormService } from '@/lib/services/form-service';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

interface ExportStatsProps {
  form: Form;
  responses: FormResponse[];
}

export function ExportStats({ form, responses }: ExportStatsProps) {
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Helper function to format date for filenames
  const getFormattedDate = () => {
    return format(new Date(), 'yyyy-MM-dd');
  };

  // Export data as CSV
  const exportAsCSV = async () => {
    try {
      setIsExporting(true);
      await FormService.exportResponses(form.id, 'csv');
      toast.success('CSV file downloaded successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV file');
    } finally {
      setIsExporting(false);
    }
  };

  // Export data as Excel
  const exportAsExcel = async () => {
    try {
      setIsExporting(true);
      await FormService.exportResponses(form.id, 'excel');
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Failed to export Excel file');
    } finally {
      setIsExporting(false);
    }
  };

  // Export charts as PNG image
  const exportAsImage = async () => {
    try {
      setIsExporting(true);
      toast.loading('Capturing charts, please wait...');

      // Get the container of charts
      const container = document.querySelector('.statistics-container');
      if (!container) {
        throw new Error('Could not find charts container');
      }

      // Use html2canvas to capture the charts
      const canvas = await html2canvas(container as HTMLElement, {
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Convert canvas to blob and save
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `${form.title}-statistics-${getFormattedDate()}.png`);
          toast.success('Statistics image exported successfully');
        } else {
          throw new Error('Failed to create image');
        }
      });
    } catch (error) {
      console.error('Error exporting image:', error);
      toast.error('Failed to export statistics as an image');
    } finally {
      setIsExporting(false);
      toast.dismiss();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' disabled={isExporting}>
          <ArrowDownToLine className='h-4 w-4 mr-2' />
          Export
          {isExporting && '...'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onClick={exportAsCSV}>
          <FileText className='h-4 w-4 mr-2' />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsExcel}>
          <FileSpreadsheet className='h-4 w-4 mr-2' />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsImage}>
          <ImageIcon className='h-4 w-4 mr-2' />
          Export Charts as Image
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
