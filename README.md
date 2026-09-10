# Pantrio

Grocery inventory and expiry tracking. This repository currently contains the
authentication system: a Node/Express API backed by MongoDB Atlas, and a React
Native client with signup, login, and persistent sessions.

```
backend/    Express + Mongoose API (JavaScript, CommonJS)
mobile/     React Native app (JavaScript, .jsx for components)
```

---

## 1. Install

Run these once, in two separate terminals or one after the other.

```bash
# Backend
cd backend
npm install
```

```bash
# Mobile
cd mobile
npm install

# iOS only — installs the native pods (macOS with Xcode required)
cd ios && bundle install && bundle exec pod install && cd ..
```

Requirements: Node 22.11 or newer (React Native 0.87 requires it), and for the
mobile app either Android Studio with an emulator or Xcode with a simulator.

---

## 2. Environment variables

Copy the template and fill in the two blanks:

```bash
cd backend
cp .env.example .env
```

| Variable | Required | What to put in it |
| --- | --- | --- |
| `MONGODB_URI` | Yes | Atlas connection string. In Atlas: **Database → Connect → Drivers**. Replace `<password>` and add the database name (`pantrio`) before the `?`. |
| `JWT_SECRET` | Yes | A long random string. Generate one with the command below. |
| `NODE_ENV` | No | `development` (default), `production`, or `test`. |
| `PORT` | No | Defaults to `4000`. |
| `JWT_EXPIRES_IN` | No | Defaults to `24h`. |
| `BCRYPT_SALT_ROUNDS` | No | Defaults to `12`. |
| `RATE_LIMIT_WINDOW_MS` | No | Defaults to `60000` (one minute). |
| `RATE_LIMIT_MAX` | No | Defaults to `5` requests per window per IP. |
| `TRUST_PROXY_HOPS` | No | Defaults to `0`. Set to `1` behind a single reverse proxy (Render, Heroku, nginx). Leaving it too high lets callers spoof their IP past the rate limiter. |

Generate a signing key:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The server refuses to start if `MONGODB_URI` or `JWT_SECRET` is missing, rather
than running with an undefined secret.

**Atlas checklist:** add your current IP under **Network Access**, and make sure
the database user has read/write access to the `pantrio` database.

### Mobile configuration

The mobile app has no `.env`. Its API URL lives in `mobile/src/config/index.js`:

- Android emulator: `http://10.0.2.2:4000` (the emulator's alias for your host
  machine — `localhost` there means the emulator itself)
- iOS simulator: `http://localhost:4000`
- Physical device: edit that file and use your machine's LAN address, e.g.
  `http://192.168.1.50:4000`

---

## 3. Run

```bash
# Terminal 1 — API with auto-reload
cd backend
npm run dev          # or: npm start

# Terminal 2 — Metro bundler
cd mobile
npm start

# Terminal 3 — build and launch the app
cd mobile
npm run android      # or: npm run ios
```

Confirm the API is up:

```bash
curl http://localhost:4000/health
# {"success":true,"data":{"status":"ok"}}
```

---

## 4. Testing the endpoints

### Register

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alex@pantrio.app",
    "password": "Fridge9#",
    "displayName": "Alex"
  }'
```

```json
{
  "success": true,
  "data": {
    "userId": "6aa2d0bd89abff22c63fbb85",
    "email": "alex@pantrio.app",
    "displayName": "Alex",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alex@pantrio.app",
    "password": "Fridge9#"
  }'
```

Same `200` payload as above.

### Authenticated request

```bash
TOKEN="paste-the-token-here"

curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "success": true,
  "data": {
    "userId": "6aa2d0bd89abff22c63fbb85",
    "email": "alex@pantrio.app",
    "displayName": "Alex"
  }
}
```

### Failure cases worth trying

```bash
# Weak password → 400 VALIDATION_ERROR
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"weak@pantrio.app","password":"weak","displayName":"Weak"}'

# Duplicate email → 409 EMAIL_EXISTS
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alex@pantrio.app","password":"Fridge9#","displayName":"Alex"}'

