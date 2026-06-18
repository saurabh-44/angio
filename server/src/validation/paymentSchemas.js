import { z } from 'zod';
import { Types } from 'mongoose';

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), {
  message: 'Invalid id',
});

// Sponsor-initiated "Sponsor N trees". The sponsor chooses how many trees
// and (optionally) which site + date. The server resolves the per-tree
// price (per-site, else global) so the client can't pick the amount.
export const createSponsorOrderSchema = z.object({
  treeCount: z.number().int().positive().max(1000),
  site: objectId.optional(),
  donationDate: z.coerce.date().optional(),
  note: z.string().trim().max(500).optional(),
});

// Verification payload posted by the Razorpay checkout handler. Names
// match Razorpay's response object verbatim.
export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});
