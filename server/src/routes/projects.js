import { Router } from 'express';
import { blockIfForcedPasswordChange, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  deleteProjectHandler,
  getProjectById,
  getProjectList,
  patchProject,
  postProject,
} from '../controllers/projectController.js';

export const projectsRouter = Router();

projectsRouter.use(requireAuth, blockIfForcedPasswordChange);

projectsRouter.get('/', asyncHandler(getProjectList));
projectsRouter.post('/', asyncHandler(postProject));
projectsRouter.get('/:id', asyncHandler(getProjectById));
projectsRouter.patch('/:id', asyncHandler(patchProject));
projectsRouter.delete('/:id', asyncHandler(deleteProjectHandler));
