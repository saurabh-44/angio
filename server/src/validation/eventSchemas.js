import { z } from 'zod';
import { Types } from 'mongoose';
import { EVENT_AUDIENCES, EVENT_RESPONSES } from '../models/Event.js';

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), {
  message: 'Invalid id',
});

export const createEventSchema = z.object({
  site: objectId,
  name: z.string().trim().min(1, 'Event name is required').max(200),
  // "YYYY-MM-DD" — the event's calendar day.
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Pick a time'),
  note: z.string().trim().max(1000).optional(),
  volunteersNeeded: z.number().int().min(1).max(10000).optional(),
  audience: z.enum(EVENT_AUDIENCES).default('all'),
  excludedUsers: z.array(objectId).max(5000).default([]),
});

// Preview of who an event would invite, so the form can show the list
// and let the creator untick people before posting.
export const audienceQuerySchema = z.object({
  site: objectId,
  audience: z.enum(EVENT_AUDIENCES).default('all'),
});

export const respondEventSchema = z.object({
  response: z.enum(EVENT_RESPONSES),
});
