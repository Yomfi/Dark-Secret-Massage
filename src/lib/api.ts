/**
 * Same-origin production default: `/api` (Hostinger PHP under public/api → dist/api).
 * Optional override: VITE_API_URL (no trailing slash).
 */
function resolveApiBase(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (!raw) return '/api';
  return raw.replace(/\/$/, '');
}

const API_BASE = resolveApiBase();

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh.php`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE}${normalized}`;

  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (
    res.status === 401 &&
    retry &&
    normalized !== '/auth/login.php' &&
    normalized !== '/auth/register.php' &&
    normalized !== '/auth/logout.php' &&
    normalized !== '/auth/refresh.php'
  ) {
    const refreshed = await tryRefresh();
    if (refreshed) return apiRequest<T>(path, options, false);
  }

  let payload: ApiSuccess<T> | ApiFailure | null = null;
  try {
    payload = (await res.json()) as ApiSuccess<T> | ApiFailure;
  } catch {
    payload = null;
  }

  if (!res.ok || !payload || payload.success !== true) {
    const err = (payload && 'error' in payload && payload.error) || {
      code: 'REQUEST_FAILED',
      message:
        res.status >= 500
          ? 'The server is temporarily unavailable. Please try again.'
          : 'Something went wrong. Please try again.',
    };
    throw new ApiError(res.status, err.code, err.message, 'details' in err ? err.details : undefined);
  }

  return payload.data;
}

export const authApi = {
  me: () => apiRequest<{ user: AuthUserDto }>('/auth/me.php'),
  login: (body: { identifier: string; password: string }) =>
    apiRequest<{ user: AuthUserDto }>('/auth/login.php', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  register: (body: RegisterBody) =>
    apiRequest<{ user: AuthUserDto }>('/auth/register.php', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  logout: () =>
    apiRequest<{ loggedOut: boolean }>('/auth/logout.php', {
      method: 'POST',
      body: '{}',
    }),
  refresh: () =>
    apiRequest<{ user: AuthUserDto }>('/auth/refresh.php', {
      method: 'POST',
      body: '{}',
    }),
  onboarding: (choice: OnboardingChoice) =>
    apiRequest<{ user: AuthUserDto }>('/auth/onboarding.php', {
      method: 'POST',
      body: JSON.stringify({ choice }),
    }),
  forgotPassword: (email: string) =>
    apiRequest<{ message: string }>('/auth/forgot-password.php', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
};

export type OnboardingChoice = 'find_partner' | 'book_massage' | 'become_provider';

export type AuthUserDto = {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: string;
  accountStatus: string;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  onboardingChoice: string | null;
};

export type RegisterBody = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  termsAccepted: true;
};
