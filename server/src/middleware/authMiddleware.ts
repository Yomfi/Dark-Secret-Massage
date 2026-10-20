import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { verifyAccessToken } from '../utils/tokens';
import { getUserById } from '../services/authService';

const ACCESS_COOKIE = 'ds_access';

export function readAccessToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  const cookie = req.cookies?.[ACCESS_COOKIE];
  if (typeof cookie === 'string' && cookie.length > 0) return cookie;
  return undefined;
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = readAccessToken(req);
  if (!token) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
  }

  req.authUser = await getUserById(payload.sub);
  next();
});

export function requireRole(...roles: UserRole[]) {
  return asyncHandler(async (req, _res, next) => {
    if (!req.authUser) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    }
    if (!roles.includes(req.authUser.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action.');
    }
    next();
  });
}

export { ACCESS_COOKIE };
