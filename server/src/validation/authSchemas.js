import { z } from 'zod';
import { GENDERS } from '../models/User.js';

const email = z.string().email().trim().toLowerCase();
const otp = z.string().regex(/^\d{6}$/, '6-digit code expected');
const password = z.string().min(8, 'Password must be at least 8 characters').max(128);
const personName = z.string().trim().min(1).max(60);
const phone = z.string().trim().min(4).max(32);

// Public sponsor self-registration. Role is forced to 'sponsor' in the
// service — never accepted from the client.
export const registerSchema = z.object({
  firstName: personName,
  lastName: personName,
  email,
  phone,
  password,
  dob: z.coerce.date().optional(),
  gender: z.enum(GENDERS).optional(),
});

// Self-service profile edit. Only the safe fields a user owns — never role,
// email, or phone (those are login identifiers / verification anchors).
export const updateProfileSchema = z.object({
  firstName: personName.optional(),
  lastName: personName.optional(),
  dob: z.coerce.date().nullable().optional(),
  gender: z.enum(GENDERS).nullable().optional(),
  avatarUrl: z.string().url().max(500).nullable().optional(),
});

// Login accepts either an email or a phone number as the identifier.
export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email or phone is required'),
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
