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
import { LOCKED_SCOPE, useSession } from '../state/sessionStore'
import { LAND_UNITS, describeSubmittedPlot, getUnit } from '../lib/units'

export default function Onboarding() {
  const { session, updateSection } = useSession()
  const navigate = useNavigate()
  const [errors, setErrors] = useState({})

  const { farmer, plot } = session
  const unit = getUnit(plot.landUnit)

  function validate() {
    const next = {}
    const size = Number(plot.landSize)
    if (!plot.landSize || Number.isNaN(size)) next.landSize = 'Enter the land size.'
    else if (size <= 0) next.landSize = 'Land size must be more than zero.'
    else if (size > 10000) next.landSize = 'That looks too large. Check the unit.'
    if (!plot.crop) next.crop = 'Select a crop.'
    if (!plot.state) next.state = 'Select a state.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function onNext() {
    if (validate()) navigate('/soil')
  }

  return (
    <Screen
      step={1}
      title="Your farm"
      subtitle="A few details about the plot you want a fertilizer plan for."
    >
      <Card title="Farmer">
        <div className="space-y-4">
          <Field label="Name" hint="Optional — used only to label this demo session.">
            <TextInput
              value={farmer.name}
              onChange={(e) => updateSection('farmer', { name: e.target.value })}
              placeholder="e.g. Sunita Patil"
              autoComplete="off"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Village">
              <TextInput
                value={farmer.village}
                onChange={(e) => updateSection('farmer', { village: e.target.value })}
                placeholder="Optional"
                autoComplete="off"
              />
            </Field>
            <Field label="District">
              <TextInput
                value={farmer.district}
                onChange={(e) => updateSection('farmer', { district: e.target.value })}
                placeholder="Optional"
                autoComplete="off"
              />
            </Field>
          </div>
          <p className="text-xs text-slate-500">
            Persona for this demo: {LOCKED_SCOPE.persona}.
          </p>
        </div>
      </Card>

      <Card title="Plot">
        <div className="space-y-4">
          <Field label="Crop" required error={errors.crop}>
            <Select
              value={plot.crop}
              error={errors.crop}
              onChange={(e) => updateSection('plot', { crop: e.target.value })}
            >
              <option value={LOCKED_SCOPE.crop}>{LOCKED_SCOPE.crop}</option>
            </Select>
          </Field>

          <Field label="State" required error={errors.state}>
            <Select
              value={plot.state}
              error={errors.state}
              onChange={(e) => updateSection('plot', { state: e.target.value })}
            >
              <option value={LOCKED_SCOPE.state}>{LOCKED_SCOPE.state}</option>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Land size" required error={errors.landSize}>
              <TextInput
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={plot.landSize}
                error={errors.landSize}
                onChange={(e) => updateSection('plot', { landSize: e.target.value })}
              />
            </Field>
            <Field label="Unit" required>
              <Select
                value={plot.landUnit}
                onChange={(e) => updateSection('plot', { landUnit: e.target.value })}
              >
                {LAND_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {plot.landSize && !errors.landSize ? (
            <p className="text-xs text-slate-600">
              Will be sent to the engine as{' '}
              <span className="font-medium text-slate-800">
                {describeSubmittedPlot(plot.landSize, plot.landUnit)}
              </span>
              .
            </p>
          ) : null}

          {unit.note ? <Banner tone="warning">{unit.note}</Banner> : null}
        </div>
      </Card>

      <Banner tone="info" title="Demo scope">
        This build is locked to {LOCKED_SCOPE.crop} in {LOCKED_SCOPE.state}. Other crops and
        states are out of scope for the demo.
      </Banner>

      <ActionBar>
        <Button onClick={onNext}>Continue to soil</Button>
      </ActionBar>
    </Screen>
  )
}
