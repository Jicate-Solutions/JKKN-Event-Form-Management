import {
  Place,
  Institution,
  Department,
  OrganizationProfile
} from './organizations';

export interface Event {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  place_id?: string;
  institution_id: string;
  department_id?: string;
  coordinator_id?: string;
  created_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  place?: Place;
  institution?: Institution;
  department?: Department;
  coordinator?: OrganizationProfile;
}
