import { Types } from 'mongoose';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  loginVerifyOtpSchema,
  registerSchema,
  resetPasswordSchema,
} from '../validation/authSchemas.js';
import {
  completeLoginWithOtp,
  completePasswordReset,
  getMe,
  registerSponsor,
  startLogin,
  startPasswordReset,
} from '../services/auth/authService.js';
import { changePassword as changePasswordService } from '../services/users/passwordService.js';
import {
  isJtiRevoked,
  revokeJti,
  signAccessToken,
  signRefreshToken,
  tokenTtl,
  verifyRefreshToken,
} from '../services/auth/tokens.js';
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  setAccessCookie,
  setRefreshCookie,
} from '../services/auth/cookies.js';
import { HttpError } from '../utils/httpError.js';
import { User } from '../models/User.js';

function publicUser(user) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    phone: user.phone ?? null,
    role: user.role,
    isPrimary: !!user.isPrimary,
    forcePasswordChange: !!user.forcePasswordChange,
  };
}

function mintCookies(res, user) {
  const subject = {
    userId: String(user._id),
    role: user.role,
    tokenVersion: user.tokenVersion ?? 0,
  };
  setAccessCookie(res, signAccessToken(subject).token);
  setRefreshCookie(res, signRefreshToken(subject).token);
}

// Public sponsor self-registration. Creates the account only — the
// client then calls /login, which runs the usual email-OTP step.
export async function register(req, res) {
  const input = registerSchema.parse(req.body);
  await registerSponsor(input);
  res.status(201).json({ ok: true });
}

// Step 1. For ngo_admin/site_owner we send an OTP and respond
// `requiresOtp: true`. For donor/volunteer we sign in immediately.
export async function login(req, res) {
  const input = loginSchema.parse(req.body);
  const result = await startLogin(input);
  if (result.requiresOtp) {
    res.json({ requiresOtp: true, email: result.email });
    return;
  }
  mintCookies(res, result.user);
  res.json({ requiresOtp: false, user: publicUser(result.user) });
}

// Step 2 — only used by roles that went through OTP.
export async function loginVerify(req, res) {
  const input = loginVerifyOtpSchema.parse(req.body);
  const user = await completeLoginWithOtp(input);
  mintCookies(res, user);
  res.json({ user: publicUser(user) });
}

export async function refresh(req, res) {
  const token = req.cookies[REFRESH_COOKIE];
  if (!token) throw HttpError.unauthorized('Missing refresh token');

  const payload = verifyRefreshToken(token);
  if (await isJtiRevoked(payload.jti)) {
    throw HttpError.unauthorized('Refresh token has been revoked');
  }
  // Rotation: blacklist the old jti immediately.
  await revokeJti(payload.jti, tokenTtl.refreshSec);

  const user = await User.findById(payload.sub).lean();
  if (!user || !user.isActive) throw HttpError.unauthorized('Account no longer active');
  if ((user.tokenVersion ?? 0) !== (payload.tv ?? 0)) {
    throw HttpError.unauthorized('Session is no longer valid — please sign in again');
  }
  mintCookies(res, user);
  res.json({ ok: true });
}

export async function logout(req, res) {
  if (req.auth) {
    await revokeJti(req.auth.jti, tokenTtl.refreshSec).catch(() => undefined);
  }
  const refreshTok = req.cookies[REFRESH_COOKIE];
  if (refreshTok) {
    try {
      const payload = verifyRefreshToken(refreshTok);
      await revokeJti(payload.jti, tokenTtl.refreshSec);
    } catch {
      // ignore — best-effort
    }
  }
  clearAuthCookies(res);
  res.json({ ok: true });
}

export async function me(req, res) {
  if (!req.auth) throw HttpError.unauthorized();
  if (!Types.ObjectId.isValid(req.auth.userId)) throw HttpError.unauthorized();
  const result = await getMe(req.auth.userId);
  res.json(result);
}

export async function changePassword(req, res) {
  if (!req.auth) throw HttpError.unauthorized();
  const input = changePasswordSchema.parse(req.body);
  const { tokenVersion } = await changePasswordService({
    userId: req.auth.userId,
    currentPassword: input.currentPassword,
    newPassword: input.newPassword,
  });

  // Mint fresh cookies for THIS session with the bumped tokenVersion so
  // the caller stays signed in. Every OTHER device is now dead.
  mintCookies(res, {
    _id: req.auth.userId,
    role: req.auth.role,
    tokenVersion,
  });
  res.json({ ok: true });
}

export async function forgotPassword(req, res) {
  const input = forgotPasswordSchema.parse(req.body);
  await startPasswordReset(input);
  // Always-ok response — don't leak whether the email exists.
  res.json({ ok: true });
}

export async function resetPassword(req, res) {
  const input = resetPasswordSchema.parse(req.body);
  const user = await completePasswordReset(input);
  // OTP already proved control of the email and they just chose a
  // brand-new password — send them straight in.
  mintCookies(res, user);
  res.json({ user: publicUser(user) });
}
