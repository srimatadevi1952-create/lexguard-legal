/**
 * Deterministic regulator notice response brief generator.
 * No AI — pure template-based logic per issuer type.
 */

// ---------------------------------------------------------------------------
// 1. Legal framework analysis per issuer
// ---------------------------------------------------------------------------
const LEGAL_FRAMEWORKS: Record<string, string> = {
  mca: `The Ministry of Corporate Affairs (MCA) administers the Companies Act 2013, the LLP Act 2008, and related rules. Show cause notices from MCA typically arise under Sections 206/207 (inspections), Section 447 (fraud), or under adjudication powers in the Companies (Adjudication of Penalties) Rules 2014. The Registrar of Companies (RoC) issues the majority of compliance notices. Responses must be filed within the specified period (typically 21-30 days); failure to respond may result in adjudication proceedings or prosecution under Section 447.`,

  sebi: `The Securities and Exchange Board of India (SEBI) derives its authority from the SEBI Act 1992 and sector-specific regulations (LODR, Takeover Regulations, Insider Trading PIT Regulations). Notices are typically show cause notices (SCNs) under the SEBI (Procedure for Holding Enquiry by Enquiry Officer and Imposing Penalty) Regulations 2002, or interim/final orders. The response period is typically 21 days. Adjudication can result in monetary penalties (up to ₹25 Cr or 3× of gain/loss), debarment, or disgorgement.`,

  cci: `The Competition Commission of India (CCI) operates under the Competition Act 2002 (amended 2023). Notices arise under Section 26(1) (prima facie order), Section 41 (DG investigation), Section 33 (interim orders), or under merger review (Section 6). CCI proceedings can result in penalties up to 10% of average 3-year turnover. Responses to investigation notices require detailed written submissions within the time specified by the DG.`,

  it_dept: `The Income Tax Department operates under the Income Tax Act 1961. Notices arise under various sections: Section 131 (summons), Section 133A (survey), Section 133(6) (information), Section 142(1) (inquiry before assessment), Section 148 (reopening), Section 156 (demand notice), Sections 271/274 (penalty), Section 276B/C (prosecution). Response timelines vary by notice type (typically 15-30 days). Failure to respond can result in ex-parte best-judgment assessment or contempt proceedings.`,

  gst: `GST notices arise under the CGST Act 2017 and applicable State GST Acts. Common notice types include ASMT-10 (scrutiny), ADT-02 (GST audit), DRC-01 (show cause notice for demand), MOV-09 (penalty for e-way bill violation), and Section 70 summons. Response timelines: DRC-01 requires reply within 30 days; other notices typically within 15-30 days. Non-response can result in best-judgment assessment under Section 62 or penalty under Section 122.`,

  rbi: `The Reserve Bank of India (RBI) regulates banks, NBFCs, payment systems, and foreign exchange under the RBI Act 1934, Banking Regulation Act 1949, FEMA 1999, and Payment and Settlement Systems Act 2007. Notices arise from the Department of Regulation, Department of Supervision, or Enforcement Department. RBI enforcement actions can result in monetary penalties under Section 47A (banks/NBFCs) or cancellation of registration. Responses typically require formal Board endorsement.`,

  dpb: `The Data Protection Board of India (DPB) is constituted under the Digital Personal Data Protection Act 2023 (DPDP Act). The Board adjudicates breaches of data protection obligations, processes data principal complaints, and levies penalties (up to ₹250 Cr for significant violations; up to ₹10,000 for failures to implement reasonable security safeguards). Notices may relate to data breaches, consent violations, data principal rights non-compliance, or data fiduciary obligations under Sections 8-12.`,

  state: `State government notices arise from state-level regulatory bodies including State Pollution Control Boards (SPCB), State Labour Departments, State GST authorities, Municipal corporations, RERA authorities, and Shops & Establishments authorities. Jurisdiction and applicable law depend on the specific state, the subject matter, and whether the entity falls under central or concurrent list jurisdiction.`,

  labour: `Labour department notices arise from the Central or State Labour Commissioner's office, EPFO, ESIC, or specialised labour courts. Common sources include inspections under the Factories Act 1948, Minimum Wages Act 1948, Payment of Wages Act 1936, Contract Labour Act 1970, or Code on Wages 2019. Central labour notices often arise under EPFO (Form 7A demand) or ESIC inspection proceedings.`,

  other: `This notice comes from a regulatory or statutory authority. Review the governing legislation carefully to identify the specific provision invoked, the relief claimed or action threatened, and the applicable limitation period for response. Consult the authority's published procedure for responses before filing.`,
}

