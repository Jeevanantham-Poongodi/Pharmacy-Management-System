import { describe, expect, it, vi } from 'vitest'
import { ApiError, createApiClient } from '../src/api/client'

function response(status: number, body: unknown, requestId = 'req-1') {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId },
  })
}

describe('api client', () => {
  it('sends the bearer token and JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(201, { id: 1 }))
    const request = createApiClient('http://api.test/', async () => 'token-abc', fetchMock)

    const result = await request<{ id: number }>('/api/v1/items', { method: 'POST', body: { name: 'X' } })

    expect(result).toEqual({ id: 1 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://api.test/api/v1/items')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer token-abc')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ name: 'X' })
  })

  it('omits Authorization when signed out', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, []))
    await createApiClient('http://api.test', async () => null, fetchMock)('/api/v1/health')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined()
  })

  it('turns the error envelope into an ApiError with code, details and request ID', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response(422, {
        error: { code: 'VALIDATION_FAILED', message: 'Some fields are invalid.', details: [{ field: 'name' }] },
      }, 'req-xyz'),
    )
    const request = createApiClient('http://api.test', async () => 't', fetchMock)

    const error = await request('/api/v1/items').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 422, code: 'VALIDATION_FAILED', requestId: 'req-xyz' })
    expect((error as ApiError).details).toEqual([{ field: 'name' }])
  })

  it('reports an unreachable server as NETWORK_ERROR', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const error = await createApiClient('http://api.test', async () => null, fetchMock)('/x').catch((e: unknown) => e)
    expect(error).toMatchObject({ code: 'NETWORK_ERROR', status: 0 })
  })
})
