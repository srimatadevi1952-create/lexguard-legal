/**
 * Contract analysis pipeline orchestrator.
 *
 * Flow: download → extract text → Claude clause extraction →
 *       Claude risk analysis → Claude EN summary → Claude HI summary →
 *       persist all results → update contract record
 *
 * Model choice: claude-opus-4-6 for clause/risk analysis,
 *               claude-sonnet-4-6 for summary + Hindi translation.
 */

import { callClaudeWithJsonRetry, safeContractText } from '@/lib/claude'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  FlagSeverity,
  FlagCategory,
  RiskLevel,
} from '@/lib/supabase/types'

// ── Intermediate types ────────────────────────────────────────────────────────

interface ClauseRaw {
  clause_number: string
  heading: string
  text: string
  parent_index: number | null
}

interface FlagRaw {
  clause_number: string | null
  severity: FlagSeverity
  category: FlagCategory
  title: string
  description: string
  exact_quote: string | null
  suggested_fix: string | null
  suggested_fix_rationale: string | null
  references: string[]
}

interface SummaryRaw {
  summary_short: string
  summary_long: string
  key_terms: {
    parties: string[]
    term: string
    payment: string
    ip: string
    termination: string
    liability: string
  }
}

interface TranslationRaw {
  summary_short_hi: string
  summary_long_hi: string
}

// ── Text extraction ───────────────────────────────────────────────────────────

export async function extractTextFromBuffer(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  const type = fileType.toLowerCase()

  if (type === 'pdf' || type === 'application/pdf') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (
      buf: Buffer
    ) => Promise<{ text: string }>
    const result = await pdfParse(buffer)
    return result.text.trim()
  }

  if (
    type === 'docx' ||
    type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require('mammoth') as {
      extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }>
    }
    const result = await mammoth.extractRawText({ buffer })
    return result.value.trim()
  }

  if (type === 'jpg' || type === 'jpeg' || type === 'png' || type === 'image/jpeg' || type === 'image/png') {
    throw new Error(
      'OCR is not yet supported in v1. Please upload a text-based PDF or DOCX.'
    )
  }

  throw new Error(`Unsupported file type: ${fileType}`)
}

// ── Clause extraction (Prompt A) ──────────────────────────────────────────────

export async function extractClauses(contractText: string): Promise<ClauseRaw[]> {
  const safeText = safeContractText(contractText, 'extractClauses')

  const prompt = `Extract the complete clause hierarchy from the following Indian-law contract.

Return ONLY a JSON array. No other text, no markdown, no explanation.

Each element must have exactly these fields:
- clause_number: string (e.g. "1", "1.1", "2.3.1")
- heading: string (clause title/heading; empty string if none)
- text: string (the FULL verbatim clause text, including heading if present)
- parent_index: number or null (0-based index of parent clause in the array; null for top-level clauses)

Rules:
- Preserve original order
- Include ALL clauses, sub-clauses and schedules
- Do not truncate or paraphrase text

CONTRACT TEXT:
${safeText}`

  return callClaudeWithJsonRetry<ClauseRaw[]>({
    model: 'claude-opus-4-6',
    system: 'You are an expert Indian contract lawyer. Output ONLY valid JSON arrays.',
    prompt,
    maxTokens: 8192,
    label: 'extractClauses',
  })
}

// ── Risk analysis (Prompt B) — batched + parallel ─────────────────────────────

const RISK_BATCH_SIZE = 10
// Analyse at most 5 batches (50 clauses) in parallel; each call stays <25s.
const MAX_RISK_BATCHES = 5

async function analyseRiskBatch(
  contractText: string,
  clauses: ClauseRaw[],
  batchIndex: number,
): Promise<FlagRaw[]> {
  const clauseSummary = clauses
    .map((c) => `[${c.clause_number}] ${c.heading}: ${c.text.slice(0, 400)}`)
    .join('\n\n')

  const prompt = `Analyse the following Indian-law contract clauses for legal issues.

Return ONLY a JSON array of flag objects. No other text.

Each flag must have exactly these fields:
- clause_number: string | null (matches a clause_number from the list below; null if contract-wide)
- severity: "low" | "medium" | "high" | "critical"
- category: "dpdp" | "gst" | "contract_act" | "it_act" | "companies_act" | "labour" | "sebi" | "fema" | "commercial" | "drafting"
- title: string (concise flag title, ≤10 words)
- description: string (2–4 sentence explanation of the issue under Indian law)
- exact_quote: string | null (verbatim text from the contract that is problematic; null if contract-wide)
- suggested_fix: string | null (concrete redraft or fix suggestion)
- suggested_fix_rationale: string | null (why this fix is needed under Indian law)
- references: string[] (specific Indian statutes, sections or regulations e.g. "Section 27, Indian Contract Act 1872")

IMPORTANT:
- Flag only genuine issues. Do NOT invent problems.
- Reference actual Indian statutes, not US or UK law.
- Severity guide: critical = immediate legal risk/unenforceability; high = significant commercial/regulatory risk; medium = suboptimal but not immediately harmful; low = drafting improvements.
- Only flag issues for the clauses listed in CLAUSE BATCH below.

CONTRACT CONTEXT (first 8000 chars):
${contractText.slice(0, 8000)}

CLAUSE BATCH ${batchIndex + 1} TO ANALYSE:
${clauseSummary}`

  return callClaudeWithJsonRetry<FlagRaw[]>({
    model: 'claude-opus-4-6',
    system: 'You are an expert Indian contract lawyer specialising in contract risk analysis. Output ONLY valid JSON arrays.',
    prompt,
    maxTokens: 4096,
    label: `analyseRisk-b${batchIndex}`,
  })
}

