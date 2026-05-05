/**
 * Deterministic DD checklist generator.
 * No AI — pure template-based logic.
 * Returns items sorted by category then sort_order.
 */

export type DDCategory =
  | 'Corporate'
  | 'Tax'
  | 'Labour'
  | 'IP'
  | 'Litigation'
  | 'Regulatory'
  | 'Material Contracts'
  | 'Financial'
  | 'Compliance'
  | 'Other'

export interface ChecklistTemplate {
  category: DDCategory
  item_text: string
  risk: 'low' | 'medium' | 'high' | 'critical'
}

// ---------------------------------------------------------------------------
// Common items for ALL M&A transactions (50 items)
// ---------------------------------------------------------------------------
const COMMON_ITEMS: ChecklistTemplate[] = [
  // Corporate
  { category: 'Corporate', item_text: 'Obtain certified copies of Certificate of Incorporation and Memorandum & Articles of Association', risk: 'high' },
  { category: 'Corporate', item_text: 'Verify company registration details on MCA21 portal (CIN, registered office, authorised capital)', risk: 'high' },
  { category: 'Corporate', item_text: 'Review board composition, shareholding pattern (Form MGT-7A), and DIN of all directors', risk: 'high' },
  { category: 'Corporate', item_text: 'Obtain and review all shareholder agreements, investment agreements, and side letters', risk: 'critical' },
  { category: 'Corporate', item_text: 'Verify share capital structure: authorised, issued, subscribed, paid-up; classes of shares', risk: 'high' },
  { category: 'Corporate', item_text: 'Confirm no outstanding pre-emptive rights, anti-dilution, drag-along or tag-along rights blocking the transaction', risk: 'high' },
  { category: 'Corporate', item_text: 'Obtain last 3 years of board minutes and annual general meeting minutes', risk: 'medium' },
  { category: 'Corporate', item_text: 'Verify all statutory registers maintained under Companies Act 2013 (MGT-1 to MGT-15)', risk: 'medium' },
  { category: 'Corporate', item_text: 'Check for any charges registered on MCA21 (Form CHG-7); verify satisfaction of past charges', risk: 'critical' },
  { category: 'Corporate', item_text: 'Identify all subsidiaries, associates, and joint ventures; confirm consolidation group structure', risk: 'high' },

  // Financial
  { category: 'Financial', item_text: 'Obtain audited financial statements for last 3 financial years (standalone + consolidated)', risk: 'critical' },
  { category: 'Financial', item_text: 'Review management accounts and quarterly financials for the current year', risk: 'high' },
  { category: 'Financial', item_text: 'Obtain auditor reports; note all qualifications and emphasis of matter paragraphs', risk: 'high' },
  { category: 'Financial', item_text: 'Review bank statements for last 12 months across all accounts', risk: 'medium' },
  { category: 'Financial', item_text: 'Verify working capital position: receivables aging, payables aging, inventory valuation method', risk: 'high' },
  { category: 'Financial', item_text: 'Confirm all off-balance-sheet liabilities, contingent liabilities, and corporate guarantees', risk: 'critical' },
  { category: 'Financial', item_text: 'Review all loan agreements, credit facilities, overdrafts, and debenture trust deeds', risk: 'high' },
  { category: 'Financial', item_text: 'Confirm no pending dividend declarations or arrears on preference shares', risk: 'medium' },

  // Tax
  { category: 'Tax', item_text: 'Obtain PAN and verify Income Tax filing compliance for last 6 assessment years', risk: 'high' },
  { category: 'Tax', item_text: 'Review all pending income tax assessments, appeals, demands, and refund claims', risk: 'critical' },
  { category: 'Tax', item_text: 'Verify GSTIN registration status and GST return filing compliance (GSTR-1, GSTR-3B)', risk: 'high' },
  { category: 'Tax', item_text: 'Obtain GST audit reports; confirm no pending GST demands or show-cause notices', risk: 'high' },
  { category: 'Tax', item_text: 'Review TDS/TCS compliance; obtain TAN and verify 26AS/AIS reconciliation', risk: 'medium' },
  { category: 'Tax', item_text: 'Confirm transfer pricing compliance and documentation for related-party international transactions', risk: 'high' },
  { category: 'Tax', item_text: 'Review stamp duty exposure on assets and agreements; confirm paid-up status', risk: 'medium' },

  // Labour
  { category: 'Labour', item_text: 'Obtain complete employee roster: headcount by category, designation, location, and total cost', risk: 'medium' },
  { category: 'Labour', item_text: 'Verify PF/EPFO and ESIC registration and compliance; obtain Form 3A/6A for last 3 years', risk: 'high' },
  { category: 'Labour', item_text: 'Review employment contracts for key employees; identify restraint-of-trade and non-compete provisions', risk: 'high' },
  { category: 'Labour', item_text: 'Confirm compliance with Shops and Establishments Act registrations across all locations', risk: 'medium' },
  { category: 'Labour', item_text: 'Identify any pending labour disputes, conciliation proceedings, or union agreements', risk: 'high' },
  { category: 'Labour', item_text: 'Review gratuity actuarial valuation; confirm funding status via LIC policy or trust', risk: 'medium' },
  { category: 'Labour', item_text: 'Confirm payment of bonus under Payment of Bonus Act; review any pending disputes', risk: 'low' },

  // IP
  { category: 'IP', item_text: 'Obtain IP asset register: patents, trademarks, copyrights, designs, domain names', risk: 'high' },
  { category: 'IP', item_text: 'Verify ownership of all IP assets; confirm IP developed by employees/contractors is properly assigned', risk: 'critical' },
  { category: 'IP', item_text: 'Obtain all technology license agreements (in and out); confirm no exclusive provisions or change-of-control triggers', risk: 'high' },
  { category: 'IP', item_text: 'Review all IP assignment agreements with founders and key employees', risk: 'high' },

  // Litigation
  { category: 'Litigation', item_text: 'Obtain full litigation register: court, arbitration, NCLT, NCLAT, and regulatory proceedings', risk: 'critical' },
  { category: 'Litigation', item_text: 'Review status of each matter; obtain advocate opinion on likely outcome and quantum', risk: 'high' },
  { category: 'Litigation', item_text: 'Confirm provisions in accounts adequately cover contingent litigation liabilities', risk: 'high' },

  // Regulatory
  { category: 'Regulatory', item_text: 'Identify all sector-specific licenses and permits; verify validity and renewal dates', risk: 'critical' },
  { category: 'Regulatory', item_text: 'Confirm CCI filing obligation under Competition Act 2002 Section 5 has been formally assessed', risk: 'high' },
  { category: 'Regulatory', item_text: 'Review all regulatory correspondence, show-cause notices, and orders in last 3 years', risk: 'high' },

  // Material Contracts
  { category: 'Material Contracts', item_text: 'Obtain all material contracts (threshold ≥ ₹1 Cr or 5% of revenue); review change-of-control clauses', risk: 'critical' },
  { category: 'Material Contracts', item_text: 'Identify all contracts with government bodies or PSUs; confirm tendering compliance', risk: 'high' },
  { category: 'Material Contracts', item_text: 'Review all lease and rental agreements for immovable property; confirm title and encumbrances', risk: 'high' },
  { category: 'Material Contracts', item_text: 'Identify top 10 customers and top 10 vendors by revenue/spend; review concentration risk', risk: 'medium' },

  // Compliance
  { category: 'Compliance', item_text: 'Review DPDP Act 2023 readiness; confirm data fiduciary obligations, consent mechanisms, and privacy policy', risk: 'high' },
  { category: 'Compliance', item_text: 'Confirm CSR compliance under Section 135, Companies Act 2013', risk: 'medium' },
  { category: 'Compliance', item_text: 'Verify anti-corruption compliance program; confirm no pending bribery or FCPA investigations', risk: 'high' },
  { category: 'Compliance', item_text: 'Review POSH Act compliance: internal committee constitution and annual report filing', risk: 'medium' },
]