// ---------------------------------------------------------------------------
// 2. Suggested response structures per issuer
// ---------------------------------------------------------------------------
const RESPONSE_STRUCTURES: Record<string, string> = {
  mca: `Recommended MCA show cause notice response structure:
1. Preliminary objections (if any): jurisdiction, limitation, procedural defects
2. Factual background: brief corporate history and context of the subject matter
3. Point-by-point response to each allegation raised in the notice
4. Legal submissions: cite relevant Companies Act provisions, MCA circulars, and precedents
5. Supporting documentation: annexures with certified copies of relevant statutory filings
6. Prayer: request for dropping proceedings or imposition of minimum penalty
7. Note: if prosecution risk is elevated, consider whether a Board resolution authorising the response is appropriate`,

  sebi: `Recommended SEBI SCN response structure:
1. Summary of the notice and the responding party's position
2. Factual matrix with supporting documentary evidence
3. Legal framework: relevant SEBI regulation and its regulatory intent
4. Point-by-point rebuttal of each allegation
5. Precedents from the Securities Appellate Tribunal (SAT) and SEBI adjudication orders
6. Proportionality argument on penalty quantum (if applicable)
7. Prayer for discharge or reduced penalty
8. Formal request for a personal hearing before the Adjudicating Officer`,

  cci: `Recommended CCI / DG investigation response structure:
1. Background and relevant market context
2. Jurisdictional position (if challenging CCI's jurisdiction)
3. Rebuttal on relevant market definition
4. Commercial justification for the conduct or transaction
5. Economic evidence and analysis (engage an economist if quantum is significant)
6. Reference to CCI precedents and international competition authority decisions
7. Proposed commitments (if applicable under Section 48A, Competition Amendment Act 2023)
8. Leniency/settlement consideration (if appropriate)`,

  it_dept: `Recommended Income Tax notice response structure:
1. Acknowledgment of the notice and identification of the relevant assessment year
2. Factual background
3. Specific response to each query, disallowance, or addition proposed
4. Supporting documents: financial statements, agreements, bank statements as required
5. Legal submissions citing relevant High Court and Supreme Court precedents
6. Reconciliation statement if a financial discrepancy is the underlying issue
7. Prayer for acceptance of the return as filed or for dropping the disallowance
8. If a reopening notice under Section 148: additional arguments on change of opinion and absence of escapement of income`,

  gst: `Recommended GST notice response structure:
1. Brief facts of the case
2. Procedural objections if the notice is time-barred or jurisdiction is disputed
3. Point-by-point response to each ground in the SCN or scrutiny notice
4. Legal analysis citing CGST Act provisions, CBIC circulars, and advance rulings
5. Supporting documentary evidence (invoices, GSTR filings, e-way bills, books of account)
6. Quantification of tax payable, if partial concession is appropriate
7. Prayer for discharge of demand or waiver of interest and penalty`,

  rbi: `Recommended RBI notice response structure:
1. Preliminary compliance statement confirming receipt and authority to respond
2. Board resolution authorising the signatory (almost always required for RBI responses)
3. Factual background of the regulated entity and its business
4. Specific response to each regulatory concern raised
5. Steps taken for rectification with a concrete timeline
6. Board-level commitments for future compliance
7. Reference to applicable RBI Master Directions and circulars
8. Request for a meeting with the regional or departmental office if appropriate`,

  dpb: `Recommended DPB notice response structure:
1. Identity and Data Fiduciary status of the organisation
2. Description of the organisation's data processing operations and purposes
3. Specific response to each ground of non-compliance alleged
4. Evidence of current compliance measures (privacy policy, consent mechanism, DPDP compliance programme)
5. Steps taken since the alleged incident to rectify any lapse
6. Reference to applicable DPDP Act provisions and DPB Rules (as notified)
7. Proportionality submissions on penalty quantum
8. Commitment to ongoing compliance programme and future monitoring`,

  state: `Recommended state regulatory notice response structure:
1. Identify the specific authority and legislative basis for the notice
2. Factual background relevant to the subject matter
3. Point-by-point response to all allegations or queries
4. Reference to applicable state legislation, rules, and notifications
5. Supporting documentary evidence (licences, permits, compliance records)
6. Compliance steps taken or proposed with a timeline
7. Prayer for relief or dropping of proceedings`,

  labour: `Recommended labour notice response structure:
1. Organisation details: registration under applicable labour statutes
2. Rebuttal of alleged non-compliance with supporting payroll/statutory records
3. Copies of relevant statutory registers and challans/returns filed
4. Reference to applicable labour legislation and judicial precedents
5. Proposed corrective action with timeline (if partial admission is appropriate)
6. Request for an inspection visit to verify compliance on the ground
7. Prayer for dropping of proceedings or imposition of minimum compounding`,

  other: `Recommended generic notice response structure:
1. Preliminary observations on the notice
2. Factual background
3. Specific response to each allegation
4. Legal submissions with statutory references
5. Supporting documentary evidence
6. Prayer for relief`,
}

