const RAW_API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const API_URL = RAW_API_URL.replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getToken(): string | null {
  return localStorage.getItem('dm_token') || sessionStorage.getItem('dm_token');
}

export function setToken(token: string | null, rememberMe: boolean = true) {
  if (token) {
    if (rememberMe) {
      localStorage.setItem('dm_token', token);
      sessionStorage.removeItem('dm_token');
    } else {
      sessionStorage.setItem('dm_token', token);
      localStorage.removeItem('dm_token');
    }
  } else {
    localStorage.removeItem('dm_token');
    sessionStorage.removeItem('dm_token');
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${cleanPath}`, { ...options, headers });
  } catch (err: any) {
    throw new ApiError(0, 'Unable to connect to the SafeSphere server. Please ensure the backend is running.');
  }

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      msg = body.detail || msg;
    } catch {}
    if (res.status === 401) {
      setToken(null);
    }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  const contentType = res.headers.get('content-type') || '';
  return contentType.includes('application/json') ? res.json() : (res.text() as unknown as T);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: any) =>
    request<T>(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: any) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: any) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form }),
  baseUrl: API_URL,
};
