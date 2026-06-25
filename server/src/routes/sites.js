import { Router } from 'express';
import { blockIfForcedPasswordChange, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  deleteSiteHandler,
  getAvailableSites,
  getSiteById,
  getSiteOverviewHandler,
  getSites,
  patchSite,
  postSite,
} from '../controllers/siteController.js';
import { getSiteQrSheet } from '../controllers/qrController.js';

export const sitesRouter = Router();

sitesRouter.use(requireAuth, blockIfForcedPasswordChange);

sitesRouter.get('/', asyncHandler(getSites));
// Must come before '/:id' so "available" isn't parsed as a site id.
sitesRouter.get('/available', asyncHandler(getAvailableSites));
sitesRouter.post('/', asyncHandler(postSite));
sitesRouter.get('/:id', asyncHandler(getSiteById));
sitesRouter.get('/:id/overview', asyncHandler(getSiteOverviewHandler));
// Path ends in .pdf so browsers + reverse proxies handle Content-Type
// transparently. Auth scope is enforced inside the QR service.
sitesRouter.get('/:id/qr-sheet.pdf', asyncHandler(getSiteQrSheet));
sitesRouter.patch('/:id', asyncHandler(patchSite));
sitesRouter.delete('/:id', asyncHandler(deleteSiteHandler));