// ---------------------------------------------------------------------------
// Sector-specific items
// ---------------------------------------------------------------------------
const TECH_ITEMS: ChecklistTemplate[] = [
  { category: 'IP', item_text: 'Conduct open-source software FOSS audit; confirm GPL/LGPL/AGPL licence compliance', risk: 'high' },
  { category: 'IP', item_text: 'Confirm cloud/SaaS infrastructure agreements (AWS, Azure, GCP) are assignable or novatable post-acquisition', risk: 'high' },
  { category: 'Compliance', item_text: 'Verify data localisation compliance under DPDP Act and RBI guidelines for payment/fintech data', risk: 'critical' },
  { category: 'Compliance', item_text: 'Review data processing agreements and DPA/BAA with all third-party vendors', risk: 'high' },
  { category: 'Material Contracts', item_text: 'Obtain all customer SLAs; review uptime guarantees, penalty clauses, and auto-renewal terms', risk: 'high' },
  { category: 'Regulatory', item_text: 'If edtech/fintech/healthtech: verify sector-specific regulatory licences (NBFC, SEBI IA, IRDAI PoSP, etc.)', risk: 'critical' },
  { category: 'IP', item_text: 'Review all software development agreements; confirm work-for-hire IP assignment from contractors', risk: 'high' },
  { category: 'Financial', item_text: 'Analyse ARR/MRR metrics, gross churn, net revenue retention, and customer acquisition cost', risk: 'medium' },
  { category: 'Corporate', item_text: 'Review ESOP plan: outstanding options, vesting schedules, exercise prices, and acceleration provisions', risk: 'high' },
  { category: 'Tax', item_text: 'Review weighted deductions claimed under Section 35(2AB) for in-house R&D; confirm DSIR approvals', risk: 'medium' },
  { category: 'Compliance', item_text: 'Confirm ISO 27001 / SOC 2 certification status; review last security audit and penetration test report', risk: 'medium' },
  { category: 'Regulatory', item_text: 'Verify MeitY approvals for data intermediary / significant social media intermediary status if applicable', risk: 'medium' },
  { category: 'Material Contracts', item_text: 'Review app store distribution agreements (Google Play, Apple App Store); confirm assignability', risk: 'medium' },
  { category: 'Labour', item_text: 'Review technology-specific non-solicitation agreements; assess key talent retention risk post-close', risk: 'high' },
  { category: 'Compliance', item_text: 'Verify IT Act 2000 / SPDI Rules 2011 compliance; review privacy policy and cookie consent mechanism', risk: 'medium' },
  { category: 'Compliance', item_text: 'Confirm CERT-In empanelment and cyber incident reporting compliance', risk: 'medium' },
  { category: 'Financial', item_text: 'Review deferred revenue schedule and revenue recognition policy under Ind AS 115', risk: 'medium' },
  { category: 'IP', item_text: 'Confirm domain name portfolio ownership; review for cybersquatting or brand infringement disputes', risk: 'low' },
]

