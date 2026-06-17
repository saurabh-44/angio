import { Router } from 'express';
import {
  blockIfForcedPasswordChange,
  requireAuth,
} from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getDonorCo2, getSystemCo2 } from '../controllers/co2Controller.js';

export const co2Router = Router();

co2Router.use(requireAuth, blockIfForcedPasswordChange);

// Role-gating is done inside the controllers because both endpoints
// touch the same Plant aggregation but with different filters.
co2Router.get('/me', asyncHandler(getDonorCo2));
co2Router.get('/system', asyncHandler(getSystemCo2));
