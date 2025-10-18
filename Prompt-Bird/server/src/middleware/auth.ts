import type { NextFunction, Request, Response } from 'express';
import { verifyJwt } from '../utils/jwt.js';
import { UserModel } from '../models/User.js';
import { WorkspaceModel } from '../models/Workspace.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    workspaceId: string;
  };
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.substring('Bearer '.length);
    const payload = verifyJwt(token);

    const user = await UserModel.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: 'Invalid user' });
    }

    const workspace = await WorkspaceModel.findById(payload.workspaceId);
    if (!workspace) {
      return res.status(401).json({ message: 'Workspace not found' });
    }

    req.user = { id: user.id, workspaceId: workspace.id };
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};
