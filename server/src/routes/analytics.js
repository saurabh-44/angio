import { Router } from 'express';
import {
  blockIfForcedPasswordChange,
  requireAuth,
  requireNgoAdmin,
} from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getAdminOverview } from '../controllers/analyticsController.js';

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth, blockIfForcedPasswordChange, requireNgoAdmin);

analyticsRouter.get('/overview', asyncHandler(getAdminOverview));
