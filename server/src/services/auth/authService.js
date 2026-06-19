import bcrypt from 'bcryptjs';
import { User, OTP_LOGIN_ROLES } from '../../models/User.js';
import { PendingSignup } from '../../models/PendingSignup.js';
import { HttpError } from '../../utils/httpError.js';
import { sendOtp, verifyOtp } from './otpService.js';
import { assertNotLocked, recordFailedLogin, resetLoginAttempts } from './loginLockout.js';
import { sendMail } from '../../config/mail.js';
import { passwordChangedTemplate } from '../../mail/templates/passwordChanged.js';
import { logger } from '../../utils/logger.js';

const BCRYPT_ROUNDS = 12;

// Roles allowed to sign in with phone + password only (no email OTP).
// Admins and site owners always complete the email OTP, regardless of
// whether they used their email or phone as the identifier.
const PHONE_NO_OTP_ROLES = new Set(['sponsor', 'volunteer']);

// How long an unverified pending signup survives before it's auto-purged.
const SIGNUP_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Step 1 of login. Verifies password, then either issues an OTP (for
// ngo_admin / site_owner) or signals the caller to mint cookies straight
// away (donor / volunteer — password-only with lockout).
export async function startLogin({ identifier, password }) {
  // Identifier is an email OR a phone number. Emails are stored lower-cased;
  // phones are stored as entered.
  const id = String(identifier).trim();
  const user = await User.findOne({
    $or: [{ email: id.toLowerCase() }, { phone: id }],
    isActive: true,
  })
    .select('+passwordHash +failedLoginCount +lockedUntil')
    .lean();
  if (!user) throw HttpError.unauthorized('Invalid credentials');

  assertNotLocked(user);
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    await recordFailedLogin(User, user._id);
    throw HttpError.unauthorized('Invalid credentials');
  }
  await resetLoginAttempts(User, user._id);

  // A phone identifier has no '@'. Sponsors/volunteers signing in by phone
  // skip the OTP; every other case (admins, site owners, or any email
  // login) still completes the email OTP step.
  const loggedInByPhone = !id.includes('@');
  const phoneBypass = loggedInByPhone && PHONE_NO_OTP_ROLES.has(user.role);

  if (OTP_LOGIN_ROLES.has(user.role) && !phoneBypass) {
    // The OTP always goes to the account's email — even if the visitor
    // signed in with their phone — so we return it for the verify step.
    await sendOtp({ email: user.email, purpose: 'login' });
    return { requiresOtp: true, email: user.email };
  }

  // Direct sign-in (password only) — caller mints cookies for this user.
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  return { requiresOtp: false, user };
}

// Step 1 of sponsor self-registration. We DON'T create the User yet — the
// password-hashed signup is stashed in PendingSignup and an email OTP is
// sent. The real account is created only once that OTP is verified (see
// completeLoginWithOtp), so unverified / spam signups never become real
// accounts. Role is hard-coded to 'sponsor'.
export async function startSignup({ firstName, lastName, email, phone, password, dob, gender }) {
  const existing = await User.findOne({ email }).select('_id').lean();
  if (existing) throw HttpError.conflict('An account with this email already exists');

  const phoneTaken = await User.findOne({ phone }).select('_id').lean();
  if (phoneTaken) throw HttpError.conflict('An account with this phone number already exists');

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  // Upsert so re-submitting the form (or a fresh attempt) just refreshes
  // the pending record + OTP rather than piling up duplicates.
  await PendingSignup.findOneAndUpdate(
    { email },
    {
      $set: {
        firstName,
        lastName,
        email,
        phone,
        dob,
        gender,
        passwordHash,
        expiresAt: new Date(Date.now() + SIGNUP_TTL_MS),
      },
    },
    { upsert: true },
  );

  await sendOtp({ email, purpose: 'login' });
  return { email };
}

// Step 2 — verifies the email OTP. Also the FINAL step of sponsor
// self-registration: if the email belongs to a PendingSignup (no real
// account yet), verifying the OTP is what actually creates the account.
export async function completeLoginWithOtp({ email, otp }) {
  await verifyOtp({ email, purpose: 'login', otp });

  let user = await User.findOne({ email, isActive: true }).lean();
  if (!user) {
    // No account yet → must be a verified sponsor signup. Create it now.
    const pending = await PendingSignup.findOne({ email }).lean();
    if (!pending) throw HttpError.unauthorized('Account not found');
    const created = await User.create({
      firstName: pending.firstName,
      lastName: pending.lastName,
      email: pending.email,
      phone: pending.phone,
      dob: pending.dob,
      gender: pending.gender,
      role: 'sponsor',
      passwordHash: pending.passwordHash,
      isActive: true,
      forcePasswordChange: false,
    });
    await PendingSignup.deleteOne({ email });
    user = await User.findById(created._id).lean();
  }

  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  return user;
}

export async function getMe(userId) {
  const user = await User.findById(userId).lean();
  if (!user || !user.isActive) throw HttpError.unauthorized('Account not found');
  return {
    user: {
      id: String(user._id),
      email: user.email,
      name: user.name,
      phone: user.phone ?? null,
      address: user.address ?? null,
      role: user.role,
      isActive: user.isActive,
      isPrimary: !!user.isPrimary,
      forcePasswordChange: !!user.forcePasswordChange,
      createdAt: user.createdAt?.toISOString?.() ?? new Date().toISOString(),
    },
  };
}

// Forgot-password: always returns "ok" to the caller so the API can't be
// used to enumerate valid emails. We only actually send a code if the
// email belongs to an active user.
export async function startPasswordReset({ email }) {
  const user = await User.findOne({ email, isActive: true }).select('_id').lean();
  if (user) {
    await sendOtp({ email, purpose: 'reset' });
    return;
  }
  logger.debug({ email }, 'forgot-password requested for non-existent email');
}

// Reset-password: verifies OTP, replaces the hash, clears the
// must-rotate flag, bumps tokenVersion to invalidate other sessions.
// Returns the user — the controller then mints cookies for the device
// that just completed the reset.
export async function completePasswordReset({ email, otp, newPassword }) {
  await verifyOtp({ email, purpose: 'reset', otp });

  const user = await User.findOne({ email, isActive: true });
  if (!user) throw HttpError.badRequest('Account no longer available');

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.forcePasswordChange = false;
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  void sendMail({
    to: email,
    subject: 'Your Environ password was changed',
    html: passwordChangedTemplate({ name: user.name, when: new Date().toUTCString() }),
  });

  // Return the Mongoose doc directly — NOT .toObject(). The global
  // toObject/toJSON transform deletes `_id` (replaces it with `id`),
  // which would silently break the controller's mintCookies() call
  // (it reads user._id to sign the JWT subject).
  return user;
}
