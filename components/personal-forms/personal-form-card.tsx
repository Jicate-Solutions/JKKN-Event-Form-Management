'use client';

// components/personal-forms/personal-form-card.tsx
// Card component for displaying personal forms in lists

import { useRouter } from 'next/navigation';
import { PersonalFormWithCollaborators } from '@/types/personal-forms';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Eye,
  Edit,
  Users,
  BarChart,
  Trash2,
  Copy,
  Globe,
  Lock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PersonalFormCardProps {
  form: PersonalFormWithCollaborators;
  onDelete?: (formId: string) => void;
  onDuplicate?: (formId: string) => void;
}

export function PersonalFormCard({
  form,
  onDelete,
  onDuplicate
}: PersonalFormCardProps) {
  const router = useRouter();

  const statusColors = {
    draft: 'bg-gray-500',
    published: 'bg-green-500',
    archived: 'bg-orange-500'
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <CardTitle className="line-clamp-1">{form.title}</CardTitle>
            {form.description && (
              <CardDescription className="line-clamp-2">
                {form.description}
              </CardDescription>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="-mt-2">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => router.push(`/personal/forms/${form.id}`)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(`/personal/forms/builder/${form.id}`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Form
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/personal/forms/${form.id}/responses`)
                }
              >
                <BarChart className="h-4 w-4 mr-2" />
                View Responses
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/personal/forms/${form.id}/collaborators`)
                }
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Collaborators
              </DropdownMenuItem>
              {onDuplicate && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDuplicate(form.id)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                </>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(form.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap gap-2">
          {/* Status Badge */}
          <Badge
            variant="outline"
            className={`${statusColors[form.status]} text-white border-0`}
          >
            {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
          </Badge>

          {/* Visibility Badge */}
          <Badge variant="outline" className="flex items-center gap-1">
            {form.is_public ? (
              <>
                <Globe className="h-3 w-3" />
                Public
              </>
            ) : (
              <>
                <Lock className="h-3 w-3" />
                Private
              </>
            )}
          </Badge>

          {/* Collaborators Count */}
          {form.collaborator_count && form.collaborator_count > 1 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {form.collaborator_count} collaborators
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
        <div className="flex items-center gap-4">
          <span>{form.response_count || 0} responses</span>
          <span>{form.fields?.length || 0} fields</span>
        </div>
        <span>
          Updated {formatDistanceToNow(new Date(form.updated_at), { addSuffix: true })}
        </span>
      </CardFooter>
    </Card>
  );
}