export async function analyseRisk(contractText: string, clauses: ClauseRaw[]): Promise<FlagRaw[]> {
  const activeClauses = clauses.slice(0, RISK_BATCH_SIZE * MAX_RISK_BATCHES)
  if (clauses.length > activeClauses.length) {
    console.warn(
      `[analysis] clause count ${clauses.length} exceeds limit — ` +
      `analysing first ${activeClauses.length} clauses only`
    )
  }

  const batches: ClauseRaw[][] = []
  for (let i = 0; i < activeClauses.length; i += RISK_BATCH_SIZE) {
    batches.push(activeClauses.slice(i, i + RISK_BATCH_SIZE))
  }

  console.log(
    `[analysis] risk analysis: ${batches.length} parallel batch(es) of ≤${RISK_BATCH_SIZE} clauses`
  )

  // All batches run in parallel — each has its own 25s timeout inside callClaude
  const batchResults = await Promise.all(
    batches.map((batch, i) => analyseRiskBatch(contractText, batch, i))
  )

  return batchResults.flat()
}

// ── English summary (Prompt C) ────────────────────────────────────────────────

export async function generateEnglishSummary(contractText: string): Promise<SummaryRaw> {
  const prompt = `Summarise the following Indian-law contract.

Return ONLY a JSON object. No other text.

Required fields:
- summary_short: string (approximately 100 words, plain English, no legal jargon)
- summary_long: string (approximately 500 words, covering all key provisions)
- key_terms: object with these string fields:
    - parties: array of strings (full names of all parties)
    - term: string (contract duration / effective period)
    - payment: string (payment amounts, schedule, penalties)
    - ip: string (IP ownership and licensing provisions)
    - termination: string (how and when either party can terminate)
    - liability: string (liability caps, indemnities, exclusions)

CONTRACT TEXT:
${contractText.slice(0, 12000)}`

  return callClaudeWithJsonRetry<SummaryRaw>({
    model: 'claude-sonnet-4-6',
    system: 'You are a legal analyst. Output ONLY valid JSON objects.',
    prompt,
    maxTokens: 4096,
    label: 'generateSummary',
  })
}

// ── Hindi translation (Prompt D) ──────────────────────────────────────────────

export async function translateToHindi(englishSummary: SummaryRaw): Promise<TranslationRaw> {
  const prompt = `Translate the following English contract summaries into clear, professional Hindi in Devanagari script. The target audience is Indian lawyers and business executives.

Return ONLY a JSON object. No other text.

Required fields:
- summary_short_hi: string (Hindi translation of the short summary)
- summary_long_hi: string (Hindi translation of the long summary)

ENGLISH SHORT SUMMARY:
${englishSummary.summary_short}

ENGLISH LONG SUMMARY:
${englishSummary.summary_long}`

  return callClaudeWithJsonRetry<TranslationRaw>({
    model: 'claude-sonnet-4-6',
    system: 'You are a professional Hindi legal translator. Maintain legal precision. Use Devanagari script. Output ONLY valid JSON.',
    prompt,
    maxTokens: 4096,
    label: 'translateHindi',
  })
}

// ── Risk score computation ────────────────────────────────────────────────────

export function computeRiskScore(flags: FlagRaw[]): { score: number; level: RiskLevel } {
  const WEIGHTS: Record<FlagSeverity, number> = {
    critical: 20,
    high: 10,
    medium: 4,
    low: 1,
  }
  const total = flags.reduce((sum, f) => sum + WEIGHTS[f.severity], 0)
  const score = Math.min(100, total)
  const level: RiskLevel =
    score >= 60 ? 'critical'
    : score >= 35 ? 'high'
    : score >= 15 ? 'medium'
    : 'low'
  return { score, level }
}

// ── Find char positions by text search ───────────────────────────────────────

function findCharPositions(
  fullText: string,
  clauseText: string
): { start: number; end: number } | null {
  const searchText = clauseText.slice(0, 120).trim()
  const idx = fullText.indexOf(searchText)
  if (idx === -1) return null
  return { start: idx, end: idx + clauseText.length }
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export async function runAnalysisPipeline(contractId: string): Promise<void> {
  const admin = createAdminClient()

  try {
    await _runPipeline(admin, contractId)
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`[pipeline] FAILED contractId=${contractId}: ${errorMsg}`)
    // Write the actual error so the UI (and developer) can see the root cause.
    await admin
      .from('contracts')
      .update({
        execution_status: 'analysis_failed',
        analysis_error: errorMsg,
      })
      .eq('id', contractId)
    throw err
  }
}

