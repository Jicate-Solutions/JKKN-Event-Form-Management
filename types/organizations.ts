// types/organizations.ts

export interface Institution {
  id: string;
  name: string;
  coordinator_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  coordinator?: {
    id: string;
    full_name: string;
    email: string;
    phone_number?: string;
  };
}

export type CreateInstitutionDto = Omit<
  Institution,
  'id' | 'created_at' | 'updated_at'
>;

export type UpdateInstitutionDto = Partial<CreateInstitutionDto>;

export interface InstitutionFilters {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface OrganizationListResponse<T> {
  data: T[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface Department {
  id: string;
  name: string;
  institution_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  coordinator_ids?: string[];
  institution?: Institution;
  coordinators?: OrganizationProfile[];
}

export interface CreateDepartmentDto {
  name: string;
  institution_id: string;
  coordinator_ids?: string[];
  is_active?: boolean;
}

export interface UpdateDepartmentDto {
  name?: string;
  institution_id?: string;
  coordinator_ids?: string[];
  is_active?: boolean;
}

export interface DepartmentFilters {
  institution_id?: string;
  coordinator_id?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface Place {
  id: string;
  name: string;
  description?: string;
  capacity?: number;
  location?: string;
  is_active?: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePlaceDto {
  name: string;
  description?: string;
  capacity?: number;
  location?: string;
  is_active?: boolean;
}

export interface UpdatePlaceDto extends Partial<CreatePlaceDto> {
  updated_at?: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  place_id: string;
  institution_id: string;
  department_id?: string;
  coordinator_id?: string;
  is_active: boolean;
  has_registration_form: boolean;
  created_at: string;
  updated_at: string;
  place?: Place;
  institution?: Institution;
  department?: Department;
  coordinator?: OrganizationProfile;
}

export interface EventFilters {
  search?: string;
  institution_id?: string;
  department_id?: string;
  place_id?: string;
  coordinator_id?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  status?: 'ongoing' | 'upcoming' | 'completed';
  page?: number;
  limit?: number;
}

export interface OrganizationProfile {
  id: string;
  full_name: string;
  email: string;
}

// Event Coordinators Types
export interface EventCoordinator {
  id: string;
  event_id: string;
  user_id: string;
  role: 'owner' | 'coordinator';
  assigned_by: string;
  created_at: string;
  updated_at: string;
  user?: OrganizationProfile & {
    avatar_url?: string;
    phone_number?: string;
  };
}

export interface AssignEventCoordinatorDto {
  event_id: string;
  user_id: string;
  role?: 'coordinator';
}

// Form Collaborators Types
export type FormPermissionLevel = 'view' | 'edit' | 'manage_responses';

export interface FormCollaborator {
  id: string;
  form_id: string;
  user_id: string;
  permission_level: FormPermissionLevel;
  assigned_by: string;
  created_at: string;
  updated_at: string;
  user?: OrganizationProfile & {
    avatar_url?: string;
    phone_number?: string;
  };
}

export interface AssignFormCollaboratorDto {
  form_id: string;
  user_id: string;
  permission_level?: FormPermissionLevel;
}
