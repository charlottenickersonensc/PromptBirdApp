import type { Response } from 'express';
import { getWorkspaceSnapshot } from '../utils/workspaceSnapshot.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export const getWorkspace = async (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.user?.workspaceId;
  if (!workspaceId) {
    return res.status(400).json({ message: 'Workspace not found in token' });
  }

  const snapshot = await getWorkspaceSnapshot(workspaceId);
  return res.json(snapshot);
};
