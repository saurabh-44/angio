import { z } from 'zod';

export const createSpeciesSchema = z.object({
  name: z.string().trim().min(1).max(120),
  scientificName: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  co2PerYearKg: z.number().min(0).max(1000).optional(),
  maxHeightCm: z.number().int().min(0).max(10000).optional(),
  maxDbhCm: z.number().int().min(0).max(1000).optional(),
  isActive: z.boolean().optional(),
});

export const updateSpeciesSchema = createSpeciesSchema.partial();

export const listSpeciesQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(50),
});
