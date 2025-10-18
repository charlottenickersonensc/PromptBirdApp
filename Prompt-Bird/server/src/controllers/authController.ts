import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import { loginSchema, registerSchema } from '../validators/auth.js';
import { UserModel } from '../models/User.js';
import { WorkspaceModel } from '../models/Workspace.js';
import { PromptFolderModel } from '../models/PromptFolder.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { ApiError } from '../middleware/errorHandler.js';
import { signJwt } from '../utils/jwt.js';
import { getWorkspaceSnapshot } from '../utils/workspaceSnapshot.js';
import { workspaceSlug } from '../utils/slug.js';

const DEFAULT_FOLDERS = [
  { name: 'Templates', position: 0 },
  { name: 'Work Projects', position: 1 },
];

export const register = async (req: Request, res: Response) => {
  const payload = registerSchema.parse(req.body);
  const emailLowercase = payload.email.toLowerCase();

  const existing = await UserModel.findOne({ emailLowercase });
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'Email already registered');
  }

  const session = await mongoose.startSession();

  let userId: string = '';
  let workspaceId: string = '';

  await session.withTransaction(async () => {
    const passwordHash = await hashPassword(payload.password);

    const user = await UserModel.create(
      [
        {
          email: payload.email,
          emailLowercase,
          passwordHash,
          displayName: payload.displayName,
          providers: [{ type: 'password' }],
        },
      ],
      { session }
    );

    userId = user[0].id;

    const workspace = await WorkspaceModel.create(
      [
        {
          name: `${payload.displayName}'s Workspace`,
          slug: workspaceSlug(payload.displayName),
          ownerId: userId,
          members: [
            {
              userId,
              role: 'owner',
              joinedAt: new Date(),
              status: 'active',
            },
          ],
        },
      ],
      { session }
    );

    workspaceId = workspace[0].id;

    await PromptFolderModel.insertMany(
      DEFAULT_FOLDERS.map((folder) => ({
        ...folder,
        workspaceId,
        parentId: null,
        createdBy: userId,
        updatedBy: userId,
      })),
      { session }
    );

    await UserModel.updateOne(
      { _id: userId },
      {
        $set: {
          'preferences.defaultWorkspaceId': workspaceId,
        },
      },
      { session }
    );
  });

  session.endSession();

  const token = signJwt({ sub: userId, workspaceId });
  const snapshot = await getWorkspaceSnapshot(workspaceId);

  return res.status(StatusCodes.CREATED).json({
    token,
    userId,
    workspaceId,
    ...snapshot,
  });
};

export const login = async (req: Request, res: Response) => {
  const payload = loginSchema.parse(req.body);
  const emailLowercase = payload.email.toLowerCase();

  const user = await UserModel.findOne({ emailLowercase });
  if (!user?.passwordHash) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  const valid = await verifyPassword(payload.password, user.passwordHash);
  if (!valid) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  const workspaceId = user.preferences?.defaultWorkspaceId?.toString();
  if (!workspaceId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User has no default workspace');
  }

  await UserModel.updateOne(
    { _id: user.id },
    { $set: { lastLoginAt: new Date() } }
  );

  const token = signJwt({ sub: user.id, workspaceId });
  const snapshot = await getWorkspaceSnapshot(workspaceId);

  return res.status(StatusCodes.OK).json({
    token,
    userId: user.id,
    workspaceId,
    ...snapshot,
  });
};
