import { z } from 'zod';
import { Types } from 'mongoose';
import { PLANT_STATUSES, PLANT_GROWTH_STAGES } from '../models/Plant.js';
import { HEALTH_STATUSES } from '../models/MaintenanceLog.js';

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), {
  message: 'Invalid id',
});

const geo = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const photo = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
});

export const createPlantSchema = z.object({
  site: objectId,
  // Optional: trees are recorded unassigned and linked to a sponsor's order
  // later by the site incharge (attach flow). May still be sent to pin the
  // tree to an order at create time.
  allocation: objectId.optional(),
  // Optional — server fills a default from the species when left blank.
  name: z.string().trim().max(120).optional(),
  species: z.string().trim().max(120).optional(),
  // Optional reference into the Species master collection. Volunteer
  // picks from the dropdown OR types a custom species name.
  speciesRef: objectId.optional(),
  geo,
  plantingPhoto: photo,
  plantedAt: z.coerce.date().optional(),
  heightCm: z.number().min(0).max(5000).optional(),
  growthStage: z.enum(PLANT_GROWTH_STAGES).optional(),
  dryBiomassKg: z.number().min(0).max(100000).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const updatePlantSchema = z.object({
  name: z.string().trim().max(120).optional(),
  species: z.string().trim().max(120).optional(),
  speciesRef: objectId.nullable().optional(),
  status: z.enum(PLANT_STATUSES).optional(),
  heightCm: z.number().min(0).max(5000).nullable().optional(),
  growthStage: z.enum(PLANT_GROWTH_STAGES).optional(),
  dryBiomassKg: z.number().min(0).max(100000).nullable().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const listPlantsQuerySchema = z.object({
  site: objectId.optional(),
  donor: objectId.optional(),
  allocation: objectId.optional(),
  status: z.enum(PLANT_STATUSES).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
});

export const createMaintenanceSchema = z.object({
  plant: objectId,
  weekOf: z.coerce.date().optional(),
  photo,
  // Live GPS location where the volunteer stood. Optional here so existing
  // callers (seed/import/tests) keep working; the field app enforces it.
  geo: geo.optional(),
  note: z.string().trim().max(1000).optional(),
  // ── Monitoring extensions (all optional) ────────────────────────
  // Match the model: heightCm 0–5000, dbhCm 0–500, enum health,
  // diseaseNotes free text up to 1000 chars.
  heightCm: z.number().min(0).max(5000).optional(),
  dbhCm: z.number().min(0).max(500).optional(),
  healthStatus: z.enum(HEALTH_STATUSES).optional(),
  diseaseNotes: z.string().trim().max(1000).optional(),
});

export const listMaintenanceQuerySchema = z.object({
  plant: objectId.optional(),
  site: objectId.optional(),
  donor: objectId.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
});

// Assigning already-planted, unsponsored trees (e.g. bulk-imported
// historical ones) to a sponsor's allocation. The IDs must all be
// unsponsored, alive, and on the allocation's site — enforced server-side.
export const attachPlantsSchema = z.object({
  plantIds: z.array(objectId).min(1).max(500),
});

// Re-homing already-planted, unsponsored trees to a different site (e.g.
// correcting a bulk import). Only unsponsored trees can move — enforced
// server-side — since a sponsored tree is tied to an order on its site.
export const movePlantsSchema = z.object({
  plantIds: z.array(objectId).min(1).max(1000),
  site: objectId,
});