# Wrong password → 401 INVALID_CREDENTIALS
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alex@pantrio.app","password":"Wrong1!"}'

# Six failed logins inside a minute → 429 RATE_LIMITED
for i in $(seq 1 6); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"alex@pantrio.app","password":"Wrong1!"}'
done
```

### Postman

Create a `POST` request to `http://localhost:4000/api/auth/register`, set
**Body → raw → JSON**, and paste:

```json
{
  "email": "alex@pantrio.app",
  "password": "Fridge9#",
  "displayName": "Alex"
}
```

For authenticated routes use **Authorization → Bearer Token** and paste the
`data.token` value from the response.

---

## API reference

Base URL: `http://localhost:4000`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | No | Liveness probe |
| `POST` | `/api/auth/register` | No | Create an account, returns a 24h JWT |
| `POST` | `/api/auth/login` | No | Exchange credentials for a 24h JWT |
| `GET` | `/api/auth/me` | Bearer | Current profile; used by the app to check a stored token on launch |

### Password policy

Minimum 6 characters, with at least one uppercase letter, one number, and one
special character. Enforced server-side by `express-validator` and mirrored in
`mobile/src/utils/validators.js` for instant feedback.

### Error format

Every failure — validation, auth, rate limiting, or an unexpected crash — uses
this envelope. `field` is the offending input when one applies and `null`
otherwise.

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Enter a valid email address.",
    "field": "email"
  }
}
```

| Code | Status | When |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Bad or missing input, or malformed JSON |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password, or a missing/expired token |
| `NOT_FOUND` | 404 | Unknown route, or a token for a deleted account |
| `EMAIL_EXISTS` | 409 | That email is already registered |
| `RATE_LIMITED` | 429 | More than 5 auth requests in a minute from one IP |
| `INTERNAL_ERROR` | 500 | Anything unexpected |

---

## Tests

```bash
cd backend && npm test    # 29 tests — API behaviour against an in-memory MongoDB
cd mobile  && npm test    # 59 tests — forms, HTTP client, and session restore
```

Both suites are self-contained. The backend spins up its own in-memory MongoDB,
so no Atlas connection or `.env` is needed to run them.

Linting:

```bash
cd backend && npm run lint
cd mobile  && npm run lint
```

---

## How it fits together

**Backend.** `server.js` connects to Mongo and only then starts listening.
`src/app.js` builds the Express app (helmet, CORS, JSON parsing, routes, error
handling) and is exported separately so tests can mount it without a socket.
Passwords are hashed by a `pre('validate')` hook on the User schema, which is
the only place bcrypt is called for storage; `passwordHash` is `select: false`,
so a query has to explicitly ask for it. Unknown errors are logged in full
server-side and returned to the client as a bare `INTERNAL_ERROR`.

**Mobile.** `AuthContext` owns the token and user and exposes `login`,
`register`, and `logout`. `AppNavigator` renders the auth stack or the dashboard
based on whether a token exists, so the screens never navigate on success
themselves — and a signed-out user has no route to the dashboard to navigate to.
`services/api.js` is the single axios instance: a request interceptor attaches
the bearer token, and a response interceptor converts every failure (server
envelope, timeout, or dead network) into one `ApiError` shape the screens can
render directly.

---

## Known limitations

These are deliberate, and each needs addressing before launch.

- **Token storage is not encrypted.** `AsyncStorage` is readable on a rooted or
  jailbroken device and in unencrypted backups. Move to
  [`react-native-keychain`](https://github.com/oblador/react-native-keychain);
  `mobile/src/services/tokenStorage.js` is the only file that needs to change.
- **CORS allows every origin.** Fine for simulators, wrong for production.
  Restrict `origin` in `backend/src/app.js`.
- **No refresh tokens.** Sessions end abruptly after 24 hours and the user has
  to sign in again.
- **No password reset or email verification.**
- **`npm audit` in `mobile/` reports advisories** in Metro and a transitive
  dependency of React Navigation. They are build-time and no upstream fix is
  published yet; `npm audit fix --force` downgrades React Native, which is worse.
  The backend audits clean.
