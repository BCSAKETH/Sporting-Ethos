// Auto-generated from the live Supabase schema via the Supabase MCP
// `generate_typescript_types` tool. Regenerate after any migration change —
// do not hand-edit.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_table: string
          id: string
          meta: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_table: string
          id?: string
          meta?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_table?: string
          id?: string
          meta?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      allergies: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointment_status_history: {
        Row: {
          appointment_id: string
          changed_by: string | null
          created_at: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["appointment_status"]
        }
        Insert: {
          appointment_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          status: Database["public"]["Enums"]["appointment_status"]
        }
        Update: {
          appointment_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "appointment_status_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_type: string
          checkin_status: string | null
          consultation_mode: Database["public"]["Enums"]["consultation_mode"]
          created_at: string
          department_id: string
          doctor_id: string
          hospital_id: string
          id: string
          notes: string | null
          patient_id: string
          priority: Database["public"]["Enums"]["appointment_priority"]
          reason_for_visit: string | null
          scheduled_datetime: string
          status: Database["public"]["Enums"]["appointment_status"]
          token_number: string | null
          updated_at: string
        }
        Insert: {
          appointment_type?: string
          checkin_status?: string | null
          consultation_mode?: Database["public"]["Enums"]["consultation_mode"]
          created_at?: string
          department_id: string
          doctor_id: string
          hospital_id: string
          id?: string
          notes?: string | null
          patient_id: string
          priority?: Database["public"]["Enums"]["appointment_priority"]
          reason_for_visit?: string | null
          scheduled_datetime: string
          status?: Database["public"]["Enums"]["appointment_status"]
          token_number?: string | null
          updated_at?: string
        }
        Update: {
          appointment_type?: string
          checkin_status?: string | null
          consultation_mode?: Database["public"]["Enums"]["consultation_mode"]
          created_at?: string
          department_id?: string
          doctor_id?: string
          hospital_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          priority?: Database["public"]["Enums"]["appointment_priority"]
          reason_for_visit?: string | null
          scheduled_datetime?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          token_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          age: number | null
          appointment_id: string | null
          appointment_ref: string | null
          check_in_time: string
          department_id: string | null
          doctor_id: string | null
          gender: string | null
          hash: string | null
          hospital_id: string | null
          id: string
          name: string
          notes: Json | null
          patient_id: string | null
          pharmacy: Json | null
          priority: string
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          age?: number | null
          appointment_id?: string | null
          appointment_ref?: string | null
          check_in_time?: string
          department_id?: string | null
          doctor_id?: string | null
          gender?: string | null
          hash?: string | null
          hospital_id?: string | null
          id?: string
          name: string
          notes?: Json | null
          patient_id?: string | null
          pharmacy?: Json | null
          priority?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          age?: number | null
          appointment_id?: string | null
          appointment_ref?: string | null
          check_in_time?: string
          department_id?: string | null
          doctor_id?: string | null
          gender?: string | null
          hash?: string | null
          hospital_id?: string | null
          id?: string
          name?: string
          notes?: Json | null
          patient_id?: string | null
          pharmacy?: Json | null
          priority?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_appointment_ref_fkey"
            columns: ["appointment_ref"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          color: string | null
          consultation_fee: number | null
          contact_number: string | null
          created_at: string
          department_type: Database["public"]["Enums"]["department_type"]
          description: string | null
          email: string | null
          floor: string | null
          hospital_id: string
          icon: string | null
          id: string
          is_active: boolean
          location: string | null
          name: string
          operating_hours: Json | null
          updated_at: string
        }
        Insert: {
          code: string
          color?: string | null
          consultation_fee?: number | null
          contact_number?: string | null
          created_at?: string
          department_type: Database["public"]["Enums"]["department_type"]
          description?: string | null
          email?: string | null
          floor?: string | null
          hospital_id: string
          icon?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          operating_hours?: Json | null
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string | null
          consultation_fee?: number | null
          contact_number?: string | null
          created_at?: string
          department_type?: Database["public"]["Enums"]["department_type"]
          description?: string | null
          email?: string | null
          floor?: string | null
          hospital_id?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          operating_hours?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string
          expo_push_token: string
          id: string
          patient_id: string
          platform: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expo_push_token: string
          id?: string
          patient_id: string
          platform?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expo_push_token?: string
          id?: string
          patient_id?: string
          platform?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      diseases: {
        Row: {
          category: string | null
          created_at: string
          icd_code: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          icd_code?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          icd_code?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      doctor_availability: {
        Row: {
          appointment_duration_minutes: number
          break_end: string | null
          break_start: string | null
          created_at: string
          doctor_id: string
          end_time: string
          id: string
          is_available: boolean
          max_patients: number | null
          start_time: string
          updated_at: string
          weekday: number
        }
        Insert: {
          appointment_duration_minutes?: number
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          doctor_id: string
          end_time: string
          id?: string
          is_available?: boolean
          max_patients?: number | null
          start_time: string
          updated_at?: string
          weekday: number
        }
        Update: {
          appointment_duration_minutes?: number
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          doctor_id?: string
          end_time?: string
          id?: string
          is_available?: boolean
          max_patients?: number | null
          start_time?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "doctor_availability_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          biography: string | null
          consultation_fee: number | null
          created_at: string
          department_id: string
          email: string | null
          first_name: string
          hospital_id: string
          id: string
          languages: string[]
          last_name: string
          phone: string | null
          profile_id: string | null
          profile_photo_url: string | null
          qualifications: string | null
          specialization: string | null
          status: Database["public"]["Enums"]["doctor_status"]
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          biography?: string | null
          consultation_fee?: number | null
          created_at?: string
          department_id: string
          email?: string | null
          first_name: string
          hospital_id: string
          id?: string
          languages?: string[]
          last_name: string
          phone?: string | null
          profile_id?: string | null
          profile_photo_url?: string | null
          qualifications?: string | null
          specialization?: string | null
          status?: Database["public"]["Enums"]["doctor_status"]
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          biography?: string | null
          consultation_fee?: number | null
          created_at?: string
          department_id?: string
          email?: string | null
          first_name?: string
          hospital_id?: string
          id?: string
          languages?: string[]
          last_name?: string
          phone?: string | null
          profile_id?: string | null
          profile_photo_url?: string | null
          qualifications?: string | null
          specialization?: string | null
          status?: Database["public"]["Enums"]["doctor_status"]
          updated_at?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          address: string | null
          city: string | null
          code: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      medicines: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          name: string
          price: number
          stock: number
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
          price?: number
          stock?: number
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
          price?: number
          stock?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          patient_id: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          patient_id: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          patient_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_allergies: {
        Row: {
          allergy_id: string
          created_at: string
          diagnosed_date: string | null
          id: string
          patient_id: string
          reaction: string | null
          severity: string | null
          updated_at: string
        }
        Insert: {
          allergy_id: string
          created_at?: string
          diagnosed_date?: string | null
          id?: string
          patient_id: string
          reaction?: string | null
          severity?: string | null
          updated_at?: string
        }
        Update: {
          allergy_id?: string
          created_at?: string
          diagnosed_date?: string | null
          id?: string
          patient_id?: string
          reaction?: string | null
          severity?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_allergies_allergy_id_fkey"
            columns: ["allergy_id"]
            isOneToOne: false
            referencedRelation: "allergies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_allergies_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_diseases: {
        Row: {
          created_at: string
          diagnosed_date: string | null
          disease_id: string
          id: string
          notes: string | null
          patient_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          diagnosed_date?: string | null
          disease_id: string
          id?: string
          notes?: string | null
          patient_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          diagnosed_date?: string | null
          disease_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_diseases_disease_id_fkey"
            columns: ["disease_id"]
            isOneToOne: false
            referencedRelation: "diseases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_diseases_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blood_group: Database["public"]["Enums"]["blood_group_type"] | null
          bmi: number | null
          created_at: string
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          height_cm: number | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          avatar_url?: string | null
          blood_group?: Database["public"]["Enums"]["blood_group_type"] | null
          bmi?: number | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          height_cm?: number | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          avatar_url?: string | null
          blood_group?: Database["public"]["Enums"]["blood_group_type"] | null
          bmi?: number | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          height_cm?: number | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      next_appt_id: { Args: never; Returns: string }
    }
    Enums: {
      appointment_priority: "normal" | "urgent" | "emergency"
      appointment_status:
        | "requested"
        | "confirmed"
        | "checked_in"
        | "in_consult"
        | "completed"
        | "cancelled"
        | "no_show"
      blood_group_type: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-"
      consultation_mode: "in_person" | "video"
      department_type: "OPD" | "IPD" | "SUPPORT"
      doctor_status: "active" | "on_leave" | "inactive"
      gender_type: "male" | "female" | "other"
      user_role: "patient" | "doctor" | "admin"
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

export const Constants = {
  public: {
    Enums: {
      appointment_priority: ["normal", "urgent", "emergency"],
      appointment_status: [
        "requested",
        "confirmed",
        "checked_in",
        "in_consult",
        "completed",
        "cancelled",
        "no_show",
      ],
      blood_group_type: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      consultation_mode: ["in_person", "video"],
      department_type: ["OPD", "IPD", "SUPPORT"],
      doctor_status: ["active", "on_leave", "inactive"],
      gender_type: ["male", "female", "other"],
      user_role: ["patient", "doctor", "admin"],
    },
  },
} as const
