import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  ActionBar,
  Banner,
  Button,
  Card,
  Field,
  Screen,
  Select,
  TextInput,
} from '../components/ui'
import { useSession } from '../state/sessionStore'

const GRADES = ['', 'low', 'medium', 'high']

/**
 * Soil step.
 *
 * Two recommendation modes, matching what the backend actually offers:
 *
 *  - blanket_rdf : no soil values needed at all.
 *  - stcr        : needs available N, P and K in kg/ha plus a yield target.
 *
 * The extra fields the manual lists (pH, low/medium/high grades, organic
 * carbon, moisture, days after sowing, lat/long) are captured and kept in
 * session state, but they are NOT sent — the current /recommend contract does
 * not accept them. They are grouped separately and labelled so nothing appears
 * to influence a number that it does not actually influence.
 */
export default function SoilInput() {
  const { session, updateSection } = useSession()
  const navigate = useNavigate()
  const [errors, setErrors] = useState({})

  const { soil, request } = session
  const isStcr = request.mode === 'stcr'

  function numericError(value, label, { max } = {}) {
    if (value === '' || value === null) return `${label} is required for a soil-test plan.`
    const n = Number(value)
    if (Number.isNaN(n)) return `${label} must be a number.`
    if (n < 0) return `${label} cannot be negative.`
    if (max && n > max) return `${label} looks too high — check the units (kg/ha).`
    return null
  }

  function validate() {
    const next = {}
    if (isStcr) {
      next.n = numericError(soil.n, 'Available nitrogen', { max: 2000 })
      next.p = numericError(soil.p, 'Available phosphorus', { max: 2000 })
      next.k = numericError(soil.k, 'Available potassium', { max: 5000 })
      const t = Number(request.targetYieldQPerHa)
      if (request.targetYieldQPerHa === '' || Number.isNaN(t)) {
        next.target = 'Target yield is required for a soil-test plan.'
      } else if (t <= 0) {
        next.target = 'Target yield must be more than zero.'
      }
    }
    if (soil.ph !== '') {
      const ph = Number(soil.ph)
      if (Number.isNaN(ph) || ph < 0 || ph > 14) next.ph = 'pH must be between 0 and 14.'
    }
    const cleaned = Object.fromEntries(Object.entries(next).filter(([, v]) => v))
    setErrors(cleaned)
    return Object.keys(cleaned).length === 0
  }

  function onNext() {
    if (validate()) navigate('/practice')
  }

  return (
    <Screen
      step={2}
      title="Soil"
      subtitle="Use your Soil Health Card if you have one. Otherwise choose the blanket plan."
    >
      <Card title="How should we calculate?">
        <Field label="Plan type" required>
          <Select
            value={request.mode}
            onChange={(e) => updateSection('request', { mode: e.target.value })}
          >
            <option value="blanket_rdf">
              Blanket recommended dose — no soil test needed
            </option>
            <option value="stcr">
              Soil-test based (STCR) — uses your Soil Health Card values
            </option>
          </Select>
        </Field>
        <p className="mt-2 text-xs text-slate-600">
          {isStcr
            ? 'The engine will use the published Maharashtra STCR equations with your soil values.'
            : 'The blanket dose ignores soil test values. It is the same for every plot of this crop.'}
        </p>
      </Card>

      {isStcr ? (
        <Card title="Soil Health Card values">
          <div className="space-y-4">
            <Field label="Where do these values come from?">
              <Select
                value={soil.source}
                onChange={(e) => updateSection('soil', { source: e.target.value })}
              >
                <option value="shc">Soil Health Card</option>
                <option value="manual">Entered manually / private lab</option>
              </Select>
            </Field>

            <Field
              label="Available nitrogen (N), kg/ha"
              required
              error={errors.n}
              hint="Printed on the Soil Health Card."
            >
              <TextInput
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={soil.n}
                error={errors.n}
                placeholder="e.g. 213"
                onChange={(e) => updateSection('soil', { n: e.target.value })}
              />
            </Field>

            <Field
              label="Available phosphorus (P), kg/ha"
              required
              error={errors.p}
              hint="Enter the value exactly as printed. Do not convert it."
            >
              <TextInput
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={soil.p}
                error={errors.p}
                placeholder="e.g. 17.4"
                onChange={(e) => updateSection('soil', { p: e.target.value })}
              />
            </Field>

            <Field label="Available potassium (K), kg/ha" required error={errors.k}>
              <TextInput
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={soil.k}
                error={errors.k}
                placeholder="e.g. 286"
                onChange={(e) => updateSection('soil', { k: e.target.value })}
              />
            </Field>

            <Field
              label="Target yield (quintal per hectare)"
              required
              error={errors.target}
              hint="The STCR equations prescribe fertilizer for a chosen yield target."
            >
              <TextInput
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                value={request.targetYieldQPerHa}
                error={errors.target}
                placeholder="e.g. 40"
                onChange={(e) =>
                  updateSection('request', { targetYieldQPerHa: e.target.value })
                }
              />
            </Field>
          </div>
        </Card>
      ) : null}

      <Card title="Also recorded" tone="info">
        <p className="mb-3 text-xs text-slate-700">
          These are saved with your session but are <strong>not</strong> used by the current
          recommendation engine. They are collected now so the reading is not lost.
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="pH" error={errors.ph}>
              <TextInput
                type="number"
                inputMode="decimal"
                min="0"
                max="14"
                step="0.1"
                value={soil.ph}
                error={errors.ph}
                placeholder="6.5"
                onChange={(e) => updateSection('soil', { ph: e.target.value })}
              />
            </Field>
            <Field label="Organic carbon (%)">
              <TextInput
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={soil.organicCarbon}
                placeholder="0.5"
                onChange={(e) => updateSection('soil', { organicCarbon: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              ['nGrade', 'N grade'],
              ['pGrade', 'P grade'],
              ['kGrade', 'K grade'],
            ].map(([key, label]) => (
              <Field key={key} label={label}>
                <Select
                  value={soil[key]}
                  onChange={(e) => updateSection('soil', { [key]: e.target.value })}
                >
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g === '' ? '—' : g}
                    </option>
                  ))}
                </Select>
              </Field>
            ))}
          </div>
          <p className="text-xs text-slate-600">
            Grades are recorded only. No published low/medium/high dose rule exists for rice in
            Maharashtra, so the engine will not convert a grade into a fertilizer quantity.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Moisture (%)">
              <TextInput
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={soil.moisture}
                onChange={(e) => updateSection('soil', { moisture: e.target.value })}
              />
            </Field>
            <Field label="Days after sowing">
              <TextInput
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={soil.daysAfterSowing}
                onChange={(e) => updateSection('soil', { daysAfterSowing: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </Card>

      {!isStcr ? (
        <Banner tone="warning" title="No soil test will be used">
          The blanket dose is the same for every plot. If you have a Soil Health Card, switch
          the plan type above to get a plan matched to your soil.
        </Banner>
      ) : null}

      <ActionBar>
        <Button variant="secondary" onClick={() => navigate('/')}>
          Back
        </Button>
        <Button onClick={onNext}>Continue</Button>
      </ActionBar>
    </Screen>
  )
}
