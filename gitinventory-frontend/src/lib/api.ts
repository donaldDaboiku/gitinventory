function readCookie(name: string) {
  return document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1)
}

export async function csrfHeaders(): Promise<Record<string, string>> {
  await fetch('/sanctum/csrf-cookie', { credentials: 'include' })
  const token = readCookie('XSRF-TOKEN')

  return token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}
}

export function createApiClient(onUnauthorized: () => void, onSubscriptionExpired?: () => void) {
  return async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
    const method = options.method?.toUpperCase() ?? 'GET'
    const csrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ? await csrfHeaders() : {}
    const headers = new Headers({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...csrf,
    })
    new Headers(options.headers).forEach((value, key) => headers.set(key, value))
    const response = await fetch(`/api/${path}`, {
      ...options,
      credentials: 'include',
      headers,
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

    if (response.status === 401) {
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
