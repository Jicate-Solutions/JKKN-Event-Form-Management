// types/personal-forms.ts
// TypeScript types for Personal Forms feature

import { FormField } from './forms';

/**
 * Personal Form
 * Forms created by users independently from institutional hierarchy
 */
export interface PersonalForm {
  id: string;
  title: string;
  description?: string;
  banner_url?: string;
  slug?: string;

  // Form content (reuses FormField structure from institutional forms)
  fields: FormField[];

  // Status and visibility
  status: 'draft' | 'published' | 'archived';
  is_public: boolean;

  // Submission control
  submission_limit?: number; // NULL = unlimited

  // Domain-based access restriction
  restrict_domain: boolean;
  allowed_domains: string[];

  // User profile autofetch from MYJKKN
  // API key is managed centrally via environment variables (process.env.MYJKKN_API_KEY)
  enable_user_autofetch: boolean;
  require_institutional_profile: boolean; // Block submissions from non-MYJKKN users
  allow_manual_entry_fallback: boolean;   // Show manual form when user not found

  // Ownership (no institution_id - completely independent)
  created_by: string;
  creator?: {
    id: string;
    full_name: string;
    email: string;
  };

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Personal Form Collaborator
 * Junction table managing collaborators and their granular permissions
 */
export interface PersonalFormCollaborator {
  id: string;
  personal_form_id: string;
  user_id: string;

  // Granular permission flags (4 capabilities)
  can_edit_structure: boolean; // Modify fields, conditional logic, settings
  can_view_responses: boolean; // View submissions and statistics
  can_export_data: boolean; // Download CSV/Excel
  can_manage_collaborators: boolean; // Add/remove collaborators, modify permissions

  // Ownership flag (multiple owners possible)
  is_owner: boolean;

  // Metadata
  added_at: string;
  added_by?: string;

  // Populated relations (when joined)
  profiles?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    role?: string;
  };
}

/**
 * Personal Form Response
 * Form submissions for personal forms (no payment support)
 */
export interface PersonalFormResponse {
  id: string;
  personal_form_id: string;

  // Unique submission identifier (format: SUB-PREFIX-NNNNNN)
  submission_id: string;

  // Response data (JSONB with field_id as keys)
  response_data: Record<string, any>;

  // Submitter information
  submitted_by?: string;
  user_email?: string;
  is_anonymous: boolean;

  // Auto-fetched user profile (if autofetch enabled)
  user_profile?: UserProfile;

  // Note: No payment fields - personal forms don't support payments

  // Timestamp
  submitted_at: string;
}

/**
 * Personal Form Statistics
 * Aggregated stats for a personal form
 */
export interface PersonalFormStats {
  total_responses: number;
  unique_submitters: number;
  last_submission_at: string | null;
  is_at_limit: boolean;
}

/**
 * Permission types for granular access control
 */
export type PersonalFormPermission =
  | 'can_edit_structure'
  | 'can_view_responses'
  | 'can_export_data'
  | 'can_manage_collaborators';

/**
 * All permission flags as an object
 */
export interface PersonalFormPermissions {
  can_edit_structure: boolean;
  can_view_responses: boolean;
  can_export_data: boolean;
  can_manage_collaborators: boolean;
}

/**
 * Workspace type for UI navigation
 */
export type Workspace = 'personal' | 'organization';

/**
 * Personal form with populated collaborators
 * Used in list views
 */
export interface PersonalFormWithCollaborators extends PersonalForm {
  collaborators?: PersonalFormCollaborator[];
  collaborator_count?: number;
  response_count?: number;
}

/**
 * Personal form creation payload
 * Omits auto-generated fields
 */
export type CreatePersonalFormPayload = Omit<
  PersonalForm,
  'id' | 'created_at' | 'updated_at'
>;

/**
 * Personal form update payload
 * Allows partial updates
 */
export type UpdatePersonalFormPayload = Partial<
  Omit<PersonalForm, 'id' | 'created_by' | 'created_at' | 'updated_at'>
>;

/**
 * Collaborator creation payload
 */
