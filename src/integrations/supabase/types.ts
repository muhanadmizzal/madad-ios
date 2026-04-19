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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activation_requests: {
        Row: {
          billing_cycle: string
          company_id: string
          created_at: string
          currency: string
          discount: number
          feature_keys: string[]
          id: string
          module_keys: string[]
          package_id: string | null
          payment_method_key: string | null
          payment_proof: string | null
          payment_reference: string | null
          request_type: string
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          company_id: string
          created_at?: string
          currency?: string
          discount?: number
          feature_keys?: string[]
          id?: string
          module_keys?: string[]
          package_id?: string | null
          payment_method_key?: string | null
          payment_proof?: string | null
          payment_reference?: string | null
          request_type?: string
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          company_id?: string
          created_at?: string
          currency?: string
          discount?: number
          feature_keys?: string[]
          id?: string
          module_keys?: string[]
          package_id?: string | null
          payment_method_key?: string | null
          payment_proof?: string | null
          payment_reference?: string | null
          request_type?: string
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activation_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activation_requests_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "madad_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      addon_catalog: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          name_ar: string | null
          pricing_type: string
          sort_order: number
          unit_label: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          name_ar?: string | null
          pricing_type?: string
          sort_order?: number
          unit_label?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          name_ar?: string | null
          pricing_type?: string
          sort_order?: number
          unit_label?: string | null
          unit_price?: number
        }
        Relationships: []
      }
      addon_requests: {
        Row: {
          addon_key: string
          billing_cycle: string | null
          company_id: string
          created_at: string
          id: string
          notes: string | null
          requested_by: string
          requested_price: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          addon_key: string
          billing_cycle?: string | null
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          requested_by: string
          requested_price?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          addon_key?: string
          billing_cycle?: string | null
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          requested_by?: string
          requested_price?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_clients: {
        Row: {
          client_name: string
          company_id: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          industry: string | null
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_name: string
          company_id: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_name?: string
          company_id?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_audit_trail: {
        Row: {
          action_taken: string | null
          company_id: string
          created_at: string
          feature: string
          id: string
          model: string | null
          module: string
          output_summary: string | null
          prompt_summary: string | null
          record_id: string | null
          structured_output: Json | null
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          company_id: string
          created_at?: string
          feature: string
          id?: string
          model?: string | null
          module: string
          output_summary?: string | null
          prompt_summary?: string | null
          record_id?: string | null
          structured_output?: Json | null
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          action_taken?: string | null
          company_id?: string
          created_at?: string
          feature?: string
          id?: string
          model?: string | null
          module?: string
          output_summary?: string | null
          prompt_summary?: string | null
          record_id?: string | null
          structured_output?: Json | null
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_audit_trail_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_package_features: {
        Row: {
          feature_key: string
          id: string
          included: boolean
          package_id: string
        }
        Insert: {
          feature_key: string
          id?: string
          included?: boolean
          package_id: string
        }
        Update: {
          feature_key?: string
          id?: string
          included?: boolean
          package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_package_features_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "ai_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_packages: {
        Row: {
          category: string
          created_at: string
          currency: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          monthly_price: number
          monthly_request_limit: number
          monthly_token_limit: number
          name: string
          name_ar: string | null
          slug: string
          sort_order: number
          updated_at: string
          yearly_price: number
        }
        Insert: {
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          monthly_price?: number
          monthly_request_limit?: number
          monthly_token_limit?: number
          name: string
          name_ar?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
          yearly_price?: number
        }
        Update: {
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          monthly_price?: number
          monthly_request_limit?: number
          monthly_token_limit?: number
          name?: string
          name_ar?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
          yearly_price?: number
        }
        Relationships: []
      }
      ai_service_logs: {
        Row: {
          company_id: string
          cost: number
          created_at: string
          feature: string
          id: string
          model: string
          tokens_used: number
          user_id: string | null
        }
        Insert: {
          company_id: string
          cost?: number
          created_at?: string
          feature: string
          id?: string
          model: string
          tokens_used?: number
          user_id?: string | null
        }
        Update: {
          company_id?: string
          cost?: number
          created_at?: string
          feature?: string
          id?: string
          model?: string
          tokens_used?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_service_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          company_id: string
          content: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          priority: string | null
          published_by: string | null
          target_department_id: string | null
          title: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string | null
          published_by?: string | null
          target_department_id?: string | null
          title: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string | null
          published_by?: string | null
          target_department_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_target_department_id_fkey"
            columns: ["target_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      api_access_logs: {
        Row: {
          api_key_id: string | null
          company_id: string
          created_at: string
          endpoint: string
          id: string
          ip_address: string | null
          method: string
          status_code: number
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          company_id: string
          created_at?: string
          endpoint: string
          id?: string
          ip_address?: string | null
          method?: string
          status_code?: number
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          company_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string | null
          method?: string
          status_code?: number
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_access_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_access_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          local_node_id: string | null
          name: string
          scopes: string[]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          local_node_id?: string | null
          name?: string
          scopes?: string[]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          local_node_id?: string | null
          name?: string
          scopes?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_local_node_id_fkey"
            columns: ["local_node_id"]
            isOneToOne: false
            referencedRelation: "madad_local_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      api_settings: {
        Row: {
          allowed_origins: string[] | null
          api_enabled: boolean
          company_id: string
          created_at: string
          id: string
          rate_limit_per_minute: number
          updated_at: string
        }
        Insert: {
          allowed_origins?: string[] | null
          api_enabled?: boolean
          company_id: string
          created_at?: string
          id?: string
          rate_limit_per_minute?: number
          updated_at?: string
        }
        Update: {
          allowed_origins?: string[] | null
          api_enabled?: boolean
          company_id?: string
          created_at?: string
          id?: string
          rate_limit_per_minute?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      appraisals: {
        Row: {
          appraisal_type: string | null
          comments: string | null
          company_id: string
          created_at: string
          cycle: string
          employee_id: string
          id: string
          improvements: string | null
          overall_rating: number | null
          reviewer_id: string | null
          status: string
          strengths: string | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          appraisal_type?: string | null
          comments?: string | null
          company_id: string
          created_at?: string
          cycle: string
          employee_id: string
          id?: string
          improvements?: string | null
          overall_rating?: number | null
          reviewer_id?: string | null
          status?: string
          strengths?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          appraisal_type?: string | null
          comments?: string | null
          company_id?: string
          created_at?: string
          cycle?: string
          employee_id?: string
          id?: string
          improvements?: string | null
          overall_rating?: number | null
          reviewer_id?: string | null
          status?: string
          strengths?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appraisals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appraisals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_actions: {
        Row: {
          action: string
          actor_user_id: string
          comments: string | null
          company_id: string
          created_at: string
          from_status: string
          id: string
          instance_id: string
          signature_data: string | null
          step_order: number | null
          to_status: string
        }
        Insert: {
          action: string
          actor_user_id: string
          comments?: string | null
          company_id: string
          created_at?: string
          from_status: string
          id?: string
          instance_id: string
          signature_data?: string | null
          step_order?: number | null
          to_status: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          comments?: string | null
          company_id?: string
          created_at?: string
          from_status?: string
          id?: string
          instance_id?: string
          signature_data?: string | null
          step_order?: number | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_actions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_actions_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          approved_by: string | null
          comments: string | null
          company_id: string
          created_at: string
          id: string
          record_id: string | null
          rejected_by: string | null
          request_type: string
          requester_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          comments?: string | null
          company_id: string
          created_at?: string
          id?: string
          record_id?: string | null
          rejected_by?: string | null
          request_type: string
          requester_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          comments?: string | null
          company_id?: string
          created_at?: string
          id?: string
          record_id?: string | null
          rejected_by?: string | null
          request_type?: string
          requester_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_corrections: {
        Row: {
          company_id: string
          created_at: string
          date: string
          employee_id: string
          id: string
          reason: string
          requested_check_in: string | null
          requested_check_out: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          date: string
          employee_id: string
          id?: string
          reason: string
          requested_check_in?: string | null
          requested_check_out?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          reason?: string
          requested_check_in?: string | null
          requested_check_out?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_corrections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          check_in: string | null
          check_out: string | null
          company_id: string
          created_at: string
          date: string
          employee_id: string
          hours_worked: number | null
          id: string
          location: string | null
          notes: string | null
          overtime_hours: number | null
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          company_id: string
          created_at?: string
          date: string
          employee_id: string
          hours_worked?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          overtime_hours?: number | null
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          company_id?: string
          created_at?: string
          date?: string
          employee_id?: string
          hours_worked?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          overtime_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_violations: {
        Row: {
          company_id: string
          created_at: string
          date: string
          employee_id: string
          id: string
          minutes_diff: number | null
          notes: string | null
          status: string
          violation_type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          date: string
          employee_id: string
          id?: string
          minutes_diff?: number | null
          notes?: string | null
          status?: string
          violation_type?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          minutes_diff?: number | null
          notes?: string | null
          status?: string
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_violations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_violations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      background_checks: {
        Row: {
          candidate_id: string
          check_type: string
          company_id: string
          created_at: string
          delivery_method: string | null
          document_path: string | null
          id: string
          notes: string | null
          result: string | null
          status: string
          upload_token: string | null
          upload_token_expires_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          candidate_id: string
          check_type?: string
          company_id: string
          created_at?: string
          delivery_method?: string | null
          document_path?: string | null
          id?: string
          notes?: string | null
          result?: string | null
          status?: string
          upload_token?: string | null
          upload_token_expires_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          candidate_id?: string
          check_type?: string
          company_id?: string
          created_at?: string
          delivery_method?: string | null
          document_path?: string | null
          id?: string
          notes?: string | null
          result?: string | null
          status?: string
          upload_token?: string | null
          upload_token_expires_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "background_checks_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "background_checks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_invoices: {
        Row: {
          amount: number
          billing_period: string | null
          company_id: string
          created_at: string
          currency: string
          due_date: string
          id: string
          invoice_number: string
          issued_date: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_proof: string | null
          payment_reference: string | null
          payment_status: string | null
          period_end: string | null
          period_start: string | null
          status: string
          subscription_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount?: number
          billing_period?: string | null
          company_id: string
          created_at?: string
          currency?: string
          due_date: string
          id?: string
          invoice_number: string
          issued_date?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_proof?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          subscription_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          billing_period?: string | null
          company_id?: string
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          invoice_number?: string
          issued_date?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_proof?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          subscription_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          company_id: string
          created_at: string
          id: string
          is_headquarters: boolean | null
          manager_name: string | null
          manager_position_id: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_headquarters?: boolean | null
          manager_name?: string | null
          manager_position_id?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_headquarters?: boolean | null
          manager_name?: string | null
          manager_position_id?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_manager_position_id_fkey"
            columns: ["manager_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      business_audit_logs: {
        Row: {
          action: string
          actor_user_id: string
          after_state: Json | null
          before_state: Json | null
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type: string
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      business_support_notes: {
        Row: {
          author_user_id: string
          company_id: string
          created_at: string
          id: string
          is_internal: boolean
          note_text: string
          note_type: string
        }
        Insert: {
          author_user_id: string
          company_id: string
          created_at?: string
          id?: string
          is_internal?: boolean
          note_text: string
          note_type?: string
        }
        Update: {
          author_user_id?: string
          company_id?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          note_text?: string
          note_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_support_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_stage_history: {
        Row: {
          candidate_id: string
          changed_by: string | null
          created_at: string
          from_stage: string | null
          id: string
          notes: string | null
          to_stage: string
        }
        Insert: {
          candidate_id: string
          changed_by?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          to_stage: string
        }
        Update: {
          candidate_id?: string
          changed_by?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_stage_history_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          ai_skill_summary: string | null
          ai_summary_generated_at: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          job_id: string
          name: string
          notes: string | null
          phone: string | null
          rating: number | null
          resume_path: string | null
          skill_category: string | null
          source: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          ai_skill_summary?: string | null
          ai_summary_generated_at?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          job_id: string
          name: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          resume_path?: string | null
          skill_category?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          ai_skill_summary?: string | null
          ai_summary_generated_at?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          job_id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          resume_path?: string | null
          skill_category?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      career_history: {
        Row: {
          company_id: string
          created_at: string
          effective_date: string
          employee_id: string
          event_type: string
          from_department: string | null
          from_grade: string | null
          from_position: string | null
          from_salary: number | null
          id: string
          notes: string | null
          to_department: string | null
          to_grade: string | null
          to_position: string | null
          to_salary: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          effective_date?: string
          employee_id: string
          event_type?: string
          from_department?: string | null
          from_grade?: string | null
          from_position?: string | null
          from_salary?: number | null
          id?: string
          notes?: string | null
          to_department?: string | null
          to_grade?: string | null
          to_position?: string | null
          to_salary?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          effective_date?: string
          employee_id?: string
          event_type?: string
          from_department?: string | null
          from_grade?: string | null
          from_position?: string | null
          from_salary?: number | null
          id?: string
          notes?: string | null
          to_department?: string | null
          to_grade?: string | null
          to_position?: string | null
          to_salary?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "career_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          accent_color: string | null
          address: string | null
          created_at: string
          default_currency: string
          email: string | null
          employee_count_range: string | null
          footer_template: string | null
          grace_minutes: number | null
          header_template: string | null
          id: string
          logo_url: string | null
          name: string
          name_ar: string | null
          overtime_multiplier: number | null
          phone: string | null
          primary_color: string | null
          registration_number: string | null
          secondary_color: string | null
          sector: string | null
          sidebar_color: string | null
          signatory_name: string | null
          signatory_title: string | null
          stamp_url: string | null
          status: string
          tax_number: string | null
          updated_at: string
          website: string | null
          working_hours_end: string | null
          working_hours_start: string | null
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          created_at?: string
          default_currency?: string
          email?: string | null
          employee_count_range?: string | null
          footer_template?: string | null
          grace_minutes?: number | null
          header_template?: string | null
          id?: string
          logo_url?: string | null
          name: string
          name_ar?: string | null
          overtime_multiplier?: number | null
          phone?: string | null
          primary_color?: string | null
          registration_number?: string | null
          secondary_color?: string | null
          sector?: string | null
          sidebar_color?: string | null
          signatory_name?: string | null
          signatory_title?: string | null
          stamp_url?: string | null
          status?: string
          tax_number?: string | null
          updated_at?: string
          website?: string | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          created_at?: string
          default_currency?: string
          email?: string | null
          employee_count_range?: string | null
          footer_template?: string | null
          grace_minutes?: number | null
          header_template?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          name_ar?: string | null
          overtime_multiplier?: number | null
          phone?: string | null
          primary_color?: string | null
          registration_number?: string | null
          secondary_color?: string | null
          sector?: string | null
          sidebar_color?: string | null
          signatory_name?: string | null
          signatory_title?: string | null
          stamp_url?: string | null
          status?: string
          tax_number?: string | null
          updated_at?: string
          website?: string | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Relationships: []
      }
      company_signatories: {
        Row: {
          allowed_document_types: string[] | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_ar: string | null
          role: string
          role_ar: string | null
          signature_url: string | null
          sort_order: number | null
          stamp_url: string | null
          updated_at: string
        }
        Insert: {
          allowed_document_types?: string[] | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_ar?: string | null
          role: string
          role_ar?: string | null
          signature_url?: string | null
          sort_order?: number | null
          stamp_url?: string | null
          updated_at?: string
        }
        Update: {
          allowed_document_types?: string[] | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string | null
          role?: string
          role_ar?: string | null
          signature_url?: string | null
          sort_order?: number | null
          stamp_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_signatories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          company_id: string
          contract_type: string
          created_at: string
          employee_id: string
          end_date: string | null
          file_path: string | null
          id: string
          notes: string | null
          probation_end_date: string | null
          salary: number | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          contract_type?: string
          created_at?: string
          employee_id: string
          end_date?: string | null
          file_path?: string | null
          id?: string
          notes?: string | null
          probation_end_date?: string | null
          salary?: number | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          contract_type?: string
          created_at?: string
          employee_id?: string
          end_date?: string | null
          file_path?: string | null
          id?: string
          notes?: string | null
          probation_end_date?: string | null
          salary?: number | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_values: {
        Row: {
          created_at: string
          custom_field_id: string
          id: string
          record_id: string
          value: string | null
        }
        Insert: {
          created_at?: string
          custom_field_id: string
          id?: string
          record_id: string
          value?: string | null
        }
        Update: {
          created_at?: string
          custom_field_id?: string
          id?: string
          record_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_custom_field_id_fkey"
            columns: ["custom_field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          company_id: string
          created_at: string
          entity_type: string
          field_label: string
          field_name: string
          field_type: string
          id: string
          is_required: boolean | null
          options: Json | null
          sort_order: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          entity_type?: string
          field_label: string
          field_name: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          sort_order?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          entity_type?: string
          field_label?: string
          field_name?: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          description: string | null
          diagram_x: number | null
          diagram_y: number | null
          id: string
          level: string
          manager_name: string | null
          manager_position_id: string | null
          name: string
          parent_department_id: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          diagram_x?: number | null
          diagram_y?: number | null
          id?: string
          level?: string
          manager_name?: string | null
          manager_position_id?: string | null
          name: string
          parent_department_id?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          diagram_x?: number | null
          diagram_y?: number | null
          id?: string
          level?: string
          manager_name?: string | null
          manager_position_id?: string | null
          name?: string
          parent_department_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_manager_position_id_fkey"
            columns: ["manager_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_parent_department_id_fkey"
            columns: ["parent_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_signatures: {
        Row: {
          company_id: string
          created_at: string
          document_hash: string | null
          document_id: string | null
          document_type: string
          id: string
          ip_address: string | null
          signature_data: string
          signature_type: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          document_hash?: string | null
          document_id?: string | null
          document_type?: string
          id?: string
          ip_address?: string | null
          signature_data: string
          signature_type?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          document_hash?: string | null
          document_id?: string | null
          document_type?: string
          id?: string
          ip_address?: string | null
          signature_data?: string
          signature_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_signatures_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_access_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          document_id: string
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          action?: string
          company_id: string
          created_at?: string
          document_id: string
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          document_id?: string
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_access_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "generated_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          company_id: string
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          merge_fields: string[] | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          merge_fields?: string[] | null
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          merge_fields?: string[] | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          employee_id: string | null
          expires_at: string | null
          expiry_notified: boolean | null
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          name: string
          rejected_at: string | null
          returned_at: string | null
          status: string
          uploaded_by: string | null
          workflow_instance_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          employee_id?: string | null
          expires_at?: string | null
          expiry_notified?: boolean | null
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          name: string
          rejected_at?: string | null
          returned_at?: string | null
          status?: string
          uploaded_by?: string | null
          workflow_instance_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string | null
          expires_at?: string | null
          expiry_notified?: boolean | null
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          name?: string
          rejected_at?: string | null
          returned_at?: string | null
          status?: string
          uploaded_by?: string | null
          workflow_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_assets: {
        Row: {
          asset_name: string
          asset_type: string
          assigned_date: string | null
          company_id: string
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          return_date: string | null
          serial_number: string | null
          status: string
        }
        Insert: {
          asset_name: string
          asset_type: string
          assigned_date?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          return_date?: string | null
          serial_number?: string | null
          status?: string
        }
        Update: {
          asset_name?: string
          asset_type?: string
          assigned_date?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          return_date?: string | null
          serial_number?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_assets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_dependents: {
        Row: {
          created_at: string
          date_of_birth: string | null
          employee_id: string
          id: string
          name: string
          national_id: string | null
          relationship: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          employee_id: string
          id?: string
          name: string
          national_id?: string | null
          relationship: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          employee_id?: string
          id?: string
          name?: string
          national_id?: string | null
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_dependents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_emergency_contacts: {
        Row: {
          alt_phone: string | null
          created_at: string
          employee_id: string
          id: string
          name: string
          phone: string
          relationship: string | null
        }
        Insert: {
          alt_phone?: string | null
          created_at?: string
          employee_id: string
          id?: string
          name: string
          phone: string
          relationship?: string | null
        }
        Update: {
          alt_phone?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          name?: string
          phone?: string
          relationship?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_emergency_contacts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_notes: {
        Row: {
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          note: string
          note_type: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          note: string
          note_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          note?: string
          note_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_notes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_penalties: {
        Row: {
          affects_payroll: boolean | null
          auto_generate_document: boolean | null
          category: string | null
          company_id: string
          created_at: string
          deduction_amount: number | null
          deduction_days: number | null
          deduction_percentage: number | null
          description: string | null
          employee_id: string
          generated_document_id: string | null
          id: string
          issued_by: string | null
          issued_date: string
          penalty_type: string
          status: string
          subject: string
          updated_at: string
          warning_id: string | null
        }
        Insert: {
          affects_payroll?: boolean | null
          auto_generate_document?: boolean | null
          category?: string | null
          company_id: string
          created_at?: string
          deduction_amount?: number | null
          deduction_days?: number | null
          deduction_percentage?: number | null
          description?: string | null
          employee_id: string
          generated_document_id?: string | null
          id?: string
          issued_by?: string | null
          issued_date?: string
          penalty_type?: string
          status?: string
          subject: string
          updated_at?: string
          warning_id?: string | null
        }
        Update: {
          affects_payroll?: boolean | null
          auto_generate_document?: boolean | null
          category?: string | null
          company_id?: string
          created_at?: string
          deduction_amount?: number | null
          deduction_days?: number | null
          deduction_percentage?: number | null
          description?: string | null
          employee_id?: string
          generated_document_id?: string | null
          id?: string
          issued_by?: string | null
          issued_date?: string
          penalty_type?: string
          status?: string
          subject?: string
          updated_at?: string
          warning_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_penalties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_penalties_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_penalties_generated_document_id_fkey"
            columns: ["generated_document_id"]
            isOneToOne: false
            referencedRelation: "generated_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_penalties_warning_id_fkey"
            columns: ["warning_id"]
            isOneToOne: false
            referencedRelation: "employee_warnings"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_praise: {
        Row: {
          affects_payroll: boolean | null
          auto_generate_document: boolean | null
          category: string | null
          company_id: string
          created_at: string
          description: string | null
          employee_id: string
          generated_document_id: string | null
          id: string
          issued_by: string | null
          issued_date: string
          praise_type: string
          reward_amount: number | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          affects_payroll?: boolean | null
          auto_generate_document?: boolean | null
          category?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          employee_id: string
          generated_document_id?: string | null
          id?: string
          issued_by?: string | null
          issued_date?: string
          praise_type?: string
          reward_amount?: number | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          affects_payroll?: boolean | null
          auto_generate_document?: boolean | null
          category?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          employee_id?: string
          generated_document_id?: string | null
          id?: string
          issued_by?: string | null
          issued_date?: string
          praise_type?: string
          reward_amount?: number | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_praise_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_praise_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_praise_generated_document_id_fkey"
            columns: ["generated_document_id"]
            isOneToOne: false
            referencedRelation: "generated_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_salary_components: {
        Row: {
          amount: number | null
          created_at: string
          employee_id: string
          id: string
          salary_component_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          employee_id: string
          id?: string
          salary_component_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          employee_id?: string
          id?: string
          salary_component_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_salary_components_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salary_components_salary_component_id_fkey"
            columns: ["salary_component_id"]
            isOneToOne: false
            referencedRelation: "salary_components"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_uploaded_documents: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          document_type: string
          employee_id: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          parent_document_id: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string
          updated_at: string
          uploader_user_id: string
          version: number
          visibility_scope: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          document_type?: string
          employee_id: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          parent_document_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
          updated_at?: string
          uploader_user_id: string
          version?: number
          visibility_scope?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          document_type?: string
          employee_id?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          parent_document_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
          updated_at?: string
          uploader_user_id?: string
          version?: number
          visibility_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_uploaded_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_uploaded_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_uploaded_documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "employee_uploaded_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_warnings: {
        Row: {
          action_taken: string | null
          company_id: string
          created_at: string
          description: string | null
          employee_id: string
          employee_response: string | null
          id: string
          incident_date: string
          issued_by: string | null
          severity: string
          status: string
          subject: string
          updated_at: string
          warning_type: string
        }
        Insert: {
          action_taken?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          employee_id: string
          employee_response?: string | null
          id?: string
          incident_date?: string
          issued_by?: string | null
          severity?: string
          status?: string
          subject: string
          updated_at?: string
          warning_type?: string
        }
        Update: {
          action_taken?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          employee_id?: string
          employee_response?: string | null
          id?: string
          incident_date?: string
          issued_by?: string | null
          severity?: string
          status?: string
          subject?: string
          updated_at?: string
          warning_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_warnings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_warnings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          avatar_url: string | null
          basic_salary: number | null
          branch_id: string | null
          company_id: string
          contract_type: string | null
          created_at: string
          currency: string | null
          date_of_birth: string | null
          department_id: string | null
          email: string | null
          employee_code: string | null
          gender: string | null
          grade_id: string | null
          hire_date: string | null
          id: string
          manager_user_id: string | null
          name_ar: string
          name_en: string | null
          national_id: string | null
          nationality: string | null
          phone: string | null
          position: string | null
          position_id: string | null
          promotion_years: number | null
          shift_id: string | null
          status: string
          total_service_years: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          basic_salary?: number | null
          branch_id?: string | null
          company_id: string
          contract_type?: string | null
          created_at?: string
          currency?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          email?: string | null
          employee_code?: string | null
          gender?: string | null
          grade_id?: string | null
          hire_date?: string | null
          id?: string
          manager_user_id?: string | null
          name_ar: string
          name_en?: string | null
          national_id?: string | null
          nationality?: string | null
          phone?: string | null
          position?: string | null
          position_id?: string | null
          promotion_years?: number | null
          shift_id?: string | null
          status?: string
          total_service_years?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          basic_salary?: number | null
          branch_id?: string | null
          company_id?: string
          contract_type?: string | null
          created_at?: string
          currency?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          email?: string | null
          employee_code?: string | null
          gender?: string | null
          grade_id?: string | null
          hire_date?: string | null
          id?: string
          manager_user_id?: string | null
          name_ar?: string
          name_en?: string | null
          national_id?: string | null
          nationality?: string | null
          phone?: string | null
          position?: string | null
          position_id?: string | null
          promotion_years?: number | null
          shift_id?: string | null
          status?: string
          total_service_years?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "salary_grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      events_log: {
        Row: {
          entity: string
          entity_id: string | null
          error_message: string | null
          event_id: string
          event_timestamp: string
          payload: Json | null
          processed_at: string
          sequence: number | null
          status: string
          tenant_id: string
          type: string
        }
        Insert: {
          entity: string
          entity_id?: string | null
          error_message?: string | null
          event_id: string
          event_timestamp: string
          payload?: Json | null
          processed_at?: string
          sequence?: number | null
          status?: string
          tenant_id: string
          type: string
        }
        Update: {
          entity?: string
          entity_id?: string | null
          error_message?: string | null
          event_id?: string
          event_timestamp?: string
          payload?: Json | null
          processed_at?: string
          sequence?: number | null
          status?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      exit_clearance: {
        Row: {
          assets_returned: boolean | null
          company_id: string
          created_at: string
          employee_id: string
          exit_interview_notes: string | null
          exit_type: string | null
          final_settlement_amount: number | null
          id: string
          last_working_date: string | null
          notice_period_days: number | null
          resignation_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assets_returned?: boolean | null
          company_id: string
          created_at?: string
          employee_id: string
          exit_interview_notes?: string | null
          exit_type?: string | null
          final_settlement_amount?: number | null
          id?: string
          last_working_date?: string | null
          notice_period_days?: number | null
          resignation_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assets_returned?: boolean | null
          company_id?: string
          created_at?: string
          employee_id?: string
          exit_interview_notes?: string | null
          exit_type?: string | null
          final_settlement_amount?: number | null
          id?: string
          last_working_date?: string | null
          notice_period_days?: number | null
          resignation_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exit_clearance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exit_clearance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      exit_surveys: {
        Row: {
          additional_comments: string | null
          company_id: string
          created_at: string
          employee_id: string
          exit_clearance_id: string
          id: string
          interview_conducted: boolean | null
          interview_date: string | null
          interviewer_name: string | null
          primary_reason: string
          satisfaction_compensation: number | null
          satisfaction_culture: number | null
          satisfaction_growth: number | null
          satisfaction_management: number | null
          satisfaction_overall: number | null
          satisfaction_worklife: number | null
          secondary_reasons: string[] | null
          updated_at: string
          what_improved: string | null
          what_liked: string | null
          would_recommend: boolean | null
          would_return: boolean | null
        }
        Insert: {
          additional_comments?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          exit_clearance_id: string
          id?: string
          interview_conducted?: boolean | null
          interview_date?: string | null
          interviewer_name?: string | null
          primary_reason?: string
          satisfaction_compensation?: number | null
          satisfaction_culture?: number | null
          satisfaction_growth?: number | null
          satisfaction_management?: number | null
          satisfaction_overall?: number | null
          satisfaction_worklife?: number | null
          secondary_reasons?: string[] | null
          updated_at?: string
          what_improved?: string | null
          what_liked?: string | null
          would_recommend?: boolean | null
          would_return?: boolean | null
        }
        Update: {
          additional_comments?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          exit_clearance_id?: string
          id?: string
          interview_conducted?: boolean | null
          interview_date?: string | null
          interviewer_name?: string | null
          primary_reason?: string
          satisfaction_compensation?: number | null
          satisfaction_culture?: number | null
          satisfaction_growth?: number | null
          satisfaction_management?: number | null
          satisfaction_overall?: number | null
          satisfaction_worklife?: number | null
          secondary_reasons?: string[] | null
          updated_at?: string
          what_improved?: string | null
          what_liked?: string | null
          would_recommend?: boolean | null
          would_return?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "exit_surveys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exit_surveys_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exit_surveys_exit_clearance_id_fkey"
            columns: ["exit_clearance_id"]
            isOneToOne: true
            referencedRelation: "exit_clearance"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_catalog: {
        Row: {
          billing_type: string
          category: string
          created_at: string
          description: string | null
          feature_type: string
          icon: string | null
          id: string
          includes_limits: Json | null
          is_active: boolean
          key: string
          module_key: string | null
          monthly_price: number
          name: string
          name_ar: string | null
          per_user_price: number
          pricing_status: string
          pricing_type: string
          sort_order: number
          yearly_price: number
        }
        Insert: {
          billing_type?: string
          category?: string
          created_at?: string
          description?: string | null
          feature_type?: string
          icon?: string | null
          id?: string
          includes_limits?: Json | null
          is_active?: boolean
          key: string
          module_key?: string | null
          monthly_price?: number
          name: string
          name_ar?: string | null
          per_user_price?: number
          pricing_status?: string
          pricing_type?: string
          sort_order?: number
          yearly_price?: number
        }
        Update: {
          billing_type?: string
          category?: string
          created_at?: string
          description?: string | null
          feature_type?: string
          icon?: string | null
          id?: string
          includes_limits?: Json | null
          is_active?: boolean
          key?: string
          module_key?: string | null
          monthly_price?: number
          name?: string
          name_ar?: string | null
          per_user_price?: number
          pricing_status?: string
          pricing_type?: string
          sort_order?: number
          yearly_price?: number
        }
        Relationships: []
      }
      feature_change_requests: {
        Row: {
          action: string
          company_id: string
          created_at: string
          current_feature_status: string | null
          estimated_monthly_impact: number | null
          feature_key: string
          id: string
          module_key: string | null
          pricing_impact: number | null
          request_type: string
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          current_feature_status?: string | null
          estimated_monthly_impact?: number | null
          feature_key: string
          id?: string
          module_key?: string | null
          pricing_impact?: number | null
          request_type?: string
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          current_feature_status?: string | null
          estimated_monthly_impact?: number | null
          feature_key?: string
          id?: string
          module_key?: string | null
          pricing_impact?: number | null
          request_type?: string
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_change_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          content: string | null
          created_at: string
          document_type: string
          employee_id: string | null
          file_hash: string | null
          file_path: string | null
          file_size: number | null
          finalized_at: string | null
          generated_by: string | null
          id: string
          is_immutable: boolean
          metadata: Json | null
          mime_type: string | null
          reference_number: string | null
          released_at: string | null
          signatory_id: string | null
          signatory_name_snapshot: string | null
          signatory_role_snapshot: string | null
          signed_at: string | null
          status: string
          template_id: string | null
          template_source: string | null
          updated_at: string
          version: number
          visibility_scope: string
          workflow_instance_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          content?: string | null
          created_at?: string
          document_type?: string
          employee_id?: string | null
          file_hash?: string | null
          file_path?: string | null
          file_size?: number | null
          finalized_at?: string | null
          generated_by?: string | null
          id?: string
          is_immutable?: boolean
          metadata?: Json | null
          mime_type?: string | null
          reference_number?: string | null
          released_at?: string | null
          signatory_id?: string | null
          signatory_name_snapshot?: string | null
          signatory_role_snapshot?: string | null
          signed_at?: string | null
          status?: string
          template_id?: string | null
          template_source?: string | null
          updated_at?: string
          version?: number
          visibility_scope?: string
          workflow_instance_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          content?: string | null
          created_at?: string
          document_type?: string
          employee_id?: string | null
          file_hash?: string | null
          file_path?: string | null
          file_size?: number | null
          finalized_at?: string | null
          generated_by?: string | null
          id?: string
          is_immutable?: boolean
          metadata?: Json | null
          mime_type?: string | null
          reference_number?: string | null
          released_at?: string | null
          signatory_id?: string | null
          signatory_name_snapshot?: string | null
          signatory_role_snapshot?: string | null
          signed_at?: string | null
          status?: string
          template_id?: string | null
          template_source?: string | null
          updated_at?: string
          version?: number
          visibility_scope?: string
          workflow_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_signatory_id_fkey"
            columns: ["signatory_id"]
            isOneToOne: false
            referencedRelation: "company_signatories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          company_id: string
          created_at: string
          cycle: string | null
          description: string | null
          employee_id: string
          id: string
          progress: number | null
          status: string
          target_date: string | null
          title: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          cycle?: string | null
          description?: string | null
          employee_id: string
          id?: string
          progress?: number | null
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          cycle?: string | null
          description?: string | null
          employee_id?: string
          id?: string
          progress?: number | null
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_schedules: {
        Row: {
          candidate_id: string
          company_id: string
          created_at: string
          created_by: string | null
          duration_minutes: number
          eval_token: string | null
          eval_token_expires_at: string | null
          external_interviewer_email: string | null
          external_interviewer_name: string | null
          id: string
          interview_type: string
          interviewer_names: string[] | null
          job_id: string
          location: string | null
          notes: string | null
          reminder_sent: boolean | null
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          eval_token?: string | null
          eval_token_expires_at?: string | null
          external_interviewer_email?: string | null
          external_interviewer_name?: string | null
          id?: string
          interview_type?: string
          interviewer_names?: string[] | null
          job_id: string
          location?: string | null
          notes?: string | null
          reminder_sent?: boolean | null
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          eval_token?: string | null
          eval_token_expires_at?: string | null
          external_interviewer_email?: string | null
          external_interviewer_name?: string | null
          id?: string
          interview_type?: string
          interviewer_names?: string[] | null
          job_id?: string
          location?: string | null
          notes?: string | null
          reminder_sent?: boolean | null
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_schedules_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_schedules_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_scorecards: {
        Row: {
          candidate_id: string
          communication_score: number | null
          company_id: string
          created_at: string
          cultural_fit_score: number | null
          experience_score: number | null
          id: string
          interview_id: string | null
          interviewer_name: string
          notes: string | null
          overall_score: number | null
          recommendation: string | null
          strengths: string | null
          technical_score: number | null
          weaknesses: string | null
        }
        Insert: {
          candidate_id: string
          communication_score?: number | null
          company_id: string
          created_at?: string
          cultural_fit_score?: number | null
          experience_score?: number | null
          id?: string
          interview_id?: string | null
          interviewer_name: string
          notes?: string | null
          overall_score?: number | null
          recommendation?: string | null
          strengths?: string | null
          technical_score?: number | null
          weaknesses?: string | null
        }
        Update: {
          candidate_id?: string
          communication_score?: number | null
          company_id?: string
          created_at?: string
          cultural_fit_score?: number | null
          experience_score?: number | null
          id?: string
          interview_id?: string | null
          interviewer_name?: string
          notes?: string | null
          overall_score?: number | null
          recommendation?: string | null
          strengths?: string | null
          technical_score?: number | null
          weaknesses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_scorecards_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_scorecards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_scorecards_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interview_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          description: string
          id: string
          invoice_id: string
          item_type: string
          quantity: number
        }
        Insert: {
          amount?: number
          description: string
          id?: string
          invoice_id: string
          item_type?: string
          quantity?: number
        }
        Update: {
          amount?: number
          description?: string
          id?: string
          invoice_id?: string
          item_type?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "billing_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_accrual_config: {
        Row: {
          accrual_method: string
          carry_forward_expiry_months: number | null
          carry_forward_max: number | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          leave_type_id: string
          monthly_amount: number
        }
        Insert: {
          accrual_method?: string
          carry_forward_expiry_months?: number | null
          carry_forward_max?: number | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          leave_type_id: string
          monthly_amount?: number
        }
        Update: {
          accrual_method?: string
          carry_forward_expiry_months?: number | null
          carry_forward_max?: number | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          leave_type_id?: string
          monthly_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_accrual_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_accrual_config_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          carried_days: number
          company_id: string
          created_at: string
          employee_id: string
          entitled_days: number
          id: string
          leave_type_id: string
          remaining_days: number | null
          updated_at: string
          used_days: number
          year: number
        }
        Insert: {
          carried_days?: number
          company_id: string
          created_at?: string
          employee_id: string
          entitled_days?: number
          id?: string
          leave_type_id: string
          remaining_days?: number | null
          updated_at?: string
          used_days?: number
          year?: number
        }
        Update: {
          carried_days?: number
          company_id?: string
          created_at?: string
          employee_id?: string
          entitled_days?: number
          id?: string
          leave_type_id?: string
          remaining_days?: number | null
          updated_at?: string
          used_days?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          attachment_path: string | null
          company_id: string
          created_at: string
          employee_id: string
          end_date: string
          half_day_period: string | null
          id: string
          is_half_day: boolean | null
          leave_type_id: string | null
          reason: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          attachment_path?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          end_date: string
          half_day_period?: string | null
          id?: string
          is_half_day?: boolean | null
          leave_type_id?: string | null
          reason?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          attachment_path?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          end_date?: string
          half_day_period?: string | null
          id?: string
          is_half_day?: boolean | null
          leave_type_id?: string | null
          reason?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          allow_carry_over: boolean
          company_id: string
          created_at: string
          days_allowed: number
          id: string
          is_paid: boolean
          max_carry_days: number
          name: string
        }
        Insert: {
          allow_carry_over?: boolean
          company_id: string
          created_at?: string
          days_allowed?: number
          id?: string
          is_paid?: boolean
          max_carry_days?: number
          name: string
        }
        Update: {
          allow_carry_over?: boolean
          company_id?: string
          created_at?: string
          days_allowed?: number
          id?: string
          is_paid?: boolean
          max_carry_days?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          loan_id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          payroll_run_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          loan_id: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payroll_run_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          loan_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payroll_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_payments_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          employee_id: string
          id: string
          loan_type: string
          monthly_deduction: number
          notes: string | null
          remaining_amount: number
          start_date: string
          status: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          loan_type?: string
          monthly_deduction: number
          notes?: string | null
          remaining_amount: number
          start_date?: string
          status?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          loan_type?: string
          monthly_deduction?: number
          notes?: string | null
          remaining_amount?: number
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      madad_employee_map: {
        Row: {
          company_id: string
          employee_id: string
          id: string
          mapped_at: string
          staff_profile_id: string
          sync_status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          employee_id: string
          id?: string
          mapped_at?: string
          staff_profile_id: string
          sync_status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          employee_id?: string
          id?: string
          mapped_at?: string
          staff_profile_id?: string
          sync_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "madad_employee_map_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "madad_employee_map_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "madad_employee_map_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      madad_local_access_requests: {
        Row: {
          company_id: string
          created_at: string
          id: string
          notes: string | null
          request_status: string
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          request_status?: string
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          request_status?: string
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "madad_local_access_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      madad_local_node_features: {
        Row: {
          company_id: string
          feature_key: string
          id: string
          local_node_id: string
          module_slug: string | null
          status: string
          synced_at: string
        }
        Insert: {
          company_id: string
          feature_key: string
          id?: string
          local_node_id: string
          module_slug?: string | null
          status?: string
          synced_at?: string
        }
        Update: {
          company_id?: string
          feature_key?: string
          id?: string
          local_node_id?: string
          module_slug?: string | null
          status?: string
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "madad_local_node_features_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "madad_local_node_features_local_node_id_fkey"
            columns: ["local_node_id"]
            isOneToOne: false
            referencedRelation: "madad_local_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      madad_local_node_modules: {
        Row: {
          company_id: string
          id: string
          local_node_id: string
          module_slug: string
          status: string
          synced_at: string
        }
        Insert: {
          company_id: string
          id?: string
          local_node_id: string
          module_slug: string
          status?: string
          synced_at?: string
        }
        Update: {
          company_id?: string
          id?: string
          local_node_id?: string
          module_slug?: string
          status?: string
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "madad_local_node_modules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "madad_local_node_modules_local_node_id_fkey"
            columns: ["local_node_id"]
            isOneToOne: false
            referencedRelation: "madad_local_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      madad_local_nodes: {
        Row: {
          activation_status: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          last_seen_at: string | null
          last_sync_at: string | null
          node_name: string
          node_status: string
          notes: string | null
          provisioning_token_expires_at: string | null
          provisioning_token_hash: string | null
          request_id: string | null
          sync_health: string
          updated_at: string
        }
        Insert: {
          activation_status?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_seen_at?: string | null
          last_sync_at?: string | null
          node_name: string
          node_status?: string
          notes?: string | null
          provisioning_token_expires_at?: string | null
          provisioning_token_hash?: string | null
          request_id?: string | null
          sync_health?: string
          updated_at?: string
        }
        Update: {
          activation_status?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_seen_at?: string | null
          last_sync_at?: string | null
          node_name?: string
          node_status?: string
          notes?: string | null
          provisioning_token_expires_at?: string | null
          provisioning_token_hash?: string | null
          request_id?: string | null
          sync_health?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "madad_local_nodes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "madad_local_nodes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "madad_local_access_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      madad_local_sync_logs: {
        Row: {
          company_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          events_count: number | null
          id: string
          local_node_id: string
          metadata: Json | null
          sync_direction: string
          sync_status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          events_count?: number | null
          id?: string
          local_node_id: string
          metadata?: Json | null
          sync_direction: string
          sync_status: string
        }
        Update: {
          company_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          events_count?: number | null
          id?: string
          local_node_id?: string
          metadata?: Json | null
          sync_direction?: string
          sync_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "madad_local_sync_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "madad_local_sync_logs_local_node_id_fkey"
            columns: ["local_node_id"]
            isOneToOne: false
            referencedRelation: "madad_local_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      madad_modules: {
        Row: {
          color: string | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          icon: string | null
          id: string
          is_global_enabled: boolean
          key: string
          name_ar: string
          name_en: string
          sort_order: number | null
          status: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          icon?: string | null
          id?: string
          is_global_enabled?: boolean
          key: string
          name_ar: string
          name_en: string
          sort_order?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          icon?: string | null
          id?: string
          is_global_enabled?: boolean
          key?: string
          name_ar?: string
          name_en?: string
          sort_order?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      madad_offers: {
        Row: {
          applicable_module_ids: string[] | null
          applicable_package_id: string | null
          apply_to_packages: string[] | null
          badge_ar: string | null
          badge_en: string | null
          bonus_feature_keys: string[] | null
          bonus_months: number | null
          condition_type: string | null
          condition_value: string | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          discount_type: string
          discount_value: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          min_billing_cycle: string | null
          offer_type: string
          starts_at: string | null
          title_ar: string
          title_en: string
        }
        Insert: {
          applicable_module_ids?: string[] | null
          applicable_package_id?: string | null
          apply_to_packages?: string[] | null
          badge_ar?: string | null
          badge_en?: string | null
          bonus_feature_keys?: string[] | null
          bonus_months?: number | null
          condition_type?: string | null
          condition_value?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          discount_type?: string
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          min_billing_cycle?: string | null
          offer_type?: string
          starts_at?: string | null
          title_ar: string
          title_en: string
        }
        Update: {
          applicable_module_ids?: string[] | null
          applicable_package_id?: string | null
          apply_to_packages?: string[] | null
          badge_ar?: string | null
          badge_en?: string | null
          bonus_feature_keys?: string[] | null
          bonus_months?: number | null
          condition_type?: string | null
          condition_value?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          discount_type?: string
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          min_billing_cycle?: string | null
          offer_type?: string
          starts_at?: string | null
          title_ar?: string
          title_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "madad_offers_applicable_package_id_fkey"
            columns: ["applicable_package_id"]
            isOneToOne: false
            referencedRelation: "madad_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      madad_package_features: {
        Row: {
          feature_key: string
          feature_label_ar: string
          feature_label_en: string
          id: string
          package_id: string
          sort_order: number | null
          value: string
        }
        Insert: {
          feature_key: string
          feature_label_ar: string
          feature_label_en: string
          id?: string
          package_id: string
          sort_order?: number | null
          value: string
        }
        Update: {
          feature_key?: string
          feature_label_ar?: string
          feature_label_en?: string
          id?: string
          package_id?: string
          sort_order?: number | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "madad_package_features_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "madad_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      madad_package_modules: {
        Row: {
          id: string
          module_id: string
          package_id: string
        }
        Insert: {
          id?: string
          module_id: string
          package_id: string
        }
        Update: {
          id?: string
          module_id?: string
          package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "madad_package_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "madad_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "madad_package_modules_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "madad_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      madad_packages: {
        Row: {
          badge_ar: string | null
          badge_en: string | null
          created_at: string
          currency: string
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          key: string
          monthly_price: number
          name_ar: string
          name_en: string
          sort_order: number | null
          trial_duration_days: number
          trial_features: Json | null
          trial_modules: Json | null
          updated_at: string
          yearly_price: number
        }
        Insert: {
          badge_ar?: string | null
          badge_en?: string | null
          created_at?: string
          currency?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          key: string
          monthly_price?: number
          name_ar: string
          name_en: string
          sort_order?: number | null
          trial_duration_days?: number
          trial_features?: Json | null
          trial_modules?: Json | null
          updated_at?: string
          yearly_price?: number
        }
        Update: {
          badge_ar?: string | null
          badge_en?: string | null
          created_at?: string
          currency?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          key?: string
          monthly_price?: number
          name_ar?: string
          name_en?: string
          sort_order?: number | null
          trial_duration_days?: number
          trial_features?: Json | null
          trial_modules?: Json | null
          updated_at?: string
          yearly_price?: number
        }
        Relationships: []
      }
      madad_platform_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      madad_tenant_feature_access: {
        Row: {
          company_id: string
          created_at: string
          feature_key: string
          granted_by_package_id: string | null
          id: string
          is_active: boolean
          module_key: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          feature_key: string
          granted_by_package_id?: string | null
          id?: string
          is_active?: boolean
          module_key?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          feature_key?: string
          granted_by_package_id?: string | null
          id?: string
          is_active?: boolean
          module_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "madad_tenant_feature_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "madad_tenant_feature_access_granted_by_package_id_fkey"
            columns: ["granted_by_package_id"]
            isOneToOne: false
            referencedRelation: "madad_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      madad_tenant_modules: {
        Row: {
          activated_at: string | null
          company_id: string
          id: string
          is_active: boolean | null
          module_id: string
        }
        Insert: {
          activated_at?: string | null
          company_id: string
          id?: string
          is_active?: boolean | null
          module_id: string
        }
        Update: {
          activated_at?: string | null
          company_id?: string
          id?: string
          is_active?: boolean | null
          module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "madad_tenant_modules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "madad_tenant_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "madad_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      madad_tenant_subscriptions: {
        Row: {
          billing_cycle: string
          company_id: string
          created_at: string
          custom_price: number | null
          end_date: string | null
          id: string
          package_id: string
          start_date: string
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          company_id: string
          created_at?: string
          custom_price?: number | null
          end_date?: string | null
          id?: string
          package_id: string
          start_date?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          company_id?: string
          created_at?: string
          custom_price?: number | null
          end_date?: string | null
          id?: string
          package_id?: string
          start_date?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "madad_tenant_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "madad_tenant_subscriptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "madad_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      madad_transactions: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          id: string
          source_module: string
          source_record_id: string | null
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          source_module: string
          source_record_id?: string | null
          transaction_date?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          source_module?: string
          source_record_id?: string | null
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "madad_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      madad_workflow_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_letters: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          benefits: string | null
          candidate_id: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          job_id: string
          notes: string | null
          offered_position: string | null
          offered_salary: number
          response: string | null
          response_at: string | null
          sent_at: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          benefits?: string | null
          candidate_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          job_id: string
          notes?: string | null
          offered_position?: string | null
          offered_salary?: number
          response?: string | null
          response_at?: string | null
          sent_at?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          benefits?: string | null
          candidate_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          offered_position?: string | null
          offered_salary?: number
          response?: string | null
          response_at?: string | null
          sent_at?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_letters_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_letters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_letters_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_tasks: {
        Row: {
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          employee_id: string | null
          id: string
          is_completed: boolean | null
          status: string
          task_type: string | null
          title: string
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          employee_id?: string | null
          id?: string
          is_completed?: boolean | null
          status?: string
          task_type?: string | null
          title: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          employee_id?: string | null
          id?: string
          is_completed?: boolean | null
          status?: string
          task_type?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_templates: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          task_type: string
          title: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          task_type?: string
          title: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          task_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_tour_progress: {
        Row: {
          company_id: string | null
          completed_modules: string[]
          created_at: string
          current_module: number
          dismissed_at: string | null
          id: string
          is_completed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          completed_modules?: string[]
          created_at?: string
          current_module?: number
          dismissed_at?: string | null
          id?: string
          is_completed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          completed_modules?: string[]
          created_at?: string
          current_module?: number
          dismissed_at?: string | null
          id?: string
          is_completed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tour_progress_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      package_catalog_features: {
        Row: {
          created_at: string
          feature_id: string
          feature_key: string
          id: string
          module_key: string
          package_id: string
        }
        Insert: {
          created_at?: string
          feature_id: string
          feature_key: string
          id?: string
          module_key: string
          package_id: string
        }
        Update: {
          created_at?: string
          feature_id?: string
          feature_key?: string
          id?: string
          module_key?: string
          package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_catalog_features_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "feature_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_catalog_features_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "madad_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_enabled: boolean
          key: string
          name_ar: string
          name_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          key: string
          name_ar: string
          name_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          key?: string
          name_ar?: string
          name_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      payroll_attendance_summary: {
        Row: {
          absence_deduction: number | null
          absent_days: number | null
          company_id: string
          created_at: string | null
          daily_rate: number | null
          early_leave_deduction: number | null
          early_leave_minutes: number | null
          employee_id: string
          holiday_pay: number | null
          holiday_worked_hours: number | null
          hourly_rate: number | null
          id: string
          late_deduction: number | null
          late_incidents: number | null
          late_minutes: number | null
          overtime_hours: number | null
          overtime_pay: number | null
          paid_leave_days: number | null
          payroll_run_id: string
          scheduled_days: number | null
          unpaid_leave_days: number | null
          unpaid_leave_deduction: number | null
          weekend_pay: number | null
          weekend_worked_hours: number | null
          worked_days: number | null
        }
        Insert: {
          absence_deduction?: number | null
          absent_days?: number | null
          company_id: string
          created_at?: string | null
          daily_rate?: number | null
          early_leave_deduction?: number | null
          early_leave_minutes?: number | null
          employee_id: string
          holiday_pay?: number | null
          holiday_worked_hours?: number | null
          hourly_rate?: number | null
          id?: string
          late_deduction?: number | null
          late_incidents?: number | null
          late_minutes?: number | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          paid_leave_days?: number | null
          payroll_run_id: string
          scheduled_days?: number | null
          unpaid_leave_days?: number | null
          unpaid_leave_deduction?: number | null
          weekend_pay?: number | null
          weekend_worked_hours?: number | null
          worked_days?: number | null
        }
        Update: {
          absence_deduction?: number | null
          absent_days?: number | null
          company_id?: string
          created_at?: string | null
          daily_rate?: number | null
          early_leave_deduction?: number | null
          early_leave_minutes?: number | null
          employee_id?: string
          holiday_pay?: number | null
          holiday_worked_hours?: number | null
          hourly_rate?: number | null
          id?: string
          late_deduction?: number | null
          late_incidents?: number | null
          late_minutes?: number | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          paid_leave_days?: number | null
          payroll_run_id?: string
          scheduled_days?: number | null
          unpaid_leave_days?: number | null
          unpaid_leave_deduction?: number | null
          weekend_pay?: number | null
          weekend_worked_hours?: number | null
          worked_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_attendance_summary_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_attendance_summary_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_attendance_summary_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_items: {
        Row: {
          absence_deduction: number | null
          allowances: number | null
          basic_salary: number
          created_at: string
          employee_id: string
          gross_salary: number
          holiday_weekend_pay: number | null
          id: string
          income_tax: number | null
          late_deduction: number | null
          net_salary: number
          other_deductions: number | null
          overtime_pay: number | null
          payroll_run_id: string
          policy_id: string | null
          social_security_employee: number | null
          social_security_employer: number | null
          unpaid_leave_deduction: number | null
        }
        Insert: {
          absence_deduction?: number | null
          allowances?: number | null
          basic_salary?: number
          created_at?: string
          employee_id: string
          gross_salary?: number
          holiday_weekend_pay?: number | null
          id?: string
          income_tax?: number | null
          late_deduction?: number | null
          net_salary?: number
          other_deductions?: number | null
          overtime_pay?: number | null
          payroll_run_id: string
          policy_id?: string | null
          social_security_employee?: number | null
          social_security_employer?: number | null
          unpaid_leave_deduction?: number | null
        }
        Update: {
          absence_deduction?: number | null
          allowances?: number | null
          basic_salary?: number
          created_at?: string
          employee_id?: string
          gross_salary?: number
          holiday_weekend_pay?: number | null
          id?: string
          income_tax?: number | null
          late_deduction?: number | null
          net_salary?: number
          other_deductions?: number | null
          overtime_pay?: number | null
          payroll_run_id?: string
          policy_id?: string | null
          social_security_employee?: number | null
          social_security_employer?: number | null
          unpaid_leave_deduction?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "payroll_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_policies: {
        Row: {
          absence_deduction_enabled: boolean | null
          absence_definition: string | null
          company_id: string
          created_at: string | null
          custom_deduction_logic: Json | null
          description: string | null
          early_leave_deduction_enabled: boolean | null
          early_leave_deduction_rate: number | null
          holiday_source: string | null
          holiday_work_multiplier: number | null
          hourly_rate_basis: string | null
          id: string
          income_tax_enabled: boolean | null
          is_default: boolean | null
          late_deduction_enabled: boolean | null
          late_deduction_rate: number | null
          late_deduction_type: string | null
          late_grace_minutes: number | null
          leave_impact_rules: Json | null
          loan_deduction_enabled: boolean | null
          name: string
          overtime_enabled: boolean | null
          overtime_multiplier: number | null
          overtime_rounding: string | null
          overtime_threshold_minutes: number | null
          payslip_custom_labels: Json | null
          payslip_language: string | null
          payslip_show_attendance: boolean | null
          payslip_show_leave: boolean | null
          payslip_show_overtime: boolean | null
          proration_basis: string | null
          proration_enabled: boolean | null
          salary_basis: string
          social_security_employee_pct: number | null
          social_security_employer_pct: number | null
          standard_hours_per_day: number | null
          tax_mode: string | null
          unpaid_leave_deduction_enabled: boolean | null
          updated_at: string | null
          weekend_days: Json | null
          weekend_work_multiplier: number | null
          working_days: Json | null
          working_hours_end: string | null
          working_hours_start: string | null
        }
        Insert: {
          absence_deduction_enabled?: boolean | null
          absence_definition?: string | null
          company_id: string
          created_at?: string | null
          custom_deduction_logic?: Json | null
          description?: string | null
          early_leave_deduction_enabled?: boolean | null
          early_leave_deduction_rate?: number | null
          holiday_source?: string | null
          holiday_work_multiplier?: number | null
          hourly_rate_basis?: string | null
          id?: string
          income_tax_enabled?: boolean | null
          is_default?: boolean | null
          late_deduction_enabled?: boolean | null
          late_deduction_rate?: number | null
          late_deduction_type?: string | null
          late_grace_minutes?: number | null
          leave_impact_rules?: Json | null
          loan_deduction_enabled?: boolean | null
          name?: string
          overtime_enabled?: boolean | null
          overtime_multiplier?: number | null
          overtime_rounding?: string | null
          overtime_threshold_minutes?: number | null
          payslip_custom_labels?: Json | null
          payslip_language?: string | null
          payslip_show_attendance?: boolean | null
          payslip_show_leave?: boolean | null
          payslip_show_overtime?: boolean | null
          proration_basis?: string | null
          proration_enabled?: boolean | null
          salary_basis?: string
          social_security_employee_pct?: number | null
          social_security_employer_pct?: number | null
          standard_hours_per_day?: number | null
          tax_mode?: string | null
          unpaid_leave_deduction_enabled?: boolean | null
          updated_at?: string | null
          weekend_days?: Json | null
          weekend_work_multiplier?: number | null
          working_days?: Json | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Update: {
          absence_deduction_enabled?: boolean | null
          absence_definition?: string | null
          company_id?: string
          created_at?: string | null
          custom_deduction_logic?: Json | null
          description?: string | null
          early_leave_deduction_enabled?: boolean | null
          early_leave_deduction_rate?: number | null
          holiday_source?: string | null
          holiday_work_multiplier?: number | null
          hourly_rate_basis?: string | null
          id?: string
          income_tax_enabled?: boolean | null
          is_default?: boolean | null
          late_deduction_enabled?: boolean | null
          late_deduction_rate?: number | null
          late_deduction_type?: string | null
          late_grace_minutes?: number | null
          leave_impact_rules?: Json | null
          loan_deduction_enabled?: boolean | null
          name?: string
          overtime_enabled?: boolean | null
          overtime_multiplier?: number | null
          overtime_rounding?: string | null
          overtime_threshold_minutes?: number | null
          payslip_custom_labels?: Json | null
          payslip_language?: string | null
          payslip_show_attendance?: boolean | null
          payslip_show_leave?: boolean | null
          payslip_show_overtime?: boolean | null
          proration_basis?: string | null
          proration_enabled?: boolean | null
          salary_basis?: string
          social_security_employee_pct?: number | null
          social_security_employer_pct?: number | null
          standard_hours_per_day?: number | null
          tax_mode?: string | null
          unpaid_leave_deduction_enabled?: boolean | null
          updated_at?: string | null
          weekend_days?: Json | null
          weekend_work_multiplier?: number | null
          working_days?: Json | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          approved_by: string | null
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string | null
          id: string
          locked_at: string | null
          month: number
          status: string
          total_deductions: number | null
          total_gross: number | null
          total_net: number | null
          updated_at: string
          year: number
        }
        Insert: {
          approved_by?: string | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          id?: string
          locked_at?: string | null
          month: number
          status?: string
          total_deductions?: number | null
          total_gross?: number | null
          total_net?: number | null
          updated_at?: string
          year: number
        }
        Update: {
          approved_by?: string | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          id?: string
          locked_at?: string | null
          month?: number
          status?: string
          total_deductions?: number | null
          total_gross?: number | null
          total_net?: number | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          feature_key: string
          id: string
          included: boolean
          limit_value: number | null
          notes: string | null
          plan_id: string
        }
        Insert: {
          feature_key: string
          id?: string
          included?: boolean
          limit_value?: number | null
          notes?: string | null
          plan_id: string
        }
        Update: {
          feature_key?: string
          id?: string
          included?: boolean
          limit_value?: number | null
          notes?: string | null
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_features: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          icon: string | null
          id: string
          is_beta: boolean
          name: string
          name_ar: string | null
          plans: string[]
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          icon?: string | null
          id?: string
          is_beta?: boolean
          name: string
          name_ar?: string | null
          plans?: string[]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          icon?: string | null
          id?: string
          is_beta?: boolean
          name?: string
          name_ar?: string | null
          plans?: string[]
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          label: string
          label_ar: string | null
          setting_key: string
          setting_type: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          label: string
          label_ar?: string | null
          setting_key: string
          setting_type?: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          label_ar?: string | null
          setting_key?: string
          setting_type?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      policy_assignments: {
        Row: {
          assignment_target_id: string
          assignment_type: string
          company_id: string
          created_at: string
          id: string
          policy_id: string
        }
        Insert: {
          assignment_target_id: string
          assignment_type?: string
          company_id: string
          created_at?: string
          id?: string
          policy_id: string
        }
        Update: {
          assignment_target_id?: string
          assignment_type?: string
          company_id?: string
          created_at?: string
          id?: string
          policy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_assignments_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "payroll_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      position_feature_assignments: {
        Row: {
          company_id: string
          created_at: string
          enabled: boolean
          feature_key: string
          id: string
          position_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          enabled?: boolean
          feature_key: string
          id?: string
          position_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          position_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_feature_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_feature_assignments_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          allowances: Json | null
          branch_id: string | null
          company_id: string
          created_at: string
          created_from: string | null
          department_id: string | null
          description: string | null
          diagram_x: number | null
          diagram_y: number | null
          grade_level: number | null
          id: string
          import_batch_id: string | null
          is_manager: boolean | null
          job_description: string | null
          max_salary: number | null
          min_salary: number | null
          parent_position_id: string | null
          position_code: string | null
          service_permissions: Json | null
          status: string | null
          system_role: string | null
          talent_requirements: Json | null
          title: string | null
          title_ar: string
          title_en: string | null
          updated_at: string | null
          workflow_responsibilities: Json | null
        }
        Insert: {
          allowances?: Json | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_from?: string | null
          department_id?: string | null
          description?: string | null
          diagram_x?: number | null
          diagram_y?: number | null
          grade_level?: number | null
          id?: string
          import_batch_id?: string | null
          is_manager?: boolean | null
          job_description?: string | null
          max_salary?: number | null
          min_salary?: number | null
          parent_position_id?: string | null
          position_code?: string | null
          service_permissions?: Json | null
          status?: string | null
          system_role?: string | null
          talent_requirements?: Json | null
          title?: string | null
          title_ar: string
          title_en?: string | null
          updated_at?: string | null
          workflow_responsibilities?: Json | null
        }
        Update: {
          allowances?: Json | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_from?: string | null
          department_id?: string | null
          description?: string | null
          diagram_x?: number | null
          diagram_y?: number | null
          grade_level?: number | null
          id?: string
          import_batch_id?: string | null
          is_manager?: boolean | null
          job_description?: string | null
          max_salary?: number | null
          min_salary?: number | null
          parent_position_id?: string | null
          position_code?: string | null
          service_permissions?: Json | null
          status?: string | null
          system_role?: string | null
          talent_requirements?: Json | null
          title?: string | null
          title_ar?: string
          title_en?: string | null
          updated_at?: string | null
          workflow_responsibilities?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "positions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_parent_position_id_fkey"
            columns: ["parent_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_assignments: {
        Row: {
          allocation_percentage: number
          created_at: string
          employee_id: string
          end_date: string | null
          id: string
          is_active: boolean
          notes: string | null
          position_id: string | null
          project_id: string
          project_position_id: string | null
          project_role: string
          start_date: string
          updated_at: string
        }
        Insert: {
          allocation_percentage?: number
          created_at?: string
          employee_id: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          position_id?: string | null
          project_id: string
          project_position_id?: string | null
          project_role?: string
          start_date?: string
          updated_at?: string
        }
        Update: {
          allocation_percentage?: number
          created_at?: string
          employee_id?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          position_id?: string | null
          project_id?: string
          project_position_id?: string | null
          project_role?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_project_position_id_fkey"
            columns: ["project_position_id"]
            isOneToOne: false
            referencedRelation: "project_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      project_positions: {
        Row: {
          created_at: string
          id: string
          is_manager: boolean | null
          parent_project_position_id: string | null
          project_id: string
          responsibilities: Json | null
          sort_order: number | null
          title: string
          title_ar: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_manager?: boolean | null
          parent_project_position_id?: string | null
          project_id: string
          responsibilities?: Json | null
          sort_order?: number | null
          title: string
          title_ar?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_manager?: boolean | null
          parent_project_position_id?: string | null
          project_id?: string
          responsibilities?: Json | null
          sort_order?: number | null
          title?: string
          title_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_positions_parent_project_position_id_fkey"
            columns: ["parent_project_position_id"]
            isOneToOne: false
            referencedRelation: "project_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_positions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          code: string
          company_id: string
          cost_center: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          name_ar: string | null
          project_manager_position_id: string | null
          spent: number | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          code: string
          company_id: string
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          name_ar?: string | null
          project_manager_position_id?: string | null
          spent?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          code?: string
          company_id?: string
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          name_ar?: string | null
          project_manager_position_id?: string | null
          spent?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_manager_position_id_fkey"
            columns: ["project_manager_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      public_holidays: {
        Row: {
          company_id: string
          created_at: string
          date: string
          id: string
          is_recurring: boolean | null
          name: string
          region: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          date: string
          id?: string
          is_recurring?: boolean | null
          name: string
          region?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          date?: string
          id?: string
          is_recurring?: boolean | null
          name?: string
          region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_holidays_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_jobs: {
        Row: {
          agency_client_id: string | null
          approved_by: string | null
          branch_id: string | null
          budget_approved: boolean | null
          closing_date: string | null
          company_id: string
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          employment_type: string | null
          hiring_source: string | null
          id: string
          position_description: string | null
          position_id: string | null
          position_requirements: string | null
          positions_count: number | null
          requirements: string | null
          requisition_notes: string | null
          salary_max: number | null
          salary_min: number | null
          salary_range_max: number | null
          salary_range_min: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agency_client_id?: string | null
          approved_by?: string | null
          branch_id?: string | null
          budget_approved?: boolean | null
          closing_date?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          employment_type?: string | null
          hiring_source?: string | null
          id?: string
          position_description?: string | null
          position_id?: string | null
          position_requirements?: string | null
          positions_count?: number | null
          requirements?: string | null
          requisition_notes?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agency_client_id?: string | null
          approved_by?: string | null
          branch_id?: string | null
          budget_approved?: boolean | null
          closing_date?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          employment_type?: string | null
          hiring_source?: string | null
          id?: string
          position_description?: string | null
          position_id?: string | null
          position_requirements?: string | null
          positions_count?: number | null
          requirements?: string | null
          requisition_notes?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_jobs_agency_client_id_fkey"
            columns: ["agency_client_id"]
            isOneToOne: false
            referencedRelation: "agency_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_jobs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_jobs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_jobs_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      request_documents: {
        Row: {
          approval_history: Json
          company_id: string
          company_snapshot: Json | null
          created_at: string
          employee_id: string | null
          employee_snapshot: Json | null
          finalized_at: string | null
          id: string
          reference_id: string | null
          reference_number: string
          request_data: Json
          request_type: string
          requester_user_id: string | null
          status: string
          updated_at: string
          workflow_instance_id: string | null
        }
        Insert: {
          approval_history?: Json
          company_id: string
          company_snapshot?: Json | null
          created_at?: string
          employee_id?: string | null
          employee_snapshot?: Json | null
          finalized_at?: string | null
          id?: string
          reference_id?: string | null
          reference_number: string
          request_data?: Json
          request_type: string
          requester_user_id?: string | null
          status?: string
          updated_at?: string
          workflow_instance_id?: string | null
        }
        Update: {
          approval_history?: Json
          company_id?: string
          company_snapshot?: Json | null
          created_at?: string
          employee_id?: string | null
          employee_snapshot?: Json | null
          finalized_at?: string | null
          id?: string
          reference_id?: string | null
          reference_number?: string
          request_data?: Json
          request_type?: string
          requester_user_id?: string | null
          status?: string
          updated_at?: string
          workflow_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_documents_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_components: {
        Row: {
          amount: number | null
          calculation_type: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          is_taxable: boolean | null
          name: string
          percentage: number | null
          type: string
        }
        Insert: {
          amount?: number | null
          calculation_type?: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_taxable?: boolean | null
          name: string
          percentage?: number | null
          type?: string
        }
        Update: {
          amount?: number | null
          calculation_type?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_taxable?: boolean | null
          name?: string
          percentage?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_components_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_equations: {
        Row: {
          company_id: string
          created_at: string
          employee_id: string | null
          formula: Json
          id: string
          is_default: boolean
          name: string
          notes: string | null
          projection_years: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_id?: string | null
          formula?: Json
          id?: string
          is_default?: boolean
          name?: string
          notes?: string | null
          projection_years?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_id?: string | null
          formula?: Json
          id?: string
          is_default?: boolean
          name?: string
          notes?: string | null
          projection_years?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_equations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_equations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_grades: {
        Row: {
          annual_increment: number | null
          company_id: string
          created_at: string
          grade_level: number
          grade_name: string
          id: string
          increment_percentage: number | null
          max_salary: number
          min_salary: number
          next_grade_id: string | null
          updated_at: string
          years_to_next_grade: number | null
        }
        Insert: {
          annual_increment?: number | null
          company_id: string
          created_at?: string
          grade_level?: number
          grade_name: string
          id?: string
          increment_percentage?: number | null
          max_salary?: number
          min_salary?: number
          next_grade_id?: string | null
          updated_at?: string
          years_to_next_grade?: number | null
        }
        Update: {
          annual_increment?: number | null
          company_id?: string
          created_at?: string
          grade_level?: number
          grade_name?: string
          id?: string
          increment_percentage?: number | null
          max_salary?: number
          min_salary?: number
          next_grade_id?: string | null
          updated_at?: string
          years_to_next_grade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_grades_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_grades_next_grade_id_fkey"
            columns: ["next_grade_id"]
            isOneToOne: false
            referencedRelation: "salary_grades"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_assignments: {
        Row: {
          created_at: string
          employee_id: string
          end_date: string | null
          id: string
          shift_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          end_date?: string | null
          id?: string
          shift_id: string
          start_date: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          end_date?: string | null
          id?: string
          shift_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          break_minutes: number | null
          company_id: string
          created_at: string
          end_time: string
          grace_minutes: number | null
          id: string
          is_night_shift: boolean | null
          name: string
          overtime_threshold_hours: number | null
          spans_midnight: boolean
          start_time: string
        }
        Insert: {
          break_minutes?: number | null
          company_id: string
          created_at?: string
          end_time: string
          grace_minutes?: number | null
          id?: string
          is_night_shift?: boolean | null
          name: string
          overtime_threshold_hours?: number | null
          spans_midnight?: boolean
          start_time: string
        }
        Update: {
          break_minutes?: number | null
          company_id?: string
          created_at?: string
          end_time?: string
          grace_minutes?: number | null
          id?: string
          is_night_shift?: boolean | null
          name?: string
          overtime_threshold_hours?: number | null
          spans_midnight?: boolean
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_change_requests: {
        Row: {
          billing_cycle: string
          company_id: string
          created_at: string
          current_ai_package_id: string | null
          current_plan_id: string | null
          id: string
          notes: string | null
          requested_addons: Json | null
          requested_ai_package_id: string | null
          requested_by: string
          requested_plan_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          company_id: string
          created_at?: string
          current_ai_package_id?: string | null
          current_plan_id?: string | null
          id?: string
          notes?: string | null
          requested_addons?: Json | null
          requested_ai_package_id?: string | null
          requested_by: string
          requested_plan_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          company_id?: string
          created_at?: string
          current_ai_package_id?: string | null
          current_plan_id?: string | null
          id?: string
          notes?: string | null
          requested_addons?: Json | null
          requested_ai_package_id?: string | null
          requested_by?: string
          requested_plan_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_change_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_change_requests_current_ai_package_id_fkey"
            columns: ["current_ai_package_id"]
            isOneToOne: false
            referencedRelation: "ai_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_change_requests_current_plan_id_fkey"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_change_requests_requested_ai_package_id_fkey"
            columns: ["requested_ai_package_id"]
            isOneToOne: false
            referencedRelation: "ai_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_change_requests_requested_plan_id_fkey"
            columns: ["requested_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          features: Json | null
          id: string
          included_features: Json | null
          is_active: boolean
          max_ai_requests: number | null
          max_branches: number
          max_employees: number
          max_storage_gb: number
          name: string
          name_ar: string
          price_monthly: number
          price_yearly: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          included_features?: Json | null
          is_active?: boolean
          max_ai_requests?: number | null
          max_branches?: number
          max_employees?: number
          max_storage_gb?: number
          name: string
          name_ar: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          included_features?: Json | null
          is_active?: boolean
          max_ai_requests?: number | null
          max_branches?: number
          max_employees?: number
          max_storage_gb?: number
          name?: string
          name_ar?: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          attachments: Json | null
          created_at: string
          id: string
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          id?: string
          message: string
          sender_id: string
          sender_type?: string
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          last_message_at: string | null
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          last_message_at?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          last_message_at?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_attempts: {
        Row: {
          api_key_id: string | null
          created_at: string
          error_summary: string | null
          failed: number
          id: string
          ip_address: string | null
          processed: number
          skipped: number
          status_code: number
          tenant_id: string | null
          total_events: number
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          error_summary?: string | null
          failed?: number
          id?: string
          ip_address?: string | null
          processed?: number
          skipped?: number
          status_code: number
          tenant_id?: string | null
          total_events?: number
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          error_summary?: string | null
          failed?: number
          id?: string
          ip_address?: string | null
          processed?: number
          skipped?: number
          status_code?: number
          tenant_id?: string | null
          total_events?: number
        }
        Relationships: [
          {
            foreignKeyName: "sync_attempts_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_document_templates: {
        Row: {
          body_template: string
          created_at: string
          document_type: string
          footer_template: string | null
          id: string
          language: string | null
          merge_fields: string[] | null
          name: string
          name_ar: string | null
          title_template: string | null
        }
        Insert: {
          body_template: string
          created_at?: string
          document_type: string
          footer_template?: string | null
          id?: string
          language?: string | null
          merge_fields?: string[] | null
          name: string
          name_ar?: string | null
          title_template?: string | null
        }
        Update: {
          body_template?: string
          created_at?: string
          document_type?: string
          footer_template?: string | null
          id?: string
          language?: string | null
          merge_fields?: string[] | null
          name?: string
          name_ar?: string | null
          title_template?: string | null
        }
        Relationships: []
      }
      tahseel_accounts: {
        Row: {
          account_code: string
          account_type: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          name_ar: string | null
          parent_account_id: string | null
          updated_at: string
        }
        Insert: {
          account_code: string
          account_type?: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_ar?: string | null
          parent_account_id?: string | null
          updated_at?: string
        }
        Update: {
          account_code?: string
          account_type?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string | null
          parent_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tahseel_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tahseel_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "tahseel_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      tahseel_expenses: {
        Row: {
          account_id: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          expense_date: string
          expense_type: string
          id: string
          source_module: string | null
          source_record_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          expense_date?: string
          expense_type?: string
          id?: string
          source_module?: string | null
          source_record_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          expense_date?: string
          expense_type?: string
          id?: string
          source_module?: string | null
          source_record_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tahseel_expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "tahseel_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tahseel_expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tahseel_invoices: {
        Row: {
          booking_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          discount: number
          due_date: string | null
          id: string
          invoice_number: string
          notes: string | null
          paid_at: string | null
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          invoice_number: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tahseel_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tahseel_journal_entries: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          entry_date: string
          entry_number: string
          id: string
          posted_at: string | null
          posted_by: string | null
          source_module: string | null
          source_record_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_number: string
          id?: string
          posted_at?: string | null
          posted_by?: string | null
          source_module?: string | null
          source_record_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_number?: string
          id?: string
          posted_at?: string | null
          posted_by?: string | null
          source_module?: string | null
          source_record_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tahseel_journal_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tahseel_journal_lines: {
        Row: {
          account_id: string
          created_at: string
          credit: number
          debit: number
          description: string | null
          id: string
          journal_entry_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tahseel_journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "tahseel_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tahseel_journal_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "tahseel_journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      tahseel_payment_records: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          expense_id: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string
          reference_number: string | null
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          expense_id?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          reference_number?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          expense_id?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tahseel_payment_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tahseel_payment_records_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "tahseel_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tahseel_payment_records_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "tahseel_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      takzeen_categories: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          name_ar: string | null
          parent_category_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          name_ar?: string | null
          parent_category_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          name_ar?: string | null
          parent_category_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "takzeen_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takzeen_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "takzeen_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      takzeen_products: {
        Row: {
          barcode: string | null
          category_id: string | null
          company_id: string
          created_at: string
          current_stock: number
          id: string
          image_url: string | null
          is_active: boolean
          max_stock: number | null
          name: string
          name_ar: string | null
          notes: string | null
          reorder_level: number
          selling_price: number
          sku: string
          unit: string
          unit_cost: number
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          company_id: string
          created_at?: string
          current_stock?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_stock?: number | null
          name: string
          name_ar?: string | null
          notes?: string | null
          reorder_level?: number
          selling_price?: number
          sku: string
          unit?: string
          unit_cost?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          company_id?: string
          created_at?: string
          current_stock?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_stock?: number | null
          name?: string
          name_ar?: string | null
          notes?: string | null
          reorder_level?: number
          selling_price?: number
          sku?: string
          unit?: string
          unit_cost?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "takzeen_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "takzeen_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takzeen_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takzeen_products_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "takzeen_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      takzeen_purchase_order_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          purchase_order_id: string
          quantity: number
          received_quantity: number
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          purchase_order_id: string
          quantity?: number
          received_quantity?: number
          total_cost?: number
          unit_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "takzeen_purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "takzeen_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takzeen_purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "takzeen_purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      takzeen_purchase_orders: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          expected_delivery: string | null
          id: string
          notes: string | null
          order_date: string
          po_number: string
          received_at: string | null
          status: string
          supplier_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number: string
          received_at?: string | null
          status?: string
          supplier_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number?: string
          received_at?: string | null
          status?: string
          supplier_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "takzeen_purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takzeen_purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "takzeen_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      takzeen_stock_movements: {
        Row: {
          company_id: string
          created_at: string
          id: string
          movement_date: string
          movement_type: string
          performed_by: string | null
          product_id: string
          quantity: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          unit_cost: number | null
          warehouse_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          movement_date?: string
          movement_type: string
          performed_by?: string | null
          product_id: string
          quantity: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          movement_date?: string
          movement_type?: string
          performed_by?: string | null
          product_id?: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "takzeen_stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takzeen_stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "takzeen_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takzeen_stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "takzeen_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      takzeen_suppliers: {
        Row: {
          address: string | null
          city: string | null
          company_id: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          name_ar: string | null
          notes: string | null
          payment_terms: string | null
          phone: string | null
          tax_number: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_ar?: string | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "takzeen_suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      takzeen_warehouses: {
        Row: {
          address: string | null
          city: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          manager_name: string | null
          name: string
          name_ar: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          manager_name?: string | null
          name: string
          name_ar?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          manager_name?: string | null
          name?: string
          name_ar?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "takzeen_warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_ai_insights: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          generated_at: string
          id: string
          insight_type: string
          recommendation: string | null
          scope_id: string | null
          scope_type: string
          severity: string
          title: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          generated_at?: string
          id?: string
          insight_type?: string
          recommendation?: string | null
          scope_id?: string | null
          scope_type?: string
          severity?: string
          title: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          generated_at?: string
          id?: string
          insight_type?: string
          recommendation?: string | null
          scope_id?: string | null
          scope_type?: string
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_ai_insights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_ai_recommendations: {
        Row: {
          company_id: string
          created_at: string
          id: string
          payload: Json | null
          recommendation_type: string
          status: string
          target_id: string | null
          target_type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          payload?: Json | null
          recommendation_type?: string
          status?: string
          target_id?: string | null
          target_type?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          payload?: Json | null
          recommendation_type?: string
          status?: string
          target_id?: string | null
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_ai_recommendations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_ai_snapshots: {
        Row: {
          company_id: string
          created_at: string
          id: string
          metrics_json: Json | null
          snapshot_date: string
          summary_json: Json | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          metrics_json?: Json | null
          snapshot_date?: string
          summary_json?: Json | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          metrics_json?: Json | null
          snapshot_date?: string
          summary_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_ai_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_blocked_dates: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          date: string
          id: string
          reason: string | null
          staff_profile_id: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          date: string
          id?: string
          reason?: string | null
          staff_profile_id?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          date?: string
          id?: string
          reason?: string | null
          staff_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_blocked_dates_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_blocked_dates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_blocked_dates_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_booking_history: {
        Row: {
          booking_id: string
          changed_at: string
          changed_by: string | null
          id: string
          notes: string | null
          status: string
        }
        Insert: {
          booking_id: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          notes?: string | null
          status: string
        }
        Update: {
          booking_id?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_booking_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_bookings: {
        Row: {
          booking_date: string
          branch_id: string | null
          buffer_after_minutes: number
          buffer_before_minutes: number
          company_id: string
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          deposit_amount: number | null
          deposit_status: string | null
          duration_minutes: number
          id: string
          notes: string | null
          original_date: string | null
          original_time_slot: string | null
          reschedule_count: number
          service_id: string
          source: string
          staff_profile_id: string
          status: string
          time_slot: string
          updated_at: string
        }
        Insert: {
          booking_date: string
          branch_id?: string | null
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          company_id: string
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          deposit_amount?: number | null
          deposit_status?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          original_date?: string | null
          original_time_slot?: string | null
          reschedule_count?: number
          service_id: string
          source?: string
          staff_profile_id: string
          status?: string
          time_slot: string
          updated_at?: string
        }
        Update: {
          booking_date?: string
          branch_id?: string | null
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          company_id?: string
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          deposit_amount?: number | null
          deposit_status?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          original_date?: string | null
          original_time_slot?: string | null
          reschedule_count?: number
          service_id?: string
          source?: string
          staff_profile_id?: string
          status?: string
          time_slot?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_bookings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_bookings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_bookings_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_branches: {
        Row: {
          address: string | null
          address_en: string | null
          company_id: string
          created_at: string
          id: string
          is_headquarters: boolean | null
          location: string | null
          name: string
          name_en: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_en?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_headquarters?: boolean | null
          location?: string | null
          name: string
          name_en?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_en?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_headquarters?: boolean | null
          location?: string | null
          name?: string
          name_en?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_customer_preferences: {
        Row: {
          cancellation_count: number
          company_id: string
          created_at: string
          customer_id: string
          id: string
          last_booking_date: string | null
          no_show_count: number
          preferred_branch_id: string | null
          preferred_days: number[] | null
          preferred_staff_id: string | null
          preferred_time_end: string | null
          preferred_time_start: string | null
          risk_score: number
          total_bookings: number
          updated_at: string
        }
        Insert: {
          cancellation_count?: number
          company_id: string
          created_at?: string
          customer_id: string
          id?: string
          last_booking_date?: string | null
          no_show_count?: number
          preferred_branch_id?: string | null
          preferred_days?: number[] | null
          preferred_staff_id?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          risk_score?: number
          total_bookings?: number
          updated_at?: string
        }
        Update: {
          cancellation_count?: number
          company_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          last_booking_date?: string | null
          no_show_count?: number
          preferred_branch_id?: string | null
          preferred_days?: number[] | null
          preferred_staff_id?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          risk_score?: number
          total_bookings?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_customer_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_customer_preferences_preferred_branch_id_fkey"
            columns: ["preferred_branch_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_customer_preferences_preferred_staff_id_fkey"
            columns: ["preferred_staff_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_holidays: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          date: string
          id: string
          is_recurring: boolean
          name: string
          name_en: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          date: string
          id?: string
          is_recurring?: boolean
          name: string
          name_en?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          date?: string
          id?: string
          is_recurring?: boolean
          name?: string
          name_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_holidays_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_holidays_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_loyalty_campaigns: {
        Row: {
          bonus_points: number
          campaign_type: string
          company_id: string
          conditions: Json
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          multiplier: number
          name: string
          name_en: string | null
          starts_at: string
        }
        Insert: {
          bonus_points?: number
          campaign_type?: string
          company_id: string
          conditions?: Json
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          multiplier?: number
          name: string
          name_en?: string | null
          starts_at?: string
        }
        Update: {
          bonus_points?: number
          campaign_type?: string
          company_id?: string
          conditions?: Json
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          multiplier?: number
          name?: string
          name_en?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_loyalty_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_loyalty_redemptions: {
        Row: {
          booking_id: string | null
          company_id: string
          customer_id: string
          id: string
          points_spent: number
          redeemed_at: string
          reward_id: string
          status: string
          used_at: string | null
          wallet_id: string
        }
        Insert: {
          booking_id?: string | null
          company_id: string
          customer_id: string
          id?: string
          points_spent: number
          redeemed_at?: string
          reward_id: string
          status?: string
          used_at?: string | null
          wallet_id: string
        }
        Update: {
          booking_id?: string | null
          company_id?: string
          customer_id?: string
          id?: string
          points_spent?: number
          redeemed_at?: string
          reward_id?: string
          status?: string
          used_at?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_loyalty_redemptions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_loyalty_redemptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_loyalty_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_loyalty_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_loyalty_redemptions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_loyalty_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_loyalty_rewards: {
        Row: {
          company_id: string
          created_at: string
          description_ar: string | null
          description_en: string | null
          discount_value: number | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_redemptions_per_customer: number | null
          min_points_required: number
          name: string
          name_en: string | null
          points_cost: number
          reward_type: string
          service_id: string | null
          starts_at: string | null
          total_available: number | null
          total_redeemed: number
        }
        Insert: {
          company_id: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions_per_customer?: number | null
          min_points_required?: number
          name: string
          name_en?: string | null
          points_cost?: number
          reward_type?: string
          service_id?: string | null
          starts_at?: string | null
          total_available?: number | null
          total_redeemed?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions_per_customer?: number | null
          min_points_required?: number
          name?: string
          name_en?: string | null
          points_cost?: number
          reward_type?: string
          service_id?: string | null
          starts_at?: string | null
          total_available?: number | null
          total_redeemed?: number
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_loyalty_rewards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_loyalty_rewards_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_services"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_loyalty_rules: {
        Row: {
          company_id: string
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean
          per_currency_amount: number | null
          points_amount: number
          rule_type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          per_currency_amount?: number | null
          points_amount?: number
          rule_type?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          per_currency_amount?: number | null
          points_amount?: number
          rule_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_loyalty_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_loyalty_tiers: {
        Row: {
          benefits: Json
          company_id: string
          created_at: string
          discount_percent: number
          id: string
          is_active: boolean
          min_points: number
          name: string
          name_en: string | null
          sort_order: number
        }
        Insert: {
          benefits?: Json
          company_id: string
          created_at?: string
          discount_percent?: number
          id?: string
          is_active?: boolean
          min_points?: number
          name: string
          name_en?: string | null
          sort_order?: number
        }
        Update: {
          benefits?: Json
          company_id?: string
          created_at?: string
          discount_percent?: number
          id?: string
          is_active?: boolean
          min_points?: number
          name?: string
          name_en?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_loyalty_tiers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_loyalty_transactions: {
        Row: {
          balance_after: number
          company_id: string
          created_at: string
          customer_id: string
          description_ar: string | null
          description_en: string | null
          expires_at: string | null
          id: string
          points: number
          source: string
          source_id: string | null
          type: string
          wallet_id: string
        }
        Insert: {
          balance_after?: number
          company_id: string
          created_at?: string
          customer_id: string
          description_ar?: string | null
          description_en?: string | null
          expires_at?: string | null
          id?: string
          points: number
          source?: string
          source_id?: string | null
          type?: string
          wallet_id: string
        }
        Update: {
          balance_after?: number
          company_id?: string
          created_at?: string
          customer_id?: string
          description_ar?: string | null
          description_en?: string | null
          expires_at?: string | null
          id?: string
          points?: number
          source?: string
          source_id?: string | null
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_loyalty_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_loyalty_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_loyalty_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_loyalty_wallets: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string
          id: string
          lifetime_points: number
          points_balance: number
          tier_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id: string
          id?: string
          lifetime_points?: number
          points_balance?: number
          tier_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          lifetime_points?: number
          points_balance?: number
          tier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_loyalty_wallets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_loyalty_wallets_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_loyalty_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_notification_jobs: {
        Row: {
          attempt_count: number
          channel: string
          company_id: string
          created_at: string
          customer_id: string | null
          event_type: string
          free_form_message: string | null
          id: string
          language: string | null
          last_error: string | null
          max_attempts: number
          next_retry_at: string | null
          phone_number: string
          response_summary: Json | null
          status: string
          template_params: Json | null
        }
        Insert: {
          attempt_count?: number
          channel?: string
          company_id: string
          created_at?: string
          customer_id?: string | null
          event_type: string
          free_form_message?: string | null
          id?: string
          language?: string | null
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          phone_number: string
          response_summary?: Json | null
          status?: string
          template_params?: Json | null
        }
        Update: {
          attempt_count?: number
          channel?: string
          company_id?: string
          created_at?: string
          customer_id?: string | null
          event_type?: string
          free_form_message?: string | null
          id?: string
          language?: string | null
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          phone_number?: string
          response_summary?: Json | null
          status?: string
          template_params?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_notification_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_notification_logs: {
        Row: {
          attempt_number: number | null
          channel: string
          company_id: string
          created_at: string
          customer_id: string | null
          delivery_status: string
          error_message: string | null
          event_type: string
          id: string
          job_id: string | null
          message_id: string | null
          metadata: Json | null
          phone_number: string | null
          response_summary: Json | null
          template_used: string | null
        }
        Insert: {
          attempt_number?: number | null
          channel?: string
          company_id: string
          created_at?: string
          customer_id?: string | null
          delivery_status?: string
          error_message?: string | null
          event_type: string
          id?: string
          job_id?: string | null
          message_id?: string | null
          metadata?: Json | null
          phone_number?: string | null
          response_summary?: Json | null
          template_used?: string | null
        }
        Update: {
          attempt_number?: number | null
          channel?: string
          company_id?: string
          created_at?: string
          customer_id?: string | null
          delivery_status?: string
          error_message?: string | null
          event_type?: string
          id?: string
          job_id?: string | null
          message_id?: string | null
          metadata?: Json | null
          phone_number?: string | null
          response_summary?: Json | null
          template_used?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_notification_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_notification_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_notification_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_payments: {
        Row: {
          amount: number
          booking_id: string
          company_id: string
          created_at: string
          currency: string
          deposit_portion: number | null
          gateway_reference: string | null
          id: string
          method: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          booking_id: string
          company_id: string
          created_at?: string
          currency?: string
          deposit_portion?: number | null
          gateway_reference?: string | null
          id?: string
          method?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          company_id?: string
          created_at?: string
          currency?: string
          deposit_portion?: number | null
          gateway_reference?: string | null
          id?: string
          method?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_service_categories: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          name_en: string | null
          sort_order: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          name_en?: string | null
          sort_order?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          name_en?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_service_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_services: {
        Row: {
          buffer_after_minutes: number
          buffer_before_minutes: number
          category_id: string | null
          company_id: string
          created_at: string
          currency: string
          description: string | null
          description_en: string | null
          duration_minutes: number
          id: string
          name: string
          name_en: string | null
          price: number
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          category_id?: string | null
          company_id: string
          created_at?: string
          currency?: string
          description?: string | null
          description_en?: string | null
          duration_minutes?: number
          id?: string
          name: string
          name_en?: string | null
          price?: number
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          category_id?: string | null
          company_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          description_en?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          name_en?: string | null
          price?: number
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_settings: {
        Row: {
          advance_booking_notice_hours: number
          booking_confirmation_style: string
          booking_window_days: number
          buffer_after_minutes: number
          buffer_before_minutes: number
          cancellation_window_hours: number
          company_id: string
          created_at: string
          currency: string
          default_language: string
          deposit_amount: number
          deposit_refundable: boolean
          deposit_required: boolean
          guest_booking_enabled: boolean
          id: string
          max_reschedules: number
          overbooking_enabled: boolean
          overbooking_max_percent: number
          premium_time_enabled: boolean
          premium_time_multiplier: number
          reminder_hours_before: number
          reschedule_window_hours: number
          slot_interval_minutes: number
          smart_assignment_enabled: boolean
          social_links: Json
          support_email: string | null
          support_phone: string | null
          updated_at: string
          waitlist_auto_fill: boolean
          waitlist_enabled: boolean
          waitlist_max_size: number
          walk_in_enabled: boolean
          walk_in_queue_mode: boolean
          whatsapp_business_phone: string | null
          whatsapp_notifications_enabled: boolean
        }
        Insert: {
          advance_booking_notice_hours?: number
          booking_confirmation_style?: string
          booking_window_days?: number
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          cancellation_window_hours?: number
          company_id: string
          created_at?: string
          currency?: string
          default_language?: string
          deposit_amount?: number
          deposit_refundable?: boolean
          deposit_required?: boolean
          guest_booking_enabled?: boolean
          id?: string
          max_reschedules?: number
          overbooking_enabled?: boolean
          overbooking_max_percent?: number
          premium_time_enabled?: boolean
          premium_time_multiplier?: number
          reminder_hours_before?: number
          reschedule_window_hours?: number
          slot_interval_minutes?: number
          smart_assignment_enabled?: boolean
          social_links?: Json
          support_email?: string | null
          support_phone?: string | null
          updated_at?: string
          waitlist_auto_fill?: boolean
          waitlist_enabled?: boolean
          waitlist_max_size?: number
          walk_in_enabled?: boolean
          walk_in_queue_mode?: boolean
          whatsapp_business_phone?: string | null
          whatsapp_notifications_enabled?: boolean
        }
        Update: {
          advance_booking_notice_hours?: number
          booking_confirmation_style?: string
          booking_window_days?: number
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          cancellation_window_hours?: number
          company_id?: string
          created_at?: string
          currency?: string
          default_language?: string
          deposit_amount?: number
          deposit_refundable?: boolean
          deposit_required?: boolean
          guest_booking_enabled?: boolean
          id?: string
          max_reschedules?: number
          overbooking_enabled?: boolean
          overbooking_max_percent?: number
          premium_time_enabled?: boolean
          premium_time_multiplier?: number
          reminder_hours_before?: number
          reschedule_window_hours?: number
          slot_interval_minutes?: number
          smart_assignment_enabled?: boolean
          social_links?: Json
          support_email?: string | null
          support_phone?: string | null
          updated_at?: string
          waitlist_auto_fill?: boolean
          waitlist_enabled?: boolean
          waitlist_max_size?: number
          walk_in_enabled?: boolean
          walk_in_queue_mode?: boolean
          whatsapp_business_phone?: string | null
          whatsapp_notifications_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_staff_profiles: {
        Row: {
          avatar_url: string | null
          booking_enabled: boolean
          company_id: string
          created_at: string
          default_branch_id: string | null
          display_name: string | null
          employee_id: string
          id: string
          is_visible: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          booking_enabled?: boolean
          company_id: string
          created_at?: string
          default_branch_id?: string | null
          display_name?: string | null
          employee_id: string
          id?: string
          is_visible?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          booking_enabled?: boolean
          company_id?: string
          created_at?: string
          default_branch_id?: string | null
          display_name?: string | null
          employee_id?: string
          id?: string
          is_visible?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_staff_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_staff_profiles_default_branch_id_fkey"
            columns: ["default_branch_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_staff_profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_staff_services: {
        Row: {
          id: string
          service_id: string
          staff_profile_id: string
        }
        Insert: {
          id?: string
          service_id: string
          staff_profile_id: string
        }
        Update: {
          id?: string
          service_id?: string
          staff_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_staff_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_staff_services_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_time_off: {
        Row: {
          date: string
          id: string
          reason: string | null
          staff_profile_id: string
        }
        Insert: {
          date: string
          id?: string
          reason?: string | null
          staff_profile_id: string
        }
        Update: {
          date?: string
          id?: string
          reason?: string | null
          staff_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_time_off_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_waitlist: {
        Row: {
          branch_id: string | null
          company_id: string
          converted_booking_id: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          notes: string | null
          notified_at: string | null
          preferred_date: string
          preferred_time_end: string | null
          preferred_time_start: string | null
          service_id: string | null
          staff_profile_id: string | null
          status: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          converted_booking_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          notified_at?: string | null
          preferred_date: string
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          service_id?: string | null
          staff_profile_id?: string | null
          status?: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          converted_booking_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          notified_at?: string | null
          preferred_date?: string
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          service_id?: string | null
          staff_profile_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_waitlist_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_waitlist_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_waitlist_converted_booking_id_fkey"
            columns: ["converted_booking_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_waitlist_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_waitlist_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_walk_ins: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          notes: string | null
          queue_position: number
          service_id: string | null
          staff_profile_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          queue_position?: number
          service_id?: string | null
          staff_profile_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          queue_position?: number
          service_id?: string | null
          staff_profile_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_walk_ins_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_walk_ins_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_walk_ins_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tathbeet_walk_ins_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tathbeet_working_hours: {
        Row: {
          day_of_week: number
          end_time: string
          id: string
          staff_profile_id: string
          start_time: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          id?: string
          staff_profile_id: string
          start_time: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          id?: string
          staff_profile_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "tathbeet_working_hours_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "tathbeet_staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_addons: {
        Row: {
          addon_key: string | null
          addon_package_id: string
          billing_cycle: string | null
          company_id: string
          created_at: string
          custom_price: number | null
          expires_at: string | null
          id: string
          notes: string | null
          started_at: string
          status: string
          updated_at: string | null
        }
        Insert: {
          addon_key?: string | null
          addon_package_id: string
          billing_cycle?: string | null
          company_id: string
          created_at?: string
          custom_price?: number | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          addon_key?: string | null
          addon_package_id?: string
          billing_cycle?: string | null
          company_id?: string
          created_at?: string
          custom_price?: number | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_addons_addon_package_id_fkey"
            columns: ["addon_package_id"]
            isOneToOne: false
            referencedRelation: "ai_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_addons_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_ai_features: {
        Row: {
          ai_employee_career_coach: boolean | null
          ai_gap_analysis: boolean | null
          ai_hr_assistant: boolean | null
          ai_planning_advisor: boolean | null
          ai_recruitment_intelligence: boolean | null
          ai_workforce_analytics: boolean | null
          company_id: string
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          ai_employee_career_coach?: boolean | null
          ai_gap_analysis?: boolean | null
          ai_hr_assistant?: boolean | null
          ai_planning_advisor?: boolean | null
          ai_recruitment_intelligence?: boolean | null
          ai_workforce_analytics?: boolean | null
          company_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          ai_employee_career_coach?: boolean | null
          ai_gap_analysis?: boolean | null
          ai_hr_assistant?: boolean | null
          ai_planning_advisor?: boolean | null
          ai_recruitment_intelligence?: boolean | null
          ai_workforce_analytics?: boolean | null
          company_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_ai_features_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_ai_quotas: {
        Row: {
          billing_cycle_start: string
          company_id: string
          id: string
          monthly_request_limit: number
          monthly_token_limit: number
          package: string
          requests_used: number
          tokens_used: number
          updated_at: string
        }
        Insert: {
          billing_cycle_start?: string
          company_id: string
          id?: string
          monthly_request_limit?: number
          monthly_token_limit?: number
          package?: string
          requests_used?: number
          tokens_used?: number
          updated_at?: string
        }
        Update: {
          billing_cycle_start?: string
          company_id?: string
          id?: string
          monthly_request_limit?: number
          monthly_token_limit?: number
          package?: string
          requests_used?: number
          tokens_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_ai_quotas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_ai_subscription: {
        Row: {
          company_id: string
          created_at: string
          expires_at: string | null
          id: string
          package_id: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          package_id: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          package_id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_ai_subscription_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_ai_subscription_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "ai_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_feature_overrides: {
        Row: {
          company_id: string
          created_at: string
          enabled: boolean
          feature_key: string
          id: string
          limit_override: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          enabled?: boolean
          feature_key: string
          id?: string
          limit_override?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          limit_override?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_feature_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_features: {
        Row: {
          activated_at: string
          activated_by: string | null
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          custom_price: number | null
          deactivated_at: string | null
          feature_key: string
          id: string
          module_key: string | null
          notes: string | null
          requested_by: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string
          activated_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          custom_price?: number | null
          deactivated_at?: string | null
          feature_key: string
          id?: string
          module_key?: string | null
          notes?: string | null
          requested_by?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string
          activated_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          custom_price?: number | null
          deactivated_at?: string | null
          feature_key?: string
          id?: string
          module_key?: string | null
          notes?: string | null
          requested_by?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_features_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          company_id: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          company_id: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          company_id?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          ai_package_id: string | null
          auto_renew: boolean
          billing_cycle: string
          company_id: string
          created_at: string
          created_by: string | null
          current_price_snapshot: Json | null
          custom_monthly_price: number | null
          custom_yearly_price: number | null
          end_date: string | null
          id: string
          included_features_snapshot: Json | null
          included_limits_snapshot: Json | null
          next_billing_date: string | null
          notes: string | null
          plan_id: string
          start_date: string
          status: string
          trial_end_date: string | null
          updated_at: string
        }
        Insert: {
          ai_package_id?: string | null
          auto_renew?: boolean
          billing_cycle?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          current_price_snapshot?: Json | null
          custom_monthly_price?: number | null
          custom_yearly_price?: number | null
          end_date?: string | null
          id?: string
          included_features_snapshot?: Json | null
          included_limits_snapshot?: Json | null
          next_billing_date?: string | null
          notes?: string | null
          plan_id: string
          start_date?: string
          status?: string
          trial_end_date?: string | null
          updated_at?: string
        }
        Update: {
          ai_package_id?: string | null
          auto_renew?: boolean
          billing_cycle?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          current_price_snapshot?: Json | null
          custom_monthly_price?: number | null
          custom_yearly_price?: number | null
          end_date?: string | null
          id?: string
          included_features_snapshot?: Json | null
          included_limits_snapshot?: Json | null
          next_billing_date?: string | null
          notes?: string | null
          plan_id?: string
          start_date?: string
          status?: string
          trial_end_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_ai_package_id_fkey"
            columns: ["ai_package_id"]
            isOneToOne: false
            referencedRelation: "ai_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_usage: {
        Row: {
          ai_requests: number
          api_calls: number
          company_id: string
          created_at: string
          employee_count: number
          id: string
          month: number
          storage_used_mb: number
          year: number
        }
        Insert: {
          ai_requests?: number
          api_calls?: number
          company_id: string
          created_at?: string
          employee_count?: number
          id?: string
          month: number
          storage_used_mb?: number
          year: number
        }
        Update: {
          ai_requests?: number
          api_calls?: number
          company_id?: string
          created_at?: string
          employee_count?: number
          id?: string
          month?: number
          storage_used_mb?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenant_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheets: {
        Row: {
          approved_by: string | null
          calculated_cost: number | null
          company_id: string
          created_at: string
          date: string
          description: string | null
          employee_id: string
          hours: number
          id: string
          project_id: string
          status: string | null
        }
        Insert: {
          approved_by?: string | null
          calculated_cost?: number | null
          company_id: string
          created_at?: string
          date: string
          description?: string | null
          employee_id: string
          hours?: number
          id?: string
          project_id: string
          status?: string | null
        }
        Update: {
          approved_by?: string | null
          calculated_cost?: number | null
          company_id?: string
          created_at?: string
          date?: string
          description?: string | null
          employee_id?: string
          hours?: number
          id?: string
          project_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      training_courses: {
        Row: {
          company_id: string
          cost: number | null
          course_type: string | null
          created_at: string
          description: string | null
          duration_hours: number | null
          end_date: string | null
          id: string
          is_mandatory: boolean | null
          max_participants: number | null
          start_date: string | null
          status: string
          title: string
          trainer: string | null
        }
        Insert: {
          company_id: string
          cost?: number | null
          course_type?: string | null
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          end_date?: string | null
          id?: string
          is_mandatory?: boolean | null
          max_participants?: number | null
          start_date?: string | null
          status?: string
          title: string
          trainer?: string | null
        }
        Update: {
          company_id?: string
          cost?: number | null
          course_type?: string | null
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          end_date?: string | null
          id?: string
          is_mandatory?: boolean | null
          max_participants?: number | null
          start_date?: string | null
          status?: string
          title?: string
          trainer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_courses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      training_enrollments: {
        Row: {
          certificate_path: string | null
          completed_at: string | null
          completion_date: string | null
          course_id: string
          created_at: string
          employee_id: string
          id: string
          score: number | null
          status: string
        }
        Insert: {
          certificate_path?: string | null
          completed_at?: string | null
          completion_date?: string | null
          course_id: string
          created_at?: string
          employee_id: string
          id?: string
          score?: number | null
          status?: string
        }
        Update: {
          certificate_path?: string | null
          completed_at?: string | null
          completion_date?: string | null
          course_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          score?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          id: string
          period: string
          usage_type: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          id?: string
          period: string
          usage_type: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          id?: string
          period?: string
          usage_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ai_overrides: {
        Row: {
          ai_employee_career_coach: boolean | null
          ai_enabled: boolean | null
          ai_gap_analysis: boolean | null
          ai_hr_assistant: boolean | null
          ai_planning_advisor: boolean | null
          ai_recruitment_intelligence: boolean | null
          ai_workforce_analytics: boolean | null
          company_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_employee_career_coach?: boolean | null
          ai_enabled?: boolean | null
          ai_gap_analysis?: boolean | null
          ai_hr_assistant?: boolean | null
          ai_planning_advisor?: boolean | null
          ai_recruitment_intelligence?: boolean | null
          ai_workforce_analytics?: boolean | null
          company_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_employee_career_coach?: boolean | null
          ai_enabled?: boolean | null
          ai_gap_analysis?: boolean | null
          ai_hr_assistant?: boolean | null
          ai_planning_advisor?: boolean | null
          ai_recruitment_intelligence?: boolean | null
          ai_workforce_analytics?: boolean | null
          company_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ai_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          scope_type: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          scope_type?: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          scope_type?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempt_count: number
          company_id: string
          created_at: string
          delivered_at: string | null
          endpoint_id: string
          event: string
          id: string
          next_retry_at: string | null
          payload: Json | null
          response_body: string | null
          response_status: number | null
          status: string
        }
        Insert: {
          attempt_count?: number
          company_id: string
          created_at?: string
          delivered_at?: string | null
          endpoint_id: string
          event: string
          id?: string
          next_retry_at?: string | null
          payload?: Json | null
          response_body?: string | null
          response_status?: number | null
          status?: string
        }
        Update: {
          attempt_count?: number
          company_id?: string
          created_at?: string
          delivered_at?: string | null
          endpoint_id?: string
          event?: string
          id?: string
          next_retry_at?: string | null
          payload?: Json | null
          response_body?: string | null
          response_status?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          events: string[]
          id: string
          is_active: boolean
          secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_instances: {
        Row: {
          approved_at: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          current_approver_id: string | null
          current_approver_position_id: string | null
          current_step_order: number
          due_date: string | null
          fallback_used: boolean | null
          final_comments: string | null
          id: string
          is_escalated: boolean
          reference_id: string
          rejected_at: string | null
          request_type: string
          requester_user_id: string
          routing_mode: string | null
          routing_snapshot: Json | null
          status: string
          submitted_at: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          current_approver_id?: string | null
          current_approver_position_id?: string | null
          current_step_order?: number
          due_date?: string | null
          fallback_used?: boolean | null
          final_comments?: string | null
          id?: string
          is_escalated?: boolean
          reference_id: string
          rejected_at?: string | null
          request_type: string
          requester_user_id: string
          routing_mode?: string | null
          routing_snapshot?: Json | null
          status?: string
          submitted_at?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          current_approver_id?: string | null
          current_approver_position_id?: string | null
          current_step_order?: number
          due_date?: string | null
          fallback_used?: boolean | null
          final_comments?: string | null
          id?: string
          is_escalated?: boolean
          reference_id?: string
          rejected_at?: string | null
          request_type?: string
          requester_user_id?: string
          routing_mode?: string | null
          routing_snapshot?: Json | null
          status?: string
          submitted_at?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_instances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instances_current_approver_position_id_fkey"
            columns: ["current_approver_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          approver_position_id: string | null
          approver_role: string | null
          auto_approve_condition: string | null
          created_at: string
          department_scope: boolean
          fallback_mode: string | null
          id: string
          is_optional: boolean
          name: string
          responsibility_key: string | null
          routing_mode: string
          skip_if_position_vacant: boolean
          sla_hours: number | null
          step_order: number
          template_id: string
          updated_at: string
        }
        Insert: {
          approver_position_id?: string | null
          approver_role?: string | null
          auto_approve_condition?: string | null
          created_at?: string
          department_scope?: boolean
          fallback_mode?: string | null
          id?: string
          is_optional?: boolean
          name: string
          responsibility_key?: string | null
          routing_mode?: string
          skip_if_position_vacant?: boolean
          sla_hours?: number | null
          step_order?: number
          template_id: string
          updated_at?: string
        }
        Update: {
          approver_position_id?: string | null
          approver_role?: string | null
          auto_approve_condition?: string | null
          created_at?: string
          department_scope?: boolean
          fallback_mode?: string | null
          id?: string
          is_optional?: boolean
          name?: string
          responsibility_key?: string | null
          routing_mode?: string
          skip_if_position_vacant?: boolean
          sla_hours?: number | null
          step_order?: number
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_approver_position_id_fkey"
            columns: ["approver_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          auto_generate_doc_type: string | null
          auto_generate_document: boolean
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          request_type: string
          target_document_type: string | null
          target_signatory_id: string | null
          updated_at: string
        }
        Insert: {
          auto_generate_doc_type?: string | null
          auto_generate_document?: boolean
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          request_type: string
          target_document_type?: string | null
          target_signatory_id?: string | null
          updated_at?: string
        }
        Update: {
          auto_generate_doc_type?: string | null
          auto_generate_document?: boolean
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          request_type?: string
          target_document_type?: string | null
          target_signatory_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_templates_target_signatory_id_fkey"
            columns: ["target_signatory_id"]
            isOneToOne: false
            referencedRelation: "company_signatories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_addon_request: {
        Args: {
          p_action?: string
          p_custom_price?: number
          p_request_id: string
        }
        Returns: Json
      }
      approve_feature_request: {
        Args: { p_request_id: string; p_reviewer_notes?: string }
        Returns: undefined
      }
      approve_subscription_change: {
        Args: { p_action?: string; p_request_id: string }
        Returns: Json
      }
      assign_platform_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_target_user_id: string
        }
        Returns: undefined
      }
      assign_tenant_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_target_user_id: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      auto_generate_document_on_approval: {
        Args: { p_instance_id: string }
        Returns: string
      }
      calculate_basket_bill: { Args: { p_company_id: string }; Returns: Json }
      can_access_employee: { Args: { p_employee_id: string }; Returns: boolean }
      cancel_local_access_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      check_basket_feature: {
        Args: { p_company_id: string; p_feature_key: string }
        Returns: boolean
      }
      check_overdue_approvals: { Args: never; Returns: Json }
      create_default_leave_types: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      create_default_workflows: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      create_workflow_instance: {
        Args: {
          p_company_id?: string
          p_reference_id: string
          p_request_type: string
        }
        Returns: string
      }
      generate_api_key: {
        Args: { p_company_id: string; p_name?: string; p_scopes?: string[] }
        Returns: Json
      }
      generate_position_code: {
        Args: { p_company_id: string }
        Returns: string
      }
      generate_request_reference: {
        Args: { p_company_id: string; p_request_type: string }
        Returns: string
      }
      generate_tenant_invoice: {
        Args: { p_billing_period?: string; p_company_id: string }
        Returns: Json
      }
      get_accessible_position_ids: {
        Args: { p_user_id: string }
        Returns: string[]
      }
      get_direct_report_ids: {
        Args: { p_manager_user_id: string }
        Returns: string[]
      }
      get_employee_project_managers: {
        Args: { p_employee_id: string }
        Returns: Json
      }
      get_feature_access:
        | { Args: { p_company_id: string; p_user_id?: string }; Returns: Json }
        | {
            Args: {
              p_company_id: string
              p_position_id?: string
              p_user_id?: string
            }
            Returns: Json
          }
      get_is_manager_of: {
        Args: { p_actor_uid: string; p_target_employee_id: string }
        Returns: boolean
      }
      get_is_platform_admin: { Args: { p_user_id?: string }; Returns: boolean }
      get_is_tenant_hr: {
        Args: { p_company_id?: string; p_user_id?: string }
        Returns: boolean
      }
      get_madad_dashboard_stats: {
        Args: { p_company_id: string }
        Returns: Json
      }
      get_madad_subscription_details: {
        Args: { p_company_id: string }
        Returns: Json
      }
      get_managed_position_ids: { Args: never; Returns: string[] }
      get_my_ai_entitlements: { Args: never; Returns: Json }
      get_my_company_id: { Args: never; Returns: string }
      get_my_position_id: { Args: never; Returns: string }
      get_my_visible_workflow_instances: {
        Args: { p_request_type?: string; p_status?: string }
        Returns: {
          approved_at: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          current_approver_id: string | null
          current_approver_position_id: string | null
          current_step_order: number
          due_date: string | null
          fallback_used: boolean | null
          final_comments: string | null
          id: string
          is_escalated: boolean
          reference_id: string
          rejected_at: string | null
          request_type: string
          requester_user_id: string
          routing_mode: string | null
          routing_snapshot: Json | null
          status: string
          submitted_at: string | null
          template_id: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "workflow_instances"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_platform_revenue_metrics: { Args: never; Returns: Json }
      get_project_cost_allocation: {
        Args: { p_project_id: string }
        Returns: Json
      }
      get_tenant_entitlements: { Args: { p_company_id: string }; Returns: Json }
      get_tenant_usage_summary: {
        Args: { p_company_id: string }
        Returns: Json
      }
      get_user_portal: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_employee_leave_balances: {
        Args: { p_company_id: string; p_employee_id: string }
        Returns: undefined
      }
      is_manager_of: {
        Args: { p_employee_id: string; p_manager_user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      preview_tenant_bill: { Args: { p_company_id: string }; Returns: Json }
      process_approval_action: {
        Args: {
          p_action: string
          p_comments?: string
          p_instance_id: string
          p_signature_data?: string
        }
        Returns: Json
      }
      provision_local_node: {
        Args: {
          p_node_name: string
          p_request_id: string
          p_review_notes?: string
        }
        Returns: Json
      }
      recover_own_role: { Args: never; Returns: Json }
      refresh_local_node_entitlements: {
        Args: { p_node_id: string }
        Returns: Json
      }
      reject_feature_request: {
        Args: { p_request_id: string; p_reviewer_notes?: string }
        Returns: undefined
      }
      reject_local_access_request: {
        Args: { p_request_id: string; p_review_notes?: string }
        Returns: undefined
      }
      remove_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_target_user_id: string
        }
        Returns: undefined
      }
      repair_stuck_workflow_instances: { Args: never; Returns: Json }
      reparent_department: {
        Args: { p_department_id: string; p_new_parent_department_id?: string }
        Returns: undefined
      }
      request_local_access: { Args: { p_notes?: string }; Returns: string }
      resolve_hierarchy_approver: {
        Args: { p_company_id: string; p_requester_position_id: string }
        Returns: {
          approver_name: string
          approver_position_id: string
          approver_user_id: string
          depth: number
        }[]
      }
      resolve_managed_employee_ids: { Args: never; Returns: string[] }
      resolve_my_position_id: { Args: never; Returns: string }
      resolve_position_approver:
        | {
            Args: { p_company_id: string; p_position_id: string }
            Returns: {
              approver_name: string
              approver_position: string
              approver_user_id: string
            }[]
          }
        | {
            Args: { p_requester_position_id: string; p_step_order?: number }
            Returns: {
              approver_name: string
              approver_position_id: string
              approver_user_id: string
            }[]
          }
      resolve_position_approver_full: {
        Args: {
          p_company_id: string
          p_fallback_mode?: string
          p_position_id: string
        }
        Returns: {
          fallback_applied: boolean
          position_title: string
          user_id: string
          user_name: string
        }[]
      }
      revoke_api_key: { Args: { p_key_id: string }; Returns: undefined }
      set_local_node_status: {
        Args: { p_node_id: string; p_status: string }
        Returns: undefined
      }
      sync_approval_to_source: {
        Args: {
          p_new_status: string
          p_reference_id: string
          p_request_type: string
        }
        Returns: undefined
      }
      transfer_employee_position: {
        Args: {
          p_employee_id: string
          p_new_position_id: string
          p_reason?: string
        }
        Returns: Json
      }
      transition_subscription_status: {
        Args: {
          p_new_status: string
          p_reason?: string
          p_subscription_id: string
        }
        Returns: Json
      }
      update_own_employee_profile: {
        Args: {
          p_address?: string
          p_avatar_url?: string
          p_emergency_contact_name?: string
          p_emergency_contact_phone?: string
          p_phone?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "hr_manager"
        | "employee"
        | "super_admin"
        | "business_admin"
        | "finance_manager"
        | "support_agent"
        | "sales_manager"
        | "technical_admin"
        | "tenant_admin"
        | "hr_officer"
        | "manager"
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
      app_role: [
        "admin",
        "hr_manager",
        "employee",
        "super_admin",
        "business_admin",
        "finance_manager",
        "support_agent",
        "sales_manager",
        "technical_admin",
        "tenant_admin",
        "hr_officer",
        "manager",
      ],
    },
  },
} as const
