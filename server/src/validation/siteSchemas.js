import { z } from 'zod';
import { Types } from 'mongoose';

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), {
  message: 'Invalid id',
});

const geo = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const createSiteSchema = z.object({
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  pinCode: z.string().trim().max(16).optional(),
  geo,
  capacity: z.number().int().min(0).default(0),
  notes: z.string().trim().max(2000).optional(),
  owner: objectId,
});

export const updateSiteSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  pinCode: z.string().trim().max(16).optional(),
  geo: geo.optional(),
  capacity: z.number().int().min(0).optional(),
  notes: z.string().trim().max(2000).optional(),
  owner: objectId.optional(),
});

export const listSitesQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  owner: objectId.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
});
