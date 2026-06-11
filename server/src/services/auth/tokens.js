import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { JwtBlacklist } from '../../models/JwtBlacklist.js';
import { HttpError } from '../../utils/httpError.js';

const ACCESS_TTL_SEC = env.JWT_ACCESS_TTL_MIN * 60;
const REFRESH_TTL_SEC = env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60;

export async function isJtiRevoked(jti) {
  const found = await JwtBlacklist.exists({ jti });
  return Boolean(found);
}

export async function revokeJti(jti, ttlSec) {
  const expiresAt = new Date(Date.now() + Math.max(60, ttlSec) * 1000);
  await JwtBlacklist.updateOne({ jti }, { $set: { jti, expiresAt } }, { upsert: true });
}

// Subject = { userId, role, tokenVersion }. `tv` lets requireAuth reject a
// token the moment the user's tokenVersion is bumped server-side.
export function signAccessToken(subject) {
  const jti = randomUUID();
  const tv = subject.tokenVersion ?? 0;
  const payload = { sub: subject.userId, jti, tv, role: subject.role };
  const token = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TTL_SEC });
  return { token, jti };
}

export function signRefreshToken(subject) {
  const jti = randomUUID();
  const payload = { sub: subject.userId, jti, tv: subject.tokenVersion ?? 0, role: subject.role };
  const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL_SEC });
  return { token, jti };
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch {
    throw HttpError.unauthorized('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch {
    throw HttpError.unauthorized('Invalid or expired refresh token');
  }
}

export const tokenTtl = {
  accessSec: ACCESS_TTL_SEC,
  refreshSec: REFRESH_TTL_SEC,
};
