/**
 * Supabase database type definitions for LexGuard Legal.
 *
 * This file was initially hand-authored to match the migrations in
 * supabase/migrations/. Regenerate from the live schema with:
 *
 *   npm run types:gen
 *
 * (Requires SUPABASE_PROJECT_REF env var — see .env.example)
 */

// ---------------------------------------------------------------------------
// Enum types
// ---------------------------------------------------------------------------
// Contract Intelligence enums
export type ContractType = 'nda' | 'msa' | 'sla' | 'employment' | 'vendor' | 'lease' | 'shareholder' | 'loan' | 'jv' | 'other'
export type ContractExecutionStatus = 'draft' | 'under_review' | 'executed' | 'archived' | 'analysis_failed'
export type FlagSeverity = 'low' | 'medium' | 'high' | 'critical'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type FlagCategory = 'dpdp' | 'gst' | 'contract_act' | 'it_act' | 'companies_act' | 'labour' | 'sebi' | 'fema' | 'commercial' | 'drafting'

export type OrgType = 'solo' | 'boutique' | 'large_firm' | 'corporate_legal' | 'other'
export type PlanTier = 'solo' | 'boutique' | 'firm' | 'enterprise'
export type PlanStatus = 'trial' | 'active' | 'past_due' | 'cancelled'
export type BillingCycle = 'monthly' | 'annual'
export type MemberRole = 'admin' | 'senior_lawyer' | 'lawyer' | 'reviewer' | 'read_only' | 'client'
export type MemberStatus = 'active' | 'invited' | 'suspended'
export type PreferredLanguage = 'en' | 'hi'
export type NotificationType = 'info' | 'warning' | 'error' | 'success' | 'deadline' | 'approval'

// ---------------------------------------------------------------------------
// Contract JSONB shapes
// ---------------------------------------------------------------------------
export interface KeyTerms {
  parties?: string[]
  term?: string
  payment?: string
  ip?: string
  termination?: string
  liability?: string
}

// ---------------------------------------------------------------------------
// Address JSONB shape
// ---------------------------------------------------------------------------
export interface OrgAddress {
  line1?: string
  city?: string
  state?: string
  pincode?: string
  country?: string
}

