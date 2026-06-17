// Auto-typed Supabase schema for LP Development Vacation System
// Keep in sync with 0001_initial_schema.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'employee' | 'manager' | 'hr' | 'admin'
export type EmployeeStatus = 'active' | 'on_leave' | 'on_vacation' | 'terminated' | 'inactive'
export type RequestStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled'
export type ApprovalDecision = 'pending' | 'approved' | 'rejected'
export type NotificationType = 'request_submitted' | 'approved' | 'rejected' | 'balance_warning' | 'reminder'
export type PaymentCalcBasis = 'avg_11m' | 'last_base'

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          ruc: string | null
          legal_rep: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          ruc?: string | null
          legal_rep?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          ruc?: string | null
          legal_rep?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          company_id: string
          name: string
          full_label: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          full_label?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          full_label?: string | null
          active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          id: string
          email: string | null
          username: string
          role: UserRole
          password_hash: string | null
          password_changed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email?: string | null
          username: string
          role?: UserRole
          password_hash?: string | null
          password_changed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          username?: string
          role?: UserRole
          password_hash?: string | null
          password_changed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          id: string
          company_id: string
          project_id: string | null
          user_id: string | null
          employee_code: string
          cedula: string | null
          full_name: string
          first_name: string | null
          last_name: string | null
          genero: string | null
          email: string
          username: string
          position: string | null
          department: string | null
          jefe_directo: string | null
          manager_id: string | null
          hire_date: string
          terminated_at: string | null
          mes_vacaciones: string | null
          dias_pendientes: number
          dias_base: number | null
          fecha_base: string | null
          dias_enfermedad: number
          monthly_salary: number | null
          status: EmployeeStatus
          role: UserRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          project_id?: string | null
          user_id?: string | null
          employee_code: string
          cedula?: string | null
          full_name: string
          first_name?: string | null
          last_name?: string | null
          genero?: string | null
          email: string
          username: string
          position?: string | null
          department?: string | null
          jefe_directo?: string | null
          manager_id?: string | null
          hire_date: string
          terminated_at?: string | null
          mes_vacaciones?: string | null
          dias_pendientes?: number
          dias_base?: number | null
          fecha_base?: string | null
          dias_enfermedad?: number
          monthly_salary?: number | null
          status?: EmployeeStatus
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          project_id?: string | null
          user_id?: string | null
          employee_code?: string
          cedula?: string | null
          full_name?: string
          first_name?: string | null
          last_name?: string | null
          genero?: string | null
          email?: string
          username?: string
          position?: string | null
          department?: string | null
          jefe_directo?: string | null
          manager_id?: string | null
          hire_date?: string
          terminated_at?: string | null
          mes_vacaciones?: string | null
          dias_pendientes?: number
          dias_base?: number | null
          fecha_base?: string | null
          dias_enfermedad?: number
          monthly_salary?: number | null
          status?: EmployeeStatus
          role?: UserRole
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      vacation_policies: {
        Row: {
          id: string
          company_id: string | null
          name: string
          is_default: boolean
          accrual_days_per_month: number
          max_accumulated_days: number
          max_accumulated_periods: number
          allow_fraction: boolean
          max_fractions: number
          advance_notice_days: number
          payment_lead_days: number
          payment_calc_basis: PaymentCalcBasis
          approval_levels: number
          created_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          name: string
          is_default?: boolean
          accrual_days_per_month?: number
          max_accumulated_days?: number
          max_accumulated_periods?: number
          allow_fraction?: boolean
          max_fractions?: number
          advance_notice_days?: number
          payment_lead_days?: number
          payment_calc_basis?: PaymentCalcBasis
          approval_levels?: number
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          name?: string
          is_default?: boolean
          accrual_days_per_month?: number
          max_accumulated_days?: number
          max_accumulated_periods?: number
          allow_fraction?: boolean
          max_fractions?: number
          advance_notice_days?: number
          payment_lead_days?: number
          payment_calc_basis?: PaymentCalcBasis
          approval_levels?: number
        }
        Relationships: []
      }
      leave_types: {
        Row: {
          id: string
          code: string
          name: string
          name_es: string
          is_paid: boolean
          affects_balance: boolean
          max_days_per_year: number | null
          requires_document: boolean
          legal_basis: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          name_es: string
          is_paid?: boolean
          affects_balance?: boolean
          max_days_per_year?: number | null
          requires_document?: boolean
          legal_basis?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          name_es?: string
          is_paid?: boolean
          affects_balance?: boolean
          max_days_per_year?: number | null
          requires_document?: boolean
          legal_basis?: string | null
          active?: boolean
        }
        Relationships: []
      }
      vacation_balances: {
        Row: {
          id: string
          employee_id: string
          policy_id: string
          period_year: number
          accrued_days: number
          used_days: number
          available_days: number
          accumulation_authorized_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          policy_id: string
          period_year: number
          accrued_days?: number
          used_days?: number
          available_days?: number
          accumulation_authorized_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          policy_id?: string
          period_year?: number
          accrued_days?: number
          used_days?: number
          available_days?: number
          accumulation_authorized_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacation_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_balances_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "vacation_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      vacation_requests: {
        Row: {
          id: string
          company_id: string
          employee_id: string
          policy_id: string
          leave_type_id: string | null
          start_date: string
          end_date: string
          business_days: number
          calendar_days: number
          reason: string | null
          status: RequestStatus
          fraction_index: number
          fraction_total: number
          short_notice: boolean
          short_notice_ack: boolean
          submitted_at: string | null
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          request_type: string
          incapacidad_url: string | null
          incapacidad_ref: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          employee_id: string
          policy_id: string
          leave_type_id?: string | null
          start_date: string
          end_date: string
          business_days: number
          calendar_days: number
          reason?: string | null
          status?: RequestStatus
          fraction_index?: number
          fraction_total?: number
          short_notice?: boolean
          short_notice_ack?: boolean
          submitted_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          request_type?: string
          incapacidad_url?: string | null
          incapacidad_ref?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          employee_id?: string
          policy_id?: string
          leave_type_id?: string | null
          start_date?: string
          end_date?: string
          business_days?: number
          calendar_days?: number
          reason?: string | null
          status?: RequestStatus
          fraction_index?: number
          fraction_total?: number
          short_notice?: boolean
          short_notice_ack?: boolean
          submitted_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          request_type?: string
          incapacidad_url?: string | null
          incapacidad_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacation_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_requests_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "vacation_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_steps: {
        Row: {
          id: string
          company_id: string
          request_id: string
          step_order: number
          approver_id: string
          decision: ApprovalDecision
          notes: string | null
          decided_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          request_id: string
          step_order?: number
          approver_id: string
          decision?: ApprovalDecision
          notes?: string | null
          decided_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          request_id?: string
          step_order?: number
          approver_id?: string
          decision?: ApprovalDecision
          notes?: string | null
          decided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_steps_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_steps_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "vacation_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_steps_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          id: string
          company_id: string | null
          actor_id: string
          actor_email: string | null
          action: string
          entity_type: string
          entity_id: string | null
          before_state: Json | null
          after_state: Json | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          actor_id: string
          actor_email?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          before_state?: Json | null
          after_state?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          actor_id?: string
          actor_email?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          before_state?: Json | null
          after_state?: Json | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          company_id: string | null
          recipient_id: string
          type: NotificationType
          title: string
          body: string | null
          link_url: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          recipient_id: string
          type: NotificationType
          title: string
          body?: string | null
          link_url?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          recipient_id?: string
          type?: NotificationType
          title?: string
          body?: string | null
          link_url?: string | null
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_events: {
        Row: {
          id: string
          company_id: string
          employee_id: string
          source_type: string
          source_id: string | null
          event_type: string
          scheduled_at: string
          calc_basis: PaymentCalcBasis | null
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          employee_id: string
          source_type: string
          source_id?: string | null
          event_type: string
          scheduled_at: string
          calc_basis?: PaymentCalcBasis | null
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          employee_id?: string
          source_type?: string
          source_id?: string | null
          event_type?: string
          scheduled_at?: string
          calc_basis?: PaymentCalcBasis | null
          processed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_events_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      increment_used_days: {
        Args: { p_employee_id: string; p_period_year: number; p_days: number }
        Returns: void
      }
      get_employee_for_user: {
        Args: { p_user_id: string }
        Returns: Database['public']['Tables']['employees']['Row'][]
      }
      get_user_role: {
        Args: { p_user_id: string }
        Returns: UserRole
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_manager_or_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      verify_password: {
        Args: { p_hash: string; p_password: string }
        Returns: boolean
      }
      admin_reset_password: {
        Args: { p_user_id: string; p_new_password: string }
        Returns: boolean
      }
      create_app_user: {
        Args: { p_username: string; p_email: string | null; p_role: string; p_password: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role: UserRole
      employee_status: EmployeeStatus
      request_status: RequestStatus
      approval_decision: ApprovalDecision
      notification_type: NotificationType
      payment_calc_basis: PaymentCalcBasis
    }
  }
}
