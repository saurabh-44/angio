import { Router } from 'express';
import { blockIfForcedPasswordChange, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  deleteAllocationHandler,
  getAllocations,
  patchAllocation,
  postAllocation,
} from '../controllers/donationController.js';

export const allocationsRouter = Router();

allocationsRouter.use(requireAuth, blockIfForcedPasswordChange);

allocationsRouter.get('/', asyncHandler(getAllocations));
allocationsRouter.post('/', asyncHandler(postAllocation));
allocationsRouter.patch('/:id', asyncHandler(patchAllocation));
allocationsRouter.delete('/:id', asyncHandler(deleteAllocationHandler));
