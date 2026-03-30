'use client';

import { createContext, useContext, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { Profile } from '@/types/auth';
import { useSession } from '@/hooks/use-session';
import { UserRole } from '@/lib/constants/roles';

interface SessionContextType {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  hasRole: (role: UserRole) => Promise<boolean>;
  canManageRoles: () => Promise<boolean>;
  canManageUsers: () => Promise<boolean>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const session = useSession();

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  return context;
}
