import { createClientSupabaseClient } from '@/lib/supabase/client';
import type {
  Department,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentFilters,
  OrganizationListResponse
} from '@/types/organizations';
import { UserRole } from '@/lib/constants/roles';

interface DepartmentWithCoordinators {
  id: string;
  name: string;
  institution_id: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  department_coordinators?: {
    id: string;
    user_id: string | null;
    profiles: {
      id: string;
      email: string;
      full_name: string | null;
      phone_number: string | null;
    } | null;
  }[];
}

interface DepartmentCoordinator {
  id: string;
  user_id: string | null;
  profiles: {
    id: string;
    email: string;
    full_name: string | null;
    phone_number: string | null;
  } | null;
}

export class DepartmentService {
  private static supabase = createClientSupabaseClient();

  static async createDepartment(
    data: CreateDepartmentDto
  ): Promise<Department> {
    try {
      const { coordinator_ids, ...departmentData } = data;

      // Create department
      const { data: department, error } = await this.supabase
        .from('departments')
        .insert(departmentData)
        .select()
        .single();

      if (error) throw error;

      // Add coordinators to department_coordinators table
      if (coordinator_ids?.length) {
        const coordinatorRecords = coordinator_ids.map((id) => ({
          department_id: department.id,
          user_id: id // This should match the profiles.id
        }));

        const { error: coordError } = await this.supabase
          .from('department_coordinators')
          .insert(coordinatorRecords);

        if (coordError) throw coordError;
      }

      return department as Department;
    } catch (error) {
      console.error('Error creating department:', error);
      throw error;
    }
  }

  static async updateDepartment(
    id: string,
    data: UpdateDepartmentDto
  ): Promise<Department> {
    try {
      const { coordinator_ids, ...departmentData } = data;

      // First update department data
      const { data: department, error } = await this.supabase
        .from('departments')
        .update(departmentData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update coordinators if provided
      if (coordinator_ids) {
        // First get existing coordinator records
        const { data: existingCoords } = await this.supabase
          .from('department_coordinators')
          .select('user_id')
          .eq('department_id', id);

        const existingIds =
          existingCoords
            ?.map((ec) => ec.user_id)
            .filter((id): id is string => id !== null) || [];
        const newIds = coordinator_ids.filter(
          (id) => !existingIds.includes(id)
        );
        const removedIds = existingIds.filter(
          (id) => !coordinator_ids.includes(id)
        );

        // Remove coordinators that were unselected
        if (removedIds.length > 0) {
          await this.supabase
            .from('department_coordinators')
            .delete()
            .eq('department_id', id)
            .in('user_id', removedIds);
        }

        // Add new coordinators
        if (newIds.length > 0) {
          const newCoordinators = newIds.map((userId) => ({
            department_id: id,
            user_id: userId
          }));

          const { error: insertError } = await this.supabase
            .from('department_coordinators')
            .insert(newCoordinators);

          if (insertError) throw insertError;
        }
      }

      return department as Department;
    } catch (error) {
      console.error('Error updating department:', error);
      throw error;
    }
  }

  static async getDepartments(
    filters: DepartmentFilters = {}
  ): Promise<OrganizationListResponse<Department>> {
    try {
      let query = this.supabase.from('departments').select(
        `
          *,
          department_coordinators (
            id,
            user_id,
            profiles:user_id (
              id,
              full_name,
              email,
              phone_number
            )
          )
        `,
        { count: 'exact' }
      );

      if (filters.institution_id) {
        query = query.eq('institution_id', filters.institution_id);
      }

      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      query = query.range(from, to).order('created_at', { ascending: false });

      const { data: departments, error, count } = await query;

      if (error) throw error;

      // Transform the data to match the expected format
      const transformedDepartments = departments?.map(
        (dept: DepartmentWithCoordinators) => ({
          ...dept,
          institution_id: dept.institution_id!,
          is_active: dept.is_active ?? true,
          coordinators: dept.department_coordinators
            ?.filter((dc) => dc.profiles !== null && dc.user_id !== null)
            .map((dc) => ({
              id: dc.profiles!.id,
              email: dc.profiles!.email,
              full_name: dc.profiles!.full_name || '',
              bio: null,
              avatar_url: null,
              phone_number: dc.profiles!.phone_number || null,
              role: UserRole.EVENT_COORDINATOR,
              is_active: true,
              last_login: null,
              profile_complete: true,
              created_at: dept.created_at,
              updated_at: dept.updated_at
            }))
        })
      ) as Department[];

      return {
        data: transformedDepartments || [],
        metadata: {
          total: count || 0,
          page,
          limit,
          totalPages: count ? Math.ceil(count / limit) : 0
        }
      };
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }
  }

  static async getDepartment(id: string): Promise<Department> {
    try {
      const { data: department, error } = await this.supabase
        .from('departments')
        .select(
          `
          *,
          department_coordinators!inner (
            id,
            user_id,
            profiles:user_id (
              id,
              full_name,
              email,
              phone_number
            )
          )
        `
        )
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        ...department,
        institution_id: department.institution_id!,
        is_active: department.is_active ?? true,
        coordinator_ids: department.department_coordinators
          ?.filter((dc) => dc.user_id !== null)
          .map((dc) => dc.user_id!),
        coordinators: department.department_coordinators
          ?.filter((dc) => dc.profiles !== null && dc.user_id !== null)
          .map((dc) => ({
            id: dc.profiles!.id,
            email: dc.profiles!.email,
            full_name: dc.profiles!.full_name || '',
            bio: null,
            avatar_url: null,
            phone_number: dc.profiles!.phone_number || null,
            role: UserRole.EVENT_COORDINATOR,
            is_active: true,
            last_login: null,
            profile_complete: true,
            created_at: department.created_at,
            updated_at: department.updated_at
          }))
      } as Department;
    } catch (error) {
      console.error('Error fetching department:', error);
      throw error;
    }
  }

  static async checkNameExists(
    name: string,
    institution_id: string,
    excludeId?: string
  ): Promise<boolean> {
    try {
      let query = this.supabase
        .from('departments')
        .select('id')
        .eq('institution_id', institution_id)
        .ilike('name', name);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking department name:', error);
      return false;
    }
  }

  static async deleteDepartment(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return;
    } catch (error) {
      console.error('Error deleting department:', error);
      throw error;
    }
  }
}
