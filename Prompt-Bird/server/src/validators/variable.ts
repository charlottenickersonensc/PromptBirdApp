import { z } from 'zod';

export const createVariableSchema = z.object({
  name: z.string().min(1),
  value: z.string(),
  type: z.enum(['string', 'number', 'code']).default('string'),
  description: z.string().optional(),
});

export const updateVariableSchema = createVariableSchema.partial().extend({
  name: z.string().min(1).optional(),
});
