import { nanoid } from 'nanoid';

export const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 30);

export const workspaceSlug = (displayName: string) => {
  const base = toSlug(displayName) || 'workspace';
  return `${base}-${nanoid(6)}`;
};
