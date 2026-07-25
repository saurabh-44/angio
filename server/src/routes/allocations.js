import { Router } from 'express';
import { blockIfForcedPasswordChange, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  deleteAllocationHandler,
  getAllocations,
  patchAllocation,
  postAllocation,
} from '../controllers/donationController.js';
import {
  getAttachablePlants,
  postAttachPlants,
} from '../controllers/plantController.js';

export const allocationsRouter = Router();

allocationsRouter.use(requireAuth, blockIfForcedPasswordChange);

allocationsRouter.get('/', asyncHandler(getAllocations));
allocationsRouter.post('/', asyncHandler(postAllocation));
allocationsRouter.patch('/:id', asyncHandler(patchAllocation));
allocationsRouter.delete('/:id', asyncHandler(deleteAllocationHandler));

// Assign existing, unsponsored trees (e.g. bulk-imported historical ones)
// to an order/allocation. Read the candidates, then attach the chosen ids.
allocationsRouter.get('/:id/attachable-plants', asyncHandler(getAttachablePlants));
allocationsRouter.post('/:id/attach-plants', asyncHandler(postAttachPlants));
