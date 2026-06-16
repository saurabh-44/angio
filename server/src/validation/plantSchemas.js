import { z } from 'zod';
import { Types } from 'mongoose';
import { PLANT_STATUSES } from '../models/Plant.js';

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
  allocation: objectId,
  species: z.string().trim().max(120).optional(),
  geo,
  plantingPhoto: photo,
  plantedAt: z.coerce.date().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const updatePlantSchema = z.object({
  species: z.string().trim().max(120).optional(),
  status: z.enum(PLANT_STATUSES).optional(),
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
  note: z.string().trim().max(1000).optional(),
});

export const listMaintenanceQuerySchema = z.object({
  plant: objectId.optional(),
  site: objectId.optional(),
  donor: objectId.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
});
