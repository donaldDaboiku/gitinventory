export function createApiClient(
  token: string | null,
  onUnauthorized: () => void,
  onSubscriptionExpired?: () => void,
) {
  return async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api/${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    })
    const text = await response.text()

    let body: Record<string, unknown> = {}
    if (text) {
      try {
        body = JSON.parse(text) as Record<string, unknown>
      } catch {
        throw new Error('Unexpected server response. Please try again.')
      }
    }

    if (response.status === 401 && token) {
      onUnauthorized()
      throw new Error('Session expired. Please sign in again.')
    }

    if (response.status === 402) {
      onSubscriptionExpired?.()
      throw new Error(String(body.message || 'Subscription expired. Please renew to continue.'))
    }

    if (!response.ok) {
      const errors = body.errors as Record<string, string[]> | undefined
      const validation = errors ? Object.values(errors).flat().join(' ') : body.message
      throw new Error(String(validation || 'Request failed.'))
    }

    return body as T
  }
}
