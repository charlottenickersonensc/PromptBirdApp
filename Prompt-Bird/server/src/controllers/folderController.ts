import type { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { createFolderSchema, moveFolderSchema, renameFolderSchema } from '../validators/folder.js';
import { PromptFolderModel } from '../models/PromptFolder.js';
import { PromptModel } from '../models/Prompt.js';
import { ApiError } from '../middleware/errorHandler.js';

const ensureFolderInWorkspace = async (folderId: string, workspaceId: string) => {
  const folder = await PromptFolderModel.findOne({ _id: folderId, workspaceId });
  if (!folder) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Folder not found');
  }
  return folder;
};

export const createFolder = async (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.user?.workspaceId;
  const userId = req.user?.id;
  if (!workspaceId || !userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'No workspace in context');
  }

  const payload = createFolderSchema.parse(req.body);

  const siblingsCount = await PromptFolderModel.countDocuments({
    workspaceId,
    parentId: payload.parentId ?? null,
  });

  const folder = await PromptFolderModel.create({
    workspaceId,
    name: payload.name,
    parentId: payload.parentId ?? null,
    position: payload.position ?? siblingsCount,
    createdBy: userId,
    updatedBy: userId,
  });

  return res.status(StatusCodes.CREATED).json({ folder });
};

export const renameFolder = async (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.user?.workspaceId;
  const userId = req.user?.id;
  const { id } = req.params;
  if (!workspaceId || !userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'No workspace in context');
  }

  const payload = renameFolderSchema.parse(req.body);

  await ensureFolderInWorkspace(id, workspaceId);

  await PromptFolderModel.updateOne(
    { _id: id },
    { $set: { name: payload.name, updatedBy: userId } }
  );

  const folder = await PromptFolderModel.findById(id).lean();
  return res.json({ folder });
};

export const deleteFolder = async (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.user?.workspaceId;
  const { id } = req.params;
  if (!workspaceId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'No workspace in context');
  }

  await ensureFolderInWorkspace(id, workspaceId);

  await Promise.all([
    PromptFolderModel.updateMany({ parentId: id }, { $set: { parentId: null } }),
    PromptModel.updateMany({ folderId: id }, { $set: { folderId: null } }),
    PromptFolderModel.deleteOne({ _id: id }),
  ]);

  return res.status(StatusCodes.NO_CONTENT).send();
};

export const moveFolder = async (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.user?.workspaceId;
  const userId = req.user?.id;
  const { id } = req.params;
  if (!workspaceId || !userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'No workspace in context');
  }

  const payload = moveFolderSchema.parse(req.body);

  await ensureFolderInWorkspace(id, workspaceId);

  await PromptFolderModel.updateOne(
    { _id: id },
    {
      $set: {
        parentId: payload.parentId ?? null,
        updatedBy: userId,
      },
    }
  );

  const folder = await PromptFolderModel.findById(id).lean();
  return res.json({ folder });
};