const PHARMA_ITEMS: ChecklistTemplate[] = [
  { category: 'Regulatory', item_text: 'Obtain all CDSCO licences (manufacturing, import, marketing approval) and confirm validity dates', risk: 'critical' },
  { category: 'Regulatory', item_text: 'Review drug master files (DMF) and API / finished dosage form approvals (Section 8C/ANDA/NDA)', risk: 'critical' },
  { category: 'IP', item_text: 'Map all patents to products; assess patent cliff risk and generic entry timelines for key SKUs', risk: 'critical' },
  { category: 'Regulatory', item_text: 'Verify WHO-GMP and Schedule M compliance certificates; obtain last government inspection reports', risk: 'high' },
  { category: 'Regulatory', item_text: 'Confirm USFDA/EMA/TGA regulatory status for export markets; obtain any Form 483 observations', risk: 'high' },
  { category: 'Regulatory', item_text: 'Obtain all clinical trial approvals (CTRI registration) and ethics committee approvals', risk: 'high' },
  { category: 'Compliance', item_text: 'Review pharmacovigilance compliance under Pharmacovigilance Programme of India (PvPI)', risk: 'high' },
  { category: 'Material Contracts', item_text: 'Review all co-marketing, co-promotion, and licensing agreements; confirm royalty payment terms', risk: 'high' },
  { category: 'Regulatory', item_text: 'Confirm compliance with Drugs Price Control Order (DPCO) for scheduled formulations', risk: 'high' },
  { category: 'Regulatory', item_text: 'Review Environmental Impact Assessment clearances and effluent treatment compliance for manufacturing sites', risk: 'high' },
  { category: 'Tax', item_text: 'Review weighted R&D deductions under Section 35; confirm DSIR certificates cover claimed periods', risk: 'medium' },
  { category: 'Compliance', item_text: 'Confirm hazardous waste disposal compliance (Hazardous and Other Wastes Rules 2016)', risk: 'high' },
]

