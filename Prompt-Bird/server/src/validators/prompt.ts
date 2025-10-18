import { z } from 'zod';

export const createPromptSchema = z.object({
  title: z.string().min(1),
  content: z.string().default(''),
  folderId: z.string().nullable().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const updatePromptSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  comment: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

export const movePromptSchema = z.object({
  folderId: z.string().nullable(),
});

export const createVersionSchema = z.object({
  content: z.string(),
  comment: z.string().min(1),
});
