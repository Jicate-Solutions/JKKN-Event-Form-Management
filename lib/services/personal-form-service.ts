// lib/services/personal-form-service.ts
// Service layer for Personal Forms feature

import { createClientSupabaseClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateSlug, generateUniqueSlug } from '@/lib/utils/slug';
import { Parser } from '@json2csv/plainjs';
import * as XLSX from 'xlsx';
import {
  PersonalForm,
  PersonalFormCollaborator,
  PersonalFormResponse,
  PersonalFormWithCollaborators,
  CreatePersonalFormPayload,
  UpdatePersonalFormPayload,
  AddCollaboratorPayload,
  UpdateCollaboratorPermissionsPayload,
  SubmitPersonalFormResponsePayload,
  PersonalFormFilters,
  PaginatedPersonalForms,
  PaginatedPersonalFormResponses,
  PersonalFormStats
} from '@/types/personal-forms';
import { FormField } from '@/types/forms';
import { Json } from '@/types/supabase';
import { MYJKKNApiService } from './myjkkn-api-service';

const PAGE_SIZE = 1000; // For large datasets
const MAX_RETRIES = 3; // Retry logic for large queries

export const PersonalFormService = {
  // ============================================
  // FORM CRUD OPERATIONS
  // ============================================

  /**
   * Create a new personal form
   * Automatically adds creator as owner with full permissions
   */
  async createPersonalForm(
    form: CreatePersonalFormPayload,
    supabaseClient?: any
  ): Promise<PersonalForm> {
    try {
      // Use provided client (for server-side) or browser client
      const supabase = supabaseClient || createClientSupabaseClient();

      // Validate required fields
      if (!form.title || !form.created_by || !form.fields) {
        throw new Error('Missing required fields: title, created_by, fields');
      }

      // Generate unique slug from title
      const baseSlug = generateSlug(form.title);
      const checkSlug = async (slug: string) => {
        const { data } = await supabase
          .from('personal_forms')
          .select('id')
          .eq('slug', slug)
          .limit(1);
        return !!(data && data.length > 0);
      };
      const uniqueSlug = await generateUniqueSlug(baseSlug, checkSlug);

      // Create the form
      const { data, error } = await supabase
        .from('personal_forms')
        .insert([
          {
            title: form.title,
            description: form.description,
            banner_url: form.banner_url,
            fields: form.fields as unknown as Json,
            status: form.status || 'draft',
            is_public: form.is_public ?? false,
            submission_limit: form.submission_limit,
            restrict_domain: form.restrict_domain ?? false,
            allowed_domains: form.allowed_domains || [],
            enable_user_autofetch: form.enable_user_autofetch ?? false,
            require_institutional_profile: form.require_institutional_profile ?? false,
            allow_manual_entry_fallback: form.allow_manual_entry_fallback ?? true,
            created_by: form.created_by,
            slug: uniqueSlug
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Auto-add creator as owner with full permissions
      await this.addCollaborator({
        personal_form_id: data.id,
        user_id: form.created_by,
        can_edit_structure: true,
        can_view_responses: true,
        can_export_data: true,
        can_manage_collaborators: true,
        is_owner: true,
        added_by: form.created_by
      }, undefined, supabase);

      return data as unknown as PersonalForm;
    } catch (error) {
      console.error('Error creating personal form:', error);
      throw error;
    }
  },

  /**
   * Get personal forms with filtering and pagination
   * Includes collaborator count and response count
   * Access control:
   * - Super admins: See all forms
   * - Other users: See only forms they created or where they're collaborators
   */
  async getPersonalForms(
    filters?: PersonalFormFilters,
    userId?: string,
    supabaseClient?: any
  ): Promise<PaginatedPersonalForms> {
    try {
      const supabase = supabaseClient || createClientSupabaseClient();

      console.log('[getPersonalForms] Fetching forms with filters:', filters);
      console.log('[getPersonalForms] User ID:', userId);

      // Check if user is super admin
      let isSuperAdmin = false;
      if (userId) {
        isSuperAdmin = await this.isSuperAdmin(userId, supabase);
        console.log('[getPersonalForms] Is super admin:', isSuperAdmin);
      }

      // Get forms the user is a collaborator on (if not super admin)
      let collaboratorFormIds: string[] = [];
      if (userId && !isSuperAdmin) {
        const { data: collabData } = await supabase
          .from('personal_form_collaborators')
          .select('personal_form_id')
          .eq('user_id', userId);

        collaboratorFormIds = collabData ? collabData.map((c: any) => c.personal_form_id) : [];
        console.log('[getPersonalForms] User is collaborator on forms:', collaboratorFormIds);
      }

      // Build query
      let query = supabase
        .from('personal_forms')
        .select('*', { count: 'exact' });

      // Apply access control: Super admins see all, others see only their forms + collaborations
      if (!isSuperAdmin && userId) {
        // Filter to forms created by user OR where user is collaborator
        if (collaboratorFormIds.length > 0) {
          query = query.or(`created_by.eq.${userId},id.in.(${collaboratorFormIds.join(',')})`);
        } else {
          // User has no collaborations, only show their created forms
          query = query.eq('created_by', userId);
        }
        console.log('[getPersonalForms] Applied access control filter for non-admin user');
      } else if (isSuperAdmin) {
        console.log('[getPersonalForms] Super admin - showing all forms');
      }

      // Apply filters
      if (filters?.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.is_public !== undefined) {
        query = query.eq('is_public', filters.is_public);
      }

      // Sorting
      const sortBy = filters?.sort_by || 'created_at';
      const sortOrder = filters?.sort_order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination
      const page = filters?.page || 1;
      const limit = filters?.limit || 10;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('[getPersonalForms] Error fetching forms:', error);
        throw error;
      }

      console.log(`[getPersonalForms] Found ${count} forms, ${data?.length} returned`);

      const forms = (data || []) as unknown as PersonalForm[];

      // Enhance with collaborator counts and response counts
      const enhancedForms: PersonalFormWithCollaborators[] = await Promise.all(
        forms.map(async (form) => {
          try {
            // Get collaborator count
            const { count: collabCount, error: collabError } = await supabase
              .from('personal_form_collaborators')
              .select('*', { count: 'exact', head: true })
              .eq('personal_form_id', form.id);

            if (collabError) {
              console.error(`[getPersonalForms] Error counting collaborators for form ${form.id}:`, collabError);
            }

            // Get response count
            const { count: responseCount, error: responseError } = await supabase
              .from('personal_form_responses')
              .select('*', { count: 'exact', head: true })
              .eq('personal_form_id', form.id);

            if (responseError) {
              console.error(`[getPersonalForms] Error counting responses for form ${form.id}:`, responseError);
            }

            return {
              ...form,
              collaborator_count: collabCount || 0,
              response_count: responseCount || 0
            };
          } catch (formError) {
            console.error(`[getPersonalForms] Error processing form ${form.id}:`, formError);
            return {
              ...form,
              collaborator_count: 0,
              response_count: 0
            };
          }
        })
      );

      return {
        data: enhancedForms,
        total: count || 0,
        page,
        limit,
        has_more: (count || 0) > to + 1
      };
    } catch (error) {
      console.error('Error fetching personal forms:', error);
      throw error;
    }
  },

  /**
   * Get a single personal form by ID or slug
   * Enforces collaborator permissions in application layer (not RLS)
   */
  async getPersonalForm(
    idOrSlug: string,
    userId?: string,
    supabaseClient?: any
  ): Promise<PersonalForm> {
    try {
      const supabase = supabaseClient || createClientSupabaseClient();

      // Check if it's a UUID or slug
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          idOrSlug
        );

      const { data, error } = await supabase
        .from('personal_forms')
        .select(`
          *,
          creator:created_by (
            id,
            full_name,
            email
          )
        `)
        .eq(isUUID ? 'id' : 'slug', idOrSlug)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Personal form not found');

      const form = data as unknown as PersonalForm;

      // If userId is provided, check collaborator access for non-public forms
      if (userId && !form.is_public && form.created_by !== userId) {
        // Super admins have access to all forms
        const isSuperAdmin = await this.isSuperAdmin(userId, supabase);
        if (isSuperAdmin) {
          return form;
        }

        // Check if user is a collaborator
        const { data: collaborator } = await supabase
          .from('personal_form_collaborators')
          .select('id')
          .eq('personal_form_id', form.id)
          .eq('user_id', userId)
          .maybeSingle();

        if (!collaborator) {
          throw new Error('You do not have access to this form');
        }
      }

      return form;
    } catch (error) {
      console.error('Error fetching personal form:', error);
      throw error;
    }
  },

  /**
   * Update a personal form
   * Enforces collaborator edit permissions in application layer
   */
  async updatePersonalForm(
    id: string,
    updates: UpdatePersonalFormPayload,
    userId?: string,
    supabaseClient?: any
  ): Promise<PersonalForm> {
    try {
      const supabase = supabaseClient || createClientSupabaseClient();

      // Get current form to check permissions
      const currentForm = await this.getPersonalForm(id, userId, supabase);

      // Check if user has permission to edit
      if (userId && currentForm.created_by !== userId) {
        // Super admins can edit all forms
        const isSuperAdmin = await this.isSuperAdmin(userId, supabase);
        if (!isSuperAdmin) {
          // Check if user is a collaborator with edit permission
          const { data: collaborator } = await supabase
            .from('personal_form_collaborators')
            .select('can_edit_structure')
            .eq('personal_form_id', id)
            .eq('user_id', userId)
            .maybeSingle();

          if (!collaborator || !collaborator.can_edit_structure) {
            throw new Error('You do not have permission to edit this form');
          }
        }
      }

      // If title is being updated, regenerate slug
      if (updates.title && updates.title !== currentForm.title) {
        const baseSlug = generateSlug(updates.title);

        // Inline slug check using the same client instance
        const checkSlug = async (slug: string) => {
          const { data } = await supabase
            .from('personal_forms')
            .select('id')
            .eq('slug', slug)
            .limit(1);
          return !!(data && data.length > 0);
        };

        updates.slug = await generateUniqueSlug(baseSlug, checkSlug);
      }

      const { data, error } = await supabase
        .from('personal_forms')
        .update(updates as { [key: string]: any })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data as unknown as PersonalForm;
    } catch (error) {
      console.error('Error updating personal form:', error);
      throw error;
    }
  },

  /**
   * Delete a personal form
   * Cascades to collaborators and responses
   */
  async deletePersonalForm(id: string, supabaseClient?: any): Promise<void> {
    try {
      console.log('[SERVICE DELETE] Starting deletePersonalForm for ID:', id);

      // Use provided client or create admin client for proper permissions
      const supabase = supabaseClient || createAdminClient();
      console.log('[SERVICE DELETE] Using client:', supabaseClient ? 'provided' : 'admin');

      console.log('[SERVICE DELETE] Executing DELETE query...');
      const { error, data } = await supabase
        .from('personal_forms')
        .delete()
        .eq('id', id)
        .select();

      console.log('[SERVICE DELETE] Query result:', { error, data });

      if (error) {
        console.error('[SERVICE DELETE] Database error:', error);
        throw error;
      }

      console.log('[SERVICE DELETE] Form deleted successfully');
    } catch (error) {
      console.error('[SERVICE DELETE] Error deleting personal form:', error);
      throw error;
    }
  },

  /**
   * Duplicate a form from institutional or personal form
   * Strips payment fields from institutional forms
   */
  async duplicateForm(
    sourceFormId: string,
    sourceType: 'institutional' | 'personal',
    userId: string,
    supabaseClient?: any
  ): Promise<PersonalForm> {
    try {
      const supabase = supabaseClient || createClientSupabaseClient();

      let sourceForm: any;
      let fields: FormField[];

      if (sourceType === 'institutional') {
        // Fetch from institutional forms table
        const { data, error } = await supabase
          .from('forms')
          .select('*')
          .eq('id', sourceFormId)
          .single();

        if (error) throw error;
        sourceForm = data;

        // Remove payment fields from duplicated form
        fields = (sourceForm.fields as FormField[]).filter(
          (field) => field.type !== 'payment'
        );
      } else {
        // Fetch from personal forms table
        const { data, error } = await supabase
          .from('personal_forms')
          .select('*')
          .eq('id', sourceFormId)
          .single();

        if (error) throw error;
        sourceForm = data;
        fields = sourceForm.fields as FormField[];
      }

      // Create personal form copy
      return await this.createPersonalForm({
        title: `${sourceForm.title} (Copy)`,
        description: sourceForm.description,
        banner_url: sourceForm.banner_url,
        fields,
        status: 'draft', // Always start as draft
        is_public: false, // Always start as private
        created_by: userId,
        restrict_domain: false,
        allowed_domains: [],
        enable_user_autofetch: false,
        require_institutional_profile: false,
        allow_manual_entry_fallback: false
      }, supabase);
    } catch (error) {
      console.error('Error duplicating form:', error);
      throw error;
    }
  },

  // ============================================
  // COLLABORATOR MANAGEMENT
  // ============================================

  /**
   * Add a collaborator to a personal form
   * Requires: Creator OR collaborator with can_manage_collaborators
   */
  async addCollaborator(
    collaborator: AddCollaboratorPayload,
    requestingUserId?: string,
    supabaseClient?: any
  ): Promise<PersonalFormCollaborator> {
    try {
      const supabase = supabaseClient || createClientSupabaseClient();

      // Check permissions if requestingUserId is provided
      if (requestingUserId) {
        await this.checkManageCollaboratorsPermission(
          collaborator.personal_form_id,
          requestingUserId
        );
      }

      const { data, error } = await supabase
        .from('personal_form_collaborators')
        .insert([collaborator])
        .select()
        .single();

      if (error) {
        // Handle duplicate collaborator
        if (error.code === '23505') {
          throw new Error('User is already a collaborator on this form');
        }
        throw error;
      }

      return data as PersonalFormCollaborator;
    } catch (error) {
      console.error('Error adding collaborator:', error);
      throw error;
    }
  },

  /**
   * Get all collaborators for a personal form
   * Includes user profile information
   */
  async getCollaborators(
    personalFormId: string,
    supabaseClient?: any
  ): Promise<PersonalFormCollaborator[]> {
    try {
      const supabase = supabaseClient || createClientSupabaseClient();

      const { data, error } = await supabase
        .from('personal_form_collaborators')
        .select(
          `
          *,
          profiles:user_id (
            id,
            full_name,
            email,
            avatar_url,
            role
          )
        `
        )
        .eq('personal_form_id', personalFormId)
        .order('added_at', { ascending: true });

      if (error) throw error;

      return (data || []) as unknown as PersonalFormCollaborator[];
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      throw error;
    }
  },

  /**
   * Get a user's collaborator record for a specific form
   */
  async getUserCollaboratorRecord(
    personalFormId: string,
    userId: string,
    supabaseClient?: any
  ): Promise<PersonalFormCollaborator | null> {
    try {
      const supabase = supabaseClient || createClientSupabaseClient();

      const { data, error } = await supabase
        .from('personal_form_collaborators')
        .select('*')
        .eq('personal_form_id', personalFormId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        throw error;
      }

      return data as PersonalFormCollaborator | null;
    } catch (error) {
      console.error('Error fetching user collaborator record:', error);
      throw error;
    }
  },

  /**
   * Update collaborator permissions
   */
  async updateCollaboratorPermissions(
    collaboratorId: string,
    permissions: UpdateCollaboratorPermissionsPayload,
    supabaseClient?: any
  ): Promise<PersonalFormCollaborator> {
    try {
      const supabase = supabaseClient || createClientSupabaseClient();

      const { data, error } = await supabase
        .from('personal_form_collaborators')
        .update(permissions)
        .eq('id', collaboratorId)
        .select()
        .single();

      if (error) throw error;

      return data as PersonalFormCollaborator;
    } catch (error) {
      console.error('Error updating collaborator permissions:', error);
      throw error;
    }
  },

  /**
   * Remove a collaborator from a personal form
   * Cannot remove the form creator
   */
  async removeCollaborator(
    collaboratorId: string,
    supabaseClient?: any
  ): Promise<void> {
    try {
      const supabase = supabaseClient || createClientSupabaseClient();

      console.log('[removeCollaborator] Attempting to delete collaborator:', collaboratorId);

      const { error } = await supabase
        .from('personal_form_collaborators')
        .delete()
        .eq('id', collaboratorId);

      if (error) {
        console.error('[removeCollaborator] Error:', error);
        throw error;
      }

      console.log('[removeCollaborator] Successfully deleted collaborator:', collaboratorId);
    } catch (error) {
      console.error('Error removing collaborator:', error);
      throw error;
    }
  },

  /**
   * Check if a user has a specific permission for a form
   */
  async checkUserPermission(
    personalFormId: string,
    userId: string,
    permission:
      | 'can_edit_structure'
      | 'can_view_responses'
      | 'can_export_data'
      | 'can_manage_collaborators',
    supabaseClient?: any
  ): Promise<boolean> {
    try {
      const supabase = supabaseClient || createClientSupabaseClient();

      // Super admins have all permissions
      if (await this.isSuperAdmin(userId, supabase)) return true;

      // Check if user is the creator (creator always has all permissions)
      const { data: form } = await supabase
        .from('personal_forms')
        .select('created_by')
        .eq('id', personalFormId)
        .single();

      if (form?.created_by === userId) return true;

      // Check collaborator permission
      const { data, error } = await supabase
        .from('personal_form_collaborators')
        .select(permission)
        .eq('personal_form_id', personalFormId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return (data as any)?.[permission] === true;
    } catch (error) {
      console.error('Error checking user permission:', error);
      return false;
    }
  },

  // ============================================
  // RESPONSE MANAGEMENT
  // ============================================

  /**
   * Submit a response to a personal form
   * Generates unique submission ID
   */
  async submitResponse(
    response: SubmitPersonalFormResponsePayload
  ): Promise<PersonalFormResponse> {
    try {
      const supabase = createClientSupabaseClient();

      // Get form for autofetch settings
      const form = await this.getPersonalForm(response.personal_form_id);

      // Fetch user profile if autofetch is enabled
      let userProfile = null;
      if (form.enable_user_autofetch && response.user_email) {
        try {
          console.log('Fetching user profile from MYJKKN for:', response.user_email);
          // API key is now managed centrally via environment variables
          userProfile = await MYJKKNApiService.getUserProfile(response.user_email);
          if (userProfile) {
            console.log('Successfully fetched user profile:', userProfile.full_name);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          // Don't throw - profile fetch failure shouldn't block submission
        }
      }

      // Use RPC function for atomic submission_id generation and insert
      // This prevents duplicate submission_id errors from concurrent submissions
      const { data, error } = await supabase
        .rpc('create_personal_form_response', {
          p_personal_form_id: response.personal_form_id,
          p_response_data: response.response_data,
          p_user_email: response.user_email,
          p_submitted_by: response.submitted_by,
          p_is_anonymous: response.is_anonymous ?? false,
          p_user_profile: userProfile as any || null
        })
        .single();

      if (error) throw error;

      return data as unknown as PersonalFormResponse;
    } catch (error) {
      console.error('Error submitting response:', error);
      throw error;
    }
  },

  /**
   * Get responses for a personal form with pagination
   * Supports large datasets (>1000 responses)
   * Requires: Creator OR collaborator with can_view_responses
   */
  async getResponses(
    personalFormId: string,
    userId?: string,
    page = 1,
    limit = 1000,
    supabaseClient?: any,
    search?: string
  ): Promise<PaginatedPersonalFormResponses> {
    try {
      const supabase = supabaseClient || createClientSupabaseClient();

      // Check permissions if userId provided
      if (userId) {
        await this.checkViewResponsesPermission(personalFormId, userId, supabase);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('personal_form_responses')
        .select('*', { count: 'exact' })
        .eq('personal_form_id', personalFormId);

      // Add search filter
      if (search) {
        query = query.or(
          `submission_id.ilike.%${search}%,user_email.ilike.%${search}%`
        );
      }

      const { data, error, count } = await query
        .range(from, to)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      return {
        data: (data || []) as unknown as PersonalFormResponse[],
        total: count || 0,
        page,
        limit,
        has_more: (count || 0) > to + 1
      };
    } catch (error) {
      console.error('Error fetching responses:', error);
      throw error;
    }
  },

  /**
   * Get all responses for export (handles large datasets with pagination)
   */
  async getAllResponsesForExport(
    personalFormId: string,
    supabaseClient?: any
  ): Promise<PersonalFormResponse[]> {
    try {
      const supabase = supabaseClient || createClientSupabaseClient();

      // Get total count first
      const { count } = await supabase
        .from('personal_form_responses')
        .select('*', { count: 'exact', head: true })
        .eq('personal_form_id', personalFormId);

      if (!count || count === 0) return [];

      const allResponses: PersonalFormResponse[] = [];
      const totalPages = Math.ceil(count / PAGE_SIZE);

      // Fetch in pages with retry logic
      for (let page = 0; page < totalPages; page++) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let retries = 0;
        let success = false;

        while (retries < MAX_RETRIES && !success) {
          try {
            const { data, error } = await supabase
              .from('personal_form_responses')
              .select('*')
              .eq('personal_form_id', personalFormId)
              .range(from, to)
              .order('submitted_at', { ascending: false });

            if (error) throw error;

            allResponses.push(...((data || []) as unknown as PersonalFormResponse[]));
            success = true;
          } catch (error) {
            retries++;
            if (retries >= MAX_RETRIES) {
              console.error(
                `Failed to fetch page ${page} after ${MAX_RETRIES} retries`
              );
              // Continue to next page instead of breaking
            } else {
              // Exponential backoff
              await new Promise((resolve) =>
                setTimeout(resolve, 500 * retries)
              );
            }
          }
        }
      }

      return allResponses;
    } catch (error) {
      console.error('Error fetching all responses:', error);
      throw error;
    }
  },

  /**
   * Get a single response by ID
   */
  async getResponseById(responseId: string): Promise<PersonalFormResponse> {
    try {
      const supabase = createClientSupabaseClient();

      const { data, error } = await supabase
        .from('personal_form_responses')
        .select('*')
        .eq('id', responseId)
        .single();

      if (error) throw error;

      return data as unknown as PersonalFormResponse;
    } catch (error) {
      console.error('Error fetching response:', error);
      throw error;
    }
  },

  /**
   * Get response statistics for a personal form
   */
  async getResponseStatistics(
    personalFormId: string,
    supabaseClient?: any
  ): Promise<PersonalFormStats> {
    try {
      const supabase = supabaseClient || createClientSupabaseClient();

      // Use the helper function
      const { data, error } = await supabase.rpc('get_personal_form_stats', {
        form_id: personalFormId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        return data[0] as PersonalFormStats;
      }

      // Fallback if function doesn't return data
      return {
        total_responses: 0,
        unique_submitters: 0,
        last_submission_at: null,
        is_at_limit: false
      };
    } catch (error) {
      console.error('Error fetching response statistics:', error);
      throw error;
    }
  },

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================

  /**
   * Format response value for export (time fields, file uploads, etc.)
   */
  formatResponseValueForExport(value: any, field: any): string {
    if (value === null || value === undefined) return '';

    // Handle time fields - format to 12-hour with AM/PM
    if (field.type === 'time' && typeof value === 'string') {
      try {
        const [hours, minutes] = value.split(':');
        const hour = parseInt(hours, 10);
        const min = parseInt(minutes, 10);

        if (!isNaN(hour) && !isNaN(min)) {
          const period = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
          return `${displayHour}:${minutes} ${period}`;
        }
      } catch (e) {
        console.error('Error formatting time:', e);
      }
      return value;
    }

    // Handle file uploads - show file name and URL
    if (typeof value === 'object') {
      if (value.url && value.name) {
        return `${value.name} (${value.url})`;
      }
      if (Array.isArray(value)) return value.join(', ');
      return JSON.stringify(value);
    }

    return String(value);
  },

  /**
   * Export responses to CSV format
   * Requires: Creator OR collaborator with can_export_data
   */
  async exportToCSV(personalFormId: string, userId?: string, supabaseClient?: any): Promise<string> {
    try {
      // Check permissions if userId provided
      if (userId) {
        await this.checkExportDataPermission(personalFormId, userId);
      }

      const form = await this.getPersonalForm(personalFormId, undefined, supabaseClient);
      const responses = await this.getAllResponsesForExport(personalFormId, supabaseClient);

      if (responses.length === 0) {
        throw new Error('No responses to export');
      }

      // Build a field type map for quick lookup
      const fieldTypeMap = new Map(
        form.fields.filter((f: any) => f.type !== 'image').map((f: any) => [f.id, f])
      );

      // Transform responses to flat structure with proper formatting
      const flatData = responses.map((r) => {
        const formattedData: Record<string, any> = {
          submission_id: r.submission_id,
          submitted_at: r.submitted_at,
          user_email: r.user_email || 'Anonymous',
          is_anonymous: r.is_anonymous,
          // MYJKKN Profile columns
          full_name: r.user_profile?.full_name || 'N/A',
          user_type: r.user_profile?.user_type || 'N/A',
          roll_staff_id: r.user_profile?.identifier || 'N/A',
          institution: r.user_profile?.institution_name || 'N/A',
          department: r.user_profile?.department_name || 'N/A',
          program_category: r.user_profile?.additional_info || 'N/A',
          mobile: r.user_profile?.mobile || 'N/A'
        };

        // Format each field value based on its type
        Object.entries(r.response_data).forEach(([fieldId, value]) => {
          const field = fieldTypeMap.get(fieldId);
          if (field) {
            formattedData[field.label] = this.formatResponseValueForExport(value, field);
          }
        });

        return formattedData;
      });

      const parser = new Parser();
      return parser.parse(flatData);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw error;
    }
  },

  /**
   * Export responses to Excel format
   * Requires: Creator OR collaborator with can_export_data
   */
  async exportToExcel(personalFormId: string, userId?: string, supabaseClient?: any): Promise<Buffer> {
    try {
      // Check permissions if userId provided
      if (userId) {
        await this.checkExportDataPermission(personalFormId, userId);
      }

      const form = await this.getPersonalForm(personalFormId, undefined, supabaseClient);
      const responses = await this.getAllResponsesForExport(personalFormId, supabaseClient);

      if (responses.length === 0) {
        throw new Error('No responses to export');
      }

      // Build a field type map for quick lookup
      const fieldTypeMap = new Map(
        form.fields.filter((f: any) => f.type !== 'image').map((f: any) => [f.id, f])
      );

      // Transform responses to flat structure with proper formatting
      const flatData = responses.map((r) => {
        const formattedData: Record<string, any> = {
          submission_id: r.submission_id,
          submitted_at: r.submitted_at,
          user_email: r.user_email || 'Anonymous',
          is_anonymous: r.is_anonymous,
          // MYJKKN Profile columns
          full_name: r.user_profile?.full_name || 'N/A',
          user_type: r.user_profile?.user_type || 'N/A',
          roll_staff_id: r.user_profile?.identifier || 'N/A',
          institution: r.user_profile?.institution_name || 'N/A',
          department: r.user_profile?.department_name || 'N/A',
          program_category: r.user_profile?.additional_info || 'N/A',
          mobile: r.user_profile?.mobile || 'N/A'
        };

        // Format each field value based on its type
        Object.entries(r.response_data).forEach(([fieldId, value]) => {
          const field = fieldTypeMap.get(fieldId);
          if (field) {
            formattedData[field.label] = this.formatResponseValueForExport(value, field);
          }
        });

        return formattedData;
      });

      const worksheet = XLSX.utils.json_to_sheet(flatData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Responses');

      return XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx'
      }) as Buffer;
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw error;
    }
  },

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  /**
   * Check if a user has super_admin role
   * Super admins have full access to all personal forms
   */
  async isSuperAdmin(userId: string, supabaseClient?: any): Promise<boolean> {
    try {
      const supabase = supabaseClient || createClientSupabaseClient();

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error checking super_admin role:', error);
        return false;
      }

      return data?.role === 'super_admin';
    } catch (error) {
      console.error('Error in isSuperAdmin:', error);
      return false;
    }
  },

  /**
   * Check if a slug already exists
   */
  async checkSlugExists(slug: string): Promise<boolean> {
    const supabase = createClientSupabaseClient();
    const { data } = await supabase
      .from('personal_forms')
      .select('id')
      .eq('slug', slug)
      .limit(1);

    return !!(data && data.length > 0);
  },

  /**
   * Check if a form can accept more submissions
   */
  async canAcceptSubmission(personalFormId: string): Promise<boolean> {
    try {
      const supabase = createClientSupabaseClient();

      // Use the helper function
      const { data, error } = await supabase.rpc(
        'can_accept_personal_form_submission',
        {
          form_id: personalFormId
        }
      );

      if (error) throw error;

      return data === true;
    } catch (error) {
      console.error('Error checking submission limit:', error);
      return false;
    }
  },

  /**
   * Generate unique submission ID
   * Format: SUB-PREFIX-NNNNNN
   */
  async generateSubmissionId(
    personalFormId: string,
    prefix: string
  ): Promise<string> {
    try {
      const supabase = createClientSupabaseClient();

      const { count } = await supabase
        .from('personal_form_responses')
        .select('*', { count: 'exact', head: true })
        .eq('personal_form_id', personalFormId);

      const sequentialNumber = String((count || 0) + 1).padStart(6, '0');
      return `SUB-${prefix}-${sequentialNumber}`;
    } catch (error) {
      console.error('Error generating submission ID:', error);
      // Fallback to timestamp-based ID
      return `SUB-${prefix}-${Date.now()}`;
    }
  },

  // ============================================
  // PERMISSION HELPERS (Application Layer)
  // ============================================

  /**
   * Check if user can manage collaborators (creator or has permission)
   * Throws error if permission denied
   */
  async checkManageCollaboratorsPermission(
    personalFormId: string,
    userId: string
  ): Promise<void> {
    const supabase = createClientSupabaseClient();

    // Super admins have all permissions
    if (await this.isSuperAdmin(userId, supabase)) return;

    // Check if user is creator
    const { data: form } = await supabase
      .from('personal_forms')
      .select('created_by')
      .eq('id', personalFormId)
      .single();

    if (form?.created_by === userId) return; // Creator has all permissions

    // Check if user is collaborator with manage permission
    const { data: collaborator } = await supabase
      .from('personal_form_collaborators')
      .select('can_manage_collaborators')
      .eq('personal_form_id', personalFormId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!collaborator || !collaborator.can_manage_collaborators) {
      throw new Error('You do not have permission to manage collaborators');
    }
  },

  /**
   * Check if user can view responses (creator or has permission)
   * Throws error if permission denied
   */
  async checkViewResponsesPermission(
    personalFormId: string,
    userId: string,
    supabaseClient?: any
  ): Promise<void> {
    const supabase = supabaseClient || createClientSupabaseClient();

    // Super admins have all permissions
    if (await this.isSuperAdmin(userId, supabase)) return;

    // Check if user is creator
    const { data: form } = await supabase
      .from('personal_forms')
      .select('created_by')
      .eq('id', personalFormId)
      .single();

    if (form?.created_by === userId) return; // Creator has all permissions

    // Check if user is collaborator with view permission
    const { data: collaborator } = await supabase
      .from('personal_form_collaborators')
      .select('can_view_responses')
      .eq('personal_form_id', personalFormId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!collaborator || !collaborator.can_view_responses) {
      throw new Error('You do not have permission to view responses');
    }
  },

  /**
   * Check if user can export data (creator or has permission)
   * Throws error if permission denied
   */
  async checkExportDataPermission(
    personalFormId: string,
    userId: string
  ): Promise<void> {
    const supabase = createClientSupabaseClient();

    // Super admins have all permissions
    if (await this.isSuperAdmin(userId, supabase)) return;

    // Check if user is creator
    const { data: form } = await supabase
      .from('personal_forms')
      .select('created_by')
      .eq('id', personalFormId)
      .single();

    if (form?.created_by === userId) return; // Creator has all permissions

    // Check if user is collaborator with export permission
    const { data: collaborator } = await supabase
      .from('personal_form_collaborators')
      .select('can_export_data')
      .eq('personal_form_id', personalFormId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!collaborator || !collaborator.can_export_data) {
      throw new Error('You do not have permission to export data');
    }
  }
};