async function _runPipeline(
  admin: ReturnType<typeof createAdminClient>,
  contractId: string,
): Promise<void> {
  // 0. Clear prior failed state and error so UI doesn't show stale data while running
  await admin
    .from('contracts')
    .update({ execution_status: 'draft', analysis_error: null })
    .eq('id', contractId)
    .eq('execution_status', 'analysis_failed')

  // 1. Fetch contract + latest version
  const { data: contract, error: contractErr } = await admin
    .from('contracts')
    .select('id, org_id, owner_id, contract_versions(id, file_path, file_type, version_number)')
    .eq('id', contractId)
    .single()

  if (contractErr || !contract) {
    throw new Error(`Contract not found: ${contractErr?.message}`)
  }

  const versions = contract.contract_versions as Array<{
    id: string; file_path: string; file_type: string; version_number: number
  }>
  if (!versions?.length) throw new Error('No versions found for contract')
  const version = versions.sort((a, b) => b.version_number - a.version_number)[0]

  // 2. Download file from storage
  console.log(`[pipeline] downloading file_path="${version.file_path}" file_type="${version.file_type}"`)
  const { data: fileData, error: dlErr } = await admin.storage
    .from('contracts')
    .download(version.file_path)

  if (dlErr || !fileData) {
    throw new Error(`Storage download failed (path="${version.file_path}"): ${dlErr?.message}`)
  }
  console.log(`[pipeline] download ok, size=${fileData.size}`)

  const buffer = Buffer.from(await fileData.arrayBuffer())

  // 3. Extract text
  const extractedText = await extractTextFromBuffer(buffer, version.file_type)

  // 4. Save extracted text
  await admin
    .from('contract_versions')
    .update({ extracted_text: extractedText })
    .eq('id', version.id)

  // 5. Prompt A — extract clauses
  const rawClauses = await extractClauses(extractedText)

  // 6. Build clause parent map and save
  const clauseIdByIndex = new Map<number, string>()
  for (let i = 0; i < rawClauses.length; i++) {
    const rc = rawClauses[i]
    const positions = findCharPositions(extractedText, rc.text)
    const parentId =
      rc.parent_index !== null && rc.parent_index !== undefined
        ? clauseIdByIndex.get(rc.parent_index) ?? null
        : null

    const { data: inserted } = await admin
      .from('contract_clauses')
      .insert({
        contract_id: contractId,
        version_id: version.id,
        clause_number: rc.clause_number || null,
        heading: rc.heading || null,
        body: rc.text,
        parent_id: parentId,
        order_index: i,
        char_start: positions?.start ?? null,
        char_end: positions?.end ?? null,
      })
      .select('id')
      .single()

    if (inserted) clauseIdByIndex.set(i, inserted.id)
  }

  // 7. Prompt B — risk analysis
  const rawFlags = await analyseRisk(extractedText, rawClauses)

  // 8. Save flags (link to clause by clause_number)
  const clauseIdByNumber = new Map<string, string>()
  clauseIdByIndex.forEach((id, idx) => {
    const cn = rawClauses[idx]?.clause_number
    if (cn) clauseIdByNumber.set(cn, id)
  })

  if (rawFlags.length > 0) {
    await admin.from('contract_flags').insert(
      rawFlags.map((f) => ({
        contract_id: contractId,
        clause_id: f.clause_number ? (clauseIdByNumber.get(f.clause_number) ?? null) : null,
        severity: f.severity,
        category: f.category,
        title: f.title,
        description: f.description,
        exact_quote: f.exact_quote ?? null,
        suggested_fix: f.suggested_fix ?? null,
        suggested_fix_rationale: f.suggested_fix_rationale ?? null,
        flag_references: (f.references ?? []).map((r) => ({ citation: r })),
      }))
    )
  }

  // 9. Prompt C — English summary
  const enSummary = await generateEnglishSummary(extractedText)

  // 10. Prompt D — Hindi translation
  const hiSummary = await translateToHindi(enSummary)

  // 11. Save summary
  await admin.from('contract_summaries').upsert({
    contract_id: contractId,
    summary_en_short: enSummary.summary_short,
    summary_en_long: enSummary.summary_long,
    summary_hi_short: hiSummary.summary_short_hi,
    summary_hi_long: hiSummary.summary_long_hi,
    key_terms: enSummary.key_terms,
  })

  // 12. Compute risk score + update contract
  const { score, level } = computeRiskScore(rawFlags)
  await admin
    .from('contracts')
    .update({
      risk_score: score,
      risk_level: level,
      execution_status: 'under_review',
      analysis_completed_at: new Date().toISOString(),
    })
    .eq('id', contractId)
}