const REAL_ESTATE_ITEMS: ChecklistTemplate[] = [
  { category: 'Regulatory', item_text: 'Verify RERA registration of all ongoing projects; confirm promoter compliance status', risk: 'critical' },
  { category: 'Corporate', item_text: 'Obtain full title chain for all land/property assets going back at least 30 years; get title opinion from senior counsel', risk: 'critical' },
  { category: 'Regulatory', item_text: 'Confirm land use / zoning approvals, conversion certificate, and change-of-land-use permissions', risk: 'critical' },
  { category: 'Compliance', item_text: 'Review all environmental clearances from MoEFCC (EIA notification compliance)', risk: 'high' },
  { category: 'Corporate', item_text: 'Verify all encumbrances, mortgages, and charges on all properties from Sub-Registrar records', risk: 'critical' },
  { category: 'Regulatory', item_text: 'Confirm building plan approvals, occupancy certificates, and completion certificates for all buildings', risk: 'high' },
  { category: 'Tax', item_text: 'Review property tax assessments; confirm no arrears across all locations', risk: 'medium' },
  { category: 'Material Contracts', item_text: 'Review all development agreements, joint development agreements, and power of attorney structures', risk: 'high' },
  { category: 'Regulatory', item_text: 'Verify FEMA compliance for NRI/foreign investor participation in real estate projects', risk: 'high' },
  { category: 'Litigation', item_text: 'Obtain encumbrance certificates; review any pending partition, title, or boundary disputes', risk: 'critical' },
  { category: 'Corporate', item_text: 'Review all carpet area calculations under RERA; confirm super area to carpet area ratio disclosures', risk: 'medium' },
  { category: 'Compliance', item_text: 'Confirm Fire NOC, lift licences, and local municipal body approvals are current', risk: 'medium' },
]

const FS_ITEMS: ChecklistTemplate[] = [
  { category: 'Regulatory', item_text: 'Obtain RBI banking/NBFC certificate of registration; verify capital adequacy and PCA status', risk: 'critical' },
  { category: 'Regulatory', item_text: 'Review SEBI registrations (broker, IA, RA, PMS, AIF, MF) and confirm compliance status', risk: 'critical' },
  { category: 'Regulatory', item_text: 'Verify IRDAI licence for insurance entities; review solvency margin and investment compliance', risk: 'critical' },
  { category: 'Compliance', item_text: 'Review AML/KYC compliance framework; obtain last internal audit report and FIU-IND filing status', risk: 'critical' },
  { category: 'Compliance', item_text: 'Confirm PMLA compliance: STR/CTR reporting track record; PEP screening process documentation', risk: 'critical' },
  { category: 'Financial', item_text: 'Review NPA classification, provisioning norms (Ind AS 109 ECL), and SARFAESI action status', risk: 'critical' },
  { category: 'Regulatory', item_text: 'Confirm RBI foreign investment compliance (FDI / ECB / FPI limits and reporting)', risk: 'high' },
  { category: 'Compliance', item_text: 'Review ALM policy, liquidity management framework, and interest rate risk management', risk: 'high' },
  { category: 'Material Contracts', item_text: 'Obtain all bancassurance and referral arrangements; confirm IRDAI/SEBI compliance for each', risk: 'high' },
  { category: 'Tax', item_text: 'Review GST on financial services (exempt vs taxable mix); confirm pro-rata ITC calculations', risk: 'high' },
  { category: 'Compliance', item_text: 'Obtain RBI cybersecurity circular compliance report for banks/NBFCs', risk: 'high' },
  { category: 'Regulatory', item_text: 'Review FEMA LRS compliance for international operations and overseas investments', risk: 'high' },
]

