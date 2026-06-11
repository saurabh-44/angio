// End-to-end auth-flow test against an in-memory MongoDB.
//
// Why this exists: a code review caught a bug where completePasswordReset
// returned `user.toObject()` — the global Mongoose plugin transform strips
// `_id`, so the controller's mintCookies() set a JWT subject of literally
// the string "undefined" and every subsequent request 401-ed. The
// post-reset `/auth/me` step below would have failed in CI before the fix
// and passes after.
//
// Run with:  node test/auth-flow.test.js

import { MongoMemoryServer } from 'mongodb-memory-server';
import http from 'node:http';
import assert from 'node:assert/strict';

// Configure env BEFORE importing the app (env.js validates on import).
process.env.NODE_ENV = 'test';
process.env.LOG_PRETTY = 'false';
process.env.LOG_LEVEL = 'silent';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-must-be-at-least-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-must-be-at-least-32-chars-long';
process.env.JWT_ACCESS_TTL_MIN = '15';
process.env.JWT_REFRESH_TTL_DAYS = '2';
process.env.PRIMARY_NGO_ADMIN_EMAIL = 'primary@ngo.test';
process.env.PRIMARY_NGO_ADMIN_PASSWORD = 'seed-password-AAA';
process.env.PRIMARY_NGO_ADMIN_NAME = 'Primary Admin';
process.env.COOKIE_SECURE = 'false';
process.env.COOKIE_SAMESITE = 'lax';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.PUBLIC_URL = 'http://localhost:4000';
process.env.CLOUDINARY_UPLOAD_FOLDER = 'angio-test';

let mongo;
let server;
let baseUrl;

async function setup() {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();

  const { connectDb } = await import('../src/config/db.js');
  await connectDb();

  const { seedNgoAdmin } = await import('../src/services/auth/seedNgoAdmin.js');
  await seedNgoAdmin();

  const { createApp } = await import('../src/app.js');
  const app = createApp();
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}

async function teardown() {
  server?.close();
  const mongoose = (await import('mongoose')).default;
  await mongoose.disconnect();
  await mongo?.stop();
}

// Tiny cookie jar so each "session" can be tracked separately.
function newJar() {
  return {};
}

function applySetCookies(jar, setCookieHeaders) {
  for (const c of setCookieHeaders) {
    const [pair] = c.split(';');
    const eq = pair.indexOf('=');
    if (eq <= 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (value === '' || /expires=Thu, 01 Jan 1970/i.test(c)) {
      delete jar[name];
    } else {
      jar[name] = value;
    }
  }
}

function cookieHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function call(method, path, { body, jar } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (jar && Object.keys(jar).length) headers.cookie = cookieHeader(jar);
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (jar) {
    const setCookie = res.headers.getSetCookie?.() ?? [];
    if (setCookie.length) applySetCookies(jar, setCookie);
  }
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { __raw: text };
  }
  return { status: res.status, body: json };
}

// Read an OTP straight out of the DB for the test (in real life it's emailed).
async function fetchOtp(email, purpose) {
  const { OtpRequest } = await import('../src/models/OtpRequest.js');
  const row = await OtpRequest.findOne({ email, purpose }).sort({ createdAt: -1 }).lean();
  if (!row) throw new Error(`no OTP found for ${email} / ${purpose}`);
  return row.otp;
}

const TESTS = [];
function test(name, fn) {
  TESTS.push({ name, fn });
}

test('seeded primary admin logs in via OTP', async () => {
  const jar = newJar();
  const r1 = await call('POST', '/api/auth/login', {
    body: { email: 'primary@ngo.test', password: 'seed-password-AAA' },
    jar,
  });
  assert.equal(r1.status, 200);
  assert.equal(r1.body.requiresOtp, true, 'ngo_admin must trigger OTP');
  assert.equal(Object.keys(jar).length, 0, 'no cookies on step 1');

  const otp = await fetchOtp('primary@ngo.test', 'login');
  const r2 = await call('POST', '/api/auth/login/verify', {
    body: { email: 'primary@ngo.test', otp },
    jar,
  });
  assert.equal(r2.status, 200);
  assert.equal(r2.body.user.role, 'ngo_admin');
  assert.equal(r2.body.user.isPrimary, true);
  assert.equal(r2.body.user.forcePasswordChange, true);
  assert.ok(jar.angio_access, 'access cookie set');
  assert.ok(jar.angio_refresh, 'refresh cookie set');
  return { jar };
});

