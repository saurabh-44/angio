import { Router } from 'express';
import { blockIfForcedPasswordChange, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  deleteSiteHandler,
  getSiteById,
  getSites,
  patchSite,
  postSite,
} from '../controllers/siteController.js';

export const sitesRouter = Router();

sitesRouter.use(requireAuth, blockIfForcedPasswordChange);

sitesRouter.get('/', asyncHandler(getSites));
sitesRouter.post('/', asyncHandler(postSite));
sitesRouter.get('/:id', asyncHandler(getSiteById));
sitesRouter.patch('/:id', asyncHandler(patchSite));
sitesRouter.delete('/:id', asyncHandler(deleteSiteHandler));