// ---------------------------------------------------------------------------
// 3. Documents typically required per issuer
// ---------------------------------------------------------------------------
const REQUIRED_DOCS: Record<string, string[]> = {
  mca: [
    'Certificate of Incorporation and Memorandum & Articles of Association',
    'Board resolution authorising the authorised signatory to respond',
    'Certified copies of relevant statutory filings from the MCA21 portal',
    'Supporting records for the period in question (books of account, registers)',
    'Prior correspondence with the RoC (if any) on the same matter',
    'Auditor certificate if financial statements are the subject of the notice',
  ],
  sebi: [
    'Board resolution authorising response',
    'SEBI registration certificate',
    'Trading / shareholding records for the relevant period',
    'Bank statements corroborating transactions in question',
    'Electronic communications (emails, chat) relied upon',
    'Corporate announcements and disclosures made to stock exchanges',
    'Compliance officer\'s certification on disclosures made',
  ],
  cci: [
    'Description of relevant market and commercial rationale for the transaction/conduct',
    'Audited financial statements (last 3 years)',
    'Market share data with cited sources',
    'Agreements underlying the conduct under scrutiny',
    'Internal communications on the alleged conduct (identify and preserve)',
    'Economic analysis / expert reports',
  ],
  it_dept: [
    'Income Tax Returns (ITR) for all relevant assessment years',
    'Audited financial statements and tax audit report (Form 3CD)',
    'Form 26AS and AIS reconciliation statement',
    'Bank statements for all accounts for the relevant period',
    'TDS certificates (Form 16 / Form 16A)',
    'Transaction-specific agreements and invoices',
    'Valuation reports if capital gains or business transfer is in question',
    'CA certificate for specific computations',
  ],
  gst: [
    'GSTIN registration certificate',
    'GST returns (GSTR-1, GSTR-3B, GSTR-9) for relevant tax periods',
    'Tax invoices and purchase invoices for disputed transactions',
    'E-way bills (if applicable to the notice)',
    'Books of account extracts and ledger print-outs',
    'Input tax credit reconciliation (GSTR-2A/2B vs books)',
    'Prior GST correspondence and any advance rulings obtained',
  ],
  rbi: [
    'Board resolution authorising response (mandatory)',
    'RBI Certificate of Registration',
    'Relevant regulatory returns / supervisory submissions for the period',
    'Internal audit / concurrent audit reports',
    'Compliance officer\'s certification',
    'Corrective action plan with detailed timelines endorsed by the Board',
  ],
  dpb: [
    'Privacy policy and cookie policy (latest published version)',
    'Consent records and audit trail for the relevant period',
    'DPDP compliance assessment / gap analysis report',
    'Data processing register (Record of Processing Activities — ROPA)',
    'Data fiduciary agreements with all data processors',
    'Technical and organisational measures documentation (TOMs)',
    'Data breach notification records if any breach occurred',
  ],
  state: [
    'Relevant licences and permits from the state authority',
    'Compliance records for the subject matter and period',
    'Prior correspondence with the authority',
    'Internal audit or inspection reports',
    'Board resolution authorising the signatory',
  ],
  labour: [
    'EPFO and ESIC registration certificates',
    'PF challans and Electronic Challan cum Return (ECR) for the relevant period',
    'ESIC challans and half-yearly returns',
    'Employee register with wages (Form B under Minimum Wages Act or equivalent)',
    'Attendance register',
    'Wage register and salary slips',
    'Form 3A / 6A (EPFO) for all relevant financial years',
    'Factory licence / Shops & Establishments registration (as applicable)',
  ],
  other: [
    'Relevant licences and regulatory registrations',
    'Supporting financial records for the period in question',
    'Prior correspondence with the authority',
    'Board resolution authorising the signatory',
  ],
}

