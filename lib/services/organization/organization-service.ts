// lib/services/organization-service.ts

import { toast } from 'react-hot-toast';
import type {
  Institution,
  CreateInstitutionDto,
  UpdateInstitutionDto,
  InstitutionFilters,
  OrganizationListResponse
} from '@/types/organizations';
import { createClientSupabaseClient } from '@/lib/supabase/client';

export class OrganizationService {
  private static supabase = createClientSupabaseClient();

  static async checkCodeExists(
    name: string,
    excludeId?: string
  ): Promise<boolean> {
    try {
      let query = this.supabase
        .from('institutions')
        .select('id')
        .ilike('name', name);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking institution name:', error);
      return false;
    }
  }

  static async createInstitution(
    data: CreateInstitutionDto
  ): Promise<Institution> {
    try {
      const {
        data: { session }
      } = await this.supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data: institution, error } = await this.supabase
        .from('institutions')
        .insert([
          {
            name: data.name,
            coordinator_id: data.coordinator_id,
            is_active: data.is_active,
            created_by: session.user.id
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Create institution coordinator relationship
      if (data.coordinator_id) {
        const { error: coordError } = await this.supabase
          .from('institution_coordinators')
          .insert([
            {
              user_id: data.coordinator_id,
              institution_id: institution.id
            }
          ]);

        if (coordError) throw coordError;
      }

      return {
        ...institution,
        coordinator_id: institution.coordinator_id ?? undefined,
        is_active: institution.is_active ?? true
      } as Institution;
    } catch (error) {
      console.error('Error creating institution:', error);
      throw error;
    }
  }

  static async updateInstitution(
    id: string,
    data: UpdateInstitutionDto
  ): Promise<Institution> {
    try {
      // First update the institution table
      const { data: institution, error } = await this.supabase
        .from('institutions')
        .update({
          name: data.name,
          coordinator_id: data.coordinator_id, // Include coordinator_id in the update
          is_active: data.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      // Handle coordinator relationship if coordinator_id is provided
      if (data.coordinator_id) {
        // First check if there's an existing coordinator relationship
        const { data: existingCoord } = await this.supabase
          .from('institution_coordinators')
          .select('id, user_id')
          .eq('institution_id', id)
          .maybeSingle();

        // If existing coordinator record found
        if (existingCoord) {
          // If coordinator is different, update the record
          if (existingCoord.user_id !== data.coordinator_id) {
            // Delete the old coordinator record
            await this.supabase
              .from('institution_coordinators')
              .delete()
              .eq('id', existingCoord.id);

            // Insert the new coordinator record
            const { error: insertError } = await this.supabase
              .from('institution_coordinators')
              .insert({
                user_id: data.coordinator_id,
                institution_id: id
              });

            if (insertError) throw insertError;
          }
        } else {
          // No existing coordinator, insert a new record
          const { error: insertError } = await this.supabase
            .from('institution_coordinators')
            .insert({
              user_id: data.coordinator_id,
              institution_id: id
            });

          if (insertError) throw insertError;
        }
      }

      return {
        ...institution,
        coordinator_id: institution.coordinator_id ?? undefined,
        is_active: institution.is_active ?? true
      } as Institution;
    } catch (error) {
      console.error('Error updating institution:', error);
      throw error;
    }
  }

  static async deleteInstitution(id: string): Promise<void> {
    try {
      // Delete the institution (departments will be deleted via cascade)
      const { error } = await this.supabase
        .from('institutions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Return void explicitly
      return;
    } catch (error) {
      console.error('Error deleting institution:', error);
      throw error;
    }
  }

  static async getInstitutions(
    filters: InstitutionFilters = {}
  ): Promise<OrganizationListResponse<Institution>> {
    try {
      let query = this.supabase
        .from('institutions')
        .select('*', { count: 'exact' });

      // Apply search filter
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      // Apply active status filter
      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      // Calculate pagination
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Apply pagination
      query = query.range(from, to).order('created_at', { ascending: false });

      // Execute query
      const { data: institutions, error, count } = await query;

      if (error) throw error;

      const transformedInstitutions = institutions?.map((inst) => ({
        ...inst,
        coordinator_id: inst.coordinator_id ?? undefined,
        is_active: inst.is_active ?? true
      })) as Institution[];

      return {
        data: transformedInstitutions || [],
        metadata: {
          total: count || 0,
          page,
          limit,
          totalPages: count ? Math.ceil(count / limit) : 0
        }
      };
    } catch (error) {
      console.error('Error in getInstitutions:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to fetch institutions'
      );
      throw error;
    }
  }

  static async getInstitution(id: string): Promise<{
    institution: Institution;
    departments: Record<string, any>;
  }> {
    try {
      const { data: institution, error } = await this.supabase
        .from('institutions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        institution: {
          ...institution,
          coordinator_id: institution.coordinator_id ?? undefined,
          is_active: institution.is_active ?? true
        } as Institution,
        departments: {}
      };
    } catch (error) {
      console.error('Error fetching institution:', error);
      throw error;
    }
  }

  static async getInstitutionNames(
    isActive?: boolean
  ): Promise<{ id: string; name: string }[]> {
    try {
      let query = this.supabase.from('institutions').select('id, name');

      if (isActive !== undefined) {
        query = query.eq('is_active', isActive);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching institution names:', error);
      throw error;
    }
  }
}
