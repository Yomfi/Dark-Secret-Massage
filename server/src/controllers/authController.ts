import type { Request, Response } from 'express';
import { env } from '../config/env';
import {
  forgotPassword,
  getUserById,
  loginUser,
  logoutUser,
  refreshSession,
  registerUser,
  resetPassword,
  setOnboardingChoice,
  verifyEmail,
  verifyPhone,
} from '../services/authService';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  verifyPhoneSchema,
} from '../validators/authValidators';
import { ACCESS_COOKIE, readAccessToken } from '../middleware/authMiddleware';
import { verifyAccessToken } from '../utils/tokens';
import { z } from 'zod';

const REFRESH_COOKIE = 'ds_refresh';

function cookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: env.cookieSecure || env.isProd,
    sameSite: env.cookieSameSite,
    domain: env.cookieDomain,
    path: '/',
    maxAge: maxAgeMs,
  } as const;
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(15 * 60 * 1000));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(30 * 24 * 60 * 60 * 1000));
}

function clearAuthCookies(res: Response) {
  const base = {
    httpOnly: true,
    secure: env.cookieSecure || env.isProd,
    sameSite: env.cookieSameSite,
    domain: env.cookieDomain,
    path: '/',
  } as const;
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
}

function requestMeta(req: Request) {
  return {
    userAgent: req.get('user-agent') || undefined,
    ipAddress: req.ip,
  };
}

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  const user = await registerUser(input);
  // Auto-login after registration for smoother onboarding
  const session = await loginUser(
    { identifier: input.email, password: input.password },
    requestMeta(req)
  );
  setAuthCookies(res, session.accessToken, session.refreshToken);
  res.status(201).json({
    success: true,
    data: { user: session.user },
  });
  void user;
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const session = await loginUser(input, requestMeta(req));
  setAuthCookies(res, session.accessToken, session.refreshToken);
  res.json({ success: true, data: { user: session.user } });
}

export async function logout(req: Request, res: Response) {
  const refresh = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  await logoutUser(refresh);
  clearAuthCookies(res);
  res.json({ success: true, data: { loggedOut: true } });
}

export async function refresh(req: Request, res: Response) {
  const refreshToken = (req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken) as
    | string
    | undefined;
  if (!refreshToken) {
    clearAuthCookies(res);
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' },
    });
  }

  const session = await refreshSession(refreshToken, requestMeta(req));
  setAuthCookies(res, session.accessToken, session.refreshToken);
  res.json({ success: true, data: { user: session.user } });
}

export async function me(req: Request, res: Response) {
  if (req.authUser) {
    return res.json({ success: true, data: { user: req.authUser } });
  }

  const token = readAccessToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' },
    });
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await getUserById(payload.sub);
    return res.json({ success: true, data: { user } });
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' },
    });
  }
}

export async function forgot(req: Request, res: Response) {
  const input = forgotPasswordSchema.parse(req.body);
  await forgotPassword(input.email);
  res.json({
    success: true,
    data: {
      message: 'If an account exists for that email, reset instructions have been sent.',
    },
  });
}

export async function reset(req: Request, res: Response) {
  const input = resetPasswordSchema.parse(req.body);
  await resetPassword(input.token, input.password);
  clearAuthCookies(res);
  res.json({
    success: true,
    data: { message: 'Your password has been updated. Please sign in.' },
  });
}

export async function verifyEmailHandler(req: Request, res: Response) {
  const input = verifyEmailSchema.parse(req.body);
  await verifyEmail(input.token);
  res.json({ success: true, data: { message: 'Email verified successfully.' } });
}

export async function verifyPhoneHandler(req: Request, res: Response) {
  if (!req.authUser) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' },
    });
  }
  const input = verifyPhoneSchema.parse(req.body);
  await verifyPhone(req.authUser.id, input.code);
  res.json({ success: true, data: { message: 'Phone verified successfully.' } });
}

export async function onboarding(req: Request, res: Response) {
  if (!req.authUser) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' },
    });
  }
  const body = z
    .object({ choice: z.enum(['find_partner', 'book_massage', 'become_provider']) })
    .parse(req.body);
  const user = await setOnboardingChoice(req.authUser.id, body.choice);
  res.json({ success: true, data: { user } });
}
