'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, MoreVertical, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Department } from '@/types/organizations';
import { DepartmentService } from '@/lib/services/organization/department-service';
import { toast } from 'react-hot-toast';
import { formatDate } from '@/lib/utils';

interface DepartmentListProps {
  institutionId: string;
  departments: Department[];
  onRefresh: () => void;
}

export function DepartmentList({
  institutionId,
  departments,
  onRefresh
}: DepartmentListProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async (id: string) => {
    try {
      setIsLoading(true);
      await DepartmentService.deleteDepartment(id);
      toast.success('Department deleted successfully');
      onRefresh();
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error('Failed to delete department');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='space-y-4'>
      <div className='flex justify-between items-center'>
        <h2 className='text-xl font-semibold'>Departments</h2>
        <Button asChild>
          <Link
            href={`/organizations/institutions/${institutionId}/departments/new`}
          >
            <Plus className='mr-2 h-4 w-4' />
            Add Department
          </Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>S.No</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Coordinator</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className='text-right'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {departments.map((department, index) => (
            <TableRow key={department.id}>
              <TableCell className='font-medium'>{index + 1}</TableCell>
              <TableCell className='font-medium'>
                <Link
                  href={`/organizations/institutions/${institutionId}/departments/${department.id}`}
                  className='hover:text-primary'
                >
                  {department.name}
                </Link>
              </TableCell>
              <TableCell>
                {department.coordinators?.[0]?.full_name || '-'}
              </TableCell>
              <TableCell>
                <Badge variant={department.is_active ? 'default' : 'secondary'}>
                  {department.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(department.created_at)}</TableCell>
              <TableCell className='text-right'>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant='ghost' className='h-8 w-8 p-0'>
                      <span className='sr-only'>Open menu</span>
                      <MoreVertical className='h-4 w-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/organizations/institutions/${institutionId}/departments/${department.id}`}
                      >
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/organizations/institutions/${institutionId}/departments/${department.id}/edit`}
                      >
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className='text-destructive focus:text-destructive'
                      onClick={() => handleDelete(department.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      ) : (
                        'Delete'
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {departments.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className='text-center py-6'>
                No departments found. Add your first department.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
