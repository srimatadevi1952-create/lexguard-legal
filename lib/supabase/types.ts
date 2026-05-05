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
// Compliance Suite enums
export type ComplianceItemStatus   = 'open' | 'in_progress' | 'done' | 'waived'
export type ComplianceItemPriority = 'low' | 'medium' | 'high' | 'critical'
export type ComplianceItemSource   = 'assessment' | 'manual' | 'contract_flag'
export type DprRequestType         = 'access' | 'correction' | 'erasure' | 'nomination' | 'grievance' | 'portability'
export type DprStatus              = 'open' | 'in_progress' | 'closed' | 'rejected'
export type DpdpBreachType         = 'confidentiality' | 'integrity' | 'availability'
export type BreachSeverity         = 'low' | 'medium' | 'high' | 'critical'
export type BreachStatus           = 'discovered' | 'investigating' | 'reported' | 'closed'
export type DocStatus              = 'draft' | 'published' | 'needs_review' | 'archived'
export type GstFindingType         = 'missing_gst_clause' | 'incorrect_rate' | 'reverse_charge_missing' | 'place_of_supply_ambiguous' | 'other'
export type GstFindingSeverity     = 'low' | 'medium' | 'high'
export type GstFindingStatus       = 'open' | 'resolved'

// DPDP pillar scores JSONB shape
export interface DpdpPillarScores {
  notice?:       number
  consent?:      number
  rights?:       number
  security?:     number
  accountability?: number
  grievance?:    number
  breach?:       number
  processor?:    number
  retention?:    number
  cross_border?: number
}

