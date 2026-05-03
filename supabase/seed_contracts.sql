-- ════════════════════════════════════════════════════════════════════════════
-- Seed: 5 demo contracts for admin@democorp.com
-- Run AFTER applying all migrations and after the demo user has completed
-- onboarding (org must exist in org_members).
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_user_id       UUID;
  v_org_id        UUID;

  -- contract IDs
  v_msa_id        UUID := '11111111-0000-0000-0000-000000000001';
  v_nda_id        UUID := '11111111-0000-0000-0000-000000000002';
  v_saas_id       UUID := '11111111-0000-0000-0000-000000000003';
  v_emp_id        UUID := '11111111-0000-0000-0000-000000000004';
  v_lease_id      UUID := '11111111-0000-0000-0000-000000000005';

  -- version IDs
  v_msa_ver       UUID := '22222222-0000-0000-0000-000000000001';
  v_nda_ver       UUID := '22222222-0000-0000-0000-000000000002';
  v_saas_ver      UUID := '22222222-0000-0000-0000-000000000003';
  v_emp_ver       UUID := '22222222-0000-0000-0000-000000000004';
  v_lease_ver     UUID := '22222222-0000-0000-0000-000000000005';

  -- clause IDs (msa)
  c_msa1 UUID; c_msa2 UUID; c_msa3 UUID; c_msa4 UUID; c_msa5 UUID;
  -- clause IDs (nda)
  c_nda1 UUID; c_nda2 UUID; c_nda3 UUID; c_nda4 UUID;
  -- clause IDs (saas)
  c_saas1 UUID; c_saas2 UUID; c_saas3 UUID; c_saas4 UUID;
  -- clause IDs (emp)
  c_emp1 UUID; c_emp2 UUID; c_emp3 UUID; c_emp4 UUID;
  -- clause IDs (lease)
  c_lease1 UUID; c_lease2 UUID; c_lease3 UUID; c_lease4 UUID;

  v_msa_text TEXT;
  v_nda_text TEXT;
  v_saas_text TEXT;
  v_emp_text TEXT;
  v_lease_text TEXT;

BEGIN
  -- Look up demo user
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@democorp.com';
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Demo user admin@democorp.com not found — skipping contract seed.';
    RETURN;
  END IF;

  -- Get their active org
  SELECT org_id INTO v_org_id
  FROM public.org_members
  WHERE user_id = v_user_id AND status = 'active'
  ORDER BY created_at LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'No active org found for demo user — skipping contract seed.';
    RETURN;
  END IF;

  -- Skip if already seeded
  IF EXISTS (SELECT 1 FROM public.contracts WHERE id = v_msa_id) THEN
    RAISE NOTICE 'Contracts already seeded — skipping.';
    RETURN;
  END IF;

  -- ── Contract texts ──────────────────────────────────────────────────────────

  v_msa_text := 'MASTER SERVICES AGREEMENT

This Master Services Agreement ("Agreement") is entered into as of 1 January 2025 between TechVision India Pvt. Ltd., a company incorporated under the Companies Act 2013 having its registered office at 14, MG Road, Bengaluru, Karnataka 560001 ("Client") and CodeSphere Solutions LLP, a limited liability partnership registered under the LLP Act 2008 having its principal place of business at Plot 22, MIDC, Pune, Maharashtra 411028 ("Service Provider").

1. SCOPE OF SERVICES
1.1 The Service Provider shall provide software development, testing, and technology consulting services as described in Statements of Work ("SOW") executed under this Agreement.
1.2 Each SOW shall specify the deliverables, timelines, milestones, and applicable fees.
1.3 The Service Provider shall assign qualified personnel to perform the Services and may subcontract with the Client''s prior written consent.

2. PAYMENT TERMS
2.1 The Client shall pay invoices within 30 days of receipt. Late payments shall attract interest at 18% per annum.
2.2 All fees are exclusive of applicable GST. The Service Provider shall issue tax invoices in compliance with the CGST Act 2017.
2.3 The Service Provider''s GSTIN is 29ABCDE1234F1Z5.

3. INTELLECTUAL PROPERTY
3.1 All deliverables created specifically for the Client under this Agreement shall vest in the Client upon full payment.
3.2 The Service Provider retains ownership of pre-existing IP, tools, frameworks, and methodologies.

4. LIMITATION OF LIABILITY
4.1 Neither party shall be liable for indirect, consequential, or punitive damages.
4.2 The Service Provider''s aggregate liability under this Agreement shall not exceed the fees paid in the preceding one (1) calendar month.

5. TERM AND TERMINATION
5.1 This Agreement shall commence on the date of execution and continue for 2 years, unless terminated earlier.
5.2 Either party may terminate this Agreement for convenience upon 30 days'' written notice.
5.3 Either party may terminate immediately upon material breach that remains uncured for 15 days after written notice.

6. GOVERNING LAW
6.1 This Agreement shall be governed by and construed in accordance with the laws of Karnataka, India.
6.2 Disputes shall be referred to arbitration under the Arbitration and Conciliation Act 1996, with seat at Bengaluru.';

  v_nda_text := 'NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into as of 15 February 2025 between Axiom Capital Advisors LLP, a limited liability partnership having its office at 302, Nariman Point, Mumbai, Maharashtra 400021 ("Disclosing Party") and MediTech Pharma Pvt. Ltd., a company incorporated under the Companies Act 2013 having its office at 5th Floor, Cyber City, Gurgaon, Haryana 122002 ("Receiving Party"), collectively the "Parties".

1. DEFINITION OF CONFIDENTIAL INFORMATION
1.1 "Confidential Information" means all information disclosed by the Disclosing Party to the Receiving Party in connection with the proposed acquisition transaction, including but not limited to financial data, business plans, customer lists, trade secrets, know-how, formulations, clinical trial data, and any other proprietary information, whether disclosed orally, in writing, or by any other means.

2. CONFIDENTIALITY OBLIGATIONS
2.1 The Receiving Party shall hold all Confidential Information in strict confidence and shall not disclose it to any third party without the Disclosing Party''s prior written consent.
2.2 The Receiving Party may disclose Confidential Information only to its employees, directors, and professional advisors who have a need to know and are bound by equivalent confidentiality obligations.

