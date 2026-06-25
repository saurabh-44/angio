import { z } from 'zod';
import { Types } from 'mongoose';
import { ROLES, GENDERS } from '../models/User.js';

const email = z.string().email().trim().toLowerCase();
const personName = z.string().trim().min(1).max(60);
const phone = z.string().trim().min(4).max(32).optional().or(z.literal(''));
const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), {
  message: 'Invalid id',
});

export const createUserSchema = z.object({
  firstName: personName,
  lastName: personName,
  email,
  phone: phone.optional(),
  dob: z.coerce.date().optional(),
  gender: z.enum(GENDERS).optional(),
  role: z.enum(ROLES),
  // Volunteer's preferred site(s) at registration — optional, admin-set.
  preferredSites: z.array(objectId).max(50).optional(),
  // Optional admin-set password. When provided we use it and skip the
  // temp-password email; when omitted we fall back to emailing a temp one.
  password: z.string().min(8, 'Password must be at least 8 characters').max(128).optional(),
});

export const updateUserSchema = z.object({
  firstName: personName.optional(),
  lastName: personName.optional(),
  dob: z.coerce.date().nullable().optional(),
  gender: z.enum(GENDERS).optional(),
  phone: phone.optional(),
  isActive: z.boolean().optional(),
  preferredSites: z.array(objectId).max(50).optional(),
});

export const listUsersQuerySchema = z.object({
  role: z.enum(ROLES).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
});
