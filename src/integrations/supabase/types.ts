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
      analyses: {
        Row: {
          alternatives: Json | null
          calories: number
          carbs_g: number
          confidence: number | null
          created_at: string
          fat_g: number
          food_name: string
          health_score: number | null
          id: string
          image_url: string | null
          is_healthy: boolean | null
          items: Json | null
          portion_size: string | null
          protein_g: number
          steps_needed: number
          tips: Json | null
          user_id: string
          walking_minutes: number
        }
        Insert: {
          alternatives?: Json | null
          calories?: number
          carbs_g?: number
          confidence?: number | null
          created_at?: string
          fat_g?: number
          food_name: string
          health_score?: number | null
          id?: string
          image_url?: string | null
          is_healthy?: boolean | null
          items?: Json | null
          portion_size?: string | null
          protein_g?: number
          steps_needed?: number
          tips?: Json | null
          user_id: string
          walking_minutes?: number
        }
        Update: {
          alternatives?: Json | null
          calories?: number
          carbs_g?: number
          confidence?: number | null
          created_at?: string
          fat_g?: number
          food_name?: string
          health_score?: number | null
          id?: string
          image_url?: string | null
          is_healthy?: boolean | null
          items?: Json | null
          portion_size?: string | null
          protein_g?: number
          steps_needed?: number
          tips?: Json | null
          user_id?: string
          walking_minutes?: number
        }
        Relationships: []
      }
      blog_automation_settings: {
        Row: {
          auto_publish: boolean
          content_calendar: Json
          created_at: string
          default_language: string
          enabled: boolean
          id: string
          last_run_at: string | null
          lock_until: string | null
          paused_at: string | null
          paused_reason: string | null
          posts_per_week: number
          preferred_categories: string[]
          singleton: boolean
          target_word_count: number
          updated_at: string
        }
        Insert: {
          auto_publish?: boolean
          content_calendar?: Json
          created_at?: string
          default_language?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          lock_until?: string | null
          paused_at?: string | null
          paused_reason?: string | null
          posts_per_week?: number
          preferred_categories?: string[]
          singleton?: boolean
          target_word_count?: number
          updated_at?: string
        }
        Update: {
          auto_publish?: boolean
          content_calendar?: Json
          created_at?: string
          default_language?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          lock_until?: string | null
          paused_at?: string | null
          paused_reason?: string | null
          posts_per_week?: number
          preferred_categories?: string[]
          singleton?: boolean
          target_word_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      blog_generation_jobs: {
        Row: {
          category_id: string | null
          completed_at: string | null
          content_type: string | null
          created_at: string
          error_message: string | null
          generated_content: Json | null
          id: string
          keyword: string | null
          language: string
          post_id: string | null
          stage: string | null
          status: string
          target_word_count: number
          topic: string
          triggered_by: string
        }
        Insert: {
          category_id?: string | null
          completed_at?: string | null
          content_type?: string | null
          created_at?: string
          error_message?: string | null
          generated_content?: Json | null
          id?: string
          keyword?: string | null
          language?: string
          post_id?: string | null
          stage?: string | null
          status?: string
          target_word_count?: number
          topic: string
          triggered_by?: string
        }
        Update: {
          category_id?: string | null
          completed_at?: string | null
          content_type?: string | null
          created_at?: string
          error_message?: string | null
          generated_content?: Json | null
          id?: string
          keyword?: string | null
          language?: string
          post_id?: string | null
          stage?: string | null
          status?: string
          target_word_count?: number
          topic?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_generation_jobs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_generation_jobs_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_views: {
        Row: {
          created_at: string
          id: string
          post_id: string
          referrer_host: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          referrer_host?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          referrer_host?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          author_name: string
          canonical_url: string | null
          category_id: string | null
          content: string
          content_type: string | null
          created_at: string
          excerpt: string | null
          faq: Json
          featured_image: string | null
          featured_image_alt: string | null
          focus_keyword: string | null
          id: string
          internal_links: Json
          is_ai_generated: boolean
          is_featured: boolean
          language: string
          meta_description: string | null
          meta_title: string | null
          needs_review: boolean
          published_at: string | null
          quality_report: Json | null
          reading_time: number
          scheduled_for: string | null
          secondary_keywords: string[]
          slug: string
          sources: Json
          status: string
          title: string
          updated_at: string
          version: number
          view_count: number
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          canonical_url?: string | null
          category_id?: string | null
          content?: string
          content_type?: string | null
          created_at?: string
          excerpt?: string | null
          faq?: Json
          featured_image?: string | null
          featured_image_alt?: string | null
          focus_keyword?: string | null
          id?: string
          internal_links?: Json
          is_ai_generated?: boolean
          is_featured?: boolean
          language?: string
          meta_description?: string | null
          meta_title?: string | null
          needs_review?: boolean
          published_at?: string | null
          quality_report?: Json | null
          reading_time?: number
          scheduled_for?: string | null
          secondary_keywords?: string[]
          slug: string
          sources?: Json
          status?: string
          title: string
          updated_at?: string
          version?: number
          view_count?: number
        }
        Update: {
          author_id?: string | null
          author_name?: string
          canonical_url?: string | null
          category_id?: string | null
          content?: string
          content_type?: string | null
          created_at?: string
          excerpt?: string | null
          faq?: Json
          featured_image?: string | null
          featured_image_alt?: string | null
          focus_keyword?: string | null
          id?: string
          internal_links?: Json
          is_ai_generated?: boolean
          is_featured?: boolean
          language?: string
          meta_description?: string | null
          meta_title?: string | null
          needs_review?: boolean
          published_at?: string | null
          quality_report?: Json | null
          reading_time?: number
          scheduled_for?: string | null
          secondary_keywords?: string[]
          slug?: string
          sources?: Json
          status?: string
          title?: string
          updated_at?: string
          version?: number
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_revisions: {
        Row: {
          content: string | null
          created_at: string
          excerpt: string | null
          id: string
          note: string | null
          post_id: string
          title: string | null
          version: number
        }
        Insert: {
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          note?: string | null
          post_id: string
          title?: string | null
          version?: number
        }
        Update: {
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          note?: string | null
          post_id?: string
          title?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_revisions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      blog_topic_ideas: {
        Row: {
          category_slug: string | null
          content_type: string | null
          created_at: string
          id: string
          keyword: string | null
          slug_hint: string
          status: string
          topic: string
          used_at: string | null
        }
        Insert: {
          category_slug?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          keyword?: string | null
          slug_hint: string
          status?: string
          topic: string
          used_at?: string | null
        }
        Update: {
          category_slug?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          keyword?: string | null
          slug_hint?: string
          status?: string
          topic?: string
          used_at?: string | null
        }
        Relationships: []
      }
      favorite_meals: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string
          description: string | null
          fat_g: number | null
          id: string
          ingredients: Json | null
          meal_type: string | null
          name: string
          protein_g: number | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          description?: string | null
          fat_g?: number | null
          id?: string
          ingredients?: Json | null
          meal_type?: string | null
          name: string
          protein_g?: number | null
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          description?: string | null
          fat_g?: number | null
          id?: string
          ingredients?: Json | null
          meal_type?: string | null
          name?: string
          protein_g?: number | null
          user_id?: string
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          carbs_g: number | null
          country: string | null
          created_at: string
          daily_calories: number | null
          days: Json
          fat_g: number | null
          goal: string | null
          grocery: Json | null
          id: string
          is_active: boolean
          protein_g: number | null
          tips: Json | null
          title: string | null
          updated_at: string
          user_id: string
          water_l: number | null
        }
        Insert: {
          carbs_g?: number | null
          country?: string | null
          created_at?: string
          daily_calories?: number | null
          days: Json
          fat_g?: number | null
          goal?: string | null
          grocery?: Json | null
          id?: string
          is_active?: boolean
          protein_g?: number | null
          tips?: Json | null
          title?: string | null
          updated_at?: string
          user_id: string
          water_l?: number | null
        }
        Update: {
          carbs_g?: number | null
          country?: string | null
          created_at?: string
          daily_calories?: number | null
          days?: Json
          fat_g?: number | null
          goal?: string | null
          grocery?: Json | null
          id?: string
          is_active?: boolean
          protein_g?: number | null
          tips?: Json | null
          title?: string | null
          updated_at?: string
          user_id?: string
          water_l?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          alcohol: string | null
          allergies: string | null
          avatar_url: string | null
          budget: string | null
          cooking_skill: string | null
          cooking_time_min: number | null
          country: string | null
          created_at: string
          daily_calorie_goal: number
          daily_step_goal: number
          diet_preference: string | null
          exercise_frequency: string | null
          foods_disliked: string | null
          foods_liked: string | null
          full_name: string | null
          gender: string | null
          health_goal: string | null
          height_cm: number | null
          hip_cm: number | null
          id: string
          language: string | null
          last_checkin_at: string | null
          medical_conditions: string | null
          metabolism_answers: Json | null
          metabolism_profile: string | null
          neck_cm: number | null
          occupation: string | null
          onboarding_completed: boolean
          region: string | null
          sleep_hours: number | null
          smoking: string | null
          target_weight_kg: number | null
          updated_at: string
          waist_cm: number | null
          water_goal_l: number | null
          water_intake_l: number | null
          weight_kg: number | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          alcohol?: string | null
          allergies?: string | null
          avatar_url?: string | null
          budget?: string | null
          cooking_skill?: string | null
          cooking_time_min?: number | null
          country?: string | null
          created_at?: string
          daily_calorie_goal?: number
          daily_step_goal?: number
          diet_preference?: string | null
          exercise_frequency?: string | null
          foods_disliked?: string | null
          foods_liked?: string | null
          full_name?: string | null
          gender?: string | null
          health_goal?: string | null
          height_cm?: number | null
          hip_cm?: number | null
          id: string
          language?: string | null
          last_checkin_at?: string | null
          medical_conditions?: string | null
          metabolism_answers?: Json | null
          metabolism_profile?: string | null
          neck_cm?: number | null
          occupation?: string | null
          onboarding_completed?: boolean
          region?: string | null
          sleep_hours?: number | null
          smoking?: string | null
          target_weight_kg?: number | null
          updated_at?: string
          waist_cm?: number | null
          water_goal_l?: number | null
          water_intake_l?: number | null
          weight_kg?: number | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          alcohol?: string | null
          allergies?: string | null
          avatar_url?: string | null
          budget?: string | null
          cooking_skill?: string | null
          cooking_time_min?: number | null
          country?: string | null
          created_at?: string
          daily_calorie_goal?: number
          daily_step_goal?: number
          diet_preference?: string | null
          exercise_frequency?: string | null
          foods_disliked?: string | null
          foods_liked?: string | null
          full_name?: string | null
          gender?: string | null
          health_goal?: string | null
          height_cm?: number | null
          hip_cm?: number | null
          id?: string
          language?: string | null
          last_checkin_at?: string | null
          medical_conditions?: string | null
          metabolism_answers?: Json | null
          metabolism_profile?: string | null
          neck_cm?: number | null
          occupation?: string | null
          onboarding_completed?: boolean
          region?: string | null
          sleep_hours?: number | null
          smoking?: string | null
          target_weight_kg?: number | null
          updated_at?: string
          waist_cm?: number | null
          water_goal_l?: number | null
          water_intake_l?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weight_checkins: {
        Row: {
          created_at: string
          energy_level: number | null
          exercise_frequency: string | null
          hip_cm: number | null
          id: string
          mood: string | null
          neck_cm: number | null
          notes: string | null
          photo_url: string | null
          sleep_hours: number | null
          user_id: string
          waist_cm: number | null
          water_intake_l: number | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          energy_level?: number | null
          exercise_frequency?: string | null
          hip_cm?: number | null
          id?: string
          mood?: string | null
          neck_cm?: number | null
          notes?: string | null
          photo_url?: string | null
          sleep_hours?: number | null
          user_id: string
          waist_cm?: number | null
          water_intake_l?: number | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          energy_level?: number | null
          exercise_frequency?: string | null
          hip_cm?: number | null
          id?: string
          mood?: string | null
          neck_cm?: number | null
          notes?: string | null
          photo_url?: string | null
          sleep_hours?: number | null
          user_id?: string
          waist_cm?: number | null
          water_intake_l?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_blog_view: {
        Args: { _referrer_host?: string; _slug: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "user"
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
    Enums: {
      app_role: ["admin", "editor", "user"],
    },
  },
} as const
