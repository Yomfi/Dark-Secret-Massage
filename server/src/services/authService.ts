import { AccountStatus, type User } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import {
  createOtpCode,
  createRawToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from '../utils/crypto';
import {
  refreshExpiryDate,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens';
import type { LoginInput, RegisterInput } from '../validators/authValidators';
import {
  sendEmailVerification,
  sendPasswordResetEmail,
  sendPhoneVerificationSms,
} from './notificationService';
import type { AuthUser } from '../types/express';

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    accountStatus: user.accountStatus,
    emailVerifiedAt: user.emailVerifiedAt,
    phoneVerifiedAt: user.phoneVerifiedAt,
    onboardingChoice: user.onboardingChoice,
  };
}

function assertAccountCanAuth(user: User): void {
  if (user.accountStatus === AccountStatus.suspended) {
    throw new AppError(403, 'ACCOUNT_SUSPENDED', 'This account has been suspended.');
  }
  if (user.accountStatus === AccountStatus.banned) {
    throw new AppError(403, 'ACCOUNT_BANNED', 'This account has been banned.');
  }
  if (user.accountStatus === AccountStatus.deleted) {
    throw new AppError(403, 'ACCOUNT_DELETED', 'This account is no longer available.');
  }
}

export async function registerUser(input: RegisterInput) {
  const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingEmail) {
    throw new AppError(409, 'EMAIL_IN_USE', 'An account with this email already exists.');
  }

  const normalizedPhone = input.phone.replace(/\s+/g, '');
  const existingPhone = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
  if (existingPhone) {
    throw new AppError(409, 'PHONE_IN_USE', 'An account with this phone number already exists.');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: normalizedPhone,
      passwordHash,
      termsAcceptedAt: new Date(),
      accountStatus: AccountStatus.pending_verification,
      role: 'user',
    },
  });

  const emailRaw = createRawToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(emailRaw),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  await sendEmailVerification(user.email, emailRaw);

  const phoneCode = createOtpCode();
  await prisma.phoneVerificationToken.create({
    data: {
      userId: user.id,
      codeHash: hashToken(phoneCode),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
  await sendPhoneVerificationSms(user.phone, phoneCode);

  return toAuthUser(user);
}

export async function loginUser(
  input: LoginInput,
  meta?: { userAgent?: string; ipAddress?: string }
) {
  const identifier = input.identifier.trim().toLowerCase();
  const phoneCandidate = input.identifier.trim().replace(/\s+/g, '');

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { phone: phoneCandidate }],
    },
  });

  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'The email or password is incorrect.');
  }

  assertAccountCanAuth(user);

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'The email or password is incorrect.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const tokens = await issueTokenPair(user, meta);
  return { user: toAuthUser(user), ...tokens };
}

async function issueTokenPair(
  user: User,
  meta?: { userAgent?: string; ipAddress?: string }
) {
  const refreshRaw = createRawToken(48);
  const refreshHash = hashToken(refreshRaw);
  const expiresAt = refreshExpiryDate();

  const record = await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt,
      userAgent: meta?.userAgent?.slice(0, 512),
      ipAddress: meta?.ipAddress?.slice(0, 64),
    },
  });

  const accessToken = signAccessToken(user.id, user.role);
  const refreshToken = signRefreshToken(user.id, record.id);

  // Store hash of the JWT refresh token string as well for revocation lookup
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { tokenHash: hashToken(refreshToken) },
  });

  return { accessToken, refreshToken, refreshExpiresAt: expiresAt };
}

export async function refreshSession(
  refreshToken: string,
  meta?: { userAgent?: string; ipAddress?: string }
) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Your session has expired. Please sign in again.');
  }

  const stored = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Your session has expired. Please sign in again.');
  }

  if (stored.tokenHash !== hashToken(refreshToken)) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Your session has expired. Please sign in again.');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Your session has expired. Please sign in again.');
  }
  assertAccountCanAuth(user);

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueTokenPair(user, meta);
  return { user: toAuthUser(user), ...tokens };
}

export async function logoutUser(refreshToken?: string) {
  if (!refreshToken) return;
  try {
    const payload = verifyRefreshToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { id: payload.jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch {
    // ignore invalid token on logout
  }
}

export async function getUserById(id: string): Promise<AuthUser> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.accountStatus === AccountStatus.deleted) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
  }
  assertAccountCanAuth(user);
  return toAuthUser(user);
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always succeed to avoid account enumeration
  if (!user) return { sent: true };

  const raw = createRawToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  await sendPasswordResetEmail(user.email, raw);
  return { sent: true };
}

export async function resetPassword(token: string, password: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!record) {
    throw new AppError(400, 'INVALID_RESET_TOKEN', 'This reset link is invalid or has expired.');
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return { reset: true };
}

export async function verifyEmail(token: string) {
  const record = await prisma.emailVerificationToken.findFirst({
    where: { tokenHash: hashToken(token), usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!record) {
    throw new AppError(400, 'INVALID_VERIFICATION_TOKEN', 'This verification link is invalid or expired.');
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        emailVerifiedAt: new Date(),
        accountStatus: AccountStatus.active,
      },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { verified: true };
}

export async function verifyPhone(userId: string, code: string) {
  const record = await prisma.phoneVerificationToken.findFirst({
    where: {
      userId,
      codeHash: hashToken(code),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!record) {
    throw new AppError(400, 'INVALID_VERIFICATION_CODE', 'That verification code is invalid or expired.');
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { phoneVerifiedAt: new Date() },
    }),
    prisma.phoneVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { verified: true };
}

export async function setOnboardingChoice(userId: string, choice: string) {
  const allowed = ['find_partner', 'book_massage', 'become_provider'];
  if (!allowed.includes(choice)) {
    throw new AppError(400, 'INVALID_ONBOARDING_CHOICE', 'Please choose a valid pathway.');
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { onboardingChoice: choice },
  });
  return toAuthUser(user);
}
