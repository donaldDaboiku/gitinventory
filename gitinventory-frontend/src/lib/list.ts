import type { ApiList, PaginatedMeta, PaginatedResponse } from '../types'

export const LIST_PAGE_SIZE = 20

export function getList<T>(payload: ApiList<T>): T[] {
  return Array.isArray(payload) ? payload : payload.data
}

export function parsePaginated<T>(payload: ApiList<T>): { items: T[]; meta: PaginatedMeta } {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      meta: { page: 1, lastPage: 1, total: payload.length },
    }
  }

  const paginated = payload as PaginatedResponse<T>

  return {
    items: paginated.data,
    meta: {
      page: paginated.current_page,
      lastPage: paginated.last_page,
      total: paginated.total,
    },
  }
}

export function appendQuery(path: string, params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      query.set(key, String(value))
    }
  })

  const qs = query.toString()

  return qs ? `${path}${path.includes('?') ? '&' : '?'}${qs}` : path
}
