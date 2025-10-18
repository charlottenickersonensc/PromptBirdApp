import { Router } from 'express';
import { getWorkspace } from '../controllers/workspaceController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const workspaceRouter = Router();

workspaceRouter.get('/', asyncHandler(getWorkspace));
