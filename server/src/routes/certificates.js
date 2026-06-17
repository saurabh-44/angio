import { Router } from 'express';
import {
  blockIfForcedPasswordChange,
  requireAuth,
  requireRole,
} from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getCertificatePdf } from '../controllers/certificateController.js';

export const certificatesRouter = Router();

certificatesRouter.use(requireAuth, blockIfForcedPasswordChange, requireRole('sponsor'));

// /:type.pdf — type is 'plantation' or 'co2'. Path-suffix .pdf
// nudges some browsers to handle the response as a download.
certificatesRouter.get('/:type.pdf', asyncHandler(getCertificatePdf));
