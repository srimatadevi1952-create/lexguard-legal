-- =============================================================================
-- Seed: Workflow Layer (Prompt 5)
-- Demo data for admin@democorp.com / democorp org
-- 12 calendar events, 1 DD matter (Tech acquisition, ₹500 Cr), 2 notices
-- =============================================================================
-- Run AFTER seed_cci_clauses.sql (requires org and user to exist)
-- =============================================================================

DO $$
DECLARE
  v_org_id  uuid;
  v_user_id uuid;
  v_matter_id uuid;
  v_notice1_event_id uuid;
  v_notice2_event_id uuid;
  v_notice1_id uuid;
  v_notice2_id uuid;
BEGIN

  -- Resolve democorp org + admin user
  SELECT id INTO v_org_id  FROM public.organizations WHERE slug = 'democorp' LIMIT 1;
  SELECT id INTO v_user_id FROM public.users WHERE email = 'admin@democorp.com' LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'democorp org not found — run seed_compliance.sql first';
    RETURN;
  END IF;

  -- -------------------------------------------------------------------------
  -- 12 calendar events (mix of regimes)
  -- -------------------------------------------------------------------------
  INSERT INTO public.calendar_events (org_id, title, description, event_type, source_table, due_date, owner_id, status, statute_reference, reminder_offsets)
  VALUES
    -- DPDP
    (v_org_id, 'DPDP Act — Annual Privacy Notice Review', 'Mandatory annual review of data principal notices under Section 5, DPDP Act 2023', 'dpdp', 'manual', (CURRENT_DATE + INTERVAL '45 days')::date, v_user_id, 'open', 'Section 5, DPDP Act 2023', '{30,15,7,3,1,0}'),
    (v_org_id, 'Data Processor Agreements — Renewal', 'Annual review and renewal of DPA with all data processors; Section 8(3) obligation', 'dpdp', 'manual', (CURRENT_DATE + INTERVAL '60 days')::date, v_user_id, 'open', 'Section 8(3), DPDP Act 2023', '{30,15,7,3,1,0}'),

    -- MCA
    (v_org_id, 'MGT-7A — Annual Return Filing', 'Annual return for private limited companies under Section 92, Companies Act 2013', 'mca', 'manual', (CURRENT_DATE + INTERVAL '30 days')::date, v_user_id, 'open', 'Section 92, Companies Act 2013', '{30,15,7,3,1,0}'),
    (v_org_id, 'AOC-4 — Financial Statements Filing', 'Filing of financial statements with RoC for FY 2024-25', 'mca', 'manual', (CURRENT_DATE + INTERVAL '90 days')::date, v_user_id, 'open', 'Section 137, Companies Act 2013', '{30,15,7,3,1,0}'),
    (v_org_id, 'DIR-3 KYC — Director KYC Renewal', 'Annual DIR-3 KYC e-verification for all directors by 30 September', 'mca', 'manual', (CURRENT_DATE + INTERVAL '120 days')::date, v_user_id, 'open', 'Rule 12A, Companies (Appointment and Qualification of Directors) Rules 2014', '{30,15,7,3,1,0}'),

    -- SEBI
    (v_org_id, 'SEBI LODR — Quarterly Compliance Report', 'Corporate governance compliance report for Q1 FY 2025-26 under SEBI LODR Regulation 27', 'sebi', 'manual', (CURRENT_DATE + INTERVAL '15 days')::date, v_user_id, 'open', 'Regulation 27(2), SEBI LODR 2015', '{15,7,3,1,0}'),

    -- Labour
    (v_org_id, 'EPFO — Monthly ECR Filing', 'Electronic Challan cum Return (ECR) for employee provident fund for current month', 'labour', 'manual', (CURRENT_DATE + INTERVAL '10 days')::date, v_user_id, 'open', 'Para 38, EPF Scheme 1952', '{7,3,1,0}'),
    (v_org_id, 'POSH — Internal Committee Annual Report', 'Annual report by Internal Complaints Committee under POSH Act Section 21', 'labour', 'manual', (CURRENT_DATE + INTERVAL '75 days')::date, v_user_id, 'open', 'Section 21, Sexual Harassment of Women at Workplace Act 2013', '{30,15,7,3,1,0}'),

    -- GST
    (v_org_id, 'GSTR-9 — Annual Return FY 2024-25', 'GST annual return filing for financial year 2024-25 by 31 December 2025', 'gst', 'manual', (CURRENT_DATE + INTERVAL '200 days')::date, v_user_id, 'open', 'Section 44, CGST Act 2017', '{30,15,7,3,1,0}'),
    (v_org_id, 'GSTR-3B — Monthly Return', 'Monthly GST return (GSTR-3B) filing for current month', 'gst', 'manual', (CURRENT_DATE + INTERVAL '20 days')::date, v_user_id, 'open', 'Section 39, CGST Act 2017; Rule 61', '{7,3,1,0}'),

    -- Contracts
    (v_org_id, 'MSA with CloudServ India — Renewal Notice', 'Master Services Agreement auto-renews; send renewal notice 60 days before expiry', 'contracts', 'manual', (CURRENT_DATE + INTERVAL '55 days')::date, v_user_id, 'open', NULL, '{30,15,7,3,1,0}'),
    (v_org_id, 'Office Lease — Bangalore — Expiry', 'Office lease expiry; negotiate renewal or identify alternate premises', 'contracts', 'manual', (CURRENT_DATE + INTERVAL '110 days')::date, v_user_id, 'open', NULL, '{30,15,7,3,1,0}');

  -- -------------------------------------------------------------------------
  -- Calendar reminders for events (generate T-7 and T-0 for each)
  -- -------------------------------------------------------------------------
  INSERT INTO public.calendar_reminders (org_id, event_id, offset_days, scheduled_send_at, status, channel)
  SELECT
    e.org_id,
    e.id,
    o.offset_days,
    (e.due_date::timestamp - (o.offset_days || ' days')::interval),
    'scheduled',
    'email'
  FROM public.calendar_events e
  CROSS JOIN (VALUES (7), (0)) AS o(offset_days)
  WHERE e.org_id = v_org_id
    AND e.created_at > NOW() - INTERVAL '1 minute';

  -- -------------------------------------------------------------------------
  -- DD matter — Project Horizon: TechCorp acquisition (Tech, Large, ₹500 Cr)
  -- -------------------------------------------------------------------------
  INSERT INTO public.dd_matters (id, org_id, name, target_name, deal_lead, transaction_type, sector, size_bracket, target_close_date, status, completion_pct, created_by)
  VALUES (
    gen_random_uuid(),
    v_org_id,
    'Project Horizon — TechCorp Acquisition',
    'TechCorp Solutions Pvt. Ltd.',
    'Priya Sharma',
    'share',
    'tech',
    'large',
    (CURRENT_DATE + INTERVAL '90 days')::date,
    'active',
    12,
    v_user_id
  )
  RETURNING id INTO v_matter_id;

  -- 10 sample checklist items (the full set would be generated via API)
  INSERT INTO public.dd_checklist_items (org_id, matter_id, category, item_text, status, risk, sort_order)
  VALUES
    (v_org_id, v_matter_id, 'Corporate',          'Obtain Certificate of Incorporation and MoA/AoA',                                           'completed',      'high',     0),
    (v_org_id, v_matter_id, 'Corporate',          'Verify MCA21 filings — annual returns, charge register, Director KYC',                    'completed',      'high',     1),
    (v_org_id, v_matter_id, 'Corporate',          'Review all shareholder agreements and ESOP plan',                                          'in_progress',    'critical', 2),
    (v_org_id, v_matter_id, 'Financial',          'Obtain audited financials for FY 2022-23, 2023-24, 2024-25',                               'completed',      'critical', 3),
    (v_org_id, v_matter_id, 'Financial',          'Review ARR/MRR and gross churn metrics',                                                   'in_progress',    'medium',   4),
    (v_org_id, v_matter_id, 'Tax',                'Verify Income Tax filing compliance and review pending demands',                           'pending',        'high',     5),
    (v_org_id, v_matter_id, 'IP',                 'Conduct FOSS open-source software audit',                                                  'flagged',        'high',     6),
    (v_org_id, v_matter_id, 'Compliance',         'Review DPDP Act 2023 readiness — data fiduciary obligations',                             'pending',        'high',     7),
    (v_org_id, v_matter_id, 'Regulatory',         'Confirm CCI filing obligation assessed under Section 5 (DVT threshold: ₹2,000 Cr)',       'completed',      'critical', 8),
    (v_org_id, v_matter_id, 'Material Contracts', 'Review all customer SLAs — uptime penalties and change-of-control provisions',            'pending',        'high',     9);

  -- Calendar event for DD close date
  INSERT INTO public.calendar_events (org_id, title, description, event_type, source_table, source_id, due_date, owner_id, status, reminder_offsets)
  VALUES (v_org_id, 'DD Target Close — Project Horizon', 'M&A due diligence target close date for TechCorp Solutions Pvt. Ltd.', 'mca', 'dd_matters', v_matter_id, (CURRENT_DATE + INTERVAL '90 days')::date, v_user_id, 'open', '{30,15,7,3,1,0}');

  -- -------------------------------------------------------------------------
  -- Notice 1 — MCA show cause notice
  -- -------------------------------------------------------------------------
  INSERT INTO public.calendar_events (org_id, title, description, event_type, source_table, due_date, owner_id, status, reminder_offsets)
  VALUES (v_org_id, 'Response deadline — MCA Show Cause Notice under Section 206(4)', 'Regulator notice response deadline. Issuer: MCA. Ref: ROC/DEL/2025/SCN-1142', 'mca', 'regulator_notices', (CURRENT_DATE + INTERVAL '14 days')::date, v_user_id, 'open', '{7,3,1,0}')
  RETURNING id INTO v_notice1_event_id;

  INSERT INTO public.regulator_notices (org_id, issuer, issuer_office, notice_ref, notice_type, received_date, deadline_date, specific_demands, suggested_response, status, calendar_event_id, created_by)
  VALUES (
    v_org_id,
    'mca',
    'Registrar of Companies, NCT of Delhi & Haryana',
    'ROC/DEL/2025/SCN-1142',
    'Show Cause Notice under Section 206(4), Companies Act 2013',
    (CURRENT_DATE - INTERVAL '7 days')::date,
    (CURRENT_DATE + INTERVAL '14 days')::date,
    'The company has not filed its annual return (MGT-7A) for FY 2023-24 within the statutory period. The RoC seeks an explanation as to why adjudication proceedings for late filing penalty should not be initiated under Section 92 read with Section 403 of the Companies Act 2013.',
    'REGULATOR NOTICE RESPONSE BRIEF
Generated by LexGuard Legal

NOTICE DETAILS
Issuer     : MCA
Type       : Show Cause Notice under Section 206(4), Companies Act 2013

1. LEGAL FRAMEWORK ANALYSIS

The Ministry of Corporate Affairs (MCA) administers the Companies Act 2013. This notice is issued under Section 206(4), Companies Act 2013, which empowers the RoC to call for information or explanation from a company. The underlying default alleged is non-filing of MGT-7A under Section 92 within the prescribed period. Additional fees for late filing are payable under Section 403.

2. SUGGESTED RESPONSE STRUCTURE

1. Preliminary facts: acknowledge the notice and the relevant financial year
2. Reason for delay: explain the factual reason for the delay in filing
3. Steps taken: confirm the return has now been filed (with SRN/receipt)
4. Legal submissions on mitigating factors
5. Prayer: request for dropping of adjudication or minimum penalty

3. RISK FLAGS

⚠  Non-response within the prescribed period may be treated as admission
⚠  Directors may have personal liability under Section 149 and 166',
    'new',
    v_notice1_event_id,
    v_user_id
  )
  RETURNING id INTO v_notice1_id;

  -- Reminders for notice 1
  INSERT INTO public.calendar_reminders (org_id, event_id, offset_days, scheduled_send_at, status, channel)
  VALUES
    (v_org_id, v_notice1_event_id, 7, (CURRENT_DATE + INTERVAL '7 days')::timestamp,  'scheduled', 'email'),
    (v_org_id, v_notice1_event_id, 3, (CURRENT_DATE + INTERVAL '11 days')::timestamp, 'scheduled', 'email'),
    (v_org_id, v_notice1_event_id, 1, (CURRENT_DATE + INTERVAL '13 days')::timestamp, 'scheduled', 'email'),
    (v_org_id, v_notice1_event_id, 0, (CURRENT_DATE + INTERVAL '14 days')::timestamp, 'scheduled', 'in_app');

  -- -------------------------------------------------------------------------
  -- Notice 2 — IT Department Section 148 reopening notice
  -- -------------------------------------------------------------------------
  INSERT INTO public.calendar_events (org_id, title, description, event_type, source_table, due_date, owner_id, status, reminder_offsets)
  VALUES (v_org_id, 'Response deadline — IT Dept Section 148 Reopening Notice AY 2022-23', 'Regulator notice response deadline. Issuer: IT Dept. Ref: ITO/Ward-2/Delhi/148/2025', 'gst', 'regulator_notices', (CURRENT_DATE + INTERVAL '28 days')::date, v_user_id, 'open', '{15,7,3,1,0}')
  RETURNING id INTO v_notice2_event_id;

  INSERT INTO public.regulator_notices (org_id, issuer, issuer_office, notice_ref, notice_type, received_date, deadline_date, specific_demands, suggested_response, status, calendar_event_id, created_by)
  VALUES (
    v_org_id,
    'it_dept',
    'Income Tax Officer, Ward 2(1), Delhi',
    'ITO/Ward-2/Delhi/148/2025',
    'Notice under Section 148, Income Tax Act 1961 — Reopening of Assessment AY 2022-23',
    (CURRENT_DATE - INTERVAL '3 days')::date,
    (CURRENT_DATE + INTERVAL '28 days')::date,
    'The Assessing Officer has reason to believe that income chargeable to tax for Assessment Year 2022-23 has escaped assessment. Specifically, the officer seeks explanation for: (1) credit entries totalling ₹2.4 Crore in the bank account not reconciled with the ITR; (2) TDS claimed under Form 16A from a vendor which does not appear in Form 26AS.',
    'REGULATOR NOTICE RESPONSE BRIEF
Generated by LexGuard Legal

NOTICE DETAILS
Issuer     : IT DEPT
Type       : Notice under Section 148, Income Tax Act 1961

1. LEGAL FRAMEWORK ANALYSIS

Section 148 of the Income Tax Act 1961 empowers the Assessing Officer to issue notice to a person if the AO has reason to believe that any income chargeable to tax for any assessment year has escaped assessment. For AY 2022-23, the limitation for reopening is 6 years from the end of the relevant assessment year (i.e., before 31 March 2029 in this case) under Section 149 as amended by Finance Act 2021.

2. SUGGESTED RESPONSE STRUCTURE

1. Acknowledgment and filing of return in response to notice (if not already filed)
2. Factual explanation for credit entries — source, nature, and taxability
3. TDS reconciliation: explain the Form 26AS vs Form 16A discrepancy
4. CA certificate/confirmation for disputed amounts
5. Prayer for acceptance of explanation without proceeding to assessment

3. RISK FLAGS

⚠  If the notice is under Section 148, confirm it is not time-barred
⚠  Avoid written admissions usable in penalty proceedings under Section 271(1)(c)
⚠  Tax prosecution under Section 276C for wilful evasion can result in imprisonment',
    'in_progress',
    v_notice2_event_id,
    v_user_id
  )
  RETURNING id INTO v_notice2_id;

  -- Reminders for notice 2
  INSERT INTO public.calendar_reminders (org_id, event_id, offset_days, scheduled_send_at, status, channel)
  VALUES
    (v_org_id, v_notice2_event_id, 15, (CURRENT_DATE + INTERVAL '13 days')::timestamp, 'scheduled', 'email'),
    (v_org_id, v_notice2_event_id, 7,  (CURRENT_DATE + INTERVAL '21 days')::timestamp, 'scheduled', 'email'),
    (v_org_id, v_notice2_event_id, 3,  (CURRENT_DATE + INTERVAL '25 days')::timestamp, 'scheduled', 'email'),
    (v_org_id, v_notice2_event_id, 1,  (CURRENT_DATE + INTERVAL '27 days')::timestamp, 'scheduled', 'email'),
    (v_org_id, v_notice2_event_id, 0,  (CURRENT_DATE + INTERVAL '28 days')::timestamp, 'scheduled', 'in_app');

  RAISE NOTICE 'Workflow seed complete. Org: %, User: %, DD matter: %', v_org_id, v_user_id, v_matter_id;
END $$;
