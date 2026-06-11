import { z } from 'zod';
import { ROLES } from '../models/User.js';

const email = z.string().email().trim().toLowerCase();
const name = z.string().trim().min(1).max(120);
const phone = z.string().trim().min(4).max(32).optional().or(z.literal(''));

export const createUserSchema = z.object({
  name,
  email,
  phone: phone.optional(),
  role: z.enum(ROLES),
});

export const updateUserSchema = z.object({
  name: name.optional(),
  phone: phone.optional(),
  isActive: z.boolean().optional(),
});

export const listUsersQuerySchema = z.object({
  role: z.enum(ROLES).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
