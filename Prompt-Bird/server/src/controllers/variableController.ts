import type { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { createVariableSchema, updateVariableSchema } from '../validators/variable.js';
import { VariableModel } from '../models/Variable.js';
import { ApiError } from '../middleware/errorHandler.js';

const ensureVariableInWorkspace = async (variableId: string, workspaceId: string) => {
  const variable = await VariableModel.findOne({ _id: variableId, workspaceId });
  if (!variable) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Variable not found');
  }
  return variable;
};

export const createVariable = async (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.user?.workspaceId;
  const userId = req.user?.id;
  if (!workspaceId || !userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'No workspace in context');
  }

  const payload = createVariableSchema.parse(req.body);

  const existing = await VariableModel.findOne({
    workspaceId,
    nameLowercase: payload.name.toLowerCase(),
  });

  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'Variable name must be unique');
  }

  const variable = await VariableModel.create({
    workspaceId,
    createdBy: userId,
    name: payload.name,
    type: payload.type,
    value: payload.value,
    description: payload.description,
  });

  return res.status(StatusCodes.CREATED).json({ variable });
};

export const updateVariable = async (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.user?.workspaceId;
  const userId = req.user?.id;
  const { id } = req.params;
  if (!workspaceId || !userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'No workspace in context');
  }

  const payload = updateVariableSchema.parse(req.body);

  const variable = await ensureVariableInWorkspace(id, workspaceId);

  if (payload.name && payload.name.toLowerCase() !== variable.nameLowercase) {
    const duplicate = await VariableModel.findOne({
      workspaceId,
      nameLowercase: payload.name.toLowerCase(),
    });
    if (duplicate) {
      throw new ApiError(StatusCodes.CONFLICT, 'Variable name must be unique');
    }
  }

  await VariableModel.updateOne(
    { _id: variable.id },
    {
      $set: {
        ...(payload.name ? { name: payload.name } : {}),
        ...(payload.type ? { type: payload.type } : {}),
        ...(payload.value !== undefined ? { value: payload.value } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        updatedAt: new Date(),
      },
    }
  );

  const updated = await VariableModel.findById(variable.id).lean();
  return res.json({ variable: updated });
};

export const deleteVariable = async (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.user?.workspaceId;
  const { id } = req.params;
  if (!workspaceId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'No workspace in context');
  }

  await ensureVariableInWorkspace(id, workspaceId);

  await VariableModel.deleteOne({ _id: id });

  return res.status(StatusCodes.NO_CONTENT).send();
};
