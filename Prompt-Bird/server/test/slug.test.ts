import { describe, expect, it } from 'vitest';
import { workspaceSlug } from '../src/utils/slug.js';

describe('workspaceSlug', () => {
  it('generates slug from display name', () => {
    const slug = workspaceSlug('Hello World');
    expect(slug.startsWith('hello-world-')).toBe(true);
    expect(slug.slice('hello-world-'.length).length).toBe(6);
  });
});
