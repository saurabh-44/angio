import { z } from 'zod';

const email = z.string().email().trim().toLowerCase();
const otp = z.string().regex(/^\d{6}$/, '6-digit code expected');
const password = z.string().min(8, 'Password must be at least 8 characters').max(128);

export const loginSchema = z.object({
  email,
  password: z.string().min(1),
});

export const loginVerifyOtpSchema = z.object({
  email,
  otp,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  email,
  otp,
  newPassword: password,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});
