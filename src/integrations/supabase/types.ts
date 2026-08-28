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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          created_at: string
          id: string
          message: string | null
          segment_id: string
          status: Database["public"]["Enums"]["segment_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          segment_id: string
          status: Database["public"]["Enums"]["segment_status"]
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          segment_id?: string
          status?: Database["public"]["Enums"]["segment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "alerts_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          after_value: Json | null
          before_value: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          origin: string | null
          reason: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          origin?: string | null
          reason?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          origin?: string | null
          reason?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cv_results: {
        Row: {
          alert_id: string | null
          box: Json | null
          caption: string | null
          captured_at: string | null
          confidence: number
          created_at: string
          id: number
          image_ref: string | null
          km: string
          km_end: number | null
          km_start: number | null
          km_value: number | null
          label: string
          lat: number | null
          lng: number | null
          model: string | null
          model_version: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          rodovia: string | null
          segment_id: string | null
          source: string | null
          status: Database["public"]["Enums"]["segment_status"]
          threshold: number | null
          work_order_id: string | null
        }
        Insert: {
          alert_id?: string | null
          box?: Json | null
          caption?: string | null
          captured_at?: string | null
          confidence: number
          created_at?: string
          id: number
          image_ref?: string | null
          km: string
          km_end?: number | null
          km_start?: number | null
          km_value?: number | null
          label: string
          lat?: number | null
          lng?: number | null
          model?: string | null
          model_version?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          rodovia?: string | null
          segment_id?: string | null
          source?: string | null
          status: Database["public"]["Enums"]["segment_status"]
          threshold?: number | null
          work_order_id?: string | null
        }
        Update: {
          alert_id?: string | null
          box?: Json | null
          caption?: string | null
          captured_at?: string | null
          confidence?: number
          created_at?: string
          id?: number
          image_ref?: string | null
          km?: string
          km_end?: number | null
          km_start?: number | null
          km_value?: number | null
          label?: string
          lat?: number | null
          lng?: number | null
          model?: string | null
          model_version?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          rodovia?: string | null
          segment_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["segment_status"]
          threshold?: number | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cv_results_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_results_rodovia_fkey"
            columns: ["rodovia"]
            isOneToOne: false
            referencedRelation: "highways"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "cv_results_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_results_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      field_teams: {
        Row: {
          base_km: number
          capacidade_dia: number
          created_at: string
          eficiencia: number
          funcionarios: number
          id: string
          nome: string
          regiao: string
          status: Database["public"]["Enums"]["team_status"]
          tempo_resposta_min: number
          updated_at: string
        }
        Insert: {
          base_km: number
          capacidade_dia?: number
          created_at?: string
          eficiencia?: number
          funcionarios?: number
          id?: string
          nome: string
          regiao?: string
          status?: Database["public"]["Enums"]["team_status"]
          tempo_resposta_min?: number
          updated_at?: string
        }
        Update: {
          base_km?: number
          capacidade_dia?: number
          created_at?: string
          eficiencia?: number
          funcionarios?: number
          id?: string
          nome?: string
          regiao?: string
          status?: Database["public"]["Enums"]["team_status"]
          tempo_resposta_min?: number
          updated_at?: string
        }
        Relationships: []
      }
      highways: {
        Row: {
          code: string
          concessao: string
          cor: string
          created_at: string
          end_lat: number
          end_lng: number
          km_fim: number
          km_inicio: number
          nome: string
          start_lat: number
          start_lng: number
          uf_fim: string
          uf_inicio: string
          updated_at: string
        }
        Insert: {
          code: string
          concessao: string
          cor?: string
          created_at?: string
          end_lat: number
          end_lng: number
          km_fim: number
          km_inicio: number
          nome: string
          start_lat: number
          start_lng: number
          uf_fim: string
          uf_inicio: string
          updated_at?: string
        }
        Update: {
          code?: string
          concessao?: string
          cor?: string
          created_at?: string
          end_lat?: number
          end_lng?: number
          km_fim?: number
          km_inicio?: number
          nome?: string
          start_lat?: number
          start_lng?: number
          uf_fim?: string
          uf_inicio?: string
          updated_at?: string
        }
        Relationships: []
      }
      inspection_measurements: {
        Row: {
          created_at: string
          id: number
          item_codigo: string
          item_descricao: string
          km_offset: number
          na: boolean
          nivel: number | null
          report_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          item_codigo: string
          item_descricao: string
          km_offset: number
          na?: boolean
          nivel?: number | null
          report_id: number
        }
        Update: {
          created_at?: string
          id?: number
          item_codigo?: string
          item_descricao?: string
          km_offset?: number
          na?: boolean
          nivel?: number | null
          report_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "inspection_measurements_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "inspection_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_reports: {
        Row: {
          created_at: string
          data_levantamento: string
          id: number
          km_end: number
          km_start: number
          report_code: string
          rodovia: string
          unidade: string
          versao: string | null
        }
        Insert: {
          created_at?: string
          data_levantamento: string
          id?: number
          km_end?: number
          km_start?: number
          report_code: string
          rodovia?: string
          unidade?: string
          versao?: string | null
        }
        Update: {
          created_at?: string
          data_levantamento?: string
          id?: number
          km_end?: number
          km_start?: number
          report_code?: string
          rodovia?: string
          unidade?: string
          versao?: string | null
        }
        Relationships: []
      }
      km_markers: {
        Row: {
          created_at: string
          id: number
          km_value: number
          lat: number
          lng: number
          rodovia: string
        }
        Insert: {
          created_at?: string
          id?: number
          km_value: number
          lat: number
          lng: number
          rodovia?: string
        }
        Update: {
          created_at?: string
          id?: number
          km_value?: number
          lat?: number
          lng?: number
          rodovia?: string
        }
        Relationships: [
          {
            foreignKeyName: "km_markers_rodovia_fkey"
            columns: ["rodovia"]
            isOneToOne: false
            referencedRelation: "highways"
            referencedColumns: ["code"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      road_route_cache: {
        Row: {
          code: string
          created_at: string
          id: string
          line: Json
          source: string
          updated_at: string
          waypoints_hash: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          line: Json
          source: string
          updated_at?: string
          waypoints_hash: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          line?: Json
          source?: string
          updated_at?: string
          waypoints_hash?: string
        }
        Relationships: []
      }
      rocada_classification: {
        Row: {
          area_m2: number | null
          centroid_lat: number
          centroid_lng: number
          classe: string
          created_at: string
          id: number
          km_approx: number | null
          polygon_coords: Json
        }
        Insert: {
          area_m2?: number | null
          centroid_lat: number
          centroid_lng: number
          classe: string
          created_at?: string
          id?: number
          km_approx?: number | null
          polygon_coords: Json
        }
        Update: {
          area_m2?: number | null
          centroid_lat?: number
          centroid_lng?: number
          classe?: string
          created_at?: string
          id?: number
          km_approx?: number | null
          polygon_coords?: Json
        }
        Relationships: []
      }
      rocada_events: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          id: string
          observacao: string | null
          responsavel: string | null
          segment_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          observacao?: string | null
          responsavel?: string | null
          segment_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          observacao?: string | null
          responsavel?: string | null
          segment_id?: string
        }
        Relationships: []
      }
      segment_ndvi_history: {
        Row: {
          altura_cm: number
          created_at: string
          data: string
          id: number
          ndvi: number
          segment_id: string
        }
        Insert: {
          altura_cm: number
          created_at?: string
          data: string
          id?: number
          ndvi: number
          segment_id: string
        }
        Update: {
          altura_cm?: number
          created_at?: string
          data?: string
          id?: number
          ndvi?: number
          segment_id?: string
        }
        Relationships: []
      }
      segment_observations: {
        Row: {
          autor: string | null
          created_at: string
          created_by: string | null
          id: string
          segment_id: string
          texto: string
        }
        Insert: {
          autor?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          segment_id: string
          texto: string
        }
        Update: {
          autor?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          segment_id?: string
          texto?: string
        }
        Relationships: []
      }
      segment_team_assignment: {
        Row: {
          created_at: string
          segment_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          segment_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          segment_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "segment_team_assignment_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "field_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      segments: {
        Row: {
          altura: number
          clause_full: string
          clausula: string
          created_at: string
          deadline: string | null
          deadline_urgent: boolean | null
          detection: Json | null
          id: string
          insight: string | null
          km: string
          km_end: number
          km_start: number
          limite: number
          ndvi: number
          notification_id: string | null
          rodovia: string | null
          status: Database["public"]["Enums"]["segment_status"]
          street: Json | null
          tipo: string
          ultima_rocada: string
          updated_at: string
        }
        Insert: {
          altura: number
          clause_full: string
          clausula: string
          created_at?: string
          deadline?: string | null
          deadline_urgent?: boolean | null
          detection?: Json | null
          id: string
          insight?: string | null
          km: string
          km_end: number
          km_start: number
          limite?: number
          ndvi: number
          notification_id?: string | null
          rodovia?: string | null
          status: Database["public"]["Enums"]["segment_status"]
          street?: Json | null
          tipo: string
          ultima_rocada: string
          updated_at?: string
        }
        Update: {
          altura?: number
          clause_full?: string
          clausula?: string
          created_at?: string
          deadline?: string | null
          deadline_urgent?: boolean | null
          detection?: Json | null
          id?: string
          insight?: string | null
          km?: string
          km_end?: number
          km_start?: number
          limite?: number
          ndvi?: number
          notification_id?: string | null
          rodovia?: string | null
          status?: Database["public"]["Enums"]["segment_status"]
          street?: Json | null
          tipo?: string
          ultima_rocada?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "segments_rodovia_fkey"
            columns: ["rodovia"]
            isOneToOne: false
            referencedRelation: "highways"
            referencedColumns: ["code"]
          },
        ]
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
      user_settings: {
        Row: {
          altura_atencao_cm: number
          altura_critica_cm: number
          created_at: string
          density: string
          id: string
          irc_weight_altura: number
          irc_weight_chuva: number
          irc_weight_idade: number
          irc_weight_ndvi: number
          notify_atencao: boolean
          notify_critico: boolean
          notify_email: boolean
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          altura_atencao_cm?: number
          altura_critica_cm?: number
          created_at?: string
          density?: string
          id?: string
          irc_weight_altura?: number
          irc_weight_chuva?: number
          irc_weight_idade?: number
          irc_weight_ndvi?: number
          notify_atencao?: boolean
          notify_critico?: boolean
          notify_email?: boolean
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          altura_atencao_cm?: number
          altura_critica_cm?: number
          created_at?: string
          density?: string
          id?: string
          irc_weight_altura?: number
          irc_weight_chuva?: number
          irc_weight_idade?: number
          irc_weight_ndvi?: number
          notify_atencao?: boolean
          notify_critico?: boolean
          notify_email?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          code: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["work_order_priority"]
          scheduled_for: string | null
          segment_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["work_order_status"]
          team_id: string | null
          tipo_servico: string
          updated_at: string
        }
        Insert: {
          code: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["work_order_priority"]
          scheduled_for?: string | null
          segment_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          team_id?: string | null
          tipo_servico?: string
          updated_at?: string
        }
        Update: {
          code?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["work_order_priority"]
          scheduled_for?: string | null
          segment_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          team_id?: string | null
          tipo_servico?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "field_teams"
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
      app_role: "admin" | "operator" | "viewer"
      segment_status: "critico" | "atencao" | "conforme"
      team_status: "disponivel" | "campo" | "manutencao" | "afastada"
      work_order_priority: "baixa" | "media" | "alta" | "critica"
      work_order_status: "pendente" | "em_andamento" | "concluida" | "cancelada"
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
      app_role: ["admin", "operator", "viewer"],
      segment_status: ["critico", "atencao", "conforme"],
      team_status: ["disponivel", "campo", "manutencao", "afastada"],
      work_order_priority: ["baixa", "media", "alta", "critica"],
      work_order_status: ["pendente", "em_andamento", "concluida", "cancelada"],
    },
  },
} as const
