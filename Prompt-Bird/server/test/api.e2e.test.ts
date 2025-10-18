import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp();

const baseUser = {
  email: 'test-user@promptbird.ai',
  password: 'Password123!',
  displayName: 'Test User',
};

const registerUser = async (overrides: Partial<typeof baseUser> = {}) => {
  const payload = { ...baseUser, ...overrides };
  const response = await request(app)
    .post('/api/auth/register')
    .send(payload);

  expect(response.status).toBe(201);
  return response.body as {
    token: string;
    userId: string;
    workspaceId: string;
    workspace: unknown;
    folders: Array<Record<string, unknown>>;
  };
};

describe('Authentication & workspace flows', () => {
  it('registers a new user and provisions a workspace snapshot', async () => {
    const result = await registerUser();

    expect(result.token).toBeDefined();
    expect(result.userId).toBeDefined();
    expect(result.workspaceId).toBeDefined();
    expect(Array.isArray(result.folders)).toBe(true);
    expect(result.folders.length).toBeGreaterThanOrEqual(2);
  });

  it('allows a registered user to log in and retrieve their workspace snapshot', async () => {
    await registerUser();

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: baseUser.email, password: baseUser.password });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBeDefined();
    expect(loginResponse.body.workspace).toBeDefined();
    expect(Array.isArray(loginResponse.body.prompts)).toBe(true);
  });

  it('rejects workspace access without authentication and succeeds with a valid token', async () => {
    const unauthenticated = await request(app).get('/api/workspace');
    expect(unauthenticated.status).toBe(401);

    const { token } = await registerUser({ email: 'workspace-user@promptbird.ai' });
    const workspaceResponse = await request(app)
      .get('/api/workspace')
      .set('Authorization', `Bearer ${token}`);

    expect(workspaceResponse.status).toBe(200);
    expect(workspaceResponse.body.workspace).toBeDefined();
    expect(Array.isArray(workspaceResponse.body.folders)).toBe(true);
  });
});

describe('Prompt and variable management', () => {
  it('creates a prompt with an initial version for an authenticated user', async () => {
    const { token } = await registerUser({ email: 'prompt-user@promptbird.ai' });

    const createResponse = await request(app)
      .post('/api/prompts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'My First Prompt',
        content: 'Hello AI',
        tags: ['test'],
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.prompt.title).toBe('My First Prompt');
    expect(Array.isArray(createResponse.body.versions)).toBe(true);
    expect(createResponse.body.versions.length).toBe(1);
  });

  it('enforces unique variable names within a workspace', async () => {
    const { token } = await registerUser({ email: 'variable-user@promptbird.ai' });

    const createVariable = await request(app)
      .post('/api/variables')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'ProjectName', value: 'PromptBird', type: 'string' });

    expect(createVariable.status).toBe(201);

    const duplicate = await request(app)
      .post('/api/variables')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'ProjectName', value: 'Duplicate', type: 'string' });

    expect(duplicate.status).toBe(409);
  });
});
