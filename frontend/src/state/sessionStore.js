/**
 * Session store internals: constants, the context object and the hook.
 *
 * Kept separate from SessionContext.jsx so that file exports only a component
 * (React Fast Refresh requires it).
 */

import { createContext, useContext } from 'react'

export const STORAGE_KEY = 'sih1639.session.v1'

/** The locked Phase 0 demo scope — see docs/scope.md. */
export const LOCKED_SCOPE = {
  crop: 'Rice / Paddy (kharif)',
  state: 'Maharashtra',
  plotSize: 1,
  landUnit: 'acre',
  persona: 'Smallholder, Soil Health Card in hand',
}

export const INITIAL_SESSION = {
  farmer: {
    name: '',
    village: '',
    district: '',
  },
  plot: {
    crop: LOCKED_SCOPE.crop,
    state: LOCKED_SCOPE.state,
    landSize: LOCKED_SCOPE.plotSize,
    landUnit: LOCKED_SCOPE.landUnit,
  },
  soil: {
    // Sent to the backend (STCR mode only).
    source: 'shc', // 'shc' | 'manual'
    n: '',
    p: '',
    k: '',
    // Recorded for later phases; NOT consumed by the current /recommend API.
    ph: '',
    organicCarbon: '',
    moisture: '',
    daysAfterSowing: '',
    nGrade: '',
    pGrade: '',
    kGrade: '',
    latitude: '',
    longitude: '',
  },
  practice: {
    urea_bags: '',
    dap_bags: '',
    mop_bags: '',
  },
  request: {
    mode: 'blanket_rdf', // 'blanket_rdf' | 'stcr'
    targetYieldQPerHa: '',
  },
}

export function loadInitialSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return INITIAL_SESSION
    const saved = JSON.parse(raw)
    // Shallow-merge each section so a schema addition does not break an old session.
    return {
      farmer: { ...INITIAL_SESSION.farmer, ...(saved.farmer ?? {}) },
      plot: { ...INITIAL_SESSION.plot, ...(saved.plot ?? {}) },
      soil: { ...INITIAL_SESSION.soil, ...(saved.soil ?? {}) },
      practice: { ...INITIAL_SESSION.practice, ...(saved.practice ?? {}) },
      request: { ...INITIAL_SESSION.request, ...(saved.request ?? {}) },
    }
  } catch {
    return INITIAL_SESSION
  }
}

export const SessionContext = createContext(null)

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside a SessionProvider')
  return ctx
}
