import { Router } from 'express';
import { blockIfForcedPasswordChange, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getDonationById,
  getDonations,
  patchDonation,
  postDonation,
} from '../controllers/donationController.js';

export const donationsRouter = Router();

donationsRouter.use(requireAuth, blockIfForcedPasswordChange);

donationsRouter.get('/', asyncHandler(getDonations));
donationsRouter.post('/', asyncHandler(postDonation));
donationsRouter.get('/:id', asyncHandler(getDonationById));
donationsRouter.patch('/:id', asyncHandler(patchDonation));
