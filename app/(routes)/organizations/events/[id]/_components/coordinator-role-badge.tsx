import { Badge } from '@/components/ui/badge';
import { Crown, UserCheck, Eye } from 'lucide-react';

interface CoordinatorRoleBadgeProps {
  role: 'owner' | 'coordinator' | 'viewer';
}

export function CoordinatorRoleBadge({ role }: CoordinatorRoleBadgeProps) {
  const roleConfig = {
    owner: {
      label: 'Owner',
      icon: Crown,
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700'
    },
    coordinator: {
      label: 'Coordinator',
      icon: UserCheck,
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700'
    },
    viewer: {
      label: 'Viewer',
      icon: Eye,
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-gray-300 dark:border-gray-600'
    }
  };

  const config = roleConfig[role];
  const Icon = config.icon;

  return (
    <Badge variant='outline' className={config.className}>
      <Icon className='mr-1 h-3 w-3' />
      {config.label}
    </Badge>
  );
}
