import { z } from 'zod';
import { Types } from 'mongoose';
import { ASSIGNMENT_KINDS } from '../models/Assignment.js';

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), {
  message: 'Invalid id',
});

export const createAssignmentSchema = z.object({
  volunteer: objectId,
  site: objectId,
  kind: z.enum(ASSIGNMENT_KINDS),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  note: z.string().trim().max(1000).optional(),
});

export const updateAssignmentSchema = z.object({
  kind: z.enum(ASSIGNMENT_KINDS).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  note: z.string().trim().max(1000).optional(),
});

export const listAssignmentsQuerySchema = z.object({
  volunteer: objectId.optional(),
  site: objectId.optional(),
  kind: z.enum(ASSIGNMENT_KINDS).optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(50),
});
