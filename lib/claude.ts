import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type ClaudeModel = 'claude-opus-4-6' | 'claude-sonnet-4-6'

/**
 * Call the Claude API and return the text response.
 * Throws on API errors or unexpected response types.
 */
export async function callClaude(params: {
  model: ClaudeModel
  system?: string
  prompt: string
  maxTokens?: number
}): Promise<string> {
  const response = await client.messages.create({
    model: params.model,
    max_tokens: params.maxTokens ?? 8192,
    ...(params.system ? { system: params.system } : {}),
    messages: [{ role: 'user', content: params.prompt }],
  })

  const block = response.content[0]
  if (!block || block.type !== 'text') {
    throw new Error(`Unexpected Claude response type: ${block?.type ?? 'empty'}`)
  }
  return block.text
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

  throw new Error(`Failed to parse JSON from response: ${raw.slice(0, 300)}`)
}

/**
 * Call Claude and parse the JSON response, with one automatic retry
 * using a stricter system prompt if the first parse fails.
 */
export async function callClaudeWithJsonRetry<T>(params: {
  model: ClaudeModel
  system?: string
  prompt: string
  maxTokens?: number
}): Promise<T> {
  const raw = await callClaude(params)
  try {
    return parseJsonResponse<T>(raw)
  } catch {
    const strictSystem =
      (params.system ? params.system + '\n' : '') +
      'CRITICAL: Output ONLY raw JSON — no prose, no markdown fences, no explanation. ' +
      'Your entire response must start with { or [ and contain nothing else.'
    const raw2 = await callClaude({ ...params, system: strictSystem })
    return parseJsonResponse<T>(raw2)
  }
}
