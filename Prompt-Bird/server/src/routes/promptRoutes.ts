import { Router } from 'express';
import { createPrompt, createVersion, deletePrompt, duplicatePrompt, listVersions, movePrompt, updatePrompt } from '../controllers/promptController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const promptRouter = Router();

promptRouter.post('/', asyncHandler(createPrompt));
promptRouter.put('/:id', asyncHandler(updatePrompt));
promptRouter.delete('/:id', asyncHandler(deletePrompt));
promptRouter.post('/:id/duplicate', asyncHandler(duplicatePrompt));
promptRouter.post('/:id/versions', asyncHandler(createVersion));
promptRouter.get('/:id/versions', asyncHandler(listVersions));
promptRouter.patch('/:id/move', asyncHandler(movePrompt));
