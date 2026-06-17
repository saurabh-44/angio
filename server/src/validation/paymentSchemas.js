import { z } from 'zod';

// Donor-initiated "Sponsor N trees" — the donor's only input is how many
// trees they want to fund. The server multiplies by TREE_UNIT_PRICE_INR
// so the client can't pick the amount.
export const createSponsorOrderSchema = z.object({
  treeCount: z.number().int().positive().max(1000),
  note: z.string().trim().max(500).optional(),
});

// Verification payload posted by the Razorpay checkout handler. Names
// match Razorpay's response object verbatim.
export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});
