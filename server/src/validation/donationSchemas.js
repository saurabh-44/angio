import { z } from 'zod';
import { Types } from 'mongoose';
import { PAYMENT_METHODS, DONATION_STATUSES } from '../models/Donation.js';

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), {
  message: 'Invalid id',
});

export const createDonationSchema = z
  .object({
    donor: objectId,
    amount: z.number().positive(),
    // Trees this money funds. Required when a site is chosen (the whole
    // donation is reserved to that site); optional otherwise — derived from
    // the default rate so the donation can still be allocated later.
    treeCount: z.number().int().positive().optional(),
    site: objectId.optional(),
    paidAt: z.coerce.date().optional(),
    method: z.enum(PAYMENT_METHODS).default('other'),
    note: z.string().trim().max(1000).optional(),
  })
  .refine((d) => !d.site || d.treeCount != null, {
    message: 'Tree count is required when a site is chosen',
    path: ['treeCount'],
  });

export const updateDonationSchema = z.object({
  amount: z.number().positive().optional(),
  paidAt: z.coerce.date().optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
  status: z.enum(DONATION_STATUSES).optional(),
  note: z.string().trim().max(1000).optional(),
});

export const listDonationsQuerySchema = z.object({
  donor: objectId.optional(),
  status: z.enum(DONATION_STATUSES).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
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
  limit: z.coerce.number().int().positive().max(500).default(20),
});
