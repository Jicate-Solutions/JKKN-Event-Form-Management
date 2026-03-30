'use client';

// components/workspace/workspace-switcher.tsx
// Toggle between Personal and Organization workspaces

import { useRouter, usePathname } from 'next/navigation';
import { Building2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Workspace = 'personal' | 'organization';

export function WorkspaceSwitcher() {
  const pathname = usePathname();
  const router = useRouter();

  // Detect current workspace from URL
  const currentWorkspace: Workspace = pathname.startsWith('/personal')
    ? 'personal'
    : 'organization';

  const switchWorkspace = (workspace: Workspace) => {
    if (workspace === currentWorkspace) return;

    if (workspace === 'personal') {
      router.push('/personal/forms');
    } else {
      router.push('/organizations/events');
    }
  };

  return (
    <div className='flex items-center gap-1 mt-4 py-2 p-1 bg-muted rounded-lg'>
      <Button
        variant={currentWorkspace === 'personal' ? 'default' : 'ghost'}
        size='sm'
        onClick={() => switchWorkspace('personal')}
        className={cn(
          'flex items-center gap-2 transition-all',
          currentWorkspace === 'personal' && 'shadow-sm'
        )}
      >
        <User className='h-4 w-4' />
        <span className='hidden sm:inline'>Personal</span>
      </Button>

      <Button
        variant={currentWorkspace === 'organization' ? 'default' : 'ghost'}
        size='sm'
        onClick={() => switchWorkspace('organization')}
        className={cn(
          'flex items-center gap-2 transition-all',
          currentWorkspace === 'organization' && 'shadow-sm'
        )}
      >
        <Building2 className='h-4 w-4' />
        <span className='hidden sm:inline'>Organization</span>
      </Button>
    </div>
  );
}
