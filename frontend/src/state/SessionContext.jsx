/**
 * Session state for the onboarding -> soil -> practice -> results flow.
 *
 * Persisted to sessionStorage so a refresh mid-demo does not lose the farmer's
 * answers. Constants and the `useSession` hook live in ./sessionStore.js.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  INITIAL_SESSION,
  STORAGE_KEY,
  SessionContext,
  loadInitialSession,
} from './sessionStore'

export function SessionProvider({ children }) {
  const [session, setSession] = useState(loadInitialSession)

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } catch {
      // sessionStorage unavailable (private mode); state still works in memory.
    }
  }, [session])

  const updateSection = useCallback((section, patch) => {
    setSession((prev) => ({ ...prev, [section]: { ...prev[section], ...patch } }))
  }, [])

  const reset = useCallback(() => {
    setSession(INITIAL_SESSION)
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(
    () => ({ session, updateSection, reset }),
    [session, updateSection, reset],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
