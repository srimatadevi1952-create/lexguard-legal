'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Loader2 } from 'lucide-react'

export function GstRescanButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ scanned: number; created: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleRescan() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/compliance/gst/rescan', { method: 'POST' })
      const body = await res.json() as { scanned?: number; created?: number; error?: string }

      if (!res.ok) {
        throw new Error(body.error ?? 'Rescan failed')
      }

      setResult({ scanned: body.scanned ?? 0, created: body.created ?? 0 })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={handleRescan}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-brand-teal text-white rounded-lg hover:bg-brand-teal-dark disabled:opacity-60 transition"
      >
        {loading
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <RefreshCw className="h-4 w-4" />
        }
        {loading ? 'Scanning…' : 'Re-scan all contracts'}
      </button>

      {result && !loading && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
          Scanned <strong>{result.scanned}</strong> contract{result.scanned !== 1 ? 's' : ''} —{' '}
          <strong>{result.created}</strong> finding{result.created !== 1 ? 's' : ''} created.
        </p>
      )}

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
          {error}
        </p>
      )}
    </div>
  )
}