// ---------------------------------------------------------------------------
// 4. Tone and approach guidance per issuer
// ---------------------------------------------------------------------------
const TONE_GUIDANCE: Record<string, string> = {
  mca: `Formal and cooperative. MCA/RoC expects professional, compliance-oriented responses. Adopt a tone that demonstrates respect for corporate governance obligations. Avoid adversarial language. If a minor default is admitted, show it was unintentional and has been corrected promptly.`,
  sebi: `Formal, measured, and legally precise. SEBI notices carry significant stakes (penalties + debarment). Every statement must be accurate and supportable with evidence. Rebut incorrect allegations clearly but without aggression. If the matter may proceed to SAT, ensure all submissions are consistent with what will be argued on appeal.`,
  cci: `Commercially and economically technical. CCI responses require economic analysis alongside legal submissions. Be transparent about business rationale — CCI appreciates straightforward commercial explanations over overly legalistic responses. Engage with market data and third-party evidence proactively.`,
  it_dept: `Formal and factual. The Income Tax Department expects numerical precision and factual accuracy. Lead with reconciliation of the figures in dispute, followed by legal arguments. Avoid emotional language. Where amounts are disputed, provide a clear tabular computation.`,
  gst: `Technical and statutory. GST notices require precise statutory citations (chapter, section, notification number, effective date). Be concise; GST authorities process high volumes. Provide quantitative workings in tabular form wherever possible.`,
  rbi: `Deferential and solution-focused. RBI values systemic stability and expects regulated entities to demonstrate Board-level commitment to compliance. Acknowledge any lapse candidly; always accompany the admission with a concrete corrective action plan endorsed by the Board.`,
  dpb: `Cooperative and transparency-oriented. As a newly constituted regulator, DPB is establishing enforcement norms. Demonstrate proactive DPDP compliance culture. Focus on technical safeguards and organisational measures already implemented, and on future compliance roadmap commitments.`,
  state: `Formal and cooperative. Match the tone to the specific state authority. State regulators respond positively to demonstrated local compliance commitment and prompt corrective action.`,
  labour: `Factual and cooperative. Labour authorities appreciate clear, organised documentary evidence. If any compliance gap is identified, show it has been rectified with supporting documentary proof (challans, receipts, updated registers).`,
  other: `Formal, factual, and respectful. Identify the governing statute and follow its prescribed response format. Obtain the authority's published procedure before filing a written response.`,
}

