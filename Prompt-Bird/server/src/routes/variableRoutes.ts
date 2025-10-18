import { Router } from 'express';
import { createVariable, deleteVariable, updateVariable } from '../controllers/variableController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const variableRouter = Router();

variableRouter.post('/', asyncHandler(createVariable));
variableRouter.patch('/:id', asyncHandler(updateVariable));
variableRouter.delete('/:id', asyncHandler(deleteVariable));
