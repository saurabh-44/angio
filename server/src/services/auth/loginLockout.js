import { HttpError } from '../../utils/httpError.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export function assertNotLocked(doc) {
  if (doc?.lockedUntil && doc.lockedUntil.getTime?.() > Date.now()) {
    const minutesLeft = Math.max(
      1,
      Math.ceil((doc.lockedUntil.getTime() - Date.now()) / 60_000),
    );
    throw HttpError.locked(
      `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`,
    );
  }
}

export async function recordFailedLogin(Model, id) {
  const now = new Date();
  const doc = await Model.findById(id).select('+failedLoginCount +lockedUntil');
  if (!doc) return;

  const inFreshStreak = !doc.lockedUntil || doc.lockedUntil.getTime() <= now.getTime();
  const nextCount = inFreshStreak
    ? (doc.failedLoginCount ?? 0) + 1
    : doc.failedLoginCount + 1;

  const update = { failedLoginCount: nextCount };
  if (nextCount >= MAX_FAILED_ATTEMPTS) {
    update.lockedUntil = new Date(now.getTime() + LOCKOUT_MS);
    update.failedLoginCount = 0;
  }
  await Model.updateOne({ _id: id }, { $set: update });
}

export async function resetLoginAttempts(Model, id) {
  await Model.updateOne(
    { _id: id },
    { $set: { failedLoginCount: 0, lockedUntil: null } },
  );
}

export const lockoutConfig = { MAX_FAILED_ATTEMPTS, LOCKOUT_MS };
