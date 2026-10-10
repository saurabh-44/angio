import { Router } from 'express';
import { blockIfForcedPasswordChange, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getEventAudience,
  getEventById,
  getEventList,
  getMyInvites,
  postEvent,
  postEventCancel,
  postEventResponse,
} from '../controllers/eventController.js';

export const eventsRouter = Router();

eventsRouter.use(requireAuth, blockIfForcedPasswordChange);

// Role-gating lives in the service (admins + site in-charges manage,
// volunteers respond).
eventsRouter.get('/', asyncHandler(getEventList));
eventsRouter.post('/', asyncHandler(postEvent));
eventsRouter.get('/audience', asyncHandler(getEventAudience));
eventsRouter.get('/invites', asyncHandler(getMyInvites));
eventsRouter.get('/:id', asyncHandler(getEventById));
eventsRouter.post('/:id/respond', asyncHandler(postEventResponse));
eventsRouter.post('/:id/cancel', asyncHandler(postEventCancel));
