-- =============================================================================
-- Compliance Suite seed data for admin@democorp.com
-- Run AFTER migrations AND after the demo user completes onboarding.
-- =============================================================================

DO $$
DECLARE
  v_org_id      UUID;
  v_user_id     UUID;
  v_dpdp_id     UUID;
  v_gst_id      UUID;
  v_cos_id      UUID;
  v_sebi_id     UUID;
  v_labour_id   UUID;
  v_fema_id     UUID;
BEGIN
  -- Resolve demo org and user
  SELECT o.id INTO v_org_id
  FROM public.organizations o
  JOIN public.org_members om ON om.org_id = o.id
  JOIN public.users u ON u.id = om.user_id
  WHERE u.email = 'admin@democorp.com'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'Demo org not found — skipping compliance seed.';
    RETURN;
  END IF;

  SELECT u.id INTO v_user_id FROM public.users u WHERE u.email = 'admin@democorp.com' LIMIT 1;

  -- Set a public slug on the demo org for the DPR intake URL
  UPDATE public.organizations SET slug = 'democorp' WHERE id = v_org_id;

  -- Resolve regime IDs
  SELECT id INTO v_dpdp_id   FROM public.compliance_regimes WHERE code = 'dpdp';
  SELECT id INTO v_gst_id    FROM public.compliance_regimes WHERE code = 'gst';
  SELECT id INTO v_cos_id    FROM public.compliance_regimes WHERE code = 'companies_act';
  SELECT id INTO v_sebi_id   FROM public.compliance_regimes WHERE code = 'sebi_lodr';
  SELECT id INTO v_labour_id FROM public.compliance_regimes WHERE code = 'labour';
  SELECT id INTO v_fema_id   FROM public.compliance_regimes WHERE code = 'fema';

  -- -------------------------------------------------------------------------
  -- Compliance Postures
  -- -------------------------------------------------------------------------
  INSERT INTO public.compliance_postures (org_id, regime_id, score, pillar_scores, trend, last_assessed_at, assessed_by)
  VALUES
    (v_org_id, v_dpdp_id, 54,
     '{"notice":6,"consent":5,"rights":7,"security":6,"accountability":4,"grievance":5,"breach":4,"processor":6,"retention":7,"cross_border":4}'::jsonb,
     'improving', NOW() - INTERVAL '10 days', v_user_id),
    (v_org_id, v_gst_id,    72, '{}', 'stable',    NOW() - INTERVAL '30 days', v_user_id),
    (v_org_id, v_cos_id,    81, '{}', 'stable',    NOW() - INTERVAL '45 days', v_user_id),
    (v_org_id, v_sebi_id,   0,  '{}', 'stable',    NULL, NULL),
    (v_org_id, v_labour_id, 63, '{}', 'declining', NOW() - INTERVAL '60 days', v_user_id),
    (v_org_id, v_fema_id,   0,  '{}', 'stable',    NULL, NULL)
  ON CONFLICT (org_id, regime_id) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- Compliance Items (8 across regimes)
  -- -------------------------------------------------------------------------
  INSERT INTO public.compliance_items
    (org_id, regime_id, title, description, status, priority, due_date, source)
  VALUES
    (v_org_id, v_dpdp_id,
     'Publish Privacy Notice on website',
     'Draft and publish a DPDP-compliant privacy notice covering all processing activities.',
     'in_progress', 'critical', CURRENT_DATE + 14, 'assessment'),

    (v_org_id, v_dpdp_id,
     'Appoint Grievance Officer',
     'Designate a Grievance Officer and publish contact details on the website as required by Section 13.',
     'open', 'high', CURRENT_DATE + 30, 'assessment'),

    (v_org_id, v_dpdp_id,
     'Implement consent withdrawal mechanism',
     'Add a self-service portal or email flow for data principals to withdraw consent.',
     'open', 'high', CURRENT_DATE + 45, 'assessment'),

    (v_org_id, v_gst_id,
     'Add reverse charge clause to vendor contracts',
     '12 vendor contracts are missing a reverse-charge applicability clause. Update templates.',
     'open', 'medium', CURRENT_DATE + 21, 'manual'),

    (v_org_id, v_cos_id,
     'File MGT-7 Annual Return for FY 2025-26',
     'Annual return due 60 days after AGM. Ensure DIN, shareholding pattern, and charges are updated.',
     'open', 'high', CURRENT_DATE + 60, 'manual'),

    (v_org_id, v_cos_id,
     'Update statutory registers (Reg. 3 & 7)',
     'Register of Members and Register of Directors require update after last board change.',
     'done', 'medium', CURRENT_DATE - 5, 'manual'),

    (v_org_id, v_labour_id,
     'Submit PF ECR for April 2026',
     'Employee Contribution Remittance due by the 15th of each month.',
     'in_progress', 'critical', CURRENT_DATE + 3, 'manual'),

    (v_org_id, v_fema_id,
     'File Annual Return on Foreign Liabilities and Assets (FLA)',
     'FEMA FLA return due July 15 for companies with foreign investments.',
     'open', 'high', '2026-07-15', 'manual');

  -- -------------------------------------------------------------------------
  -- DPR Requests (3 open)
  -- -------------------------------------------------------------------------
  INSERT INTO public.dpr_requests
    (org_id, ticket_number, principal_name, principal_email, request_type, description, status, sla_deadline)
  VALUES
    (v_org_id, 'DPR-2026-0001',
     'Priya S.', 'priya.s@example.com',
     'access',
     'I would like to receive a copy of all personal data you hold about me, including employment records and communication logs.',
     'open', NOW() + INTERVAL '25 days'),

    (v_org_id, 'DPR-2026-0002',
     'Rajesh K.', 'rajesh.k@example.com',
     'erasure',
     'Please delete all personal data associated with my account. I no longer use your services.',
     'open', NOW() + INTERVAL '20 days'),

    (v_org_id, 'DPR-2026-0003',
     'Anitha M.', 'anitha.m@example.com',
     'correction',
     'My date of birth is recorded incorrectly in your system. Correct DOB: 14-March-1989.',
     'in_progress', NOW() + INTERVAL '10 days');

  -- -------------------------------------------------------------------------
  -- DPDP Breach (1)
  -- -------------------------------------------------------------------------
  INSERT INTO public.dpdp_breaches
    (org_id, title, description, breach_type, severity, discovered_at, affected_principals_estimate,
     data_categories, status, notification_draft)
  VALUES
    (v_org_id,
     'Misconfigured S3 bucket — employee data exposed',
     'A misconfigured cloud storage bucket was found publicly accessible for approximately 6 hours on 28-April-2026. Employee names, email addresses, and salary slips were accessible.',
     'confidentiality', 'high',
     NOW() - INTERVAL '7 days',
     87,
     ARRAY['Name', 'Email address', 'Salary information'],
     'investigating',
     E'To:\nData Protection Board of India\nMinistry of Electronics and Information Technology\nNew Delhi - 110001\n\nNOTICE OF PERSONAL DATA BREACH\nRef: DEMOCORP-BREACH-2026-001\n\nDate: [INSERT DATE]\n\n1. IDENTITY OF DATA FIDUCIARY\n   Organisation: DemoCorp Pvt. Ltd.\n   Address: [INSERT ADDRESS]\n   Grievance Officer: [INSERT NAME & CONTACT]\n\n2. NATURE OF THE BREACH\n   Type: Confidentiality breach — unauthorised access to personal data\n   Description: A misconfigured cloud storage bucket was publicly accessible for approximately 6 hours. Employee personal data including names, email addresses, and salary documents were exposed.\n\n3. CATEGORIES AND NUMBER OF AFFECTED DATA PRINCIPALS\n   Estimated affected principals: 87\n   Data categories: Name, Email address, Salary information\n\n4. LIKELY CONSEQUENCES\n   Risk of unsolicited contact or phishing attempts targeting affected employees. Risk of salary data misuse.\n\n5. MEASURES TAKEN\n   - Bucket access revoked immediately upon discovery.\n   - Security audit of all cloud storage buckets initiated.\n   - Affected employees notified via internal communication.\n   - Incident logged in Breach Register.\n\n6. CONTACT FOR FURTHER INFORMATION\n   [INSERT GRIEVANCE OFFICER NAME]\n   [INSERT EMAIL AND PHONE]\n\nAuthorised Signatory: [NAME AND DESIGNATION]\nDate: [INSERT DATE]\n\nThis notice is submitted pursuant to Section 40 of the Digital Personal Data Protection Act, 2023.'
    );

  -- -------------------------------------------------------------------------
  -- DPDP Notices (draft templates)
  -- -------------------------------------------------------------------------
  INSERT INTO public.dpdp_notices (org_id, title, version, status, created_by)
  VALUES
    (v_org_id, 'Website Privacy Notice',           '1.0', 'draft',    v_user_id),
    (v_org_id, 'Employee Data Processing Notice',  '1.0', 'draft',    v_user_id),
    (v_org_id, 'Vendor/Partner Data Notice',       '1.0', 'needs_review', v_user_id);

  -- -------------------------------------------------------------------------
  -- GST Findings (3 demo findings)
  -- -------------------------------------------------------------------------
  INSERT INTO public.gst_findings (org_id, finding_type, description, severity, status)
  VALUES
    (v_org_id, 'reverse_charge_missing',
     'Vendor contracts with unregistered suppliers do not include a reverse charge mechanism clause.',
     'high', 'open'),
    (v_org_id, 'place_of_supply_ambiguous',
     'SaaS subscription agreements do not specify place of supply for IT services, risking dual-state GST applicability.',
     'medium', 'open'),
    (v_org_id, 'missing_gst_clause',
     'Three employment agreements are missing mandatory GST applicability language on reimbursements.',
     'low', 'open');

  RAISE NOTICE 'Compliance seed complete for org %', v_org_id;
END;
$$;