export type AddCollaboratorPayload = Omit<
  PersonalFormCollaborator,
  'id' | 'added_at' | 'profiles'
> & {
  added_by: string; // Required when adding
};

/**
 * Collaborator permission update payload
 */
export type UpdateCollaboratorPermissionsPayload = Partial<PersonalFormPermissions> & {
  is_owner?: boolean;
};

/**
 * Response submission payload
 */
export type SubmitPersonalFormResponsePayload = {
  personal_form_id: string;
  response_data: Record<string, any>;
  submitted_by?: string;
  user_email?: string;
  is_anonymous?: boolean;
};

/**
 * Form duplication source
 */
export type FormDuplicationSource = {
  sourceFormId: string;
  sourceType: 'institutional' | 'personal';
};

/**
 * Filters for personal forms list
 */
export interface PersonalFormFilters {
  search?: string;
  status?: 'draft' | 'published' | 'archived';
  is_public?: boolean;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'title';
  sort_order?: 'asc' | 'desc';
}

/**
 * Paginated response for personal forms
 */
export interface PaginatedPersonalForms {
  data: PersonalFormWithCollaborators[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

/**
 * Paginated response for responses
 */
export interface PaginatedPersonalFormResponses {
  data: PersonalFormResponse[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

/**
 * User search result for adding collaborators
 */
export interface UserSearchResult {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role?: string;
}

/**
 * Export format options
 */
export type ExportFormat = 'csv' | 'excel';

/**
 * User Profile from MYJKKN Application
 * Unified structure for both student and staff profiles
 */
export interface UserProfile {
  user_type: 'student' | 'staff';
  full_name: string;
  email: string;
  mobile: string | null;
  institution_name: string | null;
  department_name: string | null;
  identifier: string | null; // roll_number for students, staff_id for staff
  additional_info: string | null; // program_name for students, category for staff
  is_active: boolean;
}

/**
 * User Profile Cache
 * Stored in database to reduce API calls
 */
export interface UserProfileCache extends UserProfile {
  id: string;
  raw_data: any; // Raw API response for debugging
  fetched_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * MYJKKN Student API Response
 */
export interface MYJKKNStudent {
  id: string;
  first_name: string;
  last_name: string;
  roll_number: string;
  student_email: string;         // Personal email (not used)
  college_email: string;          // Institutional email (USED)
  student_mobile: string | null;
  institution: {
    id: string;
    name: string;
  } | null;
  department: {
    id: string;
    department_name: string;
  } | null;
  program: {
    id: string;
    program_name: string;
  } | null;
  is_profile_complete: boolean;
}

/**
 * MYJKKN Staff API Response
 */
export interface MYJKKNStaff {
  id: string;
  first_name: string;
  last_name: string;
  staff_id: string;
  email: string;                  // Personal email (not used)
  institution_email: string;      // Institutional email (USED)
  staff_mobile: string | null;
  institution: {
    id: string;
    name: string;
  } | null;
  department: {
    id: string;
    department_name: string;
  } | null;
  category: {
    id: string;
    name: string;
  } | null;
  is_active: boolean;
}

/**
 * MYJKKN API Paginated Response
 */
export interface MYJKKNApiResponse<T> {
  data: T[];
  metadata: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Form status for filtering
 */
export const FORM_STATUSES = ['draft', 'published', 'archived'] as const;

/**
 * Permission labels for UI
 */
export const PERMISSION_LABELS: Record<PersonalFormPermission, string> = {
  can_edit_structure: 'Edit Form Structure',
  can_view_responses: 'View Responses',
  can_export_data: 'Export Data',
  can_manage_collaborators: 'Manage Collaborators'
};

/**
 * Permission descriptions for UI
 */
export const PERMISSION_DESCRIPTIONS: Record<PersonalFormPermission, string> = {
  can_edit_structure: 'Modify form fields, conditional logic, and settings',
  can_view_responses: 'View form submissions and response statistics',
  can_export_data: 'Download response data as CSV or Excel files',
  can_manage_collaborators: 'Add, remove collaborators and change their permissions'
};
