import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? (isProd ? undefined : fallback);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parsePort(): number {
  const raw = process.env.PORT || (isProd ? undefined : '4000');
  if (!raw) {
    throw new Error('Missing required environment variable: PORT');
  }
  const port = Number(raw);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid PORT value: ${raw}`);
  }
  return port;
}

export const env = {
  port: parsePort(),
  nodeEnv,
  isProd,
  databaseUrl: required('DATABASE_URL', 'mysql://root:root@127.0.0.1:3306/dark_secret'),
  corsOrigins: (process.env.CORS_ORIGINS || (isProd ? '' : 'http://localhost:3000'))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  jwtAccessSecret: required('JWT_ACCESS_SECRET', 'dev_access_secret_change_me_32chars_min'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me_32chars_min'),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || '30d',
  // Prefer explicit COOKIE_SECURE=true; also force secure cookies when NODE_ENV=production
  cookieSecure: process.env.COOKIE_SECURE === 'true' || isProd,
  cookieSameSite: (process.env.COOKIE_SAME_SITE || 'lax') as 'lax' | 'strict' | 'none',
  // Prefer host-only cookies (undefined). Only set if you intentionally need a parent domain.
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
};

if (isProd && env.corsOrigins.length === 0) {
  throw new Error('Missing required environment variable: CORS_ORIGINS');
}

if (isProd && env.jwtAccessSecret === env.jwtRefreshSecret) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different in production');
}
