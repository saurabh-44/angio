import { Router } from 'express';
import { blockIfForcedPasswordChange, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { postUploadSignature } from '../controllers/uploadController.js';

export const uploadsRouter = Router();

uploadsRouter.use(requireAuth, blockIfForcedPasswordChange);

uploadsRouter.post('/signature', asyncHandler(postUploadSignature));
