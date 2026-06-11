import { Router } from 'express';
import { blockIfForcedPasswordChange, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  deleteMaintenanceHandler,
  getMaintenance,
  postMaintenance,
} from '../controllers/plantController.js';

export const maintenanceRouter = Router();

maintenanceRouter.use(requireAuth, blockIfForcedPasswordChange);

maintenanceRouter.get('/', asyncHandler(getMaintenance));
maintenanceRouter.post('/', asyncHandler(postMaintenance));
maintenanceRouter.delete('/:id', asyncHandler(deleteMaintenanceHandler));
