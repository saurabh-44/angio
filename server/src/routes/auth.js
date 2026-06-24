import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  loginVerifyOtpSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '../validation/authSchemas.js';
import {
  changePassword,
  forgotPassword,
  login,
  loginVerify,
  logout,
  me,
  refresh,
  register,
  resetPassword,
  updateMe,
} from '../controllers/authController.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  authLimiter,
  validate(registerSchema, 'body'),
  asyncHandler(register),
);
authRouter.post(
  '/login',
  authLimiter,
  validate(loginSchema, 'body'),
  asyncHandler(login),
);
authRouter.post(
  '/login/verify',
  authLimiter,
  validate(loginVerifyOtpSchema, 'body'),
  asyncHandler(loginVerify),
);

authRouter.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema, 'body'),
  asyncHandler(forgotPassword),
);
authRouter.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema, 'body'),
  asyncHandler(resetPassword),
);

authRouter.post('/refresh', authLimiter, asyncHandler(refresh));
authRouter.post('/logout', requireAuth, asyncHandler(logout));
authRouter.get('/me', requireAuth, asyncHandler(me));
authRouter.patch('/me', requireAuth, validate(updateProfileSchema, 'body'), asyncHandler(updateMe));
authRouter.post(
  '/change-password',
  authLimiter,
  requireAuth,
  validate(changePasswordSchema, 'body'),
  asyncHandler(changePassword),
);
