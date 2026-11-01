import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { listServiceCities } from '../services/sites/siteService.js';

// No-auth public route. The volunteer sign-up form's city dropdown reads
// from here — city/state names only, nothing else about the sites.
export const publicServiceCitiesRouter = Router();

publicServiceCitiesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ items: await listServiceCities() });
  }),
);
