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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointment_charges: {
        Row: {
          appointment_id: string
          created_at: string
          created_by: string | null
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          petshop_id: string
          price_cents: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          created_by?: string | null
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          petshop_id: string
          price_cents: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          created_by?: string | null
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          petshop_id?: string
          price_cents?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_charges_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_charges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_charges_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_charges_petshop_id_fkey"
            columns: ["petshop_id"]
            isOneToOne: false
            referencedRelation: "petshops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_charges_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_checklists: {
        Row: {
          appointment_id: string
          arrival_condition: string | null
          created_at: string
          created_by: string | null
          notes: string | null
          petshop_id: string
          products: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          appointment_id: string
          arrival_condition?: string | null
          created_at?: string
          created_by?: string | null
          notes?: string | null
          petshop_id: string
          products?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          appointment_id?: string
          arrival_condition?: string | null
          created_at?: string
          created_by?: string | null
          notes?: string | null
          petshop_id?: string
          products?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_checklists_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_checklists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_checklists_petshop_id_fkey"
            columns: ["petshop_id"]
            isOneToOne: false
            referencedRelation: "petshops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_checklists_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_records: {
        Row: {
          anamnesis: string | null
          appointment_id: string
          chief_complaint: string | null
          created_at: string
          created_by: string | null
          diagnosis: string | null
          petshop_id: string
          physical_exam: string | null
          plan: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          anamnesis?: string | null
          appointment_id: string
          chief_complaint?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          petshop_id: string
          physical_exam?: string | null
          plan?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          anamnesis?: string | null
          appointment_id?: string
          chief_complaint?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          petshop_id?: string
          physical_exam?: string | null
          plan?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_records_petshop_id_fkey"
            columns: ["petshop_id"]
            isOneToOne: false
            referencedRelation: "petshops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_records_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          calendar_id: string
          client_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          duration_range: unknown
          employee_id: string | null
          ends_at: string
          id: string
          notes: string | null
          pet_id: string | null
          petshop_id: string
          public_tracking_code: string
          service_id: string
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          tutor_name: string | null
          tutor_phone: string | null
          updated_at: string
          updated_by: string | null
          veterinarian_id: string | null
        }
        Insert: {
          calendar_id: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          duration_range?: unknown
          employee_id?: string | null
          ends_at: string
          id?: string
          notes?: string | null
          pet_id?: string | null
          petshop_id: string
          public_tracking_code?: string
          service_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          tutor_name?: string | null
          tutor_phone?: string | null
          updated_at?: string
          updated_by?: string | null
          veterinarian_id?: string | null
        }
        Update: {
          calendar_id?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          duration_range?: unknown
          employee_id?: string | null
          ends_at?: string
          id?: string
          notes?: string | null
          pet_id?: string | null
          petshop_id?: string
          public_tracking_code?: string
          service_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          tutor_name?: string | null
          tutor_phone?: string | null
          updated_at?: string
          updated_by?: string | null
          veterinarian_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_petshop_id_fkey"
            columns: ["petshop_id"]
            isOneToOne: false
            referencedRelation: "petshops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_veterinarian_id_fkey"
            columns: ["veterinarian_id"]
            isOneToOne: false
            referencedRelation: "veterinarians"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_table: string
          id: string
          metadata: Json
          petshop_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_table: string
          id?: string
          metadata?: Json
          petshop_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_table?: string
          id?: string
          metadata?: Json
          petshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_petshop_id_fkey"
            columns: ["petshop_id"]
            isOneToOne: false
            referencedRelation: "petshops"
            referencedColumns: ["id"]
          },
        ]
      }
      calendars: {
        Row: {
          active: boolean
          area: Database["public"]["Enums"]["service_area"]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          name: string
          petshop_id: string
          timezone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          area: Database["public"]["Enums"]["service_area"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name: string
          petshop_id: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          area?: Database["public"]["Enums"]["service_area"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name?: string
          petshop_id?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendars_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendars_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendars_petshop_id_fkey"
            columns: ["petshop_id"]
            isOneToOne: false
            referencedRelation: "petshops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendars_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_photos: {
        Row: {
          caption: string | null
          checklist_id: string
          id: string
          path: string
          petshop_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          checklist_id: string
          id?: string
          path: string
          petshop_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          checklist_id?: string
          id?: string
          path?: string
          petshop_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_photos_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_photos_petshop_id_fkey"
            columns: ["petshop_id"]
            isOneToOne: false
            referencedRelation: "petshops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_steps: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          label: string
          petshop_id: string
          position: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          label: string
          petshop_id: string
          position: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          label?: string
          petshop_id?: string
          position?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_steps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_steps_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_steps_petshop_id_fkey"
            columns: ["petshop_id"]
            isOneToOne: false
            referencedRelation: "petshops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_steps_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          appointment_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          notes: string | null
          petshop_id: string
          step_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          appointment_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          notes?: string | null
          petshop_id: string
          step_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          appointment_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          notes?: string | null
          petshop_id?: string
          step_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklists_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_petshop_id_fkey"
            columns: ["petshop_id"]
            isOneToOne: false
            referencedRelation: "petshops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "checklist_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          petshop_id: string
          phone: string
          updated_at: string
          updated_by: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          petshop_id: string
          phone: string
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          petshop_id?: string
          phone?: string
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_petshop_id_fkey"
            columns: ["petshop_id"]
            isOneToOne: false
            referencedRelation: "petshops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_notes: {
        Row: {
          appointment_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          diagnosis: string | null
          id: string
          medications: string | null
          observations: string | null
          pet_id: string | null
          petshop_id: string
          recommendations: string | null
          temperature_c: number | null
          updated_at: string
          updated_by: string | null
          veterinarian_id: string | null
          weight_kg: number | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          diagnosis?: string | null
          id?: string
          medications?: string | null
          observations?: string | null
          pet_id?: string | null
          petshop_id: string
          recommendations?: string | null
          temperature_c?: number | null
          updated_at?: string
          updated_by?: string | null
          veterinarian_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          diagnosis?: string | null
          id?: string
          medications?: string | null
          observations?: string | null
          pet_id?: string | null
          petshop_id?: string
          recommendations?: string | null
          temperature_c?: number | null
          updated_at?: string
          updated_by?: string | null
          veterinarian_id?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_petshop_id_fkey"
            columns: ["petshop_id"]
            isOneToOne: false
            referencedRelation: "petshops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_veterinarian_id_fkey"
            columns: ["veterinarian_id"]
            isOneToOne: false
            referencedRelation: "veterinarians"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          id: string
          job_title: string
          name: string
          petshop_id: string
          phone: string | null
          role: Database["public"]["Enums"]["member_role"]
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          job_title: string
          name: string
          petshop_id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          job_title?: string
          name?: string
          petshop_id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_petshop_id_fkey"
            columns: ["petshop_id"]
            isOneToOne: false
            referencedRelation: "petshops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_cents: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          petshop_id: string
          proof_path: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount_cents: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description: string
          due_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          petshop_id: string
          proof_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount_cents?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          petshop_id?: string
          proof_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_petshop_id_fkey"
            columns: ["petshop_id"]
            isOneToOne: false
            referencedRelation: "petshops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          petshop_id: string
          role: Database["public"]["Enums"]["member_role"]
          status: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          petshop_id: string
          role: Database["public"]["Enums"]["member_role"]
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          petshop_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_petshop_id_fkey"
            columns: ["petshop_id"]
            isOneToOne: false
            referencedRelation: "petshops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          link: string | null
          petshop_id: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          link?: string | null
          petshop_id?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          link?: string | null
          petshop_id?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_petshop_id_fkey"
            columns: ["petshop_id"]
            isOneToOne: false
            referencedRelation: "petshops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          paid_at: string | null
          petshop_id: string
          proof_path: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount_cents: number
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          paid_at?: string | null
          petshop_id: string
          proof_path?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount_cents?: number
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          paid_at?: string | null
          petshop_id?: string
          proof_path?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_petshop_id_fkey"
            columns: ["petshop_id"]
            isOneToOne: false
            referencedRelation: "petshops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      pets: {
        Row: {
          age_label: string | null
          breed: string | null
          client_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          name: string
          notes: string | null
          petshop_id: string
          photo_path: string | null
          sex: string | null
          species: string
          updated_at: string
          updated_by: string | null
          weight_kg: number | null
        }
        Insert: {
          age_label?: string | null
          breed?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name: string
          notes?: string | null
          petshop_id: string
          photo_path?: string | null
          sex?: string | null
          species: string
          updated_at?: string
          updated_by?: string | null
          weight_kg?: number | null
        }
        Update: {
          age_label?: string | null
          breed?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          petshop_id?: string
          photo_path?: string | null
          sex?: string | null
          species?: string
          updated_at?: string
          updated_by?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pets_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pets_petshop_id_fkey"
            columns: ["petshop_id"]
            isOneToOne: false
            referencedRelation: "petshops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      petshops: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          id: string
          legal_name: string | null
          name: string
          phone: string | null
          pix_key: string | null
          plan_id: string | null
          plan_name: string
          primary_color: string
          settings: Json
          slug: string
          status: Database["public"]["Enums"]["petshop_status"]
          subdomain: string
          updated_at: string
          updated_by: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          name: string
          phone?: string | null
          pix_key?: string | null
          plan_id?: string | null
          plan_name?: string
          primary_color?: string
          settings?: Json
          slug: string
          status?: Database["public"]["Enums"]["petshop_status"]
          subdomain: string
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          name?: string
          phone?: string | null
          pix_key?: string | null
          plan_id?: string | null
          plan_name?: string
          primary_color?: string
          settings?: Json
          slug?: string
          status?: Database["public"]["Enums"]["petshop_status"]
          subdomain?: string
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "petshops_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petshops_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petshops_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petshops_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          allows_veterinarian: boolean
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          max_users: number
          name: string
          price_cents: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          allows_veterinarian?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          max_users: number
          name: string
          price_cents: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          allows_veterinarian?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          max_users?: number
          name?: string
          price_cents?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: number
          pix_holder_name: string | null
          pix_key: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: number
          pix_holder_name?: string | null
          pix_key?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: number
          pix_holder_name?: string | null
          pix_key?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      revenues: {
        Row: {
          amount_cents: number
          appointment_id: string | null
          category: Database["public"]["Enums"]["financial_category"]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string
          id: string
          notes: string | null
          payment_method: string | null
          petshop_id: string
          received_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount_cents: number
          appointment_id?: string | null
          category?: Database["public"]["Enums"]["financial_category"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          petshop_id: string
          received_at: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount_cents?: number
          appointment_id?: string | null
          category?: Database["public"]["Enums"]["financial_category"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          petshop_id?: string
          received_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revenues_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenues_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenues_petshop_id_fkey"
            columns: ["petshop_id"]
            isOneToOne: false
            referencedRelation: "petshops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenues_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          active: boolean
          calendar_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          ends_at: string
          id: string
          petshop_id: string
          professional_id: string | null
          starts_at: string
          updated_at: string
          updated_by: string | null
          weekday: number
        }
        Insert: {
          active?: boolean
          calendar_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          ends_at: string
          id?: string
          petshop_id: string
          professional_id?: string | null
          starts_at: string
          updated_at?: string
          updated_by?: string | null
          weekday: number
        }
        Update: {
          active?: boolean
          calendar_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          ends_at?: string
          id?: string
          petshop_id?: string
          professional_id?: string | null
          starts_at?: string
          updated_at?: string
          updated_by?: string | null
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "schedules_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_petshop_id_fkey"
            columns: ["petshop_id"]
            isOneToOne: false
            referencedRelation: "petshops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          area: Database["public"]["Enums"]["service_area"]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          duration_minutes: number
          id: string
          name: string
          petshop_id: string
          price_cents: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          area: Database["public"]["Enums"]["service_area"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          duration_minutes: number
          id?: string
          name: string
          petshop_id: string
          price_cents?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          area?: Database["public"]["Enums"]["service_area"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          petshop_id?: string
          price_cents?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_petshop_id_fkey"
            columns: ["petshop_id"]
            isOneToOne: false
            referencedRelation: "petshops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      status_history: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_table: string
          from_status: string | null
          id: string
          notes: string | null
          petshop_id: string
          to_status: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_table: string
          from_status?: string | null
          id?: string
          notes?: string | null
          petshop_id: string
          to_status: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_table?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          petshop_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_history_petshop_id_fkey"
            columns: ["petshop_id"]
            isOneToOne: false
            referencedRelation: "petshops"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          due_date: string
          id: string
          petshop_id: string
          pix_key: string | null
          plan_name: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          due_date: string
          id?: string
          petshop_id: string
          pix_key?: string | null
          plan_name: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          due_date?: string
          id?: string
          petshop_id?: string
          pix_key?: string | null
          plan_name?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_petshop_id_fkey"
            columns: ["petshop_id"]
            isOneToOne: false
            referencedRelation: "petshops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          email: string
          full_name: string
          global_role: Database["public"]["Enums"]["global_role"]
          id: string
          phone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email: string
          full_name: string
          global_role?: Database["public"]["Enums"]["global_role"]
          id: string
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string
          full_name?: string
          global_role?: Database["public"]["Enums"]["global_role"]
          id?: string
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      veterinarians: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          crmv: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          id: string
          name: string
          petshop_id: string
          phone: string | null
          specialties: string[]
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          crmv?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          name: string
          petshop_id: string
          phone?: string | null
          specialties?: string[]
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          crmv?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          name?: string
          petshop_id?: string
          phone?: string | null
          specialties?: string[]
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "veterinarians_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veterinarians_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veterinarians_petshop_id_fkey"
            columns: ["petshop_id"]
            isOneToOne: false
            referencedRelation: "petshops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veterinarians_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veterinarians_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      appointment_status:
        | "pending"
        | "confirmed"
        | "checked_in"
        | "in_progress"
        | "finished"
        | "cancelled"
        | "no_show"
      expense_category:
        | "rent"
        | "utilities"
        | "payroll"
        | "supplies"
        | "services"
        | "maintenance"
        | "taxes"
        | "marketing"
        | "other"
      financial_category:
        | "grooming"
        | "veterinary"
        | "retail"
        | "service"
        | "other"
      global_role: "admin_master" | "user"
      member_role: "owner" | "attendant" | "veterinarian"
      notification_kind:
        | "subscription_due"
        | "support_access"
        | "appointment_change"
        | "checklist_step"
        | "system"
      payment_method: "pix" | "cash" | "card" | "transfer" | "other"
      payment_status: "pending" | "confirming" | "paid" | "rejected" | "overdue"
      petshop_status: "active" | "blocked" | "trial" | "cancelled"
      service_area: "grooming" | "veterinary"
      subscription_status:
        | "paid"
        | "pending"
        | "confirming"
        | "overdue"
        | "blocked"
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
      appointment_status: [
        "pending",
        "confirmed",
        "checked_in",
        "in_progress",
        "finished",
        "cancelled",
        "no_show",
      ],
      expense_category: [
        "rent",
        "utilities",
        "payroll",
        "supplies",
        "services",
        "maintenance",
        "taxes",
        "marketing",
        "other",
      ],
      financial_category: [
        "grooming",
        "veterinary",
        "retail",
        "service",
        "other",
      ],
      global_role: ["admin_master", "user"],
      member_role: ["owner", "attendant", "veterinarian"],
      notification_kind: [
        "subscription_due",
        "support_access",
        "appointment_change",
        "checklist_step",
        "system",
      ],
      payment_method: ["pix", "cash", "card", "transfer", "other"],
      payment_status: ["pending", "confirming", "paid", "rejected", "overdue"],
      petshop_status: ["active", "blocked", "trial", "cancelled"],
      service_area: ["grooming", "veterinary"],
      subscription_status: [
        "paid",
        "pending",
        "confirming",
        "overdue",
        "blocked",
      ],
    },
  },
} as const

