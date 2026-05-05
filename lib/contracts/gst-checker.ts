/**
 * Deterministic GST clause checker — no AI calls.
 *
 * Takes extracted contract text and returns an array of GST gap findings
 * based on regex / keyword matching. Each finding maps to a GstFindingType
 * in the gst_findings table.
 */

export type GstFindingType =
  | 'missing_gst_clause'
  | 'incorrect_rate'
  | 'reverse_charge_missing'
  | 'place_of_supply_ambiguous'
  | 'other'

export type GstFindingSeverity = 'low' | 'medium' | 'high'

export interface GstCheckResult {
  finding_type: GstFindingType
  description: string
  severity: GstFindingSeverity
}

// 15-char GSTIN: 2-digit state code + 5-char PAN letters + 4-digit PAN numbers
// + 1 entity letter + 1 alphanumeric + 'Z' + 1 alphanumeric check digit
const GSTIN_REGEX = /\b[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b/

const RCM_REGEX = /reverse[\s-]?charge|reverse\s+charge\s+mechanism|\brcm\b/i

const RATE_INLINE_REGEX = /\b(5|12|18|28)\s*%\s*(gst|igst|cgst\s*\+\s*sgst|cgst|sgst)/i

const TOS_REGEX = /time\s+of\s+supply|date\s+of\s+supply|point\s+of\s+taxation/i

const EINVOICE_REGEX = /e[\s-]?invoice\b|invoice\s+reference\s+number|\birn\b/i

const ITC_REGEX = /input\s+tax\s+credit|\bitc\b/i

const GOVT_REGEX = /\bgovernment\b|central\s+government|state\s+government|local\s+authority|\bpsu\b|public\s+sector\s+undertaking/i

const TDS_CGST_REGEX = /section\s+51\s+of\s+(the\s+)?cgst|gst\s+tds|tds\s+on\s+gst|tax\s+deducted\s+at\s+source\s+.*supply/i

/**
 * Run all 8 GST checks against the supplied contract text.
 * Returns an array of findings (may be empty if the contract is GST-compliant).
 */
export function checkGstClauses(text: string): GstCheckResult[] {
  const results: GstCheckResult[] = []
  const lower = text.toLowerCase()
  const mentionsGst = lower.includes('gst') || lower.includes('goods and services tax')

  // 1. GSTIN format
  if (!GSTIN_REGEX.test(text)) {
    results.push({
      finding_type: 'missing_gst_clause',
      description:
        'No valid GSTIN (15-character GST Identification Number) found. ' +
        'Format: 2-digit state code + PAN + entity code + Z + check digit. ' +
        'Both parties\' GSTINs should appear in or appended to the contract.',
      severity: 'medium',
    })
  }

  // 2. Place of supply
  if (!lower.includes('place of supply')) {
    results.push({
      finding_type: 'place_of_supply_ambiguous',
      description:
        '"Place of supply" is not specified. Under Sections 12–13 of the CGST Act 2017 ' +
        'the place of supply determines whether CGST+SGST or IGST applies. ' +
        'Its absence can expose the parties to tax disputes and GST short-payment risk.',
      severity: 'high',
    })
  }

  // 3. Reverse charge mechanism
  if (!RCM_REGEX.test(text)) {
    results.push({
      finding_type: 'reverse_charge_missing',
      description:
        'No reverse charge mechanism (RCM) clause found. ' +
        'Certain specified supplies (e.g. legal services to a body corporate, import of services) ' +
        'attract RCM liability on the recipient under Section 9(3)–9(4) CGST Act and ' +
        'Notification No. 13/2017-CT(Rate). The contract should allocate this liability.',
      severity: 'medium',
    })
  }

  // 4. GST rate reference
  if (mentionsGst && !RATE_INLINE_REGEX.test(text)) {
    results.push({
      finding_type: 'incorrect_rate',
      description:
        'The contract references GST but does not state the applicable rate ' +
        '(5%, 12%, 18%, or 28%) alongside the tax type (IGST / CGST+SGST). ' +
        'An unspecified rate creates ambiguity on invoicing and may constitute an undisclosed ' +
        'tax liability for the payer.',
      severity: 'medium',
    })
  }

  // 5. GST TDS (Section 51) — relevant for government / PSU contracts
  if (GOVT_REGEX.test(text) && !TDS_CGST_REGEX.test(text)) {
    results.push({
      finding_type: 'missing_gst_clause',
      description:
        'Contract appears to involve a government or PSU entity, but no GST TDS clause is present. ' +
        'Under Section 51 of the CGST Act 2017, specified government bodies must deduct ' +
        'TDS @ 2% (1% CGST + 1% SGST / 2% IGST) on taxable supplies above ₹2.5 lakh. ' +
        'The contract should confirm TDS applicability, responsibility for deposit, and form GSTR-7 filing.',
      severity: 'high',
    })
  }

  // 6. E-invoice / IRN clause
  if ((lower.includes('invoice') || mentionsGst) && !EINVOICE_REGEX.test(text)) {
    results.push({
      finding_type: 'missing_gst_clause',
      description:
        'No e-invoice or IRN (Invoice Reference Number) clause found. ' +
        'Under Rule 48(4) CGST Rules, B2B suppliers with aggregate turnover above ₹5 Crore ' +
        'must generate e-invoices through the IRP portal before issuing invoices to the buyer. ' +
        'The contract should confirm e-invoice compliance obligations.',
      severity: 'low',
    })
  }

  // 7. Time of supply
  if (mentionsGst && !TOS_REGEX.test(text)) {
    results.push({
      finding_type: 'missing_gst_clause',
      description:
        'No "time of supply" clause. Sections 12–13 of the CGST Act 2017 determine ' +
        'when GST liability arises (date of invoice, date of payment, or date of supply — ' +
        'whichever is earlier). The absence of this clause can create disputes on the ' +
        'GST payment period, especially for continuous supply contracts.',
      severity: 'low',
    })
  }

  // 8. Input tax credit
  if (mentionsGst && !ITC_REGEX.test(text)) {
    results.push({
      finding_type: 'missing_gst_clause',
      description:
        'No input tax credit (ITC) clause. The contract should address: ' +
        '(a) whether the supplier will file GSTR-1 timely to enable the recipient\'s ITC claim; ' +
        '(b) liability to indemnify the recipient if ITC is denied due to supplier\'s non-filing; ' +
        '(c) ITC reversal obligations under Section 16(2)(b) CGST Act if payment is delayed ' +
        'beyond 180 days.',
      severity: 'low',
    })
  }

  return results
}
