import { Router } from 'express';
import {
  blockIfForcedPasswordChange,
  requireAuth,
  requireRole,
} from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getOrderById,
  getOrders,
  getSponsorshipInfo,
  postSponsorOrder,
  postVerifyPayment,
} from '../controllers/paymentController.js';

export const paymentsRouter = Router();

// All payment endpoints are sponsor-only. Site owners / volunteers /
// admins never use this surface — admins record offline payments via
// /api/donations instead.
paymentsRouter.use(requireAuth, blockIfForcedPasswordChange, requireRole('sponsor'));

paymentsRouter.get('/info', asyncHandler(getSponsorshipInfo));

// Sponsor's own orders (status / CO₂ views). Read-only.
paymentsRouter.get('/orders', asyncHandler(getOrders));
paymentsRouter.get('/orders/:id', asyncHandler(getOrderById));

// authLimiter applied to write endpoints so a misbehaving client (or a
// script) can't spam order creation / signature verification.
paymentsRouter.post('/orders', authLimiter, asyncHandler(postSponsorOrder));
paymentsRouter.post('/verify', authLimiter, asyncHandler(postVerifyPayment));
