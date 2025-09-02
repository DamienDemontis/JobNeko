export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          id: string
          name: string
          description: string | null
          website: string | null
          industry: string | null
          location: string | null
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          website?: string | null
          industry?: string | null
          location?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          website?: string | null
          industry?: string | null
          location?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          id: string
          company_id: string
          title: string
          description: string
          requirements: string | null
          salary_min: number | null
          salary_max: number | null
          location: string | null
          employment_type: 'full-time' | 'part-time' | 'contract' | 'internship'
          remote_policy: 'on-site' | 'remote' | 'hybrid'
          job_url: string
          posted_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          title: string
          description: string
          requirements?: string | null
          salary_min?: number | null
          salary_max?: number | null
          location?: string | null
          employment_type: 'full-time' | 'part-time' | 'contract' | 'internship'
          remote_policy: 'on-site' | 'remote' | 'hybrid'
          job_url: string
          posted_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          title?: string
          description?: string
          requirements?: string | null
          salary_min?: number | null
          salary_max?: number | null
          location?: string | null
          employment_type?: 'full-time' | 'part-time' | 'contract' | 'internship'
          remote_policy?: 'on-site' | 'remote' | 'hybrid'
          job_url?: string
          posted_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      applications: {
        Row: {
          id: string
          user_id: string
          job_id: string
          status: 'not_applied' | 'applied' | 'phone_screen' | 'interview' | 'offer' | 'rejected'
          applied_date: string | null
          notes: string | null
          resume_url: string | null
          cover_letter_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          job_id: string
          status?: 'not_applied' | 'applied' | 'phone_screen' | 'interview' | 'offer' | 'rejected'
          applied_date?: string | null
          notes?: string | null
          resume_url?: string | null
          cover_letter_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          job_id?: string
          status?: 'not_applied' | 'applied' | 'phone_screen' | 'interview' | 'offer' | 'rejected'
          applied_date?: string | null
          notes?: string | null
          resume_url?: string | null
          cover_letter_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          }
        ]
      }
      application_status_history: {
        Row: {
          id: string
          application_id: string
          status: 'not_applied' | 'applied' | 'phone_screen' | 'interview' | 'offer' | 'rejected'
          changed_at: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          application_id: string
          status: 'not_applied' | 'applied' | 'phone_screen' | 'interview' | 'offer' | 'rejected'
          changed_at?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          application_id?: string
          status?: 'not_applied' | 'applied' | 'phone_screen' | 'interview' | 'offer' | 'rejected'
          changed_at?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          }
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}