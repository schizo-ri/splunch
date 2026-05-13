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
      area_templates: {
        Row: {
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      areas: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          project_id: string
          sort_order: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          project_id: string
          sort_order?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          project_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: 'areas_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          }
        ]
      }
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
      profiles: {
        Row: {
          created_at: string
          id: string
          is_superadmin: boolean
        }
        Insert: {
          created_at?: string
          id: string
          is_superadmin?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          is_superadmin?: boolean
        }
        Relationships: []
      }
      project_users: {
        Row: {
          created_at: string
          invited_by: string | null
          project_id: string
          role: 'owner' | 'member'
          user_id: string
        }
        Insert: {
          created_at?: string
          invited_by?: string | null
          project_id: string
          role: 'owner' | 'member'
          user_id: string
        }
        Update: {
          created_at?: string
          invited_by?: string | null
          project_id?: string
          role?: 'owner' | 'member'
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_users_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
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
          area_id: string | null
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
          area_id?: string | null
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
          area_id?: string | null
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
            foreignKeyName: 'punch_items_area_id_fkey'
            columns: ['area_id']
            isOneToOne: false
            referencedRelation: 'areas'
            referencedColumns: ['id']
          },
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
      is_project_member: { Args: { p_project_id: string }; Returns: boolean }
      is_project_owner: { Args: { p_project_id: string }; Returns: boolean }
      is_superadmin: { Args: Record<never, never>; Returns: boolean }
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
export type Project     = Tables<'projects'>
export type PunchItem   = Tables<'punch_items'>
export type Photo       = Tables<'photos'>
export type Comment     = Tables<'comments'>
export type Area        = Tables<'areas'>
export type AreaTemplate = Tables<'area_templates'>
export type Profile     = Tables<'profiles'>
export type ProjectUser = Tables<'project_users'>

export type ProjectRole = 'owner' | 'member'
export type PunchStatus = 'open' | 'resolved' | 'reviewed' | 'closed' | 'reopened'
export type PhotoType   = 'problem' | 'solution'

export type Annotation =
  | { type: 'circle'; x: number; y: number; rx: number; ry: number }
  | { type: 'arrow'; x: number; y: number; x2: number; y2: number }
