import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type AccessTokenPayload = {
  sub: string;
  role: string;
  typ: 'access';
};

export type RefreshTokenPayload = {
  sub: string;
  typ: 'refresh';
  jti: string;
};

export function signAccessToken(userId: string, role: string): string {
  return jwt.sign({ sub: userId, role, typ: 'access' } satisfies AccessTokenPayload, env.jwtAccessSecret, {
    expiresIn: env.accessTokenTtl as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(userId: string, jti: string): string {
  return jwt.sign(
    { sub: userId, typ: 'refresh', jti } satisfies RefreshTokenPayload,
    env.jwtRefreshSecret,
    { expiresIn: env.refreshTokenTtl as jwt.SignOptions['expiresIn'] }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
  if (payload.typ !== 'access') throw new Error('Invalid token type');
  return payload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, env.jwtRefreshSecret) as RefreshTokenPayload;
  if (payload.typ !== 'refresh') throw new Error('Invalid token type');
  return payload;
}

export function refreshExpiryDate(): Date {
  // Approximate 30d if env uses Nd format; fallback 30 days
  const ttl = env.refreshTokenTtl;
  const match = /^(\d+)([smhd])$/.exec(ttl);
  const now = Date.now();
  if (!match) return new Date(now + 30 * 24 * 60 * 60 * 1000);
  const n = Number(match[1]);
  const unit = match[2];
  const mult =
    unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  return new Date(now + n * mult);
}
