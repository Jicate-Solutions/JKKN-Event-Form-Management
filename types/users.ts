import { Profile } from './auth';
import { UserRole } from '@/lib/constants/roles';

export interface UserListResponse {
  data: Profile[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UserFilters {
  role?: UserRole;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<UserRole, number>;
  byInstitution: Record<string, number>;
}

export type CreateUserRequest = Pick<
  Profile,
  'email' | 'full_name' | 'role' | 'phone_number'
> & {
  password: string;
};

export type UpdateUserRequest = Partial<CreateUserRequest> & {
  is_active?: boolean;
  profile_complete?: boolean;
};

export interface RoleUpdateResponse {
  success: boolean;
  user: Profile;
}
