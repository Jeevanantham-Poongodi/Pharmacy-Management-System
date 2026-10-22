// The single way the browser talks to application data: the FastAPI backend (D-001).

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: unknown
  readonly requestId: string | null

  constructor(status: number, code: string, message: string, details: unknown, requestId: string | null) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
    this.requestId = requestId
  }
}

export type TokenProvider = () => Promise<string | null>

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT'
  body?: unknown
}

export function createApiClient(baseUrl: string, getToken: TokenProvider, fetchImpl: typeof fetch = fetch) {
  return async function request<T>(path: string, options: Options = {}): Promise<T> {
    const token = await getToken()
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    if (options.body !== undefined) headers['Content-Type'] = 'application/json'

    let response: Response
    try {
      response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      })
    } catch {
      throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Is the backend running?', null, null)
    }

    const requestId = response.headers.get('X-Request-ID')
    const text = await response.text()
    const data: unknown = text ? safeJson(text) : null

    if (!response.ok) {
      const error = (data as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error
      throw new ApiError(
        response.status,
        error?.code ?? 'HTTP_ERROR',
        error?.message ?? `Request failed (${response.status}).`,
        error?.details ?? null,
        requestId,
      )
    }
    return data as T
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
