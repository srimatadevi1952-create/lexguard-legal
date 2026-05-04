import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type ClaudeModel = 'claude-opus-4-6' | 'claude-sonnet-4-6'

// Characters above this threshold are truncated before sending to Claude.
// ~50k chars ≈ ~12k tokens — keeps each call well under 25s on Vercel.
export const MAX_CONTRACT_CHARS = 50_000

/**
 * Truncate contract text to a safe length. Logs a warning if truncation
 * occurs so the Vercel log shows the original document size.
 */
export function safeContractText(text: string, label = 'text'): string {
  if (text.length > MAX_CONTRACT_CHARS) {
    console.warn(
      `[claude] TRUNCATING ${label}: ${text.length} chars → ${MAX_CONTRACT_CHARS} chars ` +
      `(${Math.round(text.length / 1000)}k → ${Math.round(MAX_CONTRACT_CHARS / 1000)}k)`
    )
    return text.slice(0, MAX_CONTRACT_CHARS) + '\n\n[...document truncated...]'
  }
  console.log(`[claude] ${label} length: ${text.length} chars`)
  return text
}

/**
 * Call the Claude API and return the text response.
 * Logs request metadata, raw response preview, and surfaces SDK errors clearly.
 */
export async function callClaude(params: {
  model: ClaudeModel
  system?: string
  prompt: string
  maxTokens?: number
  label?: string
}): Promise<string> {
  const label = params.label ?? 'req'
  console.log(
    `[claude:${label}] → model=${params.model} prompt_chars=${params.prompt.length} ` +
    `max_tokens=${params.maxTokens ?? 8192}`
  )

  let response: Awaited<ReturnType<typeof client.messages.create>>
  try {
    response = await client.messages.create(
      {
        model: params.model,
        max_tokens: params.maxTokens ?? 8192,
        ...(params.system ? { system: params.system } : {}),
        messages: [{ role: 'user', content: params.prompt }],
      },
      // Hard 25s per-call timeout — prevents any single call from blocking the
      // Vercel function long enough to trigger the platform-level 60s timeout.
      { timeout: 25_000 }
    )
  } catch (err) {
    if (err instanceof Anthropic.APIConnectionTimeoutError) {
      console.error(`[claude:${label}] TIMEOUT after 25s`)
      throw new Error(`Claude API timeout after 25s [${label}] — reduce contract size or retry`)
    }
    if (err instanceof Anthropic.APIError) {
      console.error(
        `[claude:${label}] SDK APIError status=${err.status} name=${err.name} msg=${err.message}`
      )
      throw new Error(`Anthropic API error ${err.status} (${err.name}): ${err.message}`)
    }
    throw err
  }

  const block = response.content[0]
  const rawText = block?.type === 'text' ? block.text : ''
  console.log(
    `[claude:${label}] ← stop_reason=${response.stop_reason} ` +
    `in=${response.usage.input_tokens} out=${response.usage.output_tokens} | ` +
    `raw[0..300]=${JSON.stringify(rawText.slice(0, 300))}`
  )

  if (!block || block.type !== 'text') {
    throw new Error(`Unexpected Claude response type: ${block?.type ?? 'empty'}`)
  }

  // If the model returned error prose instead of JSON, surface it immediately
  // so the retry doesn't silently swallow the root cause.
  const PROSE_PREFIXES = ['An error', 'I apologize', "I'm sorry", 'I am sorry', 'Sorry,']
  if (PROSE_PREFIXES.some((p) => rawText.startsWith(p))) {
    throw new Error(
      `Claude returned prose instead of JSON [${label}]: "${rawText.slice(0, 300)}"`
    )
  }

  return rawText
}

/**
 * Parse JSON from a Claude response that may be wrapped in a markdown code block.
 */
export function parseJsonResponse<T>(raw: string): T {
  // Direct parse
  try { return JSON.parse(raw) as T } catch {}

  // Extract from ```json ... ``` or ``` ... ```
  const codeBlock = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1]) as T } catch {}
  }

  // Find first { or [ and last } or ]
  const start = Math.min(
    raw.includes('{') ? raw.indexOf('{') : Infinity,
    raw.includes('[') ? raw.indexOf('[') : Infinity,
  )
  const end = Math.max(
    raw.includes('}') ? raw.lastIndexOf('}') + 1 : -Infinity,
    raw.includes(']') ? raw.lastIndexOf(']') + 1 : -Infinity,
  )
  if (start !== Infinity && end > start) {
    try { return JSON.parse(raw.slice(start, end)) as T } catch {}
  }

  throw new Error(`Failed to parse JSON from Claude response: ${raw.slice(0, 300)}`)
}

/**
 * Call Claude and parse the JSON response, with one automatic retry
 * using a stricter system prompt if the first attempt fails to produce JSON.
 */
export async function callClaudeWithJsonRetry<T>(params: {
  model: ClaudeModel
  system?: string
  prompt: string
  maxTokens?: number
  label?: string
}): Promise<T> {
  const label = params.label ?? 'req'

  // Attempt 1
  const raw = await callClaude(params)
  console.log(`[claude:${label}] attempt-1 parse | raw_chars=${raw.length}`)
  try {
    return parseJsonResponse<T>(raw)
  } catch (parseErr) {
    console.warn(
      `[claude:${label}] attempt-1 parse FAILED: ${parseErr instanceof Error ? parseErr.message : parseErr}`
    )
  }

  // Attempt 2 — stricter prompt
  console.log(`[claude:${label}] firing retry with strict system prompt`)
  const strictSystem =
    (params.system ? params.system + '\n' : '') +
    'CRITICAL: Output ONLY raw JSON — no prose, no markdown fences, no explanation. ' +
    'Your entire response must start with { or [ and contain nothing else.'
  const raw2 = await callClaude({ ...params, system: strictSystem, label: `${label}-retry` })
  console.log(`[claude:${label}] attempt-2 parse | raw_chars=${raw2.length}`)
  return parseJsonResponse<T>(raw2)
}
