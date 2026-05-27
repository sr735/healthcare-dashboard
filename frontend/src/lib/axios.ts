import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

// ── Typed error classes ───────────────────────────────────────────────────────

/** A single field-level validation error from the server. */
export interface FieldError {
  field: string   // last segment of the loc path, e.g. "email"
  message: string
}

/**
 * Thrown when the server returns HTTP 422 (Pydantic validation failure).
 * Carries an array of per-field errors so form components can display
 * inline messages under the relevant inputs.
 */
export class ValidationError extends Error {
  readonly fieldErrors: FieldError[]

  constructor(fieldErrors: FieldError[]) {
    super('Validation failed — please correct the highlighted fields.')
    this.name = 'ValidationError'
    this.fieldErrors = fieldErrors
  }
}

/**
 * Thrown for all other HTTP error responses (4xx except 422, 5xx)
 * and for network / timeout failures.
 */
export class ApiError extends Error {
  readonly statusCode: number | undefined

  constructor(message: string, statusCode?: number) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

// ── Pydantic error shape ──────────────────────────────────────────────────────

interface PydanticDetail {
  loc: (string | number)[]
  msg: string
  type: string
}

function parsePydanticErrors(detail: unknown): FieldError[] {
  if (!Array.isArray(detail)) return []
  return (detail as PydanticDetail[]).map((d) => {
    // loc is like ["body", "email"] — take the last string segment
    const fieldSegments = d.loc.filter((s): s is string => typeof s === 'string')
    const field = fieldSegments[fieldSegments.length - 1] ?? 'unknown'
    return { field, message: d.msg }
  })
}

// ── Axios instance ────────────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
})

// Request interceptor — attach auth token when present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: unknown) => Promise.reject(error),
)

// Response interceptor — normalise errors into typed classes
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error)
    }

    const status = error.response?.status
    const data = error.response?.data as { detail?: unknown } | undefined

    // 422 → ValidationError with per-field messages
    if (status === 422 && data?.detail) {
      const fieldErrors = parsePydanticErrors(data.detail)
      if (fieldErrors.length > 0) {
        return Promise.reject(new ValidationError(fieldErrors))
      }
    }

    // All other HTTP errors (or 422 with unexpected detail shape)
    const message =
      (typeof data?.detail === 'string' ? data.detail : null) ??
      error.message

    return Promise.reject(new ApiError(message, status))
  },
)
