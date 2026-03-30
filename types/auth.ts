// types/auth.ts

import { UserRole } from '@/lib/constants/roles';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  role: UserRole;
  is_active: boolean;
  last_login: string | null;
  profile_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdate
  extends Partial<
    Omit<Profile, 'id' | 'email' | 'created_at' | 'updated_at'>
  > {}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: ProfileUpdate;
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          table_name: string;
          record_id: string;
          old_values: Record<string, unknown>;
          new_values: Record<string, unknown>;
          created_at: string;
        };
      };
    };
  };
}