test('forced-password user can hit /me and /change-password but nothing else', async ({ jar }) => {
  // /me works
  const me = await call('GET', '/api/auth/me', { jar });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.forcePasswordChange, true);

  // /users (any role-gated endpoint) is blocked with PASSWORD_CHANGE_REQUIRED
  const users = await call('GET', '/api/users', { jar });
  assert.equal(users.status, 403);
  assert.equal(users.body.error.code, 'PASSWORD_CHANGE_REQUIRED');

  // Change password — clears the flag, re-cookies the session.
  const ch = await call('POST', '/api/auth/change-password', {
    body: { currentPassword: 'seed-password-AAA', newPassword: 'real-password-BBB' },
    jar,
  });
  assert.equal(ch.status, 200);

  // Now /users works.
  const usersAfter = await call('GET', '/api/users', { jar });
  assert.equal(usersAfter.status, 200);

  // The forcePasswordChange flag is now cleared on /me.
  const meAfter = await call('GET', '/api/auth/me', { jar });
  assert.equal(meAfter.body.user.forcePasswordChange, false);
});

test('admin creates a donor (password-only role)', async () => {
  const jar = newJar();
  await call('POST', '/api/auth/login', {
    body: { email: 'primary@ngo.test', password: 'real-password-BBB' },
    jar,
  });
  const otp = await fetchOtp('primary@ngo.test', 'login');
  await call('POST', '/api/auth/login/verify', {
    body: { email: 'primary@ngo.test', otp },
    jar,
  });

  const create = await call('POST', '/api/users', {
    body: { name: 'Dora Donor', email: 'dora@donor.test', role: 'donor' },
    jar,
  });
  assert.equal(create.status, 201);
  assert.equal(create.body.user.role, 'donor');
  assert.equal(create.body.user.forcePasswordChange, true);

  // Fetch the temp password — in real life it's emailed; we read the
  // doc directly and rotate it via the password service for the test.
  const { User } = await import('../src/models/User.js');
  const { default: bcrypt } = await import('bcryptjs');
  const donor = await User.findOne({ email: 'dora@donor.test' });
  const tempPw = 'temp-donor-pass-CCC';
  donor.passwordHash = await bcrypt.hash(tempPw, 12);
  await donor.save();
  return { donorTempPw: tempPw };
});

test('donor logs in WITHOUT OTP (password-only path)', async ({ donorTempPw }) => {
  const jar = newJar();
  const r1 = await call('POST', '/api/auth/login', {
    body: { email: 'dora@donor.test', password: donorTempPw },
    jar,
  });
  assert.equal(r1.status, 200);
  assert.equal(r1.body.requiresOtp, false, 'donor must NOT trigger OTP');
  assert.equal(r1.body.user.role, 'donor');
  assert.ok(jar.angio_access, 'donor gets cookies immediately on step 1');
  return { jar, donorTempPw };
});

test('CRITICAL: forgot/reset password flow gives a working session', async ({ donorTempPw }) => {
  // Trigger reset OTP.
  const r = await call('POST', '/api/auth/forgot-password', {
    body: { email: 'dora@donor.test' },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);

  const otp = await fetchOtp('dora@donor.test', 'reset');
  const jar = newJar();
  const reset = await call('POST', '/api/auth/reset-password', {
    body: { email: 'dora@donor.test', otp, newPassword: 'donor-real-pw-DDD' },
    jar,
  });
  assert.equal(reset.status, 200, `reset failed: ${JSON.stringify(reset.body)}`);
  assert.ok(reset.body.user.id, 'response carries a non-undefined user id');
  assert.notEqual(reset.body.user.id, 'undefined');
  assert.ok(jar.angio_access, 'reset returns working cookies');

  // THE bug-canary: before the fix this 401-ed because the JWT subject
  // was the string "undefined" and User.findById("undefined") failed.
  const me = await call('GET', '/api/auth/me', { jar });
  assert.equal(me.status, 200, `post-reset /me failed: ${JSON.stringify(me.body)}`);
  assert.equal(me.body.user.email, 'dora@donor.test');
  assert.equal(me.body.user.forcePasswordChange, false);

  // The donor can log in fresh with the new password.
  const jar2 = newJar();
  const login = await call('POST', '/api/auth/login', {
    body: { email: 'dora@donor.test', password: 'donor-real-pw-DDD' },
    jar: jar2,
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.requiresOtp, false);
});

test('forgot-password does not leak whether the email exists', async () => {
  const r = await call('POST', '/api/auth/forgot-password', {
    body: { email: 'nobody-here@nowhere.test' },
  });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true });
});

test('donor cannot list users (role gate)', async () => {
  const jar = newJar();
  await call('POST', '/api/auth/login', {
    body: { email: 'dora@donor.test', password: 'donor-real-pw-DDD' },
    jar,
  });
  const users = await call('GET', '/api/users', { jar });
  assert.equal(users.status, 403);
});

