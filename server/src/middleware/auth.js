import { ACCESS_COOKIE } from '../services/auth/cookies.js';
import { isJtiRevoked, verifyAccessToken } from '../services/auth/tokens.js';
import { HttpError } from '../utils/httpError.js';
import { User } from '../models/User.js';

// How stale the lastActiveAt stamp must be before requireAuth refreshes
// it. Keeps the "Last Active" field useful without a write per request.
const LAST_ACTIVE_THROTTLE_MS = 5 * 60 * 1000;

// Verifies the access cookie and attaches `req.auth`. On every request it
// re-checks the principal in the DB: a deactivated / soft-deleted user,
// or one whose tokenVersion was bumped (password change), is rejected
// immediately instead of staying alive until the access token expires.
export async function requireAuth(req, _res, next) {
  try {
    const token = req.cookies[ACCESS_COOKIE];
    if (!token) throw HttpError.unauthorized('Not signed in');

    const payload = verifyAccessToken(token);
    if (await isJtiRevoked(payload.jti)) {
      throw HttpError.unauthorized('Session has been revoked');
    }

    const user = await User.findById(payload.sub)
      .select('isActive tokenVersion forcePasswordChange role isPrimary')
      .lean();
    if (!user || user.isActive === false) {
      throw HttpError.unauthorized('Account is no longer active');
    }
    if ((user.tokenVersion ?? 0) !== (payload.tv ?? 0)) {
      throw HttpError.unauthorized('Session is no longer valid — please sign in again');
    }

    req.auth = {
      userId: payload.sub,
      role: user.role,
      isPrimary: !!user.isPrimary,
      jti: payload.jti,
      forcePasswordChange: !!user.forcePasswordChange,
    };

    // Best-effort "Last Active" stamp. Fire-and-forget and throttled at
    // the query layer — the write only matches (and so only fires) when
    // the cached value is missing or older than the window, so we don't
    // pay a write on every single request.
    const staleBefore = new Date(Date.now() - LAST_ACTIVE_THROTTLE_MS);
    void User.updateOne(
      {
        _id: payload.sub,
        $or: [{ lastActiveAt: { $exists: false } }, { lastActiveAt: { $lt: staleBefore } }],
      },
      { $set: { lastActiveAt: new Date() } },
    ).catch(() => {});

    next();
  } catch (err) {
    next(err);
  }
}

// Role gate. Use after requireAuth.
//   router.get('/x', requireAuth, requireRole('ngo_admin'), handler)
//   router.get('/y', requireAuth, requireRole('ngo_admin', 'site_owner'), handler)
export function requireRole(...allowed) {
  const set = new Set(allowed);
  return (req, _res, next) => {
    if (!req.auth) return next(HttpError.unauthorized());
    if (!set.has(req.auth.role)) {
      return next(HttpError.forbidden('You do not have permission for this action'));
    }
    next();
  };
}

// Convenience for the most common gate.
export const requireNgoAdmin = requireRole('ngo_admin');

// Gate for actions reserved to the seeded primary NGO admin (e.g.
// removing other ngo_admin accounts).
export function requirePrimaryNgoAdmin(req, _res, next) {
  if (!req.auth) return next(HttpError.unauthorized());
  if (req.auth.role !== 'ngo_admin' || !req.auth.isPrimary) {
    return next(HttpError.forbidden('Only the primary NGO admin can perform this action'));
  }
  next();
}

// Blocks every authenticated route except the ones a forced user needs
// to clear the flag (read self, change password, log out).
export function blockIfForcedPasswordChange(req, _res, next) {
  if (req.auth?.forcePasswordChange) {
    return next(
      new HttpError(
        403,
        'PASSWORD_CHANGE_REQUIRED',
        'Please change your password before continuing.',
      ),
    );
  }
  next();
}