// ---------------------------------------------------------------------------
// 5. Risk flags per issuer
// ---------------------------------------------------------------------------
const RISK_FLAGS: Record<string, string[]> = {
  mca: [
    'MCA show cause notices for fraud under Section 447 have NO upper monetary limit on penalty and carry criminal liability — obtain criminal law counsel immediately',
    'Non-response within the prescribed period may be treated as admission or result in ex-parte adjudication',
    'Directors may have personal liability under Sections 149 and 166 — confirm individual director exposure',
    'Prior NCLT/NCLAT orders on similar issues constitute binding precedent before the RoC',
  ],
  sebi: [
    'Do NOT discard or overwrite electronic communications for the period under SEBI scrutiny — potential evidence destruction risk under Section 11C, SEBI Act',
    'Ensure trading halt by the compliance officer immediately if an insider trading allegation is involved',
    'SEBI has a 6-year limitation for adjudication but can re-open matters on discovery of new information',
    'Personal liability of Whole Time Directors and Key Managerial Personnel is real — they may receive separate SCNs',
    'Do not make press statements about the SEBI inquiry without legal clearance',
  ],
  cci: [
    'CCI penalties can reach 10% of 3-year average turnover — quantify worst-case exposure immediately',
    'DG investigation can include dawn raids; brief front-desk and IT staff on their rights before any such inspection',
    'Leniency applications require acting before competing parties file; time is of the essence',
    'Settlement route under the Competition (Amendment) Act 2023 (Section 48A) may be available — assess early',
    'International cartel cases may involve parallel filings with EU, US DOJ, or other jurisdictions — coordinate strategy globally',
  ],
  it_dept: [
    'Tax prosecution under Sections 276B/276C for wilful evasion can result in imprisonment of 3-7 years — assess criminal exposure at the outset',
    'If the notice is under Section 148, confirm it is not time-barred (6/10-year limits depending on income escaped and financial year)',
    'The responding officer must have proper authority (Power of Attorney / Board resolution) to prevent procedural challenges',
    'Avoid written admissions that could be used against the company in penalty proceedings under Section 271(1)(c)',
    'CBDT circulars are binding on IT authorities but not on taxpayers — cite strategically',
  ],
  gst: [
    'GST penalties for fraud can reach 100% of tax evaded (Section 74) versus 10% for non-fraudulent shortfall (Section 73)',
    'Time bar provisions are strict: 3 years under Section 73; 5 years under Section 74 — confirm the notice is within time',
    'Do NOT issue credit notes or debit notes to reverse disputed transactions during the notice period without legal advice',
    'Personal liability of directors / partners may arise under Section 89 (CGST Act) if the company fails to pay a confirmed demand',
    'Confirm the GSTIN is not suspended during proceedings — suspension would halt business operations',
  ],
  rbi: [
    'RBI can cancel registration / licence — confirm regulatory capital is maintained throughout the proceedings',
    'Board minutes must record receipt of the notice and the resolution authorising the response',
    'Public disclosure obligations may arise if the notice is material information under SEBI LODR (for listed entities)',
    'RBI may appoint an administrator under Section 36AA (Banking Regulation Act) in extreme cases — assess liquidity position immediately',
  ],
  dpb: [
    'DPB can levy penalties up to ₹250 Cr for significant data protection failures under the DPDP Act 2023',
    'Class action complaints by data principals may accompany or follow DPB proceedings',
    'No communications to data subjects about the DPB matter should be issued without legal clearance',
    'Technical logs, audit trails, and system records must be preserved immediately — do not purge any logs',
  ],
  state: [
    'Jurisdiction and limitation periods vary by state — confirm applicable rules before filing a response',
    'State authorities may have concurrent jurisdiction with central authorities — confirm which statute governs',
  ],
  labour: [
    'Non-compliance with EPFO/ESIC demands can trigger Section 14B damages (up to 25% additional liability over contributions)',
    'Criminal prosecution of directors / managers is possible under the EPF Act for wilful default',
    'The Inspector\'s report forms the basis of future prosecution — review and challenge any factual inaccuracies in the report promptly',
  ],
  other: [
    'Identify the governing statute and confirm the authority has jurisdiction over the subject matter',
    'Confirm the limitation period for the notice has not expired',
    'Do not make any public statements about regulatory proceedings without legal clearance',
  ],
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export function generateNoticeResponse(
  issuer: string,
  noticeType: string,
  demands: string,
): string {
  const framework = LEGAL_FRAMEWORKS[issuer]  ?? LEGAL_FRAMEWORKS['other']
  const structure  = RESPONSE_STRUCTURES[issuer] ?? RESPONSE_STRUCTURES['other']
  const docs       = REQUIRED_DOCS[issuer]    ?? REQUIRED_DOCS['other']
  const tone       = TONE_GUIDANCE[issuer]    ?? TONE_GUIDANCE['other']
  const risks      = RISK_FLAGS[issuer]       ?? RISK_FLAGS['other']

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

  return `REGULATOR NOTICE RESPONSE BRIEF
Generated by LexGuard Legal  |  ${today}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NOTICE DETAILS
Issuer     : ${issuer.toUpperCase()}
Type       : ${noticeType}
Demands / Allegations:
${demands?.trim() || '(Enter specific demands after reviewing the original notice)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1.  LEGAL FRAMEWORK ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${framework}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2.  SUGGESTED RESPONSE STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${structure}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3.  DOCUMENTS TYPICALLY REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${docs.map((d, i) => `${String(i + 1).padStart(2, ' ')}. ${d}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4.  SUGGESTED TONE AND APPROACH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${tone}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5.  RISK FLAGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${risks.map((r) => `⚠  ${r}`).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DISCLAIMER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This response brief is a template generated by LexGuard Legal to assist
legal teams in preparing a formal reply. It does not constitute legal advice
and must be reviewed and finalised by qualified legal counsel before
submission to the regulatory authority.
`
}