test('admin cannot deactivate themselves (lockout guard)', async () => {
  const jar = newJar();
  await call('POST', '/api/auth/login', {
    body: { email: 'primary@ngo.test', password: 'real-password-BBB' },
    jar,
  });
  const otp = await fetchOtp('primary@ngo.test', 'login');
  await call('POST', '/api/auth/login/verify', {
    body: { email: 'primary@ngo.test', otp },
    jar,
  });
  const me = await call('GET', '/api/auth/me', { jar });
  const adminId = me.body.user.id;
  const r = await call('PATCH', `/api/users/${adminId}`, {
    body: { isActive: false },
    jar,
  });
  assert.equal(r.status, 400);
  assert.match(r.body.error.message, /deactivate your own/i);
});

test('deactivating a donor kills their sessions (tokenVersion bump)', async () => {
  // Donor logs in.
  const donorJar = newJar();
  await call('POST', '/api/auth/login', {
    body: { email: 'dora@donor.test', password: 'donor-real-pw-DDD' },
    jar: donorJar,
  });
  const meBefore = await call('GET', '/api/auth/me', { jar: donorJar });
  assert.equal(meBefore.status, 200);

  // Admin deactivates donor.
  const adminJar = newJar();
  await call('POST', '/api/auth/login', {
    body: { email: 'primary@ngo.test', password: 'real-password-BBB' },
    jar: adminJar,
  });
  const otp = await fetchOtp('primary@ngo.test', 'login');
  await call('POST', '/api/auth/login/verify', {
    body: { email: 'primary@ngo.test', otp },
    jar: adminJar,
  });
  const donorId = meBefore.body.user.id;
  const r = await call('PATCH', `/api/users/${donorId}`, {
    body: { isActive: false },
    jar: adminJar,
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.user.isActive, false);

  // Donor's old cookie now fails (tokenVersion mismatch / account inactive).
  const meAfter = await call('GET', '/api/auth/me', { jar: donorJar });
  assert.equal(meAfter.status, 401);
});

test('refresh rotates tokens and old refresh is revoked', async () => {
  const jar = newJar();
  await call('POST', '/api/auth/login', {
    body: { email: 'primary@ngo.test', password: 'real-password-BBB' },
    jar,
  });
  const otp = await fetchOtp('primary@ngo.test', 'login');
  await call('POST', '/api/auth/login/verify', {
    body: { email: 'primary@ngo.test', otp },
    jar,
  });
  const oldRefresh = jar.angio_refresh;
  assert.ok(oldRefresh);

  const r = await call('POST', '/api/auth/refresh', { jar });
  assert.equal(r.status, 200);
  assert.notEqual(jar.angio_refresh, oldRefresh, 'refresh cookie should rotate');

  // Replay the old refresh — should be revoked now.
  const jarReplay = { angio_refresh: oldRefresh };
  const replay = await call('POST', '/api/auth/refresh', { jar: jarReplay });
  assert.equal(replay.status, 401);
});

test('logout revokes the session', async () => {
  const jar = newJar();
  await call('POST', '/api/auth/login', {
    body: { email: 'primary@ngo.test', password: 'real-password-BBB' },
    jar,
  });
  const otp = await fetchOtp('primary@ngo.test', 'login');
  await call('POST', '/api/auth/login/verify', {
    body: { email: 'primary@ngo.test', otp },
    jar,
  });
  const stolenAccess = jar.angio_access;
  assert.ok(stolenAccess);

  const lo = await call('POST', '/api/auth/logout', { jar });
  assert.equal(lo.status, 200);

  // Replay the stolen access cookie — must be revoked by JTI.
  const replay = { angio_access: stolenAccess };
  const me = await call('GET', '/api/auth/me', { jar: replay });
  assert.equal(me.status, 401);
});

test('login validates payload shape', async () => {
  const r = await call('POST', '/api/auth/login', { body: { email: 'not-an-email' } });
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'VALIDATION_ERROR');
});

async function main() {
  await setup();
  let context = {};
  let failed = 0;
  for (const { name, fn } of TESTS) {
    try {
      const next = await fn(context);
      if (next && typeof next === 'object') context = { ...context, ...next };
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed += 1;
      console.error(`  ✗ ${name}\n    ${err.message}`);
    }
  }
  await teardown();
  console.log(failed === 0 ? `\nAll ${TESTS.length} checks passed.` : `\n${failed} failed.`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error('Test runner crashed:', e);
  await teardown().catch(() => undefined);
  process.exit(1);
});