3. TERM
3.1 This Agreement shall remain in effect for a period of 3 years from the date of execution.
3.2 Obligations with respect to trade secrets shall survive indefinitely.

4. RETURN OR DESTRUCTION
4.1 Upon request or termination of discussions, the Receiving Party shall promptly return or destroy all Confidential Information and certify such destruction in writing.

5. BREACH AND REMEDIES
5.1 The Receiving Party acknowledges that breach of this Agreement may cause irreparable harm to the Disclosing Party.
5.2 In the event of breach, the Disclosing Party shall be entitled to seek specific performance and any other remedies available under applicable law.';

  v_saas_text := 'SOFTWARE-AS-A-SERVICE SUBSCRIPTION AGREEMENT

This SaaS Agreement ("Agreement") is entered into as of 1 March 2025 between CloudMatrix Technologies Pvt. Ltd. (CIN: U72900MH2020PTC123456), having its registered office at Tower B, BKC, Mumbai, Maharashtra 400051 ("Provider") and Sterling Financial Services Ltd. (CIN: L65110MH1998PLC456789), a listed company having its office at Dalal Street, Fort, Mumbai, Maharashtra 400023 ("Customer").

1. LICENSE GRANT
1.1 Subject to payment of applicable subscription fees, the Provider grants the Customer a non-exclusive, non-transferable licence to access and use the CloudMatrix Platform ("Platform") for the Customer''s internal business operations.

2. SERVICE LEVELS AND UPTIME
2.1 The Provider guarantees 99.5% monthly uptime for the Platform, excluding scheduled maintenance windows communicated 72 hours in advance.
2.2 For each hour of downtime below the guaranteed level, the Customer shall receive a service credit equal to 0.5% of the monthly subscription fee.

3. DATA SECURITY AND PRIVACY
3.1 The Provider shall implement appropriate technical and organisational measures to protect Customer Data against unauthorised access, destruction, or alteration.
3.2 Both parties acknowledge they are subject to applicable Indian data protection laws.

4. PAYMENT AND TAXES
4.1 The Customer shall pay the annual subscription fee of INR 24,00,000 (Rupees Twenty-Four Lakhs) plus applicable GST within 30 days of invoice.
4.2 The Provider''s GSTIN is 27AABCC1234D1Z1. The Customer''s GSTIN is 27XYZAB5678E2Z5.

5. TERM AND TERMINATION
5.1 This Agreement is for an initial term of 1 year and shall auto-renew unless either party provides 60 days'' notice of non-renewal.
5.2 Either party may terminate for material breach upon 30 days'' cure period.
5.3 The Customer may terminate for convenience upon 90 days'' notice, subject to payment of an early termination fee of 3 months'' subscription.';

  v_emp_text := 'EMPLOYMENT AGREEMENT

This Employment Agreement ("Agreement") is entered into as of 3 March 2025 between LexisCorp India Pvt. Ltd., a company incorporated under the Companies Act 2013 (CIN: U72200DL2015PTC280000), having its registered office at Connaught Place, New Delhi 110001 ("Company") and Vikram Mehta, son of Ramesh Mehta, residing at C-45, Defence Colony, New Delhi 110024 ("Employee").

1. POSITION AND COMPENSATION
1.1 The Employee is appointed as Senior Legal Counsel with effect from 1 April 2025.
1.2 The Employee shall receive a fixed gross salary of INR 25,00,000 per annum, subject to applicable TDS deductions.
1.3 The Employee is eligible for a variable performance bonus of up to 20% of CTC, subject to achievement of KPIs.

2. CONFIDENTIALITY
2.1 The Employee shall not disclose any proprietary, technical, commercial, or business information of the Company to any third party during or after employment.
2.2 This obligation shall survive termination of employment for a period of 5 years.

3. NON-COMPETE
3.1 During employment and for a period of 24 months following termination of employment, the Employee shall not, anywhere in India, directly or indirectly engage in, own, manage, operate, control, or participate in any business that competes with the Company''s business of legal technology, contract management software, or AI-assisted legal services.

4. INTELLECTUAL PROPERTY ASSIGNMENT
4.1 All inventions, developments, discoveries, works of authorship, and improvements made by the Employee during the term of employment that relate to the Company''s business shall be the exclusive property of the Company.

5. TERM AND TERMINATION
5.1 This Agreement shall be for an initial period of 3 years and shall renew automatically unless either party provides 3 months'' notice.
5.2 The Company may terminate this Agreement immediately for cause including gross misconduct, material breach, or conviction of a criminal offence.
5.3 The Employee shall receive a severance payment of 1 month''s gross salary for every completed year of service upon termination without cause.';

  v_lease_text := 'COMMERCIAL LEASE DEED

This Lease Deed ("Deed") is executed on 10 April 2025 between Prestige Developers Ltd. (CIN: L45201KA1997PLC022009), a public limited company having its registered office at Prestige Falcon Towers, Lavelle Road, Bengaluru, Karnataka 560001 (hereinafter "Landlord") and StartupHub Technologies Pvt. Ltd. (CIN: U72900KA2022PTC142857), a private limited company having its registered office at 201, Indiranagar, Bengaluru, Karnataka 560038 (hereinafter "Tenant").

1. PREMISES AND TERM
1.1 The Landlord agrees to lease to the Tenant office premises admeasuring approximately 5,000 sq. ft. of carpet area on the 7th Floor of Prestige Falcon Tower B, Lavelle Road, Bengaluru ("Premises").
1.2 The lease shall be for a period of 36 months commencing 1 May 2025 and ending 30 April 2028.

2. RENT AND ESCALATION
2.1 The monthly rent shall be INR 1,50,000 (Rupees One Lakh Fifty Thousand) plus applicable GST for the first 12 months.
2.2 The rent shall escalate by 10% at the end of every 12-month period.
2.3 The Tenant shall pay a refundable security deposit of INR 4,50,000 (equivalent to 3 months'' rent) within 7 days of execution of this Deed.

3. LOCK-IN PERIOD
3.1 Neither party shall terminate this Deed during the first 18 months ("Lock-in Period") except for material breach.
3.2 Termination during the Lock-in Period shall attract a penalty equal to the remaining Lock-in Period rent.

