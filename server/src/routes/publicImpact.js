import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPublicImpact } from '../controllers/co2Controller.js';

// No-auth public route. The landing page hero reads its live site count
// and CO₂ total from here.
export const publicImpactRouter = Router();

publicImpactRouter.get('/', asyncHandler(getPublicImpact));
