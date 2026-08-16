import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ApiError, postRecommend } from '../api/client'
import {
  ActionBar,
  Banner,
  Button,
  Card,
  KeyValue,
  Screen,
} from '../components/ui'
import { useSession } from '../state/sessionStore'
import { describeSubmittedPlot, toBackendPlot } from '../lib/units'

const PRODUCT_ORDER = ['dap', 'urea', 'mop']
const PRACTICE_KEY = { urea: 'urea_bags', dap: 'dap_bags', mop: 'mop_bags' }

/** Build the request body from session state. Only fields the API accepts. */
function buildPayload(session) {
  const { plot, soil, request } = session
  const body = {
    plot: toBackendPlot(plot.landSize, plot.landUnit),
    mode: request.mode,
  }
  if (request.mode === 'stcr') {
    body.soil_test = { n: Number(soil.n), p: Number(soil.p), k: Number(soil.k) }
    body.target_yield_q_per_ha = Number(request.targetYieldQPerHa)
  }
  return body
}

export default function Results() {
  const { session } = useSession()
  const navigate = useNavigate()
  const [state, setState] = useState({ status: 'loading' })
  const [payload, setPayload] = useState(null)

  const fetchRecommendation = useCallback(async () => {
    setState({ status: 'loading' })
    const body = buildPayload(session)
    setPayload(body)
    try {
      const data = await postRecommend(body)
      setState({ status: 'success', data })
    } catch (err) {
      setState({ status: 'error', error: err })
    }
  }, [session])

  useEffect(() => {
    fetchRecommendation()
  }, [fetchRecommendation])

  if (state.status === 'loading') {
    return (
      <Screen step={4} title="Working out your plan…">
        <Card>
          <div className="flex items-center gap-3">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-green-600" />
            <p className="text-sm text-slate-600">Asking the recommendation engine…</p>
          </div>
        </Card>
      </Screen>
    )
  }

  if (state.status === 'error') {
    return (
      <ErrorView error={state.error} payload={payload} onRetry={fetchRecommendation} navigate={navigate} />
    )
  }

  return <SuccessView data={state.data} session={session} navigate={navigate} onRetry={fetchRecommendation} />
}

/* ------------------------------------------------------------------ errors */

function ErrorView({ error, payload, onRetry, navigate }) {
  const isApi = error instanceof ApiError
  const offline = isApi && error.status === 0
  const validation = isApi && error.status === 422

  let title = 'Could not get a recommendation'
  let tone = 'danger'
  let advice = 'Something went wrong talking to the engine.'

  if (offline) {
    title = 'Cannot reach the engine'
    advice =
      'The backend did not respond. Check that it is running and that VITE_API_BASE_URL points at it, then try again.'
  } else if (validation) {
    title = 'The engine rejected these inputs'
    tone = 'warning'
    advice = 'Go back and correct the highlighted values, then try again.'
  } else if (isApi && error.status >= 500) {
    title = 'The engine hit an internal error'
    advice = 'This is a backend problem, not a problem with your inputs.'
  }

  const detail =
    isApi && error.body && typeof error.body === 'object' ? error.body.detail : null

  return (
    <Screen step={4} title="Recommendation">
      <Banner tone={tone} title={title}>
        <p>{advice}</p>
        {detail ? (
          <p className="mt-2 font-mono text-xs break-words">{String(detail)}</p>
        ) : (
          <p className="mt-2 font-mono text-xs break-words">{error.message}</p>
        )}
      </Banner>

      {payload ? (
        <Card title="What was sent">
          <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </Card>
      ) : null}

      <ActionBar>
        <Button variant="secondary" onClick={() => navigate('/practice')}>
          Back
        </Button>
        <Button onClick={onRetry}>Try again</Button>
      </ActionBar>
    </Screen>
  )
}

/* ----------------------------------------------------------------- success */