// Contract Intelligence enums
export type ContractType = 'nda' | 'msa' | 'sla' | 'employment' | 'vendor' | 'lease' | 'shareholder' | 'loan' | 'jv' | 'other'
export type ContractExecutionStatus = 'draft' | 'under_review' | 'executed' | 'archived' | 'analysis_failed' | 'analysing'
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

      // ---- Compliance Suite ------------------------------------------------

      compliance_regimes: {
        Row: {
          id: string
          code: string
          name: string
          description: string
          icon_name: string
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          description: string
          icon_name: string
          order_index?: number
          created_at?: string
        }
        Update: {
          name?: string
          description?: string
          icon_name?: string
          order_index?: number
        }
      }

      compliance_postures: {
        Row: {
          id: string
          org_id: string
          regime_id: string
          score: number
          pillar_scores: DpdpPillarScores
          trend: 'improving' | 'stable' | 'declining'
          last_assessed_at: string | null
          assessed_by: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          regime_id: string
          score?: number
          pillar_scores?: DpdpPillarScores
          trend?: 'improving' | 'stable' | 'declining'
          last_assessed_at?: string | null
          assessed_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          score?: number
          pillar_scores?: DpdpPillarScores
          trend?: 'improving' | 'stable' | 'declining'
          last_assessed_at?: string | null
          assessed_by?: string | null
          notes?: string | null
          updated_at?: string
        }
      }

      compliance_items: {
        Row: {
          id: string
          org_id: string
          regime_id: string
          title: string
          description: string | null
          status: ComplianceItemStatus
          priority: ComplianceItemPriority
          due_date: string | null
          assigned_to: string | null
          source: ComplianceItemSource
          source_question: string | null
          source_contract_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          regime_id: string
          title: string
          description?: string | null
          status?: ComplianceItemStatus
          priority?: ComplianceItemPriority
          due_date?: string | null
          assigned_to?: string | null
          source?: ComplianceItemSource
          source_question?: string | null
          source_contract_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          status?: ComplianceItemStatus
          priority?: ComplianceItemPriority
          due_date?: string | null
          assigned_to?: string | null
          updated_at?: string
        }
      }

      dpr_requests: {
        Row: {
          id: string
          org_id: string
          ticket_number: string
          principal_name: string
          principal_email: string
          request_type: DprRequestType
          description: string
          status: DprStatus
          assigned_to: string | null
          sla_deadline: string
          response_text: string | null
          responded_at: string | null
          responded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          ticket_number?: string   // auto-generated by trigger
          principal_name: string
          principal_email: string
          request_type: DprRequestType
          description: string
          status?: DprStatus
          assigned_to?: string | null
          sla_deadline: string
          response_text?: string | null
          responded_at?: string | null
          responded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: DprStatus
          assigned_to?: string | null
          response_text?: string | null
          responded_at?: string | null
          responded_by?: string | null
          updated_at?: string
        }
      }

      dpdp_breaches: {
        Row: {
          id: string
          org_id: string
          title: string
          description: string
          breach_type: DpdpBreachType
          severity: BreachSeverity
          discovered_at: string
          reported_to_dpb_at: string | null
          dpb_acknowledgement_ref: string | null
          affected_principals_estimate: number | null
          data_categories: string[]
          status: BreachStatus
          notification_draft: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          title: string
          description: string
          breach_type: DpdpBreachType
          severity?: BreachSeverity
          discovered_at: string
          reported_to_dpb_at?: string | null
          dpb_acknowledgement_ref?: string | null
          affected_principals_estimate?: number | null
          data_categories?: string[]
          status?: BreachStatus
          notification_draft?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string
          severity?: BreachSeverity
          reported_to_dpb_at?: string | null
          dpb_acknowledgement_ref?: string | null
          affected_principals_estimate?: number | null
          data_categories?: string[]
          status?: BreachStatus
          notification_draft?: string | null
          updated_at?: string
        }
      }

      dpdp_notices: {
        Row: {
          id: string
          org_id: string
          title: string
          content: string
          version: string
          status: DocStatus
          published_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          title: string
          content?: string
          version?: string
          status?: DocStatus
          published_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          content?: string
          version?: string
          status?: DocStatus
          published_at?: string | null
          updated_at?: string
        }
      }

      dpdp_consents: {
        Row: {
          id: string
          org_id: string
          principal_identifier: string
          purpose: string
          granted_at: string
          withdrawn_at: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          principal_identifier: string
          purpose: string
          granted_at?: string
          withdrawn_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          withdrawn_at?: string | null
          is_active?: boolean
        }
      }

      gst_findings: {
        Row: {
          id: string
          org_id: string
          contract_id: string | null
          finding_type: GstFindingType
          description: string
          severity: GstFindingSeverity
          status: GstFindingStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          contract_id?: string | null
          finding_type: GstFindingType
          description: string
          severity?: GstFindingSeverity
          status?: GstFindingStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          description?: string
          severity?: GstFindingSeverity
          status?: GstFindingStatus
          updated_at?: string
        }
      }

      // ---- M&A / CCI -------------------------------------------------------

      cci_assessments: {
        Row: {
          id: string
          org_id: string
          assessed_by: string | null
          acquirer_name: string
          acquirer_assets_india: number | null
          acquirer_assets_worldwide: number | null
          acquirer_turnover_india: number | null
          acquirer_turnover_worldwide: number | null
          target_name: string
          target_assets_india: number | null
          target_assets_worldwide: number | null
          target_turnover_india: number | null
          target_turnover_worldwide: number | null
          target_india_turnover_pct: number | null
          group_assets_india: number | null
          group_assets_worldwide: number | null
          group_turnover_india: number | null
          group_turnover_worldwide: number | null
          deal_value: number | null
          transaction_type: string | null
          verdict: 'filing_required' | 'exempt' | 'borderline'
          form_type: string | null
          triggered_tests: string[]
          exempt_reasons: string[]
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          assessed_by?: string | null
          acquirer_name: string
          acquirer_assets_india?: number | null
          acquirer_assets_worldwide?: number | null
          acquirer_turnover_india?: number | null
          acquirer_turnover_worldwide?: number | null
          target_name: string
          target_assets_india?: number | null
          target_assets_worldwide?: number | null
          target_turnover_india?: number | null
          target_turnover_worldwide?: number | null
          target_india_turnover_pct?: number | null
          group_assets_india?: number | null
          group_assets_worldwide?: number | null
          group_turnover_india?: number | null
          group_turnover_worldwide?: number | null
          deal_value?: number | null
          transaction_type?: string | null
          verdict: 'filing_required' | 'exempt' | 'borderline'
          form_type?: string | null
          triggered_tests?: string[]
          exempt_reasons?: string[]
          notes?: string | null
          created_at?: string
        }
        Update: {
          notes?: string | null
        }
      }

      // ---- Clause Library --------------------------------------------------

      clauses: {
        Row: {
          id: string
          org_id: string | null
          title: string
          category: string
          clause_text_en: string
          clause_text_hi: string | null
          use_case: string | null
          risk_notes: string | null
          party_position: 'drafter_favours' | 'counterparty_favours' | 'neutral'
          applicable_acts: string[]
          applicable_contract_types: string[]
          references: string | null
          visibility: 'global' | 'org_private'
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          title: string
          category: string
          clause_text_en: string
          clause_text_hi?: string | null
          use_case?: string | null
          risk_notes?: string | null
          party_position?: 'drafter_favours' | 'counterparty_favours' | 'neutral'
          applicable_acts?: string[]
          applicable_contract_types?: string[]
          references?: string | null
          visibility?: 'global' | 'org_private'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          category?: string
          clause_text_en?: string
          clause_text_hi?: string | null
          use_case?: string | null
          risk_notes?: string | null
          party_position?: 'drafter_favours' | 'counterparty_favours' | 'neutral'
          applicable_acts?: string[]
          applicable_contract_types?: string[]
          references?: string | null
          visibility?: 'global' | 'org_private'
          updated_at?: string
        }
      }

      clause_insertions: {
        Row: {
          id: string
          org_id: string
          clause_id: string
          inserted_by: string | null
          contract_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          clause_id: string
          inserted_by?: string | null
          contract_id?: string | null
          created_at?: string
        }
        Update: never
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

// Compliance Suite types
export type ComplianceRegime   = Database['public']['Tables']['compliance_regimes']['Row']
export type CompliancePosture  = Database['public']['Tables']['compliance_postures']['Row']
export type CompliancePostureInsert = Database['public']['Tables']['compliance_postures']['Insert']
export type CompliancePostureUpdate = Database['public']['Tables']['compliance_postures']['Update']
export type ComplianceItem     = Database['public']['Tables']['compliance_items']['Row']
export type ComplianceItemInsert = Database['public']['Tables']['compliance_items']['Insert']
export type ComplianceItemUpdate = Database['public']['Tables']['compliance_items']['Update']
export type DprRequest         = Database['public']['Tables']['dpr_requests']['Row']
export type DprRequestInsert   = Database['public']['Tables']['dpr_requests']['Insert']
export type DprRequestUpdate   = Database['public']['Tables']['dpr_requests']['Update']
export type DpdpBreach         = Database['public']['Tables']['dpdp_breaches']['Row']
export type DpdpBreachInsert   = Database['public']['Tables']['dpdp_breaches']['Insert']
export type DpdpNotice         = Database['public']['Tables']['dpdp_notices']['Row']
export type DpdpConsent        = Database['public']['Tables']['dpdp_consents']['Row']
export type GstFinding         = Database['public']['Tables']['gst_findings']['Row']

// M&A / CCI types
export type CciAssessment      = Database['public']['Tables']['cci_assessments']['Row']
export type CciAssessmentInsert = Database['public']['Tables']['cci_assessments']['Insert']

// Clause Library types
export type ClauseRow          = Database['public']['Tables']['clauses']['Row']
export type ClauseInsertRow    = Database['public']['Tables']['clauses']['Insert']
export type ClauseInsertion    = Database['public']['Tables']['clause_insertions']['Row']
