export class ApiError extends Error {
  status: number

  constructor(status: number, message?: string) {
    super(message ?? `HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    ...init,
  })
  if (!res.ok) {
    throw new ApiError(res.status)
  }
  const contentType = res.headers.get('Content-Type') ?? ''
  if (contentType.includes('application/json')) {
    return (await res.json()) as T
  }
  return undefined as T
}

export interface LoginInput {
  username: string
  password: string
}

export interface OkResponse {
  ok: true
}

export const api = {
  me: () => request<OkResponse>('/api/me', { method: 'GET' }),
  login: (input: LoginInput) =>
    request<OkResponse>('/api/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  logout: () => request<void>('/api/logout', { method: 'POST' }),
}

export const apiKeys = {
  me: () => ['api', 'me'] as const,
}
