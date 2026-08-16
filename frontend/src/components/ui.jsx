/** Small shared UI primitives. Mobile-first: large tap targets, no fixed widths. */

import { Link } from 'react-router-dom'

export function Screen({ title, subtitle, step, children }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto w-full max-w-lg px-4 pb-28 pt-5">
        {step ? <Stepper current={step} /> : null}
        <h1 className="mt-4 text-2xl font-semibold leading-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
        <div className="mt-5 space-y-5">{children}</div>
      </div>
    </div>
  )
}

const STEPS = ['Farm', 'Soil', 'Practice', 'Result']

export function Stepper({ current }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label="Progress">
      {STEPS.map((label, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <li key={label} className="flex flex-1 flex-col gap-1">
            <span
              className={`h-1.5 rounded-full ${
                done ? 'bg-green-600' : active ? 'bg-green-500' : 'bg-slate-200'
              }`}
            />
            <span
              className={`text-[11px] ${
                active ? 'font-semibold text-green-700' : 'text-slate-500'
              }`}
            >
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function Card({ title, right, children, tone = 'default' }) {
  const tones = {
    default: 'border-slate-200 bg-white',
    warning: 'border-amber-300 bg-amber-50',
    danger: 'border-red-300 bg-red-50',
    info: 'border-sky-200 bg-sky-50',
  }
  return (
    <section className={`rounded-xl border p-4 shadow-sm ${tones[tone]}`}>
      {(title || right) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          {title ? <h2 className="text-base font-semibold">{title}</h2> : <span />}
          {right}
        </header>
      )}
      {children}
    </section>
  )
}

export function Field({ label, hint, error, children, required }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      {children}
      {hint && !error ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  )
}

const inputBase =
  'w-full rounded-lg border px-3 py-3 text-base outline-none focus:ring-2 focus:ring-green-500'

export function TextInput({ error, ...props }) {
  return (
    <input
      {...props}
      className={`${inputBase} ${error ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'}`}
    />
  )
}

export function Select({ error, children, ...props }) {
  return (
    <select
      {...props}
      className={`${inputBase} ${error ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'}`}
    >
      {children}
    </select>
  )
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const variants = {
    primary: 'bg-green-700 text-white hover:bg-green-800 disabled:bg-slate-300',
    secondary: 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50',
  }
  return (
    <button
      {...props}
      className={`w-full rounded-lg px-4 py-3.5 text-base font-semibold transition ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function LinkButton({ to, children, variant = 'secondary' }) {
  const variants = {
    primary: 'bg-green-700 text-white',
    secondary: 'bg-white text-slate-800 border border-slate-300',
  }
  return (
    <Link
      to={to}
      className={`block w-full rounded-lg px-4 py-3.5 text-center text-base font-semibold ${variants[variant]}`}
    >
      {children}
    </Link>
  )
}

/** Sticky footer so the primary action is always thumb-reachable on a phone. */
export function ActionBar({ children }) {
  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-lg gap-3 px-4 py-3">{children}</div>
    </div>
  )
}

export function Banner({ tone = 'info', title, children }) {
  const tones = {
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    warning: 'border-amber-300 bg-amber-50 text-amber-900',
    danger: 'border-red-300 bg-red-50 text-red-900',
  }
  return (
    <div className={`rounded-lg border p-3 text-sm ${tones[tone]}`} role="status">
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? 'mt-1' : ''}>{children}</div>
    </div>
  )
}

export function KeyValue({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-900">{value}</dd>
    </div>
  )
}
