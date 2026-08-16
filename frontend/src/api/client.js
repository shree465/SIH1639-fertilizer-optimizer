/**
 * Central API client for the SIH1639 Fertilizer Optimizer backend.
 *
 * All network access from the frontend goes through this module so that the
 * base URL, headers, timeouts and error shape are defined in exactly one place.
 *
 * Base URL comes from the Vite env var VITE_API_BASE_URL and falls back to the
 * local FastAPI dev server. Never place secrets in VITE_* variables — Vite
 * inlines them into the browser bundle.
 */

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
).replace(/\/+$/, '')

export const DEFAULT_LANGUAGE = import.meta.env.VITE_DEFAULT_LANGUAGE || 'en'

const DEFAULT_TIMEOUT_MS = 15000

/** Error carrying the HTTP status and the parsed response body, when present. */
export class ApiError extends Error {
  constructor(message, { status = 0, body = null, url = '' } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
    this.url = url
  }
}

function buildUrl(path, query) {
  const url = new URL(
    `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`,
  )
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

/**
 * Low-level request helper.
 *
 * @param {string} path      Path beginning with "/" (e.g. "/health").
 * @param {object} [options]
 * @param {string} [options.method]  HTTP method, defaults to GET.
 * @param {object} [options.query]   Query-string parameters.
 * @param {object} [options.body]    JSON-serialisable request body.
 * @param {number} [options.timeoutMs]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<any>} Parsed JSON body (or raw text if not JSON).
 */
export async function request(
  path,
  { method = 'GET', query, body, headers, timeoutMs = DEFAULT_TIMEOUT_MS, signal } = {},
) {
  const url = buildUrl(path, query)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  if (signal) signal.addEventListener('abort', () => controller.abort())

  let response
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        'Accept-Language': DEFAULT_LANGUAGE,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timer)
    const reason =
      err.name === 'AbortError' ? `Request timed out after ${timeoutMs}ms` : err.message
    throw new ApiError(`Network error calling ${method} ${url}: ${reason}`, { url })
  }
  clearTimeout(timer)

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text()

  if (!response.ok) {
    const detail =
      (payload && typeof payload === 'object' && payload.detail) || response.statusText
    throw new ApiError(`${method} ${path} failed (${response.status}): ${detail}`, {
      status: response.status,
      body: payload,
      url,
    })
  }
  return payload
}

/* -------------------------------------------------------------------------
 * Endpoints exposed by the backend.
 *
 * NOTE: request/response payload shapes are defined by the FastAPI routes and
 * are wired up in Phase 1. Callers pass plain objects; nothing is validated here.
 * ---------------------------------------------------------------------- */

/** GET /health — liveness probe. */
export const getHealth = (opts) => request('/health', opts)

/** POST /recommend — fertilizer recommendation for a plot. */
export const postRecommend = (payload, opts) =>
  request('/recommend', { ...opts, method: 'POST', body: payload })

/** GET /soil-lookup/{cardId} — Soil Health Card lookup. */
export const getSoilLookup = (cardId, opts) =>
  request(`/soil-lookup/${encodeURIComponent(cardId)}`, opts)

/** GET /weather — weather for a location (e.g. { lat, lon }). */
export const getWeather = (query, opts) => request('/weather', { ...opts, query })

/** POST /schemes/match — match a farmer profile against subsidy schemes. */
export const postSchemesMatch = (payload, opts) =>
  request('/schemes/match', { ...opts, method: 'POST', body: payload })

/** POST /feedback — submit farmer feedback on a recommendation. */
export const postFeedback = (payload, opts) =>
  request('/feedback', { ...opts, method: 'POST', body: payload })

/** POST /lcc/reading — submit a Leaf Colour Chart reading. */
export const postLccReading = (payload, opts) =>
  request('/lcc/reading', { ...opts, method: 'POST', body: payload })

const api = {
  API_BASE_URL,
  DEFAULT_LANGUAGE,
  request,
  getHealth,
  postRecommend,
  getSoilLookup,
  getWeather,
  postSchemesMatch,
  postFeedback,
  postLccReading,
}

export default api