function fmt(n, digits = 1) {
  if (n === null || n === undefined) return '—'
  return Number(n).toFixed(digits)
}

function SuccessView({ data, session, navigate, onRetry }) {
  const plan = data.fertilizer_plan ?? {}
  const doses = Array.isArray(plan.doses) ? plan.doses : []
  const notices = Array.isArray(data.notices) ? data.notices : []
  const blocking = notices.filter((n) => n.severity === 'blocking')
  const warnings = notices.filter((n) => n.severity === 'warning')
  const infos = notices.filter((n) => n.severity === 'info')

  const perPlot = data.requirement_per_plot ?? {}
  const p2o5 = perPlot.p2o5 ?? {}
  const p2o5Blocked = p2o5.status === 'blocked'

  const ordered = [...doses].sort(
    (a, b) => PRODUCT_ORDER.indexOf(a.product_key) - PRODUCT_ORDER.indexOf(b.product_key),
  )

  const credit = Number(plan.dap_nitrogen_credit_kg ?? 0)
  const ureaDose = doses.find((d) => d.product_key === 'urea')

  const { plot, practice } = session
  const hasBaseline = Object.values(PRACTICE_KEY).some((k) => practice[k] !== '')

  return (
    <Screen
      step={4}
      title="Your fertilizer plan"
      subtitle={`${plot.crop} · ${describeSubmittedPlot(plot.landSize, plot.landUnit)}`}
    >
      {/* F. R2a / blocking state — first thing on the page, never buried. */}
      {blocking.map((n) => (
        <Banner key={n.code} tone="danger" title="This plan is incomplete">
          <p>{n.message}</p>
          <p className="mt-2 text-xs">
            Reason code <span className="font-mono">{n.code}</span>
            {n.reference ? (
              <>
                {' '}· guard <span className="font-mono">{n.reference}</span>
              </>
            ) : null}
          </p>
        </Banner>
      ))}

      {/* A. Recommended products: kg + bags, straight from the API. */}
      <Card title="What to buy">
        {ordered.length === 0 ? (
          <p className="text-sm text-slate-600">
            The engine returned no products for this plot.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {ordered.map((d) => (
              <li key={d.product_key} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{d.product_name}</p>
                  <p className="text-xs text-slate-500">
                    Grade {d.grade} · {d.bag_size_kg} kg bag
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-semibold tabular-nums">{fmt(d.kg, 1)} kg</p>
                  <p className="text-sm text-slate-600">
                    {d.bags} bag{d.bags === 1 ? '' : 's'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {p2o5Blocked ? (
          <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3">
            <p className="text-sm font-semibold text-red-900">
              No phosphorus (DAP) quantity is shown
            </p>
            <p className="mt-1 text-sm text-red-900">
              The engine could not calculate the P₂O₅ requirement from your soil test, so no
              figure is given. A number has deliberately <strong>not</strong> been guessed.
            </p>
          </div>
        ) : null}
      </Card>

      {/* B. DAP nitrogen deduction — kept high on the page, no scrolling needed. */}
      {credit > 0 ? (
        <Card title="Why the urea figure is lower than you expect" tone="info">
          <p className="text-sm text-slate-800">
            DAP is not only phosphorus — it is <strong>18% nitrogen</strong>. The{' '}
            {fmt(ordered.find((d) => d.product_key === 'dap')?.kg, 1)} kg of DAP above already
            supplies <strong>{fmt(credit, 1)} kg of nitrogen</strong>, so that much has been
            subtracted from the urea.
          </p>
          <p className="mt-2 text-sm text-slate-800">
            Applying a full urea dose <em>on top of</em> DAP is the most common way nitrogen
            gets over-applied.
          </p>
          {ureaDose?.note ? (
            <p className="mt-2 rounded bg-white/70 p-2 text-xs text-slate-700">{ureaDose.note}</p>
          ) : null}
        </Card>
      ) : null}

      {warnings.map((n) => (
        <Banner key={n.code} tone="warning" title={n.code.replaceAll('_', ' ').toLowerCase()}>
          {n.message}
        </Banner>
      ))}

      {/* E. Current vs recommended. */}
      {hasBaseline ? (
        <Card title="Now vs recommended">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500">
                  <th className="py-2">Product</th>
                  <th className="py-2 text-right">You use</th>
                  <th className="py-2 text-right">Recommended</th>
                  <th className="py-2 text-right">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PRODUCT_ORDER.map((key) => {
                  const dose = doses.find((d) => d.product_key === key)
                  const raw = practice[PRACTICE_KEY[key]]
                  if (raw === '' && !dose) return null
                  const current = raw === '' ? null : Number(raw)
                  const recommended = dose ? dose.bags : null
                  const diff =
                    current !== null && recommended !== null ? recommended - current : null
                  return (
                    <tr key={key}>
                      <td className="py-2 font-medium capitalize">{key}</td>
                      <td className="py-2 text-right tabular-nums">
                        {current === null ? '—' : `${current} bag${current === 1 ? '' : 's'}`}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {recommended === null
                          ? '—'
                          : `${recommended} bag${recommended === 1 ? '' : 's'}`}
                      </td>
                      <td
                        className={`py-2 text-right font-medium tabular-nums ${
                          diff === null ? 'text-slate-400' : diff < 0 ? 'text-green-700' : diff > 0 ? 'text-amber-700' : 'text-slate-500'
                        }`}
                      >
                        {diff === null ? '—' : diff === 0 ? 'same' : diff > 0 ? `+${diff}` : diff}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Bag counts only. Both columns are shown as reported — nothing is recalculated here.
          </p>
        </Card>
      ) : null}

      {/* C. NPK information. */}
      <Card title="Nutrients">
        <dl className="divide-y divide-slate-100">
          <KeyValue
            label="N required"
            value={perPlot.n?.kg != null ? `${fmt(perPlot.n.kg, 1)} kg` : '—'}
          />
          <KeyValue
            label="P₂O₅ required"
            value={
              p2o5Blocked ? (
                <span className="text-red-700">unavailable</span>
              ) : p2o5.kg != null ? (
                `${fmt(p2o5.kg, 1)} kg`
              ) : (
                '—'
              )
            }
          />
          <KeyValue
            label="K₂O required"
            value={perPlot.k2o?.kg != null ? `${fmt(perPlot.k2o.kg, 1)} kg` : '—'}
          />
          <KeyValue
            label="NPK ratio"
            value={
              data.npk_ratio ?? (
                <span className="text-slate-500">not available for this plan</span>
              )
            }
          />
        </dl>
      </Card>

      {infos.length > 0 ? (
        <Card title="Notes from the engine">
          <ul className="space-y-2">
            {infos.map((n) => (
              <li key={n.code} className="text-sm text-slate-700">
                {n.message}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* D. Source citation. */}
      {data.provenance ? (
        <Card title="Where this comes from">
          <p className="text-sm text-slate-800">{data.provenance.source_name}</p>
          {data.provenance.source_locator ? (
            <p className="mt-1 text-xs text-slate-600">{data.provenance.source_locator}</p>
          ) : null}
          {data.provenance.basis ? (
            <p className="mt-1 text-xs text-slate-600">Basis: {data.provenance.basis}</p>
          ) : null}
          {data.provenance.source_url ? (
            <a
              className="mt-2 block break-all text-sm font-medium text-green-800 underline"
              href={data.provenance.source_url}
              target="_blank"
              rel="noreferrer"
            >
              {data.provenance.source_url}
            </a>
          ) : null}
        </Card>
      ) : null}

      <ActionBar>
        <Button variant="secondary" onClick={() => navigate('/practice')}>
          Back
        </Button>
        <Button onClick={onRetry}>Recalculate</Button>
      </ActionBar>
    </Screen>
  )
}
