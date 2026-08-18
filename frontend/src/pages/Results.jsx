import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ApiError, postRecommend, postImbalance, postEconomics, postSchemesMatch } from '../api/client'
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
import { useTextToSpeech } from '../lib/useVoice'

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

  // TTS
  const { speak, speaking, supported: ttsSupported } = useTextToSpeech()
  const recommendationText = ordered
    .map((d) => `${d.product_name}: ${fmt(d.kg, 1)} kg, ${d.bags} bags`)
    .join('. ')

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

        {/* TTS button */}
        {ttsSupported && ordered.length > 0 ? (
          <button
            type="button"
            className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition"
            onClick={() => speak(
              `Your fertilizer recommendation: ${recommendationText}`,
              'en-IN',
            )}
            disabled={speaking}
          >
            {speaking ? '🔊 Speaking…' : '🔊 Read recommendation aloud'}
          </button>
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

      {/* Phase 3: Imbalance dial */}
      {hasBaseline ? (
        <ImbalanceSection practice={practice} doses={doses} />
      ) : null}

      {/* Phase 3: Economics */}
      {hasBaseline ? (
        <EconomicsSection practice={practice} doses={doses} />
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

      {/* Phase 3: Schemes */}
      <SchemesSection session={session} />

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

      {/* Phase 3: LCC navigation */}
      <Card title="In-season tools">
        <button
          type="button"
          className="w-full rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-left text-sm font-medium text-green-900 hover:bg-green-100 transition"
          onClick={() => navigate('/lcc')}
        >
          🌿 Leaf Colour Chart — check if nitrogen top-dressing is needed
        </button>
      </Card>

      <ActionBar>
        <Button variant="secondary" onClick={() => navigate('/practice')}>
          Back
        </Button>
        <Button onClick={onRetry}>Recalculate</Button>
      </ActionBar>
    </Screen>
  )
}

/* ------------------------------------------------------------ Imbalance */

function ImbalanceSection({ practice, doses }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const currentBags = {
      urea_bags: practice.urea_bags === '' ? 0 : Number(practice.urea_bags),
      dap_bags: practice.dap_bags === '' ? 0 : Number(practice.dap_bags),
      mop_bags: practice.mop_bags === '' ? 0 : Number(practice.mop_bags),
    }
    const recDose = (key) => {
      const d = doses.find((x) => x.product_key === key)
      return d ? d.bags : 0
    }
    const recommendedBags = {
      urea_bags: recDose('urea'),
      dap_bags: recDose('dap'),
      mop_bags: recDose('mop'),
    }

    setLoading(true)
    postImbalance({ current: currentBags, recommended: recommendedBags })
      .then((res) => { setData(res); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [practice, doses])

  if (loading) return null
  if (error) {
    return (
      <Banner tone="warning" title="Imbalance data unavailable">
        {error}
      </Banner>
    )
  }
  if (!data) return null

  const surplus = data.nitrogen_surplus_kg

  return (
    <Card title="NPK Imbalance">
      {/* Nitrogen surplus — the headline number */}
      <div className="mb-4 rounded-lg bg-gradient-to-r from-amber-50 to-amber-100 p-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
          {surplus > 0 ? 'Nitrogen surplus (over-applied)' : surplus < 0 ? 'Additional nitrogen with plan' : 'Nitrogen balanced'}
        </p>
        <p className={`text-3xl font-bold tabular-nums ${surplus > 0 ? 'text-amber-800' : surplus < 0 ? 'text-green-700' : 'text-slate-700'}`}>
          {surplus > 0 ? `+${fmt(surplus, 1)}` : fmt(surplus, 1)} kg
        </p>
        {surplus > 0 ? (
          <p className="mt-1 text-xs text-amber-700">
            You are currently applying {fmt(surplus, 1)} kg more nitrogen than recommended
          </p>
        ) : null}
      </div>

      {/* Ratio comparison bars */}
      <div className="space-y-3">
        <RatioBar label="Your current" ratio={data.current_ratio} message={data.current_ratio_message} color="amber" />
        <RatioBar label="Recommended" ratio={data.recommended_ratio} message={data.recommended_ratio_message} color="green" />
        <RatioBar label="Target" ratio={data.target_ratio} color="sky" />
      </div>

      {/* Totals */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="font-medium text-slate-500">Current totals</p>
          <p>N: {fmt(data.current_totals.n_kg)} kg</p>
          <p>P₂O₅: {fmt(data.current_totals.p2o5_kg)} kg</p>
          <p>K₂O: {fmt(data.current_totals.k2o_kg)} kg</p>
        </div>
        <div>
          <p className="font-medium text-slate-500">Recommended totals</p>
          <p>N: {fmt(data.recommended_totals.n_kg)} kg</p>
          <p>P₂O₅: {fmt(data.recommended_totals.p2o5_kg)} kg</p>
          <p>K₂O: {fmt(data.recommended_totals.k2o_kg)} kg</p>
        </div>
      </div>
    </Card>
  )
}

function RatioBar({ label, ratio, message, color = 'slate' }) {
  if (!ratio && message) {
    return (
      <div>
        <p className="text-xs font-medium text-slate-600">{label}</p>
        <p className="text-xs text-amber-700 italic">{message}</p>
      </div>
    )
  }
  if (!ratio) return null

  const total = ratio.n + ratio.p2o5 + ratio.k2o
  if (total === 0) return null

  const pcts = {
    n: (ratio.n / total) * 100,
    p: (ratio.p2o5 / total) * 100,
    k: (ratio.k2o / total) * 100,
  }

  const colors = {
    amber: ['bg-amber-500', 'bg-amber-300', 'bg-amber-200'],
    green: ['bg-green-600', 'bg-green-400', 'bg-green-300'],
    sky: ['bg-sky-500', 'bg-sky-300', 'bg-sky-200'],
    slate: ['bg-slate-500', 'bg-slate-400', 'bg-slate-300'],
  }
  const c = colors[color] || colors.slate

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-600">{label}</p>
        <p className="text-xs font-mono text-slate-500">{ratio.label}</p>
      </div>
      <div className="mt-1 flex h-4 overflow-hidden rounded-full">
        <div className={`${c[0]} transition-all`} style={{ width: `${pcts.n}%` }} title={`N: ${ratio.n}`} />
        <div className={`${c[1]} transition-all`} style={{ width: `${pcts.p}%` }} title={`P₂O₅: ${ratio.p2o5}`} />
        <div className={`${c[2]} transition-all`} style={{ width: `${pcts.k}%` }} title={`K₂O: ${ratio.k2o}`} />
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] text-slate-400">
        <span>N</span>
        <span>P₂O₅</span>
        <span>K₂O</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ Economics */

function EconomicsSection({ practice, doses }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const currentBags = {
      urea_bags: practice.urea_bags === '' ? 0 : Number(practice.urea_bags),
      dap_bags: practice.dap_bags === '' ? 0 : Number(practice.dap_bags),
      mop_bags: practice.mop_bags === '' ? 0 : Number(practice.mop_bags),
    }
    const recDose = (key) => {
      const d = doses.find((x) => x.product_key === key)
      return d ? d.bags : 0
    }
    const recommendedBags = {
      urea_bags: recDose('urea'),
      dap_bags: recDose('dap'),
      mop_bags: recDose('mop'),
    }

    setLoading(true)
    postEconomics({ current: currentBags, recommended: recommendedBags })
      .then((res) => { setData(res); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [practice, doses])

  if (loading) return null
  if (error) {
    return (
      <Banner tone="warning" title="Economics data unavailable">
        {error}
      </Banner>
    )
  }
  if (!data) return null

  const savingsPositive = data.savings > 0
  const savingsZero = data.savings === 0

  return (
    <Card title="Economics">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">Current cost</p>
          <p className="text-lg font-bold tabular-nums text-slate-800">₹{data.current_cost.toLocaleString('en-IN')}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">Recommended cost</p>
          <p className="text-lg font-bold tabular-nums text-slate-800">₹{data.recommended_cost.toLocaleString('en-IN')}</p>
        </div>
        <div className={`rounded-lg p-3 ${savingsPositive ? 'bg-green-50' : savingsZero ? 'bg-slate-50' : 'bg-amber-50'}`}>
          <p className="text-xs font-medium text-slate-500">
            {savingsPositive ? 'You save' : savingsZero ? 'Same cost' : 'Additional cost'}
          </p>
          <p className={`text-lg font-bold tabular-nums ${savingsPositive ? 'text-green-700' : savingsZero ? 'text-slate-700' : 'text-amber-700'}`}>
            ₹{Math.abs(data.savings).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {data.assumptions.length > 0 ? (
        <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-2">
          <p className="text-xs font-medium text-slate-500">Price assumptions</p>
          {data.assumptions.map((a, i) => (
            <p key={i} className="mt-1 text-xs text-slate-600">{a}</p>
          ))}
        </div>
      ) : null}

      <p className="mt-2 text-xs text-slate-500">
        Input cost comparison only. No yield gain is assumed or fabricated.
      </p>
    </Card>
  )
}

/* ------------------------------------------------------------ Schemes */

function SchemesSection({ session }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const profile = {
      is_landholding: true,
      state: session.plot.state,
      crop: session.plot.crop,
    }
    setLoading(true)
    postSchemesMatch(profile)
      .then((res) => { setData(res); setLoading(false) })
      .catch(() => setLoading(false))
  }, [session.plot.state, session.plot.crop])

  if (loading || !data) return null

  const matched = data.schemes.filter((s) => s.eligibility_met)
  if (matched.length === 0) return null

  return (
    <Card title="Government schemes you may be eligible for">
      <ul className="divide-y divide-slate-100">
        {matched.map((s) => (
          <li key={s.id} className="py-3">
            <p className="font-medium text-slate-900">{s.name}</p>
            <p className="mt-1 text-sm text-slate-700">{s.description}</p>
            <p className="mt-1 text-xs text-slate-500">{s.reason}</p>
            <a
              className="mt-1 block text-xs font-medium text-green-700 underline"
              href={s.source_url}
              target="_blank"
              rel="noreferrer"
            >
              {s.source} →
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500 italic">{data.disclaimer}</p>
    </Card>
  )
}