const MANUFACTURING_ITEMS: ChecklistTemplate[] = [
  { category: 'Regulatory', item_text: 'Obtain factory licence under Factories Act 1948; verify validity across all plants and locations', risk: 'critical' },
  { category: 'Regulatory', item_text: 'Review environmental clearances: Consent to Establish and Consent to Operate from SPCB', risk: 'critical' },
  { category: 'Regulatory', item_text: 'Verify hazardous waste generation, storage, treatment, and disposal authorisations', risk: 'high' },
  { category: 'Corporate', item_text: 'Obtain all immovable property titles for factory land and buildings; verify industrial zone compliance', risk: 'high' },
  { category: 'Regulatory', item_text: 'Review BIS certifications, product quality approvals, and ISI marks for all products', risk: 'high' },
  { category: 'Labour', item_text: 'Review Contract Labour (Regulation and Abolition) Act compliance; check principal employer licence', risk: 'high' },
  { category: 'Tax', item_text: 'Review customs duty classification and import licences; confirm advance authorisations used correctly', risk: 'high' },
  { category: 'Regulatory', item_text: 'Confirm National Green Tribunal order compliance; review any NGT proceedings against the company', risk: 'high' },
  { category: 'Material Contracts', item_text: 'Review all EPC contracts, equipment supply agreements, and O&M agreements for plant assets', risk: 'medium' },
  { category: 'Labour', item_text: 'Verify Industrial Disputes Act compliance; review long-term wage settlements with unions', risk: 'high' },
  { category: 'Financial', item_text: 'Review capital expenditure plan, maintenance capex schedule, and independent asset condition reports', risk: 'medium' },
  { category: 'Regulatory', item_text: 'Confirm air and water emission standards compliance; obtain stack monitoring and ambient air quality reports', risk: 'high' },
]

const SECTOR_ITEMS: Record<string, ChecklistTemplate[]> = {
  tech:          TECH_ITEMS,
  pharma:        PHARMA_ITEMS,
  real_estate:   REAL_ESTATE_ITEMS,
  fs:            FS_ITEMS,
  manufacturing: MANUFACTURING_ITEMS,
}

// ---------------------------------------------------------------------------
// Size-bracket items
// ---------------------------------------------------------------------------
const SMALL_ITEMS: ChecklistTemplate[] = [
  { category: 'Corporate', item_text: 'Verify company does not qualify as a small company / OPC under Companies Act 2013', risk: 'low' },
  { category: 'Tax', item_text: 'Confirm presumptive taxation scheme usage (Sections 44AD/44ADA/44AE) if applicable', risk: 'low' },
  { category: 'Financial', item_text: 'Review related-party transactions between promoters and company; confirm arm\'s length basis', risk: 'high' },
  { category: 'Compliance', item_text: 'Confirm DPIIT startup recognition status; review angel tax exemption under Section 56(2)(viib)', risk: 'medium' },
  { category: 'Labour', item_text: 'Verify PF/ESIC applicability given employee headcount (threshold: 20 employees)', risk: 'medium' },
  { category: 'Tax', item_text: 'Review startup income tax exemption claimed under Section 80-IAC; confirm DPIIT certificate', risk: 'medium' },
  { category: 'Corporate', item_text: 'Confirm CCPS / convertible notes are FEMA-compliant if foreign investors are involved', risk: 'high' },
  { category: 'IP', item_text: 'Confirm all IP assets are in the company\'s name, not in any founder\'s personal name', risk: 'critical' },
  { category: 'Compliance', item_text: 'Confirm annual return and financial statement filings on MCA21 are current and complete', risk: 'medium' },
  { category: 'Financial', item_text: 'Review founder/promoter salary rationality against an arm\'s length benchmark', risk: 'medium' },
]

