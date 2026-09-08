import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { resetDb, closeDb } from '../helpers/testDb';

describe('Auth', () => {
  beforeEach(resetDb);
  afterAll(closeDb);

  it('registers a new user and never returns the password hash', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe('alice@example.com');
    expect(res.body.data.password_hash).toBeUndefined();
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/auth/register').send({ email: 'bob@example.com', password: 'password123' });

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'bob@example.com', password: 'password123' });

    expect(res.status).toBe(409);
  });

  it('rejects a password under 8 characters with 400', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'carol@example.com', password: 'short' });

    expect(res.status).toBe(400);
  });

  it('rejects a malformed email with 400', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(400);
  });

  it('logs in with correct credentials and returns a token', async () => {
    await request(app).post('/auth/register').send({ email: 'dave@example.com', password: 'password123' });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'dave@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.email).toBe('dave@example.com');
  });

  it('rejects the wrong password', async () => {
    await request(app).post('/auth/register').send({ email: 'erin@example.com', password: 'password123' });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'erin@example.com', password: 'wrong-password' });

    // Documented app behavior: 404, not 401, kept consistent with the
    // "unregistered email" case below (see the README's Notes section).
    expect(res.status).toBe(404);
  });

  it('gives an identical response for a nonexistent email and a wrong password', async () => {
    await request(app).post('/auth/register').send({ email: 'frank@example.com', password: 'password123' });

    const wrongPassword = await request(app)
      .post('/auth/login')
      .send({ email: 'frank@example.com', password: 'wrong-password' });

    const noSuchUser = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever123' });

    expect(wrongPassword.status).toBe(noSuchUser.status);
    expect(wrongPassword.body.error.message).toBe(noSuchUser.body.error.message);
  });
});