// ---------------------------------------------------------------------------
// Database schema type (matches Supabase generated format)
// ---------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          legal_name: string | null
          type: OrgType
          gstin: string | null
          pan: string | null
          address: OrgAddress | null
          primary_contact: string | null
          plan_tier: PlanTier
          plan_status: PlanStatus
          trial_ends_at: string | null
          billing_cycle: BillingCycle
          data_residency: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          legal_name?: string | null
          type?: OrgType
          gstin?: string | null
          pan?: string | null
          address?: OrgAddress | null
          primary_contact?: string | null
          plan_tier?: PlanTier
          plan_status?: PlanStatus
          trial_ends_at?: string | null
          billing_cycle?: BillingCycle
          data_residency?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          legal_name?: string | null
          type?: OrgType
          gstin?: string | null
          pan?: string | null
          address?: OrgAddress | null
          primary_contact?: string | null
          plan_tier?: PlanTier
          plan_status?: PlanStatus
          trial_ends_at?: string | null
          billing_cycle?: BillingCycle
          data_residency?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }

      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          preferred_language: PreferredLanguage
          avatar_url: string | null
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          preferred_language?: PreferredLanguage
          avatar_url?: string | null
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          phone?: string | null
          preferred_language?: PreferredLanguage
          avatar_url?: string | null
          last_login_at?: string | null
          updated_at?: string
        }
      }

      org_members: {
        Row: {
          id: string
          org_id: string
          user_id: string
          role: MemberRole
          status: MemberStatus
          invited_by: string | null
          joined_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          role?: MemberRole
          status?: MemberStatus
          invited_by?: string | null
          joined_at?: string | null
          created_at?: string
        }
        Update: {
          role?: MemberRole
          status?: MemberStatus
          invited_by?: string | null
          joined_at?: string | null
        }
      }

      user_session_state: {
        Row: {
          user_id: string
          active_org_id: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          active_org_id?: string | null
          updated_at?: string
        }
        Update: {
          active_org_id?: string | null
          updated_at?: string
        }
      }

      audit_log: {
        Row: {
          id: string
          org_id: string
          user_id: string
          entity_type: string
          entity_id: string
          action: string
          before_state: Record<string, unknown> | null
          after_state: Record<string, unknown> | null
          metadata: Record<string, unknown> | null
          prev_hash: string
          row_hash: string
          created_at: string
        }
        Insert: never  // use log_audit_event() RPC instead
        Update: never  // append-only
      }

      contracts: {
        Row: {
          id: string
          org_id: string
          title: string
          counterparty: string | null
          contract_type: ContractType
          governing_law_state: string | null
          execution_status: ContractExecutionStatus
          risk_score: number | null
          risk_level: RiskLevel | null
          owner_id: string | null
          effective_date: string | null
          expiry_date: string | null
          analysis_completed_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          title: string
          counterparty?: string | null
          contract_type?: ContractType
          governing_law_state?: string | null
          execution_status?: ContractExecutionStatus
          risk_score?: number | null
          risk_level?: RiskLevel | null
          owner_id?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          analysis_completed_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          title?: string
          counterparty?: string | null
          contract_type?: ContractType
          governing_law_state?: string | null
          execution_status?: ContractExecutionStatus
          risk_score?: number | null
          risk_level?: RiskLevel | null
          owner_id?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          analysis_completed_at?: string | null
          updated_at?: string
          deleted_at?: string | null
        }
      }

      contract_versions: {
        Row: {
          id: string
          contract_id: string
          version_number: number
          file_path: string
          file_name: string
          file_type: string
          file_size_bytes: number | null
          extracted_text: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          contract_id: string
          version_number?: number
          file_path: string
          file_name: string
          file_type: string
          file_size_bytes?: number | null
          extracted_text?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          extracted_text?: string | null
        }
      }

      contract_clauses: {
        Row: {
          id: string
          contract_id: string
          version_id: string
          clause_number: string | null
          heading: string | null
          body: string
          parent_id: string | null
          order_index: number
          char_start: number | null
          char_end: number | null
          created_at: string
        }
        Insert: {
          id?: string
          contract_id: string
          version_id: string
          clause_number?: string | null
          heading?: string | null
          body: string
          parent_id?: string | null
          order_index?: number
          char_start?: number | null
          char_end?: number | null
          created_at?: string
        }
        Update: {
          heading?: string | null
          body?: string
          char_start?: number | null
          char_end?: number | null
        }
      }

      contract_flags: {
        Row: {
          id: string
          contract_id: string
          clause_id: string | null
          severity: FlagSeverity
          category: FlagCategory
          title: string
          description: string
          exact_quote: string | null
          suggested_fix: string | null
          suggested_fix_rationale: string | null
          flag_references: Record<string, unknown>[]
          is_resolved: boolean
          resolved_by: string | null
          resolved_at: string | null
          resolution_note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          contract_id: string
          clause_id?: string | null
          severity: FlagSeverity
          category: FlagCategory
          title: string
          description: string
          exact_quote?: string | null
          suggested_fix?: string | null
          suggested_fix_rationale?: string | null
          flag_references?: Record<string, unknown>[]
          is_resolved?: boolean
          resolved_by?: string | null
          resolved_at?: string | null
          resolution_note?: string | null
          created_at?: string
        }
        Update: {
          is_resolved?: boolean
          resolved_by?: string | null
          resolved_at?: string | null
          resolution_note?: string | null
        }
      }

      contract_summaries: {
        Row: {
          id: string
          contract_id: string
          summary_en_short: string | null
          summary_en_long: string | null
          summary_hi_short: string | null
          summary_hi_long: string | null
          key_terms: KeyTerms
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contract_id: string
          summary_en_short?: string | null
          summary_en_long?: string | null
          summary_hi_short?: string | null
          summary_hi_long?: string | null
          key_terms?: KeyTerms
          created_at?: string
          updated_at?: string
        }
        Update: {
          summary_en_short?: string | null
          summary_en_long?: string | null
          summary_hi_short?: string | null
          summary_hi_long?: string | null
          key_terms?: KeyTerms
          updated_at?: string
        }
      }

      contract_chat_messages: {
        Row: {
          id: string
          contract_id: string
          user_id: string
          role: 'user' | 'assistant'
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          contract_id: string
          user_id: string
          role: 'user' | 'assistant'
          content: string
          created_at?: string
        }
        Update: never
      }

      contract_tags: {
        Row: {
          id: string
          org_id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          color?: string
          created_at?: string
        }
        Update: {
          name?: string
          color?: string
        }
      }

      contract_tag_assignments: {
        Row: {
          contract_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          contract_id: string
          tag_id: string
          created_at?: string
        }
        Update: never
      }

      notifications: {
        Row: {
          id: string
          user_id: string
          org_id: string | null
          title: string
          body: string | null
          type: NotificationType
          entity_type: string | null
          entity_id: string | null
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          org_id?: string | null
          title: string
          body?: string | null
          type?: NotificationType
          entity_type?: string | null
          entity_id?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          is_read?: boolean
          read_at?: string | null
        }
      }
    }

    Enums: {
      contract_type: ContractType
      contract_execution_status: ContractExecutionStatus
      flag_severity: FlagSeverity
      risk_level: RiskLevel
      flag_category: FlagCategory
      org_type: OrgType
      plan_tier: PlanTier
      plan_status: PlanStatus
      billing_cycle: BillingCycle
      member_role: MemberRole
      member_status: MemberStatus
      preferred_language: PreferredLanguage
      notification_type: NotificationType
    }

    Functions: {
      current_org_id: {
        Args: Record<string, never>
        Returns: string | null
      }
      log_audit_event: {
        Args: {
          p_org_id: string
          p_entity_type: string
          p_entity_id: string
          p_action: string
          p_before?: Record<string, unknown> | null
          p_after?: Record<string, unknown> | null
          p_metadata?: Record<string, unknown> | null
        }
        Returns: string
      }
      create_organization: {
        Args: {
          p_name: string
          p_legal_name?: string | null
          p_type?: OrgType
          p_gstin?: string | null
          p_pan?: string | null
          p_address?: OrgAddress | null
        }
        Returns: string
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Convenience row types (shorthand for common usage)
// ---------------------------------------------------------------------------
export type Organization = Database['public']['Tables']['organizations']['Row']
export type OrgInsert    = Database['public']['Tables']['organizations']['Insert']
export type OrgUpdate    = Database['public']['Tables']['organizations']['Update']

export type UserProfile     = Database['public']['Tables']['users']['Row']
export type UserProfileUpdate = Database['public']['Tables']['users']['Update']

export type OrgMember       = Database['public']['Tables']['org_members']['Row']
export type OrgMemberInsert = Database['public']['Tables']['org_members']['Insert']

export type AuditLogEntry   = Database['public']['Tables']['audit_log']['Row']
export type Notification    = Database['public']['Tables']['notifications']['Row']

// Contract Intelligence types
export type Contract            = Database['public']['Tables']['contracts']['Row']
export type ContractInsert      = Database['public']['Tables']['contracts']['Insert']
export type ContractUpdate      = Database['public']['Tables']['contracts']['Update']
export type ContractVersion     = Database['public']['Tables']['contract_versions']['Row']
export type ContractVersionInsert = Database['public']['Tables']['contract_versions']['Insert']
export type ContractClause      = Database['public']['Tables']['contract_clauses']['Row']
export type ContractClauseInsert = Database['public']['Tables']['contract_clauses']['Insert']
export type ContractFlag        = Database['public']['Tables']['contract_flags']['Row']
export type ContractFlagInsert  = Database['public']['Tables']['contract_flags']['Insert']
export type ContractSummary     = Database['public']['Tables']['contract_summaries']['Row']
export type ContractSummaryInsert = Database['public']['Tables']['contract_summaries']['Insert']
export type ContractChatMessage = Database['public']['Tables']['contract_chat_messages']['Row']
export type ContractTag         = Database['public']['Tables']['contract_tags']['Row']
