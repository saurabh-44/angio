import { z } from 'zod';
import { Types } from 'mongoose';
import { PAYMENT_METHODS } from '../models/Donation.js';

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), {
  message: 'Invalid id',
});

export const createDonationSchema = z.object({
  donor: objectId,
  amount: z.number().positive(),
  paidAt: z.coerce.date().optional(),
  method: z.enum(PAYMENT_METHODS).default('other'),
  note: z.string().trim().max(1000).optional(),
});

export const updateDonationSchema = z.object({
  amount: z.number().positive().optional(),
  paidAt: z.coerce.date().optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
  note: z.string().trim().max(1000).optional(),
});

export const listDonationsQuerySchema = z.object({
  donor: objectId.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const createAllocationSchema = z.object({
  donation: objectId,
  site: objectId,
  targetPlants: z.number().int().positive(),
  allocatedAmount: z.number().nonnegative(),
  note: z.string().trim().max(1000).optional(),
});

export const updateAllocationSchema = z.object({
  targetPlants: z.number().int().positive().optional(),
  allocatedAmount: z.number().nonnegative().optional(),
  note: z.string().trim().max(1000).optional(),
});

export const listAllocationsQuerySchema = z.object({
  donation: objectId.optional(),
  donor: objectId.optional(),
  site: objectId.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
