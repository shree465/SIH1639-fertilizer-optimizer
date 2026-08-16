import { useEffect, useState } from 'react'
import { API_BASE_URL, getHealth } from './api/client'

/**
 * Phase 0 placeholder screen. Its only job is to prove that the Vite app boots,
 * Tailwind is wired up, and the API client can reach the backend.
 * Real screens land in later phases.
 */
function App() {
  const [health, setHealth] = useState({ state: 'loading' })

  useEffect(() => {
    let cancelled = false
    getHealth()
      .then((data) => !cancelled && setHealth({ state: 'ok', data }))
      .catch((err) => !cancelled && setHealth({ state: 'error', message: err.message }))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">SIH1639 Fertilizer Optimizer</h1>
        <p className="mt-1 text-sm text-slate-500">Phase 0 — connectivity check</p>

        <dl className="mt-5 space-y-3 text-sm">
          <div>
            <dt className="font-medium text-slate-600">API base URL</dt>
            <dd className="font-mono break-all text-slate-800">{API_BASE_URL}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-600">GET /health</dt>
            <dd className="font-mono break-all text-slate-800">
              {health.state === 'loading' && 'checking…'}
              {health.state === 'ok' && JSON.stringify(health.data)}
              {health.state === 'error' && (
                <span className="text-red-600">{health.message}</span>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </main>
  )
}

export default App
