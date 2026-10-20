import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import * as authController from '../controllers/authController';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many attempts. Please try again shortly.',
    },
  },
});

export const authRouter = Router();

authRouter.post('/register', authLimiter, asyncHandler(authController.register));
authRouter.post('/login', authLimiter, asyncHandler(authController.login));
authRouter.post('/logout', asyncHandler(authController.logout));
authRouter.post('/refresh', authLimiter, asyncHandler(authController.refresh));
authRouter.get('/me', asyncHandler(authController.me));
authRouter.post('/forgot-password', authLimiter, asyncHandler(authController.forgot));
authRouter.post('/reset-password', authLimiter, asyncHandler(authController.reset));
authRouter.post('/verify-email', authLimiter, asyncHandler(authController.verifyEmailHandler));
authRouter.post(
  '/verify-phone',
  requireAuth,
  authLimiter,
  asyncHandler(authController.verifyPhoneHandler)
);
authRouter.post('/onboarding', requireAuth, asyncHandler(authController.onboarding));

// Role middleware smoke route for QA (admin only)
authRouter.get(
  '/admin-ping',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: { ok: true } });
  })
);
