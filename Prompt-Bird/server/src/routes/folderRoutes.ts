import { Router } from 'express';
import { createFolder, deleteFolder, moveFolder, renameFolder } from '../controllers/folderController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const folderRouter = Router();

folderRouter.post('/', asyncHandler(createFolder));
folderRouter.patch('/:id', asyncHandler(renameFolder));
folderRouter.delete('/:id', asyncHandler(deleteFolder));
folderRouter.patch('/:id/move', asyncHandler(moveFolder));
