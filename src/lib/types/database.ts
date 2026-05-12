export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      comments: {
        Row: {
          author_name: string
          author_user_id: string | null
          body: string
          created_at: string | null
          id: string
          punch_item_id: string
        }
        Insert: {
          author_name: string
          author_user_id?: string | null
          body: string
          created_at?: string | null
          id?: string
          punch_item_id: string
        }
        Update: {
          author_name?: string
          author_user_id?: string | null
          body?: string
          created_at?: string | null
          id?: string
          punch_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comments_punch_item_id_fkey'
            columns: ['punch_item_id']
            isOneToOne: false
            referencedRelation: 'punch_items'
            referencedColumns: ['id']
          }
        ]
      }
      photos: {
        Row: {
          annotations: Json | null
          created_at: string | null
          created_by_name: string | null
          id: string
          punch_item_id: string
          storage_path: string
          type: string
        }
        Insert: {
          annotations?: Json | null
          created_at?: string | null
          created_by_name?: string | null
          id?: string
          punch_item_id: string
          storage_path: string
          type: string
        }
        Update: {
          annotations?: Json | null
          created_at?: string | null
          created_by_name?: string | null
          id?: string
          punch_item_id?: string
          storage_path?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'photos_punch_item_id_fkey'
            columns: ['punch_item_id']
            isOneToOne: false
            referencedRelation: 'punch_items'
            referencedColumns: ['id']
          }
        ]
      }
      projects: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      punch_items: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          project_id: string | null
          share_token: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          project_id?: string | null
          share_token?: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          project_id?: string | null
          share_token?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'punch_items_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T]['Row']

export type TablesInsert<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T]['Update']

// Convenience aliases
export type Project = Tables<'projects'>
export type PunchItem = Tables<'punch_items'>
export type Photo = Tables<'photos'>
export type Comment = Tables<'comments'>

export type PunchStatus = 'open' | 'resolved' | 'reviewed' | 'closed' | 'reopened'
export type PhotoType = 'problem' | 'solution'

export type Annotation =
  | { type: 'circle'; x: number; y: number; rx: number; ry: number }
  | { type: 'arrow'; x: number; y: number; x2: number; y2: number }
