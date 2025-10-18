import type { Response } from 'express';
import mongoose from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { PromptModel } from '../models/Prompt.js';
import { PromptVersionModel } from '../models/PromptVersion.js';
import { createPromptSchema, createVersionSchema, movePromptSchema, updatePromptSchema } from '../validators/prompt.js';
import { ApiError } from '../middleware/errorHandler.js';

const ensurePromptInWorkspace = async (promptId: string, workspaceId: string) => {
  const prompt = await PromptModel.findOne({ _id: promptId, workspaceId });
  if (!prompt) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Prompt not found');
  }
  return prompt;
};

export const createPrompt = async (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.user?.workspaceId;
  const userId = req.user?.id;
  if (!workspaceId || !userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'No workspace in context');
  }

  const payload = createPromptSchema.parse(req.body);

  const session = await mongoose.startSession();
  let createdPromptId: string | null = null;

  await session.withTransaction(async () => {
    const [prompt] = await PromptModel.create(
      [
        {
          workspaceId,
          ownerId: userId,
          folderId: payload.folderId ?? null,
          title: payload.title,
          content: payload.content ?? '',
          description: payload.description ?? '',
          tags: payload.tags ?? [],
          lastEditedBy: userId,
        },
      ],
      { session }
    );

    createdPromptId = prompt.id;

    const version = await PromptVersionModel.create(
      [
        {
          promptId: prompt.id,
          workspaceId,
          content: payload.content ?? '',
          comment: 'Initial version',
          versionNumber: 1,
          createdBy: userId,
        },
      ],
      { session }
    );

    await PromptModel.updateOne(
      { _id: prompt.id },
      { $set: { currentVersionId: version[0]._id } },
      { session }
    );
  });

  session.endSession();

  const prompt = await PromptModel.findById(createdPromptId).lean();
  const versions = await PromptVersionModel.find({ promptId: createdPromptId }).sort({ versionNumber: -1 }).lean();

  return res.status(StatusCodes.CREATED).json({ prompt, versions });
};

export const updatePrompt = async (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.user?.workspaceId;
  const userId = req.user?.id;
  const { id } = req.params;
  if (!workspaceId || !userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'No workspace in context');
  }

  const payload = updatePromptSchema.parse(req.body);

  const prompt = await ensurePromptInWorkspace(id, workspaceId);

  const session = await mongoose.startSession();

  await session.withTransaction(async () => {
    await PromptModel.updateOne(
      { _id: prompt.id },
      {
        $set: {
          ...(payload.title ? { title: payload.title } : {}),
          ...(payload.description !== undefined ? { description: payload.description } : {}),
          ...(payload.tags ? { tags: payload.tags } : {}),
          ...(payload.status ? { status: payload.status } : {}),
          lastEditedBy: userId,
        },
      },
      { session }
    );

    if (payload.content !== undefined) {
      const latestVersion = await PromptVersionModel.findOne({ promptId: prompt.id })
        .sort({ versionNumber: -1 })
        .session(session);

      const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

      const version = await PromptVersionModel.create(
        [
          {
            promptId: prompt.id,
            workspaceId,
            content: payload.content,
            comment: payload.comment ?? 'Update',
            versionNumber: nextVersionNumber,
            createdBy: userId,
          },
        ],
        { session }
      );

      await PromptModel.updateOne(
        { _id: prompt.id },
        {
          $set: {
            content: payload.content,
            currentVersionId: version[0]._id,
          },
        },
        { session }
      );
    }
  });

  session.endSession();

  const updatedPrompt = await PromptModel.findById(prompt.id).lean();
  return res.json({ prompt: updatedPrompt });
};

export const deletePrompt = async (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.user?.workspaceId;
  const { id } = req.params;
  if (!workspaceId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'No workspace in context');
  }

  await ensurePromptInWorkspace(id, workspaceId);

  await Promise.all([
    PromptModel.deleteOne({ _id: id }),
    PromptVersionModel.deleteMany({ promptId: id }),
  ]);

  return res.status(StatusCodes.NO_CONTENT).send();
};

export const movePrompt = async (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.user?.workspaceId;
  const userId = req.user?.id;
  const { id } = req.params;
  if (!workspaceId || !userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'No workspace in context');
  }

  const payload = movePromptSchema.parse(req.body);
  await ensurePromptInWorkspace(id, workspaceId);

  await PromptModel.updateOne(
    { _id: id },
    {
      $set: {
        folderId: payload.folderId,
        lastEditedBy: userId,
      },
    }
  );

  const prompt = await PromptModel.findById(id).lean();
  return res.json({ prompt });
};

export const duplicatePrompt = async (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.user?.workspaceId;
  const userId = req.user?.id;
  const { id } = req.params;
  if (!workspaceId || !userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'No workspace in context');
  }

  const prompt = await ensurePromptInWorkspace(id, workspaceId);

  const session = await mongoose.startSession();
  let newPromptId: string = '';

  await session.withTransaction(async () => {
    const duplicate = await PromptModel.create(
      [
        {
          workspaceId,
          ownerId: userId,
          folderId: prompt.folderId,
          title: `${prompt.title} (Copy)`,
          content: prompt.content,
          description: prompt.description,
          tags: prompt.tags,
          status: 'draft',
          lastEditedBy: userId,
        },
      ],
      { session }
    );

    newPromptId = duplicate[0].id;

    const latestVersion = await PromptVersionModel.findOne({ promptId: prompt.id })
      .sort({ versionNumber: -1 })
      .lean();

    const versionNumber = latestVersion ? latestVersion.versionNumber : 1;

    const newVersion = await PromptVersionModel.create(
      [
        {
          promptId: newPromptId,
          workspaceId,
          content: prompt.content,
          comment: 'Duplicated prompt',
          versionNumber,
          createdBy: userId,
        },
      ],
      { session }
    );

    await PromptModel.updateOne(
      { _id: newPromptId },
      { $set: { currentVersionId: newVersion[0]._id } },
      { session }
    );
  });

  session.endSession();

  const newPrompt = await PromptModel.findById(newPromptId).lean();
  const versions = await PromptVersionModel.find({ promptId: newPromptId }).sort({ versionNumber: -1 }).lean();

  return res.status(StatusCodes.CREATED).json({ prompt: newPrompt, versions });
};

export const createVersion = async (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.user?.workspaceId;
  const userId = req.user?.id;
  const { id } = req.params;
  if (!workspaceId || !userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'No workspace in context');
  }

  const payload = createVersionSchema.parse(req.body);

  const prompt = await ensurePromptInWorkspace(id, workspaceId);

  const latestVersion = await PromptVersionModel.findOne({ promptId: prompt.id }).sort({ versionNumber: -1 });
  const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

  const version = await PromptVersionModel.create({
    promptId: prompt.id,
    workspaceId,
    content: payload.content,
    comment: payload.comment,
    versionNumber: nextVersionNumber,
    createdBy: userId,
  });

  await PromptModel.updateOne(
    { _id: prompt.id },
    {
      $set: {
        currentVersionId: version.id,
        content: payload.content,
        lastEditedBy: userId,
      },
    }
  );

  const versions = await PromptVersionModel.find({ promptId: prompt.id }).sort({ versionNumber: -1 }).lean();

  return res.status(StatusCodes.CREATED).json({ version, versions });
};

export const listVersions = async (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.user?.workspaceId;
  const { id } = req.params;
  if (!workspaceId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'No workspace in context');
  }

  await ensurePromptInWorkspace(id, workspaceId);

  const versions = await PromptVersionModel.find({ promptId: id }).sort({ versionNumber: -1 }).lean();
  return res.json({ versions });
};
