'use strict';

// The limit is read from the environment when `src/config/env.js` is first
// required, so it has to be overridden before the app is pulled in. `require`
// executes in order in CommonJS, which makes this safe.
process.env.RATE_LIMIT_MAX = '2';
process.env.RATE_LIMIT_WINDOW_MS = '60000';

const request = require('supertest');
const createApp = require('../src/app');
const {
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} = require('./helpers/db');

const app = createApp();

beforeAll(connectTestDatabase);
afterEach(clearTestDatabase);
afterAll(disconnectTestDatabase);

describe('auth rate limiting', () => {
  it('rejects requests past the per-IP limit with the shared error envelope', async () => {
    const attempt = () =>
      request(app).post('/api/auth/login').send({ email: 'sam@example.com', password: 'Nope1!' });

    await attempt();
    await attempt();
    const blocked = await attempt();

    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: expect.any(String),
        field: null,
      },
    });
  });

  it('counts register and login separately from unthrottled routes', async () => {
    await request(app).post('/api/auth/login').send({ email: 'a@example.com', password: 'Nope1!' });
    await request(app).post('/api/auth/login').send({ email: 'a@example.com', password: 'Nope1!' });

    // /health carries no limiter, so it must still answer.
    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
  });
});
