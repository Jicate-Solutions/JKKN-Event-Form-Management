import { createClientSupabaseClient } from '@/lib/supabase/client';
import type {
  Place,
  CreatePlaceDto,
  UpdatePlaceDto
} from '@/types/organizations';

export class PlaceService {
  private static supabase = createClientSupabaseClient();

  static async createPlace(data: CreatePlaceDto): Promise<Place> {
    try {
      const {
        data: { user }
      } = await this.supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: place, error } = await this.supabase
        .from('places')
        .insert([
          {
            ...data,
            created_by: user.id
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return {
        ...place,
        description: place.description ?? undefined,
        capacity: place.capacity ?? undefined,
        location: place.location ?? undefined,
        is_active: place.is_active ?? true,
        created_by: place.created_by ?? undefined
      } as Place;
    } catch (error) {
      console.error('Error creating place:', error);
      throw error;
    }
  }

  static async updatePlace(id: string, data: UpdatePlaceDto): Promise<Place> {
    try {
      const { data: place, error } = await this.supabase
        .from('places')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return {
        ...place,
        description: place.description ?? undefined,
        capacity: place.capacity ?? undefined,
        location: place.location ?? undefined,
        is_active: place.is_active ?? true,
        created_by: place.created_by ?? undefined
      } as Place;
    } catch (error) {
      console.error('Error updating place:', error);
      throw error;
    }
  }

  static async getPlace(id: string): Promise<Place> {
    try {
      const { data: place, error } = await this.supabase
        .from('places')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return {
        ...place,
        description: place.description ?? undefined,
        capacity: place.capacity ?? undefined,
        location: place.location ?? undefined,
        is_active: place.is_active ?? true,
        created_by: place.created_by ?? undefined
      } as Place;
    } catch (error) {
      console.error('Error fetching place:', error);
      throw error;
    }
  }

  static async getPlaces(
    filters: {
      search?: string;
      isActive?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    data: Place[];
    total: number;
  }> {
    try {
      let query = this.supabase.from('places').select('*', { count: 'exact' });

      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      query = query.range(from, to).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      const transformedPlaces = data?.map((place) => ({
        ...place,
        description: place.description ?? undefined,
        capacity: place.capacity ?? undefined,
        location: place.location ?? undefined,
        is_active: place.is_active ?? true,
        created_by: place.created_by ?? undefined
      })) as Place[];

      return {
        data: transformedPlaces || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching places:', error);
      throw error;
    }
  }

  static async deletePlace(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('places')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting place:', error);
      throw error;
    }
  }

  static async checkNameExists(
    name: string,
    excludeId?: string
  ): Promise<boolean> {
    try {
      let query = this.supabase.from('places').select('id').ilike('name', name);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking place name:', error);
      return false;
    }
  }
}
