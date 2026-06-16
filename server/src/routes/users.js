import { Router } from 'express';
import {
  blockIfForcedPasswordChange,
  requireAuth,
  requireNgoAdmin,
  requireRole,
} from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  deleteUserHandler,
  getUserById,
  getUsers,
  patchUser,
  postResetUserPassword,
  postUser,
} from '../controllers/userController.js';

export const usersRouter = Router();

// Auth + forced-password gate apply to every route. Role-gating is
// per-route because site_owner needs limited access (list + create
// volunteers under their own sites). Service layer enforces what
// site_owner can actually see/touch — these gates just keep donors and
// volunteers out entirely.
usersRouter.use(requireAuth, blockIfForcedPasswordChange);

// Listing + creation: NGO admin (anyone, any role) + site_owner (limited
// to volunteer-only scope, enforced in userService).
usersRouter.get('/', requireRole('ngo_admin', 'site_owner'), asyncHandler(getUsers));
usersRouter.post('/', requireRole('ngo_admin', 'site_owner'), asyncHandler(postUser));

// Per-user reads/writes stay NGO-admin-only.
usersRouter.get('/:id', requireNgoAdmin, asyncHandler(getUserById));
usersRouter.patch('/:id', requireNgoAdmin, asyncHandler(patchUser));
usersRouter.delete('/:id', requireNgoAdmin, asyncHandler(deleteUserHandler));
usersRouter.post('/:id/reset-password', requireNgoAdmin, asyncHandler(postResetUserPassword));
