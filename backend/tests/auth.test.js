'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const createApp = require('../src/app');
const User = require('../src/models/User');
const {
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} = require('./helpers/db');

const app = createApp();

const VALID_USER = {
  email: 'sam@example.com',
  password: 'Pantry1!',
  displayName: 'Sam',
};

beforeAll(connectTestDatabase);
afterEach(clearTestDatabase);
afterAll(disconnectTestDatabase);

describe('POST /api/auth/register', () => {
  it('creates an account and returns a token', async () => {
    const response = await request(app).post('/api/auth/register').send(VALID_USER);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({
      userId: expect.any(String),
      email: 'sam@example.com',
      displayName: 'Sam',
      token: expect.any(String),
    });
  });

  it('signs a token that carries the user id and expires in 24 hours', async () => {
    const response = await request(app).post('/api/auth/register').send(VALID_USER);
    const payload = jwt.verify(response.body.data.token, process.env.JWT_SECRET);

    expect(payload.sub).toBe(response.body.data.userId);
    expect(payload.email).toBe('sam@example.com');
    expect(payload.exp - payload.iat).toBe(24 * 60 * 60);
  });

  it('stores a bcrypt hash and never the plaintext password', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);

    const stored = await User.findOne({ email: VALID_USER.email }).select('+passwordHash');

    expect(stored.passwordHash).not.toBe(VALID_USER.password);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
    await expect(bcrypt.compare(VALID_USER.password, stored.passwordHash)).resolves.toBe(true);
  });

  it('never includes the password hash in the response body', async () => {
    const response = await request(app).post('/api/auth/register').send(VALID_USER);

    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it('rejects a duplicate email with EMAIL_EXISTS', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);
    const response = await request(app).post('/api/auth/register').send(VALID_USER);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'EMAIL_EXISTS',
        message: expect.any(String),
        field: 'email',
      },
    });
  });

  it('treats emails case-insensitively when detecting duplicates', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);

    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, email: 'SAM@Example.com' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMAIL_EXISTS');
  });

  describe('validation', () => {
    const cases = [
      ['missing email', { ...VALID_USER, email: undefined }, 'email'],
      ['malformed email', { ...VALID_USER, email: 'not-an-email' }, 'email'],
      ['empty display name', { ...VALID_USER, displayName: '   ' }, 'displayName'],
      ['password too short', { ...VALID_USER, password: 'Ab1!' }, 'password'],
      ['password without uppercase', { ...VALID_USER, password: 'pantry1!' }, 'password'],
      ['password without number', { ...VALID_USER, password: 'Pantry!!' }, 'password'],
      ['password without special character', { ...VALID_USER, password: 'Pantry11' }, 'password'],
    ];

    it.each(cases)('rejects %s', async (_label, payload, field) => {
      const response = await request(app).post('/api/auth/register').send(payload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.field).toBe(field);
      expect(typeof response.body.error.message).toBe('string');
    });

    it('accepts a password whose only special character is a space', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...VALID_USER, password: 'Pantry 1' });

      expect(response.status).toBe(201);
    });

    it('trims and lowercases the stored email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...VALID_USER, email: '  SAM@Example.COM  ' });

      expect(response.status).toBe(201);
      expect(response.body.data.email).toBe('sam@example.com');
    });
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);
  });

  it('returns a token for correct credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({
      userId: expect.any(String),
      email: 'sam@example.com',
      displayName: 'Sam',
      token: expect.any(String),
    });
  });

  it('accepts a differently cased email', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'SAM@EXAMPLE.COM', password: VALID_USER.password });

    expect(response.status).toBe(200);
  });

  it('rejects a wrong password with INVALID_CREDENTIALS', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: 'Wrong1!' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: expect.any(String),
        field: null,
      },
    });
  });

  it('returns the same response for an unknown email as for a wrong password', async () => {
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Pantry1!' });

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: 'Wrong1!' });

    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrongPassword.body);
  });

  it('requires both fields', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.field).toBe('password');
  });

  it('does not apply the registration password policy to existing accounts', async () => {
    // A weak password must fail as INVALID_CREDENTIALS (401), not
    // VALIDATION_ERROR (400) — otherwise the response reveals policy state
    // rather than credential state.
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: 'weak' });

    expect(response.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the profile for a valid token', async () => {
    const registration = await request(app).post('/api/auth/register').send(VALID_USER);

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registration.body.data.token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe('sam@example.com');
  });

  it('rejects a missing token', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects a token signed with the wrong secret', async () => {
    const forged = jwt.sign({ sub: '507f1f77bcf86cd799439011' }, 'wrong-secret');

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${forged}`);

    expect(response.status).toBe(401);
  });
});

describe('error handling', () => {
  it('returns NOT_FOUND for an unknown route', async () => {
    const response = await request(app).get('/api/auth/nope');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('returns VALIDATION_ERROR for malformed JSON', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('sets security headers from helmet', async () => {
    const response = await request(app).get('/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
