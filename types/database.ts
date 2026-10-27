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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_agenda_items: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          id: string
          is_completed: boolean
          position: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          is_completed?: boolean
          position?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          is_completed?: boolean
          position?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_event_fk"
            columns: ["user_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "event_agenda_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_notes: {
        Row: {
          created_at: string
          event_id: string
          note_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          note_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_notes_user_id_event_id_fkey"
            columns: ["user_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "event_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_notes_user_id_note_id_fkey"
            columns: ["user_id", "note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      event_tags: {
        Row: {
          created_at: string
          event_id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          tag_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_tags_user_id_event_id_fkey"
            columns: ["user_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "event_tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tags_user_id_tag_id_fkey"
            columns: ["user_id", "tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      events: {
        Row: {
          category_id: string | null
          created_at: string
          decisions: string | null
          description: string | null
          end_at: string | null
          follow_up_at: string | null
          fts: unknown
          id: string
          location: string | null
          meeting_url: string | null
          minutes: string | null
          project_id: string | null
          start_at: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          decisions?: string | null
          description?: string | null
          end_at?: string | null
          follow_up_at?: string | null
          fts?: unknown
          id?: string
          location?: string | null
          meeting_url?: string | null
          minutes?: string | null
          project_id?: string | null
          start_at: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          decisions?: string | null
          description?: string | null
          end_at?: string | null
          follow_up_at?: string | null
          fts?: unknown
          id?: string
          location?: string | null
          meeting_url?: string | null
          minutes?: string | null
          project_id?: string | null
          start_at?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_category_fk"
            columns: ["user_id", "category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "events_project_fk"
            columns: ["user_id", "project_id"]
            isOneToOne: false
            referencedRelation: "project_progress"
            referencedColumns: ["user_id", "project_id"]
          },
          {
            foreignKeyName: "events_project_fk"
            columns: ["user_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_notes: {
        Row: {
          created_at: string
          idea_id: string
          note_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          idea_id: string
          note_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          idea_id?: string
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_notes_user_id_idea_id_fkey"
            columns: ["user_id", "idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "idea_notes_user_id_note_id_fkey"
            columns: ["user_id", "note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      idea_tags: {
        Row: {
          created_at: string
          idea_id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          idea_id: string
          tag_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          idea_id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_tags_user_id_idea_id_fkey"
            columns: ["user_id", "idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "idea_tags_user_id_tag_id_fkey"
            columns: ["user_id", "tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      ideas: {
        Row: {
          archived_at: string | null
          category_id: string | null
          color: string | null
          content: string | null
          converted_project_id: string | null
          converted_task_id: string | null
          created_at: string
          fts: unknown
          id: string
          is_pinned: boolean
          project_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          category_id?: string | null
          color?: string | null
          content?: string | null
          converted_project_id?: string | null
          converted_task_id?: string | null
          created_at?: string
          fts?: unknown
          id?: string
          is_pinned?: boolean
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          category_id?: string | null
          color?: string | null
          content?: string | null
          converted_project_id?: string | null
          converted_task_id?: string | null
          created_at?: string
          fts?: unknown
          id?: string
          is_pinned?: boolean
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_category_fk"
            columns: ["user_id", "category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "ideas_converted_project_fk"
            columns: ["user_id", "converted_project_id"]
            isOneToOne: false
            referencedRelation: "project_progress"
            referencedColumns: ["user_id", "project_id"]
          },
          {
            foreignKeyName: "ideas_converted_project_fk"
            columns: ["user_id", "converted_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "ideas_project_fk"
            columns: ["user_id", "project_id"]
            isOneToOne: false
            referencedRelation: "project_progress"
            referencedColumns: ["user_id", "project_id"]
          },
          {
            foreignKeyName: "ideas_project_fk"
            columns: ["user_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "ideas_task_fk"
            columns: ["user_id", "converted_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "ideas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      note_tags: {
        Row: {
          created_at: string
          note_id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          note_id: string
          tag_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          note_id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_tags_user_id_note_id_fkey"
            columns: ["user_id", "note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "note_tags_user_id_tag_id_fkey"
            columns: ["user_id", "tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      notes: {
        Row: {
          archived_at: string | null
          category_id: string | null
          content: string
          created_at: string
          fts: unknown
          id: string
          is_pinned: boolean
          project_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          category_id?: string | null
          content?: string
          created_at?: string
          fts?: unknown
          id?: string
          is_pinned?: boolean
          project_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          category_id?: string | null
          content?: string
          created_at?: string
          fts?: unknown
          id?: string
          is_pinned?: boolean
          project_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_category_fk"
            columns: ["user_id", "category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "notes_project_fk"
            columns: ["user_id", "project_id"]
            isOneToOne: false
            referencedRelation: "project_progress"
            referencedColumns: ["user_id", "project_id"]
          },
          {
            foreignKeyName: "notes_project_fk"
            columns: ["user_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          dismissed_at: string | null
          event_id: string | null
          id: string
          read_at: string | null
          reminder_job_id: string | null
          review_id: string | null
          task_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          dismissed_at?: string | null
          event_id?: string | null
          id?: string
          read_at?: string | null
          reminder_job_id?: string | null
          review_id?: string | null
          task_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          dismissed_at?: string | null
          event_id?: string | null
          id?: string
          read_at?: string | null
          reminder_job_id?: string | null
          review_id?: string | null
          task_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_event_id_fkey"
            columns: ["user_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_reminder_job_id_fkey"
            columns: ["user_id", "reminder_job_id"]
            isOneToOne: false
            referencedRelation: "reminder_jobs"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "notifications_user_id_review_id_fkey"
            columns: ["user_id", "review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "notifications_user_id_task_id_fkey"
            columns: ["user_id", "task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          position: number
          project_id: string
          status: string
          title: string
          updated_at: string
          user_id: string
          weight: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          project_id: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          weight?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_fk"
            columns: ["user_id", "project_id"]
            isOneToOne: false
            referencedRelation: "project_progress"
            referencedColumns: ["user_id", "project_id"]
          },
          {
            foreignKeyName: "milestones_project_fk"
            columns: ["user_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "project_milestones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          archived_at: string | null
          category_id: string | null
          color: string | null
          created_at: string
          description: string | null
          fts: unknown
          id: string
          name: string
          start_date: string | null
          status: string
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          category_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          fts?: unknown
          id?: string
          name: string
          start_date?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          category_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          fts?: unknown
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_category_fk"
            columns: ["user_id", "category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_jobs: {
        Row: {
          attempt_count: number
          channel: string
          created_at: string
          event_id: string | null
          id: string
          idempotency_key: string
          kind: string
          last_attempt_at: string | null
          last_error: string | null
          next_attempt_at: string | null
          provider_message_id: string | null
          reminder_at: string
          review_id: string | null
          sent_at: string | null
          status: string
          task_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          channel: string
          created_at?: string
          event_id?: string | null
          id?: string
          idempotency_key: string
          kind: string
          last_attempt_at?: string | null
          last_error?: string | null
          next_attempt_at?: string | null
          provider_message_id?: string | null
          reminder_at: string
          review_id?: string | null
          sent_at?: string | null
          status?: string
          task_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          channel?: string
          created_at?: string
          event_id?: string | null
          id?: string
          idempotency_key?: string
          kind?: string
          last_attempt_at?: string | null
          last_error?: string | null
          next_attempt_at?: string | null
          provider_message_id?: string | null
          reminder_at?: string
          review_id?: string | null
          sent_at?: string | null
          status?: string
          task_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_jobs_user_id_event_id_fkey"
            columns: ["user_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "reminder_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_jobs_user_id_review_id_fkey"
            columns: ["user_id", "review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "reminder_jobs_user_id_task_id_fkey"
            columns: ["user_id", "task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      review_tags: {
        Row: {
          created_at: string
          review_id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          review_id: string
          tag_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          review_id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_tags_user_id_review_id_fkey"
            columns: ["user_id", "review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "review_tags_user_id_tag_id_fkey"
            columns: ["user_id", "tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      review_tasks: {
        Row: {
          created_at: string
          review_id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          review_id: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          review_id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_tasks_user_id_review_id_fkey"
            columns: ["user_id", "review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "review_tasks_user_id_task_id_fkey"
            columns: ["user_id", "task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      reviews: {
        Row: {
          category_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          fts: unknown
          id: string
          notes: string | null
          project_id: string | null
          review_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          fts?: unknown
          id?: string
          notes?: string | null
          project_id?: string | null
          review_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          fts?: unknown
          id?: string
          notes?: string | null
          project_id?: string | null
          review_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_category_fk"
            columns: ["user_id", "category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "reviews_project_fk"
            columns: ["user_id", "project_id"]
            isOneToOne: false
            referencedRelation: "project_progress"
            referencedColumns: ["user_id", "project_id"]
          },
          {
            foreignKeyName: "reviews_project_fk"
            columns: ["user_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_events: {
        Row: {
          created_at: string
          event_id: string
          relation: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          relation?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          relation?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_events_user_id_event_id_fkey"
            columns: ["user_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "task_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_events_user_id_task_id_fkey"
            columns: ["user_id", "task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      task_notes: {
        Row: {
          created_at: string
          note_id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          note_id: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          note_id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_notes_user_id_note_id_fkey"
            columns: ["user_id", "note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "task_notes_user_id_task_id_fkey"
            columns: ["user_id", "task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      task_tags: {
        Row: {
          created_at: string
          tag_id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          tag_id: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          tag_id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tags_user_id_tag_id_fkey"
            columns: ["user_id", "tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "task_tags_user_id_task_id_fkey"
            columns: ["user_id", "task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      tasks: {
        Row: {
          archived_at: string | null
          category_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_at: string | null
          estimated_minutes: number | null
          fts: unknown
          id: string
          occurrence_key: string | null
          parent_task_id: string | null
          position: number
          priority: string
          project_id: string | null
          recurrence_rule: string | null
          recurrence_series_id: string | null
          recurrence_weekdays: number[] | null
          remind_at: string | null
          scheduled_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          estimated_minutes?: number | null
          fts?: unknown
          id?: string
          occurrence_key?: string | null
          parent_task_id?: string | null
          position?: number
          priority?: string
          project_id?: string | null
          recurrence_rule?: string | null
          recurrence_series_id?: string | null
          recurrence_weekdays?: number[] | null
          remind_at?: string | null
          scheduled_at?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          estimated_minutes?: number | null
          fts?: unknown
          id?: string
          occurrence_key?: string | null
          parent_task_id?: string | null
          position?: number
          priority?: string
          project_id?: string | null
          recurrence_rule?: string | null
          recurrence_series_id?: string | null
          recurrence_weekdays?: number[] | null
          remind_at?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_category_fk"
            columns: ["user_id", "category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "tasks_parent_fk"
            columns: ["user_id", "parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "tasks_project_fk"
            columns: ["user_id", "project_id"]
            isOneToOne: false
            referencedRelation: "project_progress"
            referencedColumns: ["user_id", "project_id"]
          },
          {
            foreignKeyName: "tasks_project_fk"
            columns: ["user_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          date_format: string
          default_deadline_lead_minutes: number
          default_meeting_lead_minutes: number
          default_task_priority: string
          email_reminders_enabled: boolean
          time_format: string
          updated_at: string
          user_id: string
          week_starts_on: number
        }
        Insert: {
          created_at?: string
          date_format?: string
          default_deadline_lead_minutes?: number
          default_meeting_lead_minutes?: number
          default_task_priority?: string
          email_reminders_enabled?: boolean
          time_format?: string
          updated_at?: string
          user_id: string
          week_starts_on?: number
        }
        Update: {
          created_at?: string
          date_format?: string
          default_deadline_lead_minutes?: number
          default_meeting_lead_minutes?: number
          default_task_priority?: string
          email_reminders_enabled?: boolean
          time_format?: string
          updated_at?: string
          user_id?: string
          week_starts_on?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reviews: {
        Row: {
          created_at: string
          id: string
          lessons_learned: string | null
          next_week_priorities: string | null
          reflection: string | null
          updated_at: string
          user_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          lessons_learned?: string | null
          next_week_priorities?: string | null
          reflection?: string | null
          updated_at?: string
          user_id: string
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          lessons_learned?: string | null
          next_week_priorities?: string | null
          reflection?: string | null
          updated_at?: string
          user_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      project_progress: {
        Row: {
          basis: string | null
          pct: number | null
          project_id: string | null
          task_done: number | null
          task_total: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      claim_reminder_jobs: {
        Args: { p_limit?: number }
        Returns: {
          attempt_count: number
          channel: string
          created_at: string
          event_id: string | null
          id: string
          idempotency_key: string
          kind: string
          last_attempt_at: string | null
          last_error: string | null
          next_attempt_at: string | null
          provider_message_id: string | null
          reminder_at: string
          review_id: string | null
          sent_at: string | null
          status: string
          task_id: string | null
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "reminder_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_task: {
        Args: { p_task_id: string }
        Returns: {
          archived_at: string | null
          category_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_at: string | null
          estimated_minutes: number | null
          fts: unknown
          id: string
          occurrence_key: string | null
          parent_task_id: string | null
          position: number
          priority: string
          project_id: string | null
          recurrence_rule: string | null
          recurrence_series_id: string | null
          recurrence_weekdays: number[] | null
          remind_at: string | null
          scheduled_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      convert_idea_to_project: { Args: { p_idea_id: string }; Returns: string }
      convert_idea_to_task: { Args: { p_idea_id: string }; Returns: string }
      finish_reminder_job: {
        Args: {
          p_error?: string
          p_id: string
          p_ok: boolean
          p_provider_id?: string
          p_retry?: boolean
        }
        Returns: undefined
      }
      global_search: {
        Args: {
          p_category?: string
          p_from?: string
          p_kinds?: string[]
          p_limit?: number
          p_priority?: string
          p_project?: string
          p_status?: string
          p_tag?: string
          p_to?: string
          q: string
        }
        Returns: {
          at: string
          category_id: string
          id: string
          kind: string
          priority: string
          project_id: string
          rank: number
          snippet: string
          status: string
          title: string
        }[]
      }
      reopen_task: {
        Args: { p_task_id: string }
        Returns: {
          archived_at: string | null
          category_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_at: string | null
          estimated_minutes: number | null
          fts: unknown
          id: string
          occurrence_key: string | null
          parent_task_id: string | null
          position: number
          priority: string
          project_id: string | null
          recurrence_rule: string | null
          recurrence_series_id: string | null
          recurrence_weekdays: number[] | null
          remind_at: string | null
          scheduled_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      user_tz: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
