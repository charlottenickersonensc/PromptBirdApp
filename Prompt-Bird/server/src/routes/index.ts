import { Router } from 'express';
import { authRouter } from './authRoutes.js';
import { requireAuth } from '../middleware/auth.js';
import { workspaceRouter } from './workspaceRoutes.js';
import { promptRouter } from './promptRoutes.js';
import { folderRouter } from './folderRoutes.js';
import { variableRouter } from './variableRoutes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/workspace', requireAuth, workspaceRouter);
apiRouter.use('/prompts', requireAuth, promptRouter);
apiRouter.use('/folders', requireAuth, folderRouter);
apiRouter.use('/variables', requireAuth, variableRouter);
