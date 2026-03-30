export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      department_coordinators: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_coordinators_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_coordinators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          institution_id: string | null
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      event_coordinators: {
        Row: {
          assigned_by: string
          created_at: string
          event_id: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          event_id: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          event_id?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_coordinators_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_coordinators_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_coordinators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          coordinator_id: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string | null
          end_time: string
          has_registration_form: boolean | null
          id: string
          institution_id: string | null
          is_active: boolean | null
          place_id: string | null
          start_time: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          coordinator_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          end_time: string
          has_registration_form?: boolean | null
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          place_id?: string | null
          start_time: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          coordinator_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          end_time?: string
          has_registration_form?: boolean | null
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          place_id?: string | null
          start_time?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      form_collaborators: {
        Row: {
          assigned_by: string
          created_at: string
          form_id: string
          id: string
          permission_level: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          form_id: string
          id?: string
          permission_level?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          form_id?: string
          id?: string
          permission_level?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_collaborators_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_collaborators_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      form_responses: {
        Row: {
          form_id: string
          id: string
          is_anonymous: boolean | null
          payment_amount: number | null
          payment_id: string | null
          payment_status: string | null
          payment_updated_at: string | null
          response_data: Json
          submission_id: string | null
          submitted_at: string | null
          submitted_by: string | null
          user_email: string | null
        }
        Insert: {
          form_id: string
          id?: string
          is_anonymous?: boolean | null
          payment_amount?: number | null
          payment_id?: string | null
          payment_status?: string | null
          payment_updated_at?: string | null
          response_data?: Json
          submission_id?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          user_email?: string | null
        }
        Update: {
          form_id?: string
          id?: string
          is_anonymous?: boolean | null
          payment_amount?: number | null
          payment_id?: string | null
          payment_status?: string | null
          payment_updated_at?: string | null
          response_data?: Json
          submission_id?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          banner_url: string | null
          category: string
          created_at: string | null
          created_by: string
          description: string | null
          fields: Json
          id: string
          is_public: boolean
          title: string
          updated_at: string | null
        }
        Insert: {
          banner_url?: string | null
          category: string
          created_at?: string | null
          created_by: string
          description?: string | null
          fields?: Json
          id?: string
          is_public?: boolean
          title: string
          updated_at?: string | null
        }
        Update: {
          banner_url?: string | null
          category?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          fields?: Json
          id?: string
          is_public?: boolean
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      forms: {
        Row: {
          banner_url: string | null
          created_at: string | null
          created_by: string
          description: string | null
          event_id: string | null
          fields: Json
          id: string
          institution_id: string
          is_public: boolean | null
          slug: string | null
          status: string
          submission_limit: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          event_id?: string | null
          fields?: Json
          id?: string
          institution_id: string
          is_public?: boolean | null
          slug?: string | null
          status?: string
          submission_limit?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          event_id?: string | null
          fields?: Json
          id?: string
          institution_id?: string
          is_public?: boolean | null
          slug?: string | null
          status?: string
          submission_limit?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_coordinators: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_coordinators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          coordinator_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          coordinator_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          coordinator_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      personal_form_collaborators: {
        Row: {
          added_at: string
          added_by: string | null
          can_edit_structure: boolean
          can_export_data: boolean
          can_manage_collaborators: boolean
          can_view_responses: boolean
          id: string
          is_owner: boolean
          personal_form_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          can_edit_structure?: boolean
          can_export_data?: boolean
          can_manage_collaborators?: boolean
          can_view_responses?: boolean
          id?: string
          is_owner?: boolean
          personal_form_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          can_edit_structure?: boolean
          can_export_data?: boolean
          can_manage_collaborators?: boolean
          can_view_responses?: boolean
          id?: string
          is_owner?: boolean
          personal_form_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_form_collaborators_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_form_collaborators_personal_form_id_fkey"
            columns: ["personal_form_id"]
            isOneToOne: false
            referencedRelation: "personal_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_form_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_form_responses: {
        Row: {
          id: string
          is_anonymous: boolean
          personal_form_id: string
          response_data: Json
          submission_id: string
          submitted_at: string
          submitted_by: string | null
          user_email: string | null
          user_profile: Json | null
        }
        Insert: {
          id?: string
          is_anonymous?: boolean
          personal_form_id: string
          response_data?: Json
          submission_id: string
          submitted_at?: string
          submitted_by?: string | null
          user_email?: string | null
          user_profile?: Json | null
        }
        Update: {
          id?: string
          is_anonymous?: boolean
          personal_form_id?: string
          response_data?: Json
          submission_id?: string
          submitted_at?: string
          submitted_by?: string | null
          user_email?: string | null
          user_profile?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_form_responses_personal_form_id_fkey"
            columns: ["personal_form_id"]
            isOneToOne: false
            referencedRelation: "personal_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_form_responses_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_forms: {
        Row: {
          allow_manual_entry_fallback: boolean | null
          allowed_domains: string[] | null
          banner_url: string | null
          created_at: string
          created_by: string
          description: string | null
          enable_user_autofetch: boolean | null
          fields: Json
          id: string
          is_public: boolean | null
          myjkkn_api_key: string | null
          require_institutional_profile: boolean | null
          restrict_domain: boolean | null
          slug: string | null
          status: string
          submission_limit: number | null
          title: string
          updated_at: string
        }
        Insert: {
          allow_manual_entry_fallback?: boolean | null
          allowed_domains?: string[] | null
          banner_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          enable_user_autofetch?: boolean | null
          fields?: Json
          id?: string
          is_public?: boolean | null
          myjkkn_api_key?: string | null
          require_institutional_profile?: boolean | null
          restrict_domain?: boolean | null
          slug?: string | null
          status?: string
          submission_limit?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          allow_manual_entry_fallback?: boolean | null
          allowed_domains?: string[] | null
          banner_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          enable_user_autofetch?: boolean | null
          fields?: Json
          id?: string
          is_public?: boolean | null
          myjkkn_api_key?: string | null
          require_institutional_profile?: boolean | null
          restrict_domain?: boolean | null
          slug?: string | null
          status?: string
          submission_limit?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          capacity: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          phone_number: string | null
          profile_complete: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_login?: string | null
          phone_number?: string | null
          profile_complete?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          phone_number?: string | null
          profile_complete?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      user_profile_cache: {
        Row: {
          additional_info: string | null
          created_at: string
          department_name: string | null
          email: string
          fetched_at: string
          full_name: string
          id: string
          identifier: string | null
          institution_name: string | null
          is_active: boolean | null
          mobile: string | null
          raw_data: Json | null
          updated_at: string
          user_type: string
        }
        Insert: {
          additional_info?: string | null
          created_at?: string
          department_name?: string | null
          email: string
          fetched_at?: string
          full_name: string
          id?: string
          identifier?: string | null
          institution_name?: string | null
          is_active?: boolean | null
          mobile?: string | null
          raw_data?: Json | null
          updated_at?: string
          user_type: string
        }
        Update: {
          additional_info?: string | null
          created_at?: string
          department_name?: string | null
          email?: string
          fetched_at?: string
          full_name?: string
          id?: string
          identifier?: string | null
          institution_name?: string | null
          is_active?: boolean | null
          mobile?: string | null
          raw_data?: Json | null
          updated_at?: string
          user_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_accept_personal_form_submission: {
        Args: { form_id: string }
        Returns: boolean
      }
      can_accept_submission: { Args: { p_form_id: string }; Returns: boolean }
      create_form_response: {
        Args: {
          p_form_id: string
          p_is_anonymous: boolean
          p_payment_amount: number
          p_payment_status: string
          p_response_data: Json
          p_submission_id: string
          p_submitted_by: string
          p_user_email: string
        }
        Returns: Json
      }
      get_form_submission_count: {
        Args: { p_form_id: string }
        Returns: number
      }
      get_form_submission_stats: {
        Args: { p_form_id: string }
        Returns: {
          can_submit: boolean
          current_count: number
          is_unlimited: boolean
          remaining_slots: number
          submission_limit: number
        }[]
      }
      get_personal_form_stats: {
        Args: { form_id: string }
        Returns: {
          is_at_limit: boolean
          last_submission_at: string
          total_responses: number
          unique_submitters: number
        }[]
      }
      is_institution_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      form_status: "draft" | "published" | "archived"
      user_role:
        | "super_admin"
        | "administrator"
        | "institution_coordinator"
        | "event_coordinator"
        | "staff"
        | "student"
        | "public"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      form_status: ["draft", "published", "archived"],
      user_role: [
        "super_admin",
        "administrator",
        "institution_coordinator",
        "event_coordinator",
        "staff",
        "student",
        "public",
      ],
    },
  },
} as const