4. MAINTENANCE AND COMMON AREAS
4.1 The Tenant shall pay monthly maintenance charges of INR 15,000 towards common area maintenance (CAM charges).
4.2 The Landlord shall be responsible for structural repairs and maintenance of common areas.

5. ALTERATIONS
5.1 The Tenant shall not make any structural alterations to the Premises without the Landlord''s prior written consent.
5.2 Non-structural fit-out works may be carried out by the Tenant at its cost.';

  -- ── Insert contracts ─────────────────────────────────────────────────────────

  INSERT INTO public.contracts (id, org_id, title, counterparty, contract_type, governing_law_state,
    execution_status, risk_score, risk_level, owner_id, effective_date, expiry_date,
    analysis_completed_at)
  VALUES
    (v_msa_id, v_org_id, 'Master Services Agreement — TechVision / CodeSphere',
     'CodeSphere Solutions LLP', 'msa', 'Karnataka', 'executed', 42, 'high',
     v_user_id, '2025-01-01', '2027-01-01', now() - interval '2 days'),
    (v_nda_id, v_org_id, 'Non-Disclosure Agreement — Axiom Capital / MediTech',
     'MediTech Pharma Pvt. Ltd.', 'nda', 'Maharashtra', 'executed', 8, 'low',
     v_user_id, '2025-02-15', '2028-02-15', now() - interval '5 days'),
    (v_saas_id, v_org_id, 'SaaS Subscription Agreement — CloudMatrix / Sterling',
     'CloudMatrix Technologies Pvt. Ltd.', 'sla', 'Maharashtra', 'under_review', 65, 'critical',
     v_user_id, '2025-03-01', '2026-03-01', now() - interval '1 day'),
    (v_emp_id, v_org_id, 'Employment Agreement — Vikram Mehta',
     'Vikram Mehta', 'employment', 'Delhi', 'executed', 21, 'medium',
     v_user_id, '2025-04-01', '2028-04-01', now() - interval '3 days'),
    (v_lease_id, v_org_id, 'Commercial Lease — Prestige Falcon Tower B',
     'Prestige Developers Ltd.', 'lease', 'Karnataka', 'executed', 9, 'low',
     v_user_id, '2025-05-01', '2028-04-30', now() - interval '4 days');

  -- ── Insert versions (with extracted text) ────────────────────────────────────

  INSERT INTO public.contract_versions (id, contract_id, version_number, file_path, file_name, file_type, extracted_text, created_by)
  VALUES
    (v_msa_ver, v_msa_id, 1, 'org_' || v_org_id || '/contracts/' || v_msa_id || '/v1.pdf',
     'MSA_TechVision_CodeSphere_2025.pdf', 'application/pdf', v_msa_text, v_user_id),
    (v_nda_ver, v_nda_id, 1, 'org_' || v_org_id || '/contracts/' || v_nda_id || '/v1.pdf',
     'NDA_Axiom_MediTech_2025.pdf', 'application/pdf', v_nda_text, v_user_id),
    (v_saas_ver, v_saas_id, 1, 'org_' || v_org_id || '/contracts/' || v_saas_id || '/v1.pdf',
     'SaaS_CloudMatrix_Sterling_2025.pdf', 'application/pdf', v_saas_text, v_user_id),
    (v_emp_ver, v_emp_id, 1, 'org_' || v_org_id || '/contracts/' || v_emp_id || '/v1.pdf',
     'Employment_VikramMehta_2025.pdf', 'application/pdf', v_emp_text, v_user_id),
    (v_lease_ver, v_lease_id, 1, 'org_' || v_org_id || '/contracts/' || v_lease_id || '/v1.pdf',
     'Lease_PrestigeFalcon_2025.pdf', 'application/pdf', v_lease_text, v_user_id);

  -- ── Insert clauses ────────────────────────────────────────────────────────────

  -- MSA clauses
  INSERT INTO public.contract_clauses (contract_id, version_id, clause_number, heading, body, order_index)
  VALUES
    (v_msa_id, v_msa_ver, '1', 'Scope of Services', 'The Service Provider shall provide software development, testing, and technology consulting services as described in Statements of Work ("SOW") executed under this Agreement. Each SOW shall specify the deliverables, timelines, milestones, and applicable fees. The Service Provider shall assign qualified personnel to perform the Services and may subcontract with the Client''s prior written consent.', 0),
    (v_msa_id, v_msa_ver, '2', 'Payment Terms', 'The Client shall pay invoices within 30 days of receipt. Late payments shall attract interest at 18% per annum. All fees are exclusive of applicable GST. The Service Provider shall issue tax invoices in compliance with the CGST Act 2017. The Service Provider''s GSTIN is 29ABCDE1234F1Z5.', 1),
    (v_msa_id, v_msa_ver, '3', 'Intellectual Property', 'All deliverables created specifically for the Client under this Agreement shall vest in the Client upon full payment. The Service Provider retains ownership of pre-existing IP, tools, frameworks, and methodologies.', 2),
    (v_msa_id, v_msa_ver, '4', 'Limitation of Liability', 'Neither party shall be liable for indirect, consequential, or punitive damages. The Service Provider''s aggregate liability under this Agreement shall not exceed the fees paid in the preceding one (1) calendar month.', 3),
    (v_msa_id, v_msa_ver, '5', 'Term and Termination', 'This Agreement shall commence on the date of execution and continue for 2 years, unless terminated earlier. Either party may terminate this Agreement for convenience upon 30 days'' written notice.', 4)
  RETURNING id INTO c_msa1;

  SELECT id INTO c_msa1 FROM public.contract_clauses WHERE contract_id = v_msa_id AND clause_number = '1';
  SELECT id INTO c_msa2 FROM public.contract_clauses WHERE contract_id = v_msa_id AND clause_number = '2';
  SELECT id INTO c_msa3 FROM public.contract_clauses WHERE contract_id = v_msa_id AND clause_number = '3';
  SELECT id INTO c_msa4 FROM public.contract_clauses WHERE contract_id = v_msa_id AND clause_number = '4';
  SELECT id INTO c_msa5 FROM public.contract_clauses WHERE contract_id = v_msa_id AND clause_number = '5';

  -- NDA clauses
  INSERT INTO public.contract_clauses (contract_id, version_id, clause_number, heading, body, order_index)
  VALUES
    (v_nda_id, v_nda_ver, '1', 'Definition of Confidential Information', '"Confidential Information" means all information disclosed by the Disclosing Party to the Receiving Party in connection with the proposed acquisition transaction, including but not limited to financial data, business plans, customer lists, trade secrets, know-how, formulations, clinical trial data, and any other proprietary information, whether disclosed orally, in writing, or by any other means.', 0),
    (v_nda_id, v_nda_ver, '2', 'Confidentiality Obligations', 'The Receiving Party shall hold all Confidential Information in strict confidence and shall not disclose it to any third party without the Disclosing Party''s prior written consent. The Receiving Party may disclose Confidential Information only to its employees, directors, and professional advisors who have a need to know and are bound by equivalent confidentiality obligations.', 1),
    (v_nda_id, v_nda_ver, '3', 'Term', 'This Agreement shall remain in effect for a period of 3 years from the date of execution. Obligations with respect to trade secrets shall survive indefinitely.', 2),
    (v_nda_id, v_nda_ver, '4', 'Breach and Remedies', 'The Receiving Party acknowledges that breach of this Agreement may cause irreparable harm to the Disclosing Party. In the event of breach, the Disclosing Party shall be entitled to seek specific performance and any other remedies available under applicable law.', 3);

  SELECT id INTO c_nda1 FROM public.contract_clauses WHERE contract_id = v_nda_id AND clause_number = '1';
  SELECT id INTO c_nda2 FROM public.contract_clauses WHERE contract_id = v_nda_id AND clause_number = '2';
  SELECT id INTO c_nda3 FROM public.contract_clauses WHERE contract_id = v_nda_id AND clause_number = '3';
  SELECT id INTO c_nda4 FROM public.contract_clauses WHERE contract_id = v_nda_id AND clause_number = '4';

  -- SaaS clauses
  INSERT INTO public.contract_clauses (contract_id, version_id, clause_number, heading, body, order_index)
  VALUES
    (v_saas_id, v_saas_ver, '1', 'License Grant', 'Subject to payment of applicable subscription fees, the Provider grants the Customer a non-exclusive, non-transferable licence to access and use the CloudMatrix Platform ("Platform") for the Customer''s internal business operations.', 0),
    (v_saas_id, v_saas_ver, '2', 'Service Levels and Uptime', 'The Provider guarantees 99.5% monthly uptime for the Platform, excluding scheduled maintenance windows communicated 72 hours in advance. For each hour of downtime below the guaranteed level, the Customer shall receive a service credit equal to 0.5% of the monthly subscription fee.', 1),
    (v_saas_id, v_saas_ver, '3', 'Data Security and Privacy', 'The Provider shall implement appropriate technical and organisational measures to protect Customer Data against unauthorised access, destruction, or alteration. Both parties acknowledge they are subject to applicable Indian data protection laws.', 2),
    (v_saas_id, v_saas_ver, '4', 'Payment and Taxes', 'The Customer shall pay the annual subscription fee of INR 24,00,000 plus applicable GST within 30 days of invoice. The Provider''s GSTIN is 27AABCC1234D1Z1.', 3);

  SELECT id INTO c_saas1 FROM public.contract_clauses WHERE contract_id = v_saas_id AND clause_number = '1';
  SELECT id INTO c_saas2 FROM public.contract_clauses WHERE contract_id = v_saas_id AND clause_number = '2';
  SELECT id INTO c_saas3 FROM public.contract_clauses WHERE contract_id = v_saas_id AND clause_number = '3';
  SELECT id INTO c_saas4 FROM public.contract_clauses WHERE contract_id = v_saas_id AND clause_number = '4';

  -- Employment clauses
  INSERT INTO public.contract_clauses (contract_id, version_id, clause_number, heading, body, order_index)
  VALUES
    (v_emp_id, v_emp_ver, '1', 'Position and Compensation', 'The Employee is appointed as Senior Legal Counsel with effect from 1 April 2025. The Employee shall receive a fixed gross salary of INR 25,00,000 per annum, subject to applicable TDS deductions. The Employee is eligible for a variable performance bonus of up to 20% of CTC.', 0),
    (v_emp_id, v_emp_ver, '2', 'Confidentiality', 'The Employee shall not disclose any proprietary, technical, commercial, or business information of the Company to any third party during or after employment. This obligation shall survive termination of employment for a period of 5 years.', 1),
    (v_emp_id, v_emp_ver, '3', 'Non-Compete', 'During employment and for a period of 24 months following termination of employment, the Employee shall not, anywhere in India, directly or indirectly engage in, own, manage, operate, control, or participate in any business that competes with the Company''s business of legal technology, contract management software, or AI-assisted legal services.', 2),
    (v_emp_id, v_emp_ver, '4', 'Intellectual Property Assignment', 'All inventions, developments, discoveries, works of authorship, and improvements made by the Employee during the term of employment that relate to the Company''s business shall be the exclusive property of the Company.', 3);

  SELECT id INTO c_emp1 FROM public.contract_clauses WHERE contract_id = v_emp_id AND clause_number = '1';
  SELECT id INTO c_emp2 FROM public.contract_clauses WHERE contract_id = v_emp_id AND clause_number = '2';
  SELECT id INTO c_emp3 FROM public.contract_clauses WHERE contract_id = v_emp_id AND clause_number = '3';
  SELECT id INTO c_emp4 FROM public.contract_clauses WHERE contract_id = v_emp_id AND clause_number = '4';

  -- Lease clauses
  INSERT INTO public.contract_clauses (contract_id, version_id, clause_number, heading, body, order_index)
  VALUES
    (v_lease_id, v_lease_ver, '1', 'Premises and Term', 'The Landlord agrees to lease to the Tenant office premises admeasuring approximately 5,000 sq. ft. of carpet area on the 7th Floor of Prestige Falcon Tower B. The lease shall be for a period of 36 months commencing 1 May 2025 and ending 30 April 2028.', 0),
    (v_lease_id, v_lease_ver, '2', 'Rent and Escalation', 'The monthly rent shall be INR 1,50,000 plus applicable GST for the first 12 months. The rent shall escalate by 10% at the end of every 12-month period. A refundable security deposit of INR 4,50,000 is payable within 7 days.', 1),
    (v_lease_id, v_lease_ver, '3', 'Lock-in Period', 'Neither party shall terminate this Deed during the first 18 months except for material breach. Termination during the Lock-in Period shall attract a penalty equal to the remaining Lock-in Period rent.', 2),
    (v_lease_id, v_lease_ver, '4', 'Maintenance', 'The Tenant shall pay monthly maintenance charges of INR 15,000 towards common area maintenance. The Landlord shall be responsible for structural repairs and maintenance of common areas.', 3);

  SELECT id INTO c_lease1 FROM public.contract_clauses WHERE contract_id = v_lease_id AND clause_number = '1';
  SELECT id INTO c_lease2 FROM public.contract_clauses WHERE contract_id = v_lease_id AND clause_number = '2';
  SELECT id INTO c_lease3 FROM public.contract_clauses WHERE contract_id = v_lease_id AND clause_number = '3';
  SELECT id INTO c_lease4 FROM public.contract_clauses WHERE contract_id = v_lease_id AND clause_number = '4';

  -- ── Insert flags ──────────────────────────────────────────────────────────────

  -- MSA flags
  INSERT INTO public.contract_flags (contract_id, clause_id, severity, category, title, description,
    exact_quote, suggested_fix, suggested_fix_rationale, flag_references)
  VALUES
    (v_msa_id, c_msa4, 'high', 'commercial',
     'Liability cap limited to 1 month fees',
     'The aggregate liability cap of one calendar month''s fees is extremely low for a multi-year MSA covering software development. Industry practice and commercial reasonableness under Indian law typically require a cap of 12 months'' fees or total contract value. This cap may leave the Client with inadequate remedy for significant failures.',
     'The Service Provider''s aggregate liability under this Agreement shall not exceed the fees paid in the preceding one (1) calendar month.',
     'Replace "one (1) calendar month" with "twelve (12) months" or "the total fees paid under the relevant SOW, whichever is higher".',
     'Under Section 73 of the Indian Contract Act 1872, parties are entitled to compensation for losses naturally arising from breach. An excessively low cap may be challenged as unconscionable and may not provide adequate compensation.',
     '[{"citation": "Section 73, Indian Contract Act 1872"}, {"citation": "Section 74, Indian Contract Act 1872"}]'),
    (v_msa_id, c_msa3, 'critical', 'dpdp',
     'No data processing agreement for personal data',
     'The MSA covers software development services that will likely involve processing of personal data belonging to the Client''s customers. Under the Digital Personal Data Protection Act 2023 ("DPDP Act"), the Client as Data Fiduciary must ensure that any Data Processor (Service Provider) is contractually bound to process data only as instructed and implements adequate safeguards. This Agreement lacks a Data Processing Agreement ("DPA") or equivalent provisions.',
     NULL,
     'Add a dedicated Data Processing Annex specifying: (i) categories of personal data processed; (ii) purposes of processing; (iii) obligations of the Data Processor under DPDP Act 2023; (iv) sub-processor restrictions; (v) data breach notification timelines; (vi) return/deletion of data on termination.',
     'Section 8(2) of the Digital Personal Data Protection Act 2023 requires Data Fiduciaries to ensure contractual obligations on Data Processors. Failure to include these provisions exposes the Client to regulatory action under the DPDP Act.',
     '[{"citation": "Section 8, Digital Personal Data Protection Act 2023"}, {"citation": "Section 10, DPDP Act 2023"}]');

  -- NDA flags
  INSERT INTO public.contract_flags (contract_id, clause_id, severity, category, title, description,
    exact_quote, suggested_fix, suggested_fix_rationale, flag_references)
  VALUES
    (v_nda_id, c_nda1, 'medium', 'drafting',
     'Confidential Information definition lacks standard exclusions',
     'The definition of "Confidential Information" is overly broad and does not carve out standard exclusions. Under well-drafted NDAs under Indian law, exclusions such as information already in the public domain, independently developed information, and information received from third parties without restriction are essential to prevent the NDA from being overbroad and potentially unenforceable.',
     '"Confidential Information" means all information disclosed by the Disclosing Party to the Receiving Party in connection with the proposed acquisition transaction, including but not limited to financial data, business plans, customer lists...',
     'Add exclusions: "Confidential Information shall not include information that: (a) is or becomes publicly available through no act or omission of the Receiving Party; (b) was independently developed by the Receiving Party without reference to the Confidential Information; (c) was lawfully received from a third party without restriction; or (d) was already known to the Receiving Party at the time of disclosure."',
     'Indian courts have held overly broad confidentiality clauses to be difficult to enforce. Standard carve-outs ensure the clause is commercially reasonable and enforceable under Section 27 of the Indian Contract Act 1872.',
     '[{"citation": "Section 27, Indian Contract Act 1872"}]'),
    (v_nda_id, NULL, 'medium', 'contract_act',
     'No governing law clause',
     'This Agreement does not specify the governing law or jurisdiction for dispute resolution. For an NDA between parties in Maharashtra and Haryana, the governing law and dispute resolution forum must be specified. Without this, disputes may involve forum shopping and uncertainty about applicable law.',
     NULL,
     'Add: "This Agreement shall be governed by and construed in accordance with the laws of India. Any dispute arising out of or in connection with this Agreement shall be subject to the exclusive jurisdiction of the courts at Mumbai, Maharashtra."',
     'Under the Code of Civil Procedure 1908, without a jurisdiction clause, multiple courts could have concurrent jurisdiction, leading to delays. Section 28 of the Indian Contract Act 1872 deals with agreements in restraint of legal proceedings.',
     '[{"citation": "Section 28, Indian Contract Act 1872"}, {"citation": "Code of Civil Procedure 1908"}]');

  -- SaaS flags
  INSERT INTO public.contract_flags (contract_id, clause_id, severity, category, title, description,
    exact_quote, suggested_fix, suggested_fix_rationale, flag_references)
  VALUES
    (v_saas_id, c_saas3, 'critical', 'dpdp',
     'No Data Processor Agreement for financial data',
     'The SaaS Provider processes financial services data of a listed company (Sterling Financial Services Ltd.). Under the DPDP Act 2023, financial data constitutes significant personal data. There is no Data Processing Agreement, sub-processor restrictions, breach notification timeline (required: 72 hours to Data Protection Board), or data localisation provisions. SEBI regulations additionally require data of financial entities to be stored and processed in India.',
     'Both parties acknowledge they are subject to applicable Indian data protection laws.',
     'Replace Clause 3 entirely with a comprehensive data processing annex specifying categories of personal data, lawful basis, security standards (ISO 27001 or equivalent), 72-hour breach notification, India data localisation, audit rights, and sub-processor restrictions.',
     'Section 8 DPDP Act 2023 requires contractual obligations on Data Processors. SEBI Circular SEBI/HO/ITD/ITD_VAPT/P/CIR/2023/194 requires financial intermediaries to store data in India. Non-compliance may result in penalties up to INR 250 crore.',
     '[{"citation": "Section 8, DPDP Act 2023"}, {"citation": "SEBI Circular SEBI/HO/ITD/2023/194"}]'),
    (v_saas_id, c_saas2, 'medium', 'commercial',
     'Uptime penalty cap too low',
     'The SLA credit of 0.5% of monthly subscription per hour of downtime is extremely low. For a financial services company using a SaaS platform, downtime has significant operational and regulatory impact. Industry standard is 5-10% of monthly subscription per day, with cumulative credits up to one month''s subscription. The current formula could result in negligible compensation for extended outages.',
     'For each hour of downtime below the guaranteed level, the Customer shall receive a service credit equal to 0.5% of the monthly subscription fee.',
     'Replace with: "For each hour of downtime in excess of the permitted downtime, the Provider shall credit 5% of the pro-rated daily subscription fee. Cumulative credits shall not exceed the monthly subscription fee. Credits shall be applied within 30 days."',
     'Under Section 73 of the Indian Contract Act 1872, compensation must be a genuine pre-estimate of loss. For financial services operations, downtime costs significantly exceed 0.5% per hour.',
     '[{"citation": "Section 73, Indian Contract Act 1872"}]');

  -- Employment flags
  INSERT INTO public.contract_flags (contract_id, clause_id, severity, category, title, description,
    exact_quote, suggested_fix, suggested_fix_rationale, flag_references)
  VALUES
    (v_emp_id, c_emp3, 'high', 'contract_act',
     'Non-compete clause likely unenforceable under Indian law',
     'The non-compete clause restricts the Employee for 24 months post-employment across all of India and across all competing businesses. Under Section 27 of the Indian Contract Act 1872, agreements in restraint of trade are void. Indian courts have consistently held post-employment non-compete clauses to be unenforceable, with limited exceptions for legitimate proprietary interest protection.',
     'During employment and for a period of 24 months following termination of employment, the Employee shall not, anywhere in India, directly or indirectly engage in, own, manage, operate, control, or participate in any business that competes with the Company''s business.',
     'Remove or substantially narrow the post-employment non-compete. Consider replacing with: a stronger NDA covering specific proprietary information; a non-solicitation of clients/employees clause (more likely to be upheld); and a gardening leave provision during the notice period.',
     'Section 27 of the Indian Contract Act 1872 states that every agreement in restraint of trade is void, with narrow exceptions. The Supreme Court in Niranjan Shankar Golikari v Century Spinning held post-employment non-competes void unless during employment period.',
     '[{"citation": "Section 27, Indian Contract Act 1872"}, {"citation": "Niranjan Shankar Golikari v Century Spinning (1967) 2 SCR 378"}]'),
    (v_emp_id, c_emp1, 'low', 'drafting',
     'ESOP vesting schedule not defined',
     'The Agreement mentions eligibility for a variable performance bonus but does not reference or attach an ESOP grant letter or vesting schedule. If ESOPs are contemplated, the vesting schedule, cliff period, exercise price, and conditions must be documented. Without this, disputes may arise over entitlement.',
     'The Employee is eligible for a variable performance bonus of up to 20% of CTC, subject to achievement of KPIs.',
     'If ESOPs are to be granted, execute a separate ESOP Grant Letter covering: number of options, exercise price, vesting schedule (cliff and monthly/annual vesting), performance conditions, and treatment upon termination.',
     'Under SEBI (Share Based Employee Benefits and Sweat Equity) Regulations 2021, ESOP terms must be documented in a grant letter. Tax implications under Section 17(2) of the Income Tax Act 1961 require clear documentation of exercise price and FMV.',
     '[{"citation": "SEBI (SBEB) Regulations 2021"}, {"citation": "Section 17(2), Income Tax Act 1961"}]');

  -- Lease flags
  INSERT INTO public.contract_flags (contract_id, clause_id, severity, category, title, description,
    exact_quote, suggested_fix, suggested_fix_rationale, flag_references)
  VALUES
    (v_lease_id, c_lease1, 'medium', 'drafting',
     'RERA registration not referenced',
     'Commercial lease deeds for premises in RERA-registered projects must reference the RERA registration number of the project. This Deed does not mention whether the Prestige Falcon Tower B is RERA-registered or provide the registration number. For a Bengaluru commercial property, RERA compliance under the Real Estate (Regulation and Development) Act 2016 and Karnataka RERA rules must be verified.',
     'The Landlord agrees to lease to the Tenant office premises admeasuring approximately 5,000 sq. ft. of carpet area on the 7th Floor of Prestige Falcon Tower B.',
     'Add to Clause 1: "The Landlord confirms that the Property is registered with Karnataka Real Estate Regulatory Authority under RERA Registration No. [●]. The Landlord shall ensure compliance with all RERA obligations with respect to the Premises."',
     'Section 3 of the RERA Act 2016 requires registration of real estate projects. Karnataka RERA Regulations require RERA registration number to be mentioned in all sale/lease deeds for covered projects.',
     '[{"citation": "Section 3, RERA Act 2016"}, {"citation": "Karnataka RERA Regulations 2017"}]'),
    (v_lease_id, c_lease2, 'low', 'commercial',
     'Stamp duty allocation not specified',
     'The Deed does not specify which party bears the cost of stamp duty on the lease. In Karnataka, stamp duty on commercial leases is payable under the Karnataka Stamp Act 1957. The amount is typically 1% of total rent for the lease period plus security deposit. Without allocation, disputes may arise between parties.',
     NULL,
     'Add to Clause 2: "The stamp duty payable on this Deed shall be borne by the Tenant. Registration charges shall be shared equally between the parties."',
     'Under the Karnataka Stamp Act 1957, stamp duty on lease deeds is the liability of the lessee. The allocation should be documented to avoid ambiguity under Section 31 of the Stamp Act.',
     '[{"citation": "Karnataka Stamp Act 1957"}, {"citation": "Section 31, Indian Stamp Act 1899"}]');

  -- ── Insert summaries ──────────────────────────────────────────────────────────

  INSERT INTO public.contract_summaries (contract_id, summary_en_short, summary_en_long, summary_hi_short, key_terms)
  VALUES
    (v_msa_id,
     'TechVision India has engaged CodeSphere Solutions for software development and consulting services under a 2-year Master Services Agreement. Services are governed by project-specific Statements of Work. The Service Provider retains liability capped at one month''s fees, and all bespoke deliverables vest in TechVision upon full payment. The agreement is governed by Karnataka law with Bengaluru-seated arbitration.',
     'This Master Services Agreement between TechVision India Pvt. Ltd. and CodeSphere Solutions LLP governs an ongoing technology engagement for software development, testing, and consulting. The Client has flexibility to issue Statements of Work defining scope, milestones, and fees. The Service Provider may subcontract with prior written consent. Payment is due within 30 days of invoice, with late payment interest at 18% per annum. GST is charged additionally, and the Service Provider''s GSTIN is provided. IP ownership of bespoke deliverables vests in TechVision upon full payment, while the Service Provider retains all pre-existing IP. The liability cap is notably low—capped at one month''s preceding fees—which is a significant commercial risk for TechVision. The agreement runs for two years from execution with mutual 30-day termination for convenience rights. Disputes are to be resolved by arbitration in Bengaluru under the Arbitration and Conciliation Act 1996. The agreement is broadly standard for Indian technology engagements but the liability cap requires renegotiation before execution.',
     'टेकविजन इंडिया प्राइवेट लिमिटेड ने कोडस्फियर सॉल्यूशंस एलएलपी के साथ 2 वर्षीय मास्टर सर्विसेज एग्रीमेंट के तहत सॉफ्टवेयर विकास और परामर्श सेवाओं के लिए एक समझौता किया है। सेवा प्रदाता की देयता एक महीने की फीस तक सीमित है, और सभी विशेष उत्पाद पूर्ण भुगतान पर टेकविजन को सौंप दिए जाते हैं।',
     '{"parties": ["TechVision India Pvt. Ltd. (Client)", "CodeSphere Solutions LLP (Service Provider)"], "term": "2 years from execution date (1 January 2025 to 31 December 2026)", "payment": "30-day payment terms; 18% p.a. late interest; fees exclusive of GST", "ip": "Bespoke deliverables vest in Client on full payment; Service Provider retains pre-existing IP", "termination": "30 days notice for convenience by either party; immediate on material breach (15-day cure period)", "liability": "Aggregate cap: preceding 1 month fees; no indirect/consequential damages"}'),
    (v_nda_id,
     'Axiom Capital Advisors and MediTech Pharma have entered a 3-year mutual NDA for the purpose of evaluating a potential acquisition transaction. The NDA covers all information disclosed in connection with the deal. Obligations survive for trade secrets. The agreement lacks standard exclusions and governing law provisions.',
     'This Non-Disclosure Agreement governs information sharing between Axiom Capital Advisors LLP and MediTech Pharma Pvt. Ltd. in connection with a proposed acquisition. The definition of Confidential Information is broad, covering financial data, business plans, customer lists, trade secrets, clinical trial data, and all other proprietary information. The Receiving Party is restricted to sharing information only with employees, directors, and professional advisors on a need-to-know basis, who must be bound by equivalent confidentiality obligations. The NDA has a 3-year term, with trade secrets protected indefinitely. Upon request, all Confidential Information must be returned or destroyed with written certification. In the event of breach, the Disclosing Party may seek specific performance and other remedies, acknowledging that monetary damages alone may not be adequate. Two notable gaps exist: the definition of Confidential Information lacks standard exclusions for publicly available information, independently developed information, and information from third parties; and there is no governing law or dispute resolution clause. These omissions should be addressed before execution.',
     'एक्सिओम कैपिटल एडवाइजर्स एलएलपी और मेडीटेक फार्मा प्राइवेट लिमिटेड ने एक प्रस्तावित अधिग्रहण लेनदेन के मूल्यांकन हेतु 3 वर्षीय गोपनीयता समझौते पर हस्ताक्षर किए हैं। यह समझौता सभी साझा जानकारी को गोपनीय रखने की बाध्यता स्थापित करता है। व्यापार रहस्यों के संबंध में दायित्व अनिश्चितकाल तक जारी रहेगा।',
     '{"parties": ["Axiom Capital Advisors LLP (Disclosing Party)", "MediTech Pharma Pvt. Ltd. (Receiving Party)"], "term": "3 years from execution (15 February 2025 to 14 February 2028); trade secrets indefinitely", "payment": "Not applicable", "ip": "No IP transfer provisions", "termination": "No early termination provision", "liability": "Specific performance and equitable remedies available; no monetary cap"}'),
    (v_saas_id,
     'CloudMatrix Technologies has licensed its SaaS platform to Sterling Financial Services under a one-year auto-renewal agreement at INR 24 lakhs per annum plus GST. The Provider guarantees 99.5% uptime with 0.5% hourly credits for downtime. Critical gaps include absence of a DPDP Act-compliant data processing framework for financial data.',
     'This SaaS Agreement governs Sterling Financial Services Ltd.''s subscription to the CloudMatrix Platform for internal business operations. The licence is non-exclusive and non-transferable. The Provider commits to 99.5% monthly uptime, with downtime credits of 0.5% of monthly subscription per hour. The annual fee is INR 24,00,000 plus GST, payable within 30 days of invoice. The Agreement auto-renews for successive one-year terms unless 60 days'' notice is given, with an early termination fee of three months'' subscription on convenience termination. The Agreement has two critical compliance gaps: first, there is no data processing agreement or DPDP Act provisions despite the Provider processing the financial services data of a SEBI-regulated entity; second, the uptime credit structure is commercially inadequate for a financial services operation. The stamp duty and registration provisions are absent. GST details are provided by both parties, which is appropriate.',
     'क्लाउडमैट्रिक्स टेक्नोलॉजीज ने स्टर्लिंग फाइनेंशियल सर्विसेज को एक वर्षीय ऑटो-रिन्यूअल सदस्यता के तहत अपना SaaS प्लेटफॉर्म 24 लाख रुपये प्रतिवर्ष (जीएसटी अतिरिक्त) पर लाइसेंस दिया है। 99.5% अपटाइम की गारंटी है। डेटा सुरक्षा और DPDP अधिनियम अनुपालन के संदर्भ में यह समझौता अपूर्ण है।',
     '{"parties": ["CloudMatrix Technologies Pvt. Ltd. (Provider)", "Sterling Financial Services Ltd. (Customer)"], "term": "1 year auto-renewal; 60 days notice for non-renewal", "payment": "INR 24,00,000 per annum + GST; 30-day terms; 3 months early termination fee", "ip": "Non-exclusive non-transferable licence; no IP transfer", "termination": "30-day cure period for breach; 90-day convenience termination", "liability": "No aggregate cap specified; SLA credits limited to monthly subscription"}'),
    (v_emp_id,
     'LexisCorp India has appointed Vikram Mehta as Senior Legal Counsel from 1 April 2025 at INR 25 lakhs CTC plus 20% performance bonus. The agreement includes a post-employment non-compete clause across India for 24 months, which is likely unenforceable under the Indian Contract Act 1872. IP assignment provisions are comprehensive.',
     'This Employment Agreement appoints Vikram Mehta as Senior Legal Counsel at LexisCorp India Pvt. Ltd. with effect from 1 April 2025 for an initial 3-year term. The fixed CTC is INR 25,00,000 per annum with up to 20% variable bonus tied to KPIs. Standard confidentiality provisions apply during and for 5 years post-employment. The agreement contains a post-employment non-compete restraining Mehta from working in competing legal technology businesses anywhere in India for 24 months. Under settled Indian law (Section 27, Indian Contract Act 1872 and Supreme Court precedent), such post-employment non-competes are void. The clause should be removed and replaced with targeted non-solicitation and enhanced NDA provisions. IP assignment is comprehensive and well-drafted. The agreement also references potential ESOP eligibility, but the vesting schedule and grant terms are not documented. Termination provisions include 3 months'' notice with severance of 1 month per completed year on termination without cause, which is commercially reasonable.',
     'लेक्सिसकॉर्प इंडिया ने विक्रम मेहता को 1 अप्रैल 2025 से वरिष्ठ कानूनी सलाहकार के रूप में 25 लाख रुपये वार्षिक वेतन पर नियुक्त किया है। 24 महीने की प्रतिस्पर्धा-निषेध शर्त है, जो भारतीय अनुबंध अधिनियम 1872 की धारा 27 के तहत संभवतः अप्रवर्तनीय है। बौद्धिक संपदा असाइनमेंट प्रावधान व्यापक हैं।',
     '{"parties": ["LexisCorp India Pvt. Ltd. (Company)", "Vikram Mehta (Employee)"], "term": "3 years from 1 April 2025; auto-renewal with 3 months notice", "payment": "INR 25,00,000 CTC p.a. + 20% variable bonus; standard TDS deductions", "ip": "All employment-related inventions and works vest in Company", "termination": "3 months notice; immediate for cause; severance: 1 month per year of service", "liability": "Standard employment liability; non-compete likely void under Section 27 ICA"}'),
    (v_lease_id,
     'Prestige Developers has leased 5,000 sq. ft. of office space in Prestige Falcon Tower B, Bengaluru to StartupHub Technologies for 36 months at INR 1.5 lakhs per month (10% annual escalation) plus GST. The Lease includes an 18-month lock-in. RERA registration number and stamp duty allocation are not addressed.',
     'This Commercial Lease Deed grants StartupHub Technologies Pvt. Ltd. occupation of 5,000 sq. ft. of office space on the 7th Floor of Prestige Falcon Tower B, Bengaluru for 36 months from 1 May 2025. The monthly rent is INR 1,50,000 plus GST, with 10% annual escalation. A security deposit of INR 4,50,000 (3 months'' rent) is payable upfront. Monthly CAM charges of INR 15,000 apply for common area maintenance. The lease is subject to an 18-month lock-in, after which either party can terminate. Premature termination during lock-in attracts a penalty equivalent to the remaining lock-in rent. The Landlord is responsible for structural repairs; the Tenant can undertake non-structural fit-out. Two improvements are needed: the RERA registration number for the Prestige Falcon Tower project should be included for compliance with Karnataka RERA; and stamp duty allocation should be expressly stated (customarily borne by the Tenant under the Karnataka Stamp Act 1957). The Deed is otherwise commercially balanced.',
     'प्रेस्टिज डेवलपर्स लिमिटेड ने स्टार्टअपहब टेक्नोलॉजीज प्राइवेट लिमिटेड को बेंगलुरु के प्रेस्टिज फाल्कन टॉवर बी में 5,000 वर्ग फुट कार्यालय स्थान 36 महीनों के लिए 1.5 लाख रुपये प्रतिमाह (10% वार्षिक वृद्धि) पर पट्टे पर दिया है। 18 महीने का लॉक-इन अवधि है। RERA पंजीकरण संख्या और स्टाम्प शुल्क आवंटन का उल्लेख नहीं है।',
     '{"parties": ["Prestige Developers Ltd. (Landlord)", "StartupHub Technologies Pvt. Ltd. (Tenant)"], "term": "36 months: 1 May 2025 to 30 April 2028; 18-month lock-in", "payment": "INR 1,50,000/month + GST; 10% annual escalation; INR 4,50,000 security deposit; INR 15,000/month CAM", "ip": "Not applicable", "termination": "After lock-in: either party; lock-in breach penalty = remaining lock-in rent", "liability": "Lock-in penalty; no aggregate liability cap stated"}');

  RAISE NOTICE 'Successfully seeded 5 demo contracts for org %.', v_org_id;
END $$;
