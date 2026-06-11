import { Router } from 'express';
import { blockIfForcedPasswordChange, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  deleteAssignmentHandler,
  getAssignments,
  patchAssignment,
  postAssignment,
} from '../controllers/assignmentController.js';

export const assignmentsRouter = Router();

assignmentsRouter.use(requireAuth, blockIfForcedPasswordChange);

assignmentsRouter.get('/', asyncHandler(getAssignments));
assignmentsRouter.post('/', asyncHandler(postAssignment));
assignmentsRouter.patch('/:id', asyncHandler(patchAssignment));
assignmentsRouter.delete('/:id', asyncHandler(deleteAssignmentHandler));
