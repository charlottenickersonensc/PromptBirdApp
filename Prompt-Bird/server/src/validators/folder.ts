import { z } from 'zod';

export const createFolderSchema = z.object({
  name: z.string().min(1),
  parentId: z.string().nullable().optional(),
  position: z.number().optional(),
});

export const renameFolderSchema = z.object({
  name: z.string().min(1),
});

export const moveFolderSchema = z.object({
  parentId: z.string().nullable(),
});
