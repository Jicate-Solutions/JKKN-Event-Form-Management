import { Badge } from '@/components/ui/badge';
import { Eye, Edit, FileCheck } from 'lucide-react';
import type { FormPermissionLevel } from '@/types/organizations';

interface PermissionLevelBadgeProps {
  permission: FormPermissionLevel;
}

export function PermissionLevelBadge({ permission }: PermissionLevelBadgeProps) {
  const permissionConfig = {
    view: {
      label: 'View Only',
      icon: Eye,
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-gray-300 dark:border-gray-600'
    },
    edit: {
      label: 'Can Edit',
      icon: Edit,
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700'
    },
    manage_responses: {
      label: 'Manage Responses',
      icon: FileCheck,
      className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700'
    }
  };

  const config = permissionConfig[permission];
  const Icon = config.icon;

  return (
    <Badge variant='outline' className={config.className}>
      <Icon className='mr-1 h-3 w-3' />
      {config.label}
    </Badge>
  );
}
