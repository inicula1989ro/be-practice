import request from 'supertest';
import { app } from '../../src/app';

let counter = 0;

export interface TestSession {
  token: string;
  userId: number;
  email: string;
}

// Registers a fresh user (unique email per call, so tests never collide
// with each other even without resetDb running between every single call
// within one test) and logs in, returning what most tests actually need:
// a bearer token and the user's id.
export async function registerAndLogin(): Promise<TestSession> {
  const email = `test-${Date.now()}-${counter++}@example.com`;
  const password = 'password123';

  await request(app).post('/auth/register').send({ email, password }).expect(201);

  const loginRes = await request(app).post('/auth/login').send({ email, password }).expect(200);

  return {
    token: loginRes.body.data.token,
    userId: loginRes.body.data.user.id,
    email,
  };
}