const MID_ITEMS: ChecklistTemplate[] = [
  { category: 'Tax', item_text: 'Confirm mandatory tax audit under Section 44AB; review Form 3CA/3CD for all relevant years', risk: 'medium' },
  { category: 'Corporate', item_text: 'Review ESOP scheme under Companies Act 2013 (Section 62(1)(b)) or SEBI ESOP Regulations if listed', risk: 'medium' },
  { category: 'Financial', item_text: 'Confirm working capital facilities: fund-based and non-fund-based limits; review security package', risk: 'high' },
  { category: 'Compliance', item_text: 'Verify Secretarial Audit under Section 204 if public company or private with paid-up capital ≥ ₹10 Cr', risk: 'medium' },
  { category: 'Corporate', item_text: 'Confirm internal audit function in place under Section 138, Companies Act 2013', risk: 'low' },
  { category: 'Regulatory', item_text: 'Confirm RoC annual filings are current: MGT-7, AOC-4, ADT-1, DIR-12', risk: 'high' },
  { category: 'Financial', item_text: 'Review inter-company loans and investments; confirm compliance with Sections 185 and 186', risk: 'high' },
  { category: 'Compliance', item_text: 'Review CSR policy and expenditure track record under Section 135 if applicable', risk: 'low' },
  { category: 'Tax', item_text: 'Review MAT credit entitlement under Section 115JAA; confirm carry-forward position', risk: 'medium' },
  { category: 'Material Contracts', item_text: 'Identify all material related-party transactions; confirm proper board/shareholder approval under Section 188', risk: 'high' },
  { category: 'Corporate', item_text: 'Confirm no non-banking assets held by the company that would trigger NBFC categorisation', risk: 'medium' },
  { category: 'Financial', item_text: 'Review trade receivables financing (factoring, invoice discounting); confirm recourse position', risk: 'medium' },
  { category: 'Compliance', item_text: 'Confirm POSH internal committee annual report filing; verify last 3 years\' reports', risk: 'medium' },
  { category: 'Labour', item_text: 'Review works committee or bipartite arrangements with workers if applicable', risk: 'low' },
  { category: 'Tax', item_text: 'Confirm Country-by-Country reporting obligation if part of an international group (revenue > ₹5,500 Cr)', risk: 'medium' },
]

const LARGE_ITEMS: ChecklistTemplate[] = [
  { category: 'Regulatory', item_text: 'Confirm CCI merger filing obligation has been formally assessed and filed if required; obtain approval timeline', risk: 'critical' },
  { category: 'Corporate', item_text: 'Review full group structure including NCLT/High Court-approved schemes of arrangement', risk: 'high' },
  { category: 'Tax', item_text: 'Assess GAAR implications; obtain specific legal opinion if transaction involves tax structuring', risk: 'critical' },
  { category: 'Regulatory', item_text: 'Review SEBI LODR compliance if target is listed; check promoter pledging disclosures on stock exchanges', risk: 'critical' },
  { category: 'Compliance', item_text: 'Review Ind AS adoption status; confirm all restatements and opening balance sheet adjustments are documented', risk: 'high' },
  { category: 'Tax', item_text: 'Review FEMA compliance for FDI, ODI, ECB; obtain RBI approvals if required for the transaction', risk: 'critical' },
  { category: 'Corporate', item_text: 'Review all group-level guarantees and cross-default provisions in financing documents', risk: 'critical' },
  { category: 'Regulatory', item_text: 'Assess sectoral FDI limit compliance post-acquisition; confirm compliance with FDI policy sector caps', risk: 'critical' },
  { category: 'Tax', item_text: 'Review advance pricing agreement (APA) status; consider bilateral APA implications', risk: 'high' },
  { category: 'Financial', item_text: 'Review hedging policy for foreign currency exposures; assess mark-to-market derivative positions', risk: 'high' },
  { category: 'Compliance', item_text: 'Review enterprise-level anti-trust compliance program; assess parallel foreign merger control obligations', risk: 'high' },
  { category: 'Corporate', item_text: 'Review all listed debentures, NCDs, bonds; confirm Debenture Trustee compliance and covenant status', risk: 'high' },
  { category: 'Regulatory', item_text: 'Review SEBI Takeover Code obligations (SAST Regulations 2011) and open offer threshold implications', risk: 'critical' },
  { category: 'Compliance', item_text: 'Review insider trading compliance: designated persons list, trade window compliance, UPSI documentation', risk: 'high' },
  { category: 'Financial', item_text: 'Engage independent valuer for Ind AS 103 purchase price allocation (PPA) exercise pre-close', risk: 'high' },
  { category: 'Labour', item_text: 'Confirm global mobility and expatriate compliance; review shadow payroll obligations', risk: 'medium' },
  { category: 'Corporate', item_text: 'Review any pending NCLT/NCLAT proceedings; confirm no insolvency applications filed against the company', risk: 'critical' },
  { category: 'Regulatory', item_text: 'Review sector-specific merger control requirements (RBI for banking, IRDAI for insurance)', risk: 'critical' },
  { category: 'Tax', item_text: 'Assess stamp duty optimisation structure vs substantive compliance across all transaction legs', risk: 'high' },
  { category: 'Compliance', item_text: 'Review Secretarial Audit reports for last 3 years; note any qualifications by the Company Secretary', risk: 'medium' },
]

