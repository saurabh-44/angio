import { Router } from 'express';
import { blockIfForcedPasswordChange, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  deleteSpeciesHandler,
  getSpeciesById,
  getSpeciesList,
  patchSpecies,
  postSpecies,
} from '../controllers/speciesController.js';

export const speciesRouter = Router();

speciesRouter.use(requireAuth, blockIfForcedPasswordChange);

// Role-scoping is per-call inside the service: read open to admin /
// site_owner / volunteer (for the planting picker); writes admin-only.
speciesRouter.get('/', asyncHandler(getSpeciesList));
speciesRouter.post('/', asyncHandler(postSpecies));
speciesRouter.get('/:id', asyncHandler(getSpeciesById));
speciesRouter.patch('/:id', asyncHandler(patchSpecies));
speciesRouter.delete('/:id', asyncHandler(deleteSpeciesHandler));
