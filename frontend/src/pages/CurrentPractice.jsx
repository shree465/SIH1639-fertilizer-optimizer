import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  ActionBar,
  Banner,
  Button,
  Card,
  Field,
  Screen,
  TextInput,
} from '../components/ui'
import { useSession } from '../state/sessionStore'

const PRODUCTS = [
  { key: 'urea_bags', label: 'Urea', bag: '45 kg bag' },
  { key: 'dap_bags', label: 'DAP', bag: '50 kg bag' },
  { key: 'mop_bags', label: 'MOP (potash)', bag: '50 kg bag' },
]

/**
 * Current practice baseline.
 *
 * Stored in session state so it survives navigation between steps and can be
 * shown beside the recommendation on the results screen. It is NOT sent to
 * /recommend — the current API does not accept it.
 */
export default function CurrentPractice() {
  const { session, updateSection } = useSession()
  const navigate = useNavigate()
  const [errors, setErrors] = useState({})

  const { practice, plot } = session

  function validate() {
    const next = {}
    for (const { key, label } of PRODUCTS) {
      const raw = practice[key]
      if (raw === '' || raw === null) continue // optional
      const n = Number(raw)
      if (Number.isNaN(n)) next[key] = `${label} must be a number.`
      else if (n < 0) next[key] = `${label} cannot be negative.`
      else if (n > 999) next[key] = `${label} looks too high.`
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function onNext() {
    if (validate()) navigate('/results')
  }

  const anyEntered = PRODUCTS.some(({ key }) => practice[key] !== '')

  return (
    <Screen
      step={3}
      title="What you use now"
      subtitle={`How many bags do you currently apply on this ${plot.landSize} ${plot.landUnit}?`}
    >
      <Card title="Current fertilizer use">
        <div className="space-y-4">
          {PRODUCTS.map(({ key, label, bag }) => (
            <Field
              key={key}
              label={`${label} — bags per season`}
              hint={bag}
              error={errors[key]}
            >
              <TextInput
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={practice[key]}
                error={errors[key]}
                placeholder="0"
                onChange={(e) => updateSection('practice', { [key]: e.target.value })}
              />
            </Field>
          ))}
        </div>
      </Card>

      {!anyEntered ? (
        <Banner tone="info">
          Leave these blank if you do not know them. You will still get a recommendation —
          you just will not see the side-by-side comparison.
        </Banner>
      ) : null}

      <Banner tone="info" title="Why we ask">
        Your current use is the baseline. The results screen puts it next to the recommended
        plan so you can see exactly where the difference is.
      </Banner>

      <ActionBar>
        <Button variant="secondary" onClick={() => navigate('/soil')}>
          Back
        </Button>
        <Button onClick={onNext}>Get recommendation</Button>
      </ActionBar>
    </Screen>
  )
}
