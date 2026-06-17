import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPublicTree } from '../controllers/qrController.js';

// No-auth public route. Anyone scanning a tree's QR sticker hits this.
// Cache-friendly, deliberately minimal payload — no donor identity, no
// volunteer name, just the proof a stranger needs to verify the tree.
export const publicTreesRouter = Router();

publicTreesRouter.get('/:code', asyncHandler(getPublicTree));
