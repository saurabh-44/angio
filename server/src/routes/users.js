import { Router } from 'express';
import {
  blockIfForcedPasswordChange,
  requireAuth,
  requireNgoAdmin,
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

usersRouter.use(requireAuth, blockIfForcedPasswordChange, requireNgoAdmin);

usersRouter.get('/', asyncHandler(getUsers));
usersRouter.post('/', asyncHandler(postUser));
usersRouter.get('/:id', asyncHandler(getUserById));
usersRouter.patch('/:id', asyncHandler(patchUser));
usersRouter.delete('/:id', asyncHandler(deleteUserHandler));
usersRouter.post('/:id/reset-password', asyncHandler(postResetUserPassword));