const SIZE_ITEMS: Record<string, ChecklistTemplate[]> = {
  small: SMALL_ITEMS,
  mid:   MID_ITEMS,
  large: LARGE_ITEMS,
}

// ---------------------------------------------------------------------------
// Transaction-type-specific items
// ---------------------------------------------------------------------------
function transactionItems(transactionType: string): ChecklistTemplate[] {
  if (transactionType === 'asset') {
    return [
      { category: 'Tax', item_text: 'Confirm GST on asset acquisition: slump sale vs itemised asset sale treatment; Section 2(102) CGST Act analysis', risk: 'high' },
      { category: 'Corporate', item_text: 'For asset acquisition: confirm employee transfer implications under Industrial Disputes Act (transfer of undertaking)', risk: 'high' },
      { category: 'Tax', item_text: 'Review tax depreciation blocks being acquired; confirm Written Down Value (WDV) of each block', risk: 'medium' },
      { category: 'Regulatory', item_text: 'Confirm all licences and permits are transferable to acquirer; identify licences requiring fresh application', risk: 'critical' },
    ]
  }
  if (transactionType === 'slump_sale') {
    return [
      { category: 'Tax', item_text: 'Confirm slump sale is correctly structured under Section 50B, Income Tax Act 1961; obtain net worth certificate from CA', risk: 'critical' },
      { category: 'Tax', item_text: 'Review GST implications: confirm composite supply analysis; Section 2(102) CGST Act position documented', risk: 'high' },
      { category: 'Corporate', item_text: 'Confirm board and shareholder approval for slump sale under Companies Act 2013', risk: 'high' },
      { category: 'Labour', item_text: 'Review employee transfer terms under Section 25FF, Industrial Disputes Act; identify non-consenting employees', risk: 'high' },
    ]
  }
  if (transactionType === 'merger') {
    return [
      { category: 'Regulatory', item_text: 'Prepare NCLT merger petition under Sections 230-232, Companies Act 2013; confirm required hearings and notices', risk: 'critical' },
      { category: 'Tax', item_text: 'Confirm merger qualifies as "amalgamation" under Section 2(1B), Income Tax Act 1961 for tax neutrality', risk: 'critical' },
      { category: 'Corporate', item_text: 'Obtain shareholders\' and creditors\' approval via NCLT scheme (or fast-track under Section 233 if eligible)', risk: 'critical' },
      { category: 'Regulatory', item_text: 'File RoC Form CAA-1 (notice to RoC); obtain independent accountant report on share exchange ratio', risk: 'high' },
      { category: 'Tax', item_text: 'Analyse MAT credit carry-forward ability post-merger under Section 115JAA; obtain tax counsel opinion', risk: 'medium' },
    ]
  }
  return []
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export function generateDDChecklist(
  transactionType: string,
  sector: string,
  sizeBracket: string,
): ChecklistTemplate[] {
  const items: ChecklistTemplate[] = [
    ...COMMON_ITEMS,
    ...(SECTOR_ITEMS[sector] ?? []),
    ...(SIZE_ITEMS[sizeBracket] ?? SIZE_ITEMS['mid']),
    ...transactionItems(transactionType),
  ]
  return items
}
