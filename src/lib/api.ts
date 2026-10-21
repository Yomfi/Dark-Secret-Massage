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

export type ProviderRegisterBody = RegisterBody & {
  displayName: string;
};

export type ProviderDashboardDto = {
  user: AuthUserDto;
  profile: { id: string; slug: string; displayName: string; completed: boolean } | null;
  verification: {
    status: string;
    identityStatus: string;
    paymentStatus: string;
    feeAmount: number;
    currency: string;
    verifiedAt: string | null;
    rejectionReason: string | null;
    submittedForReviewAt: string | null;
  };
  progress: {
    accountCreated: boolean;
    phoneVerified: boolean;
    emailVerified: boolean;
    profileCompleted: boolean;
    identitySubmitted: boolean;
    verificationFeePaid: boolean;
    adminReview: string;
  };
  isVerified: boolean;
};

export const providerApi = {
  register: (body: ProviderRegisterBody) =>
    apiRequest<{ user: AuthUserDto; nextStep: string }>('/provider/register.php', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  sendPhoneCode: () =>
    apiRequest<{
      sent?: boolean;
      alreadyVerified?: boolean;
      demoMode?: boolean;
      demoCode?: string;
      message: string;
    }>('/provider/send-phone-code.php', { method: 'POST', body: '{}' }),
  verifyPhone: (code: string) =>
    apiRequest<{ user: AuthUserDto; verified: boolean; nextStep: string }>(
      '/provider/verify-phone.php',
      { method: 'POST', body: JSON.stringify({ code }) },
    ),
  sendEmailCode: () =>
    apiRequest<{
      sent?: boolean;
      alreadyVerified?: boolean;
      demoMode?: boolean;
      demoToken?: string;
      message: string;
    }>('/provider/send-email-code.php', { method: 'POST', body: '{}' }),
  verifyEmail: (token: string) =>
    apiRequest<{ user: AuthUserDto; verified: boolean; nextStep: string }>(
      '/provider/verify-email.php',
      { method: 'POST', body: JSON.stringify({ token }) },
    ),
  getProfile: () => apiRequest<{ profile: Record<string, unknown> | null }>('/provider/profile.php'),
  saveProfile: (body: Record<string, unknown>) =>
    apiRequest<{ saved: boolean; nextStep: string }>('/provider/profile.php', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  submitIdentity: async (form: FormData) => {
    const res = await fetch(`${API_BASE}/provider/identity.php`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    const payload = await res.json();
    if (!res.ok || !payload?.success) {
      throw new ApiError(
        res.status,
        payload?.error?.code || 'REQUEST_FAILED',
        payload?.error?.message || 'Identity upload failed.',
      );
    }
    return payload.data as { submitted: boolean; identityStatus: string; nextStep: string };
  },
  getPayment: () =>
    apiRequest<{
      feeAmount: number;
      currency: string;
      paymentStatus: string;
      gatewayReady: boolean;
      message: string;
    }>('/provider/payment.php'),
  initiatePayment: () =>
    apiRequest<{
      gatewayReady: boolean;
      message: string;
      paymentStatus: string;
      nextStep: string;
    }>('/provider/payment.php', { method: 'POST', body: '{}' }),
  submitReview: () =>
    apiRequest<{ submitted: boolean; verificationStatus: string; message: string }>(
      '/provider/submit-review.php',
      { method: 'POST', body: '{}' },
    ),
  dashboard: () => apiRequest<ProviderDashboardDto>('/provider/dashboard.php'),
};

export const adminProviderApi = {
  list: () =>
    apiRequest<{ providers: Array<Record<string, unknown>> }>('/admin/provider-reviews.php'),
  review: (body: {
    providerUserId: string;
    action: 'approve' | 'reject' | 'request_changes';
    notes?: string;
    rejectionReason?: string;
  }) =>
    apiRequest<{ verificationStatus: string }>('/admin/provider-reviews.php', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
