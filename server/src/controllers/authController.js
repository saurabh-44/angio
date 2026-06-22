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
  startSignup,
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
import { getBearerToken } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';
import { User } from '../models/User.js';

// Native (Capacitor) clients send `X-Client: native` and cannot use
// cookies, so they need the tokens echoed in the JSON body to store in
// secure storage. Web clients omit the header and keep using cookies.
function wantsTokens(req) {
  return req.get('x-client') === 'native';
}

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

// Signs a fresh access+refresh pair, sets the web cookies, and — for
// native callers — returns the raw tokens so the controller can echo
// them in the response body. Web callers get `undefined` (cookies only).
function issueSession(req, res, user) {
  const subject = {
    userId: String(user._id),
    role: user.role,
    tokenVersion: user.tokenVersion ?? 0,
  };
  const accessToken = signAccessToken(subject).token;
  const refreshToken = signRefreshToken(subject).token;
  setAccessCookie(res, accessToken);
  setRefreshCookie(res, refreshToken);
  return wantsTokens(req) ? { accessToken, refreshToken } : undefined;
}

// Public sponsor self-registration. Creates the account only — the
// client then calls /login, which runs the usual email-OTP step.
// Step 1 of self-registration. No account is created yet — we email an OTP
// and only create the User once it's verified (via /login/verify).
export async function register(req, res) {
  const input = registerSchema.parse(req.body);
  const { email } = await startSignup(input);
  res.status(200).json({ requiresOtp: true, email });
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
  const tokens = issueSession(req, res, result.user);
  res.json({ requiresOtp: false, user: publicUser(result.user), tokens });
}

// Step 2 — only used by roles that went through OTP.
export async function loginVerify(req, res) {
  const input = loginVerifyOtpSchema.parse(req.body);
  const user = await completeLoginWithOtp(input);
  const tokens = issueSession(req, res, user);
  res.json({ user: publicUser(user), tokens });
}

export async function refresh(req, res) {
  // Web sends the refresh token in its httpOnly cookie; native sends it
  // as a Bearer header (it has no cookie jar across the webview origin).
  const token = req.cookies[REFRESH_COOKIE] || getBearerToken(req);
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
  const tokens = issueSession(req, res, user);
  res.json({ ok: true, tokens });
}

export async function logout(req, res) {
  if (req.auth) {
    await revokeJti(req.auth.jti, tokenTtl.refreshSec).catch(() => undefined);
  }
  // Native has no refresh cookie — it posts the token in the body so we
  // can still revoke it server-side.
  const refreshTok = req.cookies[REFRESH_COOKIE] || req.body?.refreshToken;
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

  // Mint a fresh session for THIS caller with the bumped tokenVersion so
  // they stay signed in. Every OTHER device is now dead.
  const tokens = issueSession(req, res, {
    _id: req.auth.userId,
    role: req.auth.role,
    tokenVersion,
  });
  res.json({ ok: true, tokens });
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
  const tokens = issueSession(req, res, user);
  res.json({ user: publicUser(user), tokens });
}
