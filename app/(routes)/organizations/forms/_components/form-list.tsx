'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreVertical, Edit, Trash2, Copy, Eye, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Form } from '@/types/forms';
import { FormService } from '@/lib/services/form-service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';

interface FormListProps {
  forms: Form[];
  onRefresh?: () => void;
}

export function FormList({ forms, onRefresh }: FormListProps) {
  const router = useRouter();
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!formToDelete) return;

    try {
      setIsLoading(true);
      await FormService.deleteForm(formToDelete.id);
      toast.success('Form deleted successfully');
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting form:', error);
      toast.error('Failed to delete form');
    } finally {
      setIsLoading(false);
      setFormToDelete(null);
    }
  };

  const copyToClipboard = (form: Form) => {
    // Use slug if available, otherwise fall back to UUID
    const identifier = form.slug || form.id;
    const url = `${window.location.origin}/forms/public/${identifier}`;
    navigator.clipboard.writeText(url);
    toast.success('Form URL copied to clipboard');
  };

  return (
    <>
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className='w-[70px]'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {forms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className='text-center py-8'>
                  No forms found
                </TableCell>
              </TableRow>
            ) : (
              forms.map((form) => (
                <TableRow key={form.id}>
                  <TableCell>{form.title}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        form.status === 'published'
                          ? 'default'
                          : form.status === 'draft'
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {form.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={form.is_public ? 'default' : 'outline'}>
                      {form.is_public ? 'Public' : 'Private'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(form.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='icon'>
                          <MoreVertical className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>

                        <DropdownMenuItem asChild>
                          <Link
                            href={`/forms/${form.id}`}
                            className='cursor-pointer'
                          >
                            <Eye className='mr-2 h-4 w-4' />
                            View Form
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link
                            href={`/organizations/forms/builder/${form.id}`}
                            className='cursor-pointer'
                          >
                            <Edit className='mr-2 h-4 w-4' />
                            Edit Form
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => copyToClipboard(form)}
                          className='cursor-pointer'
                        >
                          <Copy className='mr-2 h-4 w-4' />
                          Copy Link
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link
                            href={`/organizations/forms/responses/${form.id}`}
                            className='cursor-pointer'
                          >
                            <FileText className='mr-2 h-4 w-4' />
                            View Responses
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => setFormToDelete(form)}
                          className='text-destructive focus:text-destructive cursor-pointer'
                        >
                          <Trash2 className='mr-2 h-4 w-4' />
                          Delete Form
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!formToDelete}
        onOpenChange={() => setFormToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this form? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className='bg-destructive hover:bg-destructive/90'
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
