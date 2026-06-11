import { Router } from 'express';
import { blockIfForcedPasswordChange, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  deletePlantHandler,
  getPlantById,
  getPlants,
  patchPlant,
  postPlant,
} from '../controllers/plantController.js';

export const plantsRouter = Router();

plantsRouter.use(requireAuth, blockIfForcedPasswordChange);

plantsRouter.get('/', asyncHandler(getPlants));
plantsRouter.post('/', asyncHandler(postPlant));
plantsRouter.get('/:id', asyncHandler(getPlantById));
plantsRouter.patch('/:id', asyncHandler(patchPlant));
plantsRouter.delete('/:id', asyncHandler(deletePlantHandler));
