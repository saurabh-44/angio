import bcrypt from 'bcryptjs';
import { User, OTP_LOGIN_ROLES } from '../../models/User.js';
import { HttpError } from '../../utils/httpError.js';
import { sendOtp, verifyOtp } from './otpService.js';
import { assertNotLocked, recordFailedLogin, resetLoginAttempts } from './loginLockout.js';
import { sendMail } from '../../config/mail.js';
import { passwordChangedTemplate } from '../../mail/templates/passwordChanged.js';
import { logger } from '../../utils/logger.js';

const BCRYPT_ROUNDS = 12;

// Step 1 of login. Verifies password, then either issues an OTP (for
// ngo_admin / site_owner) or signals the caller to mint cookies straight
// away (donor / volunteer — password-only with lockout).
export async function startLogin({ email, password }) {
  const user = await User.findOne({ email, isActive: true })
    .select('+passwordHash +failedLoginCount +lockedUntil')
    .lean();
  if (!user) throw HttpError.unauthorized('Invalid email or password');

  assertNotLocked(user);
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    await recordFailedLogin(User, user._id);
    throw HttpError.unauthorized('Invalid email or password');
  }
  await resetLoginAttempts(User, user._id);

  if (OTP_LOGIN_ROLES.has(user.role)) {
    await sendOtp({ email, purpose: 'login' });
    return { requiresOtp: true };
  }

  // Password-only role — caller will mint cookies for this user directly.
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  return { requiresOtp: false, user };
}

// Public sponsor self-registration. Creates a 'sponsor' account the
// visitor can immediately log into (which then runs the normal email-OTP
// step). Role is hard-coded here — the client can never request another
// role. `name` is auto-composed from first/last by the User pre-save hook.
export async function registerSponsor({ firstName, lastName, email, phone, password, dob, gender }) {
  const existing = await User.findOne({ email }).select('_id').lean();
  if (existing) throw HttpError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await User.create({
    firstName,
    lastName,
    email,
    phone,
    dob,
    gender,
    role: 'sponsor',
    passwordHash,
    isActive: true,
    forcePasswordChange: false,
  });
}

// Step 2 — used only for roles that went through OTP in step 1.
export async function completeLoginWithOtp({ email, otp }) {
  await verifyOtp({ email, purpose: 'login', otp });

  const user = await User.findOne({ email, isActive: true }).lean();
  if (!user) throw HttpError.unauthorized('Account not found');

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
    subject: 'Your NGO Trees password was changed',
    html: passwordChangedTemplate({ name: user.name, when: new Date().toUTCString() }),
  });

  // Return the Mongoose doc directly — NOT .toObject(). The global
  // toObject/toJSON transform deletes `_id` (replaces it with `id`),
  // which would silently break the controller's mintCookies() call
  // (it reads user._id to sign the JWT subject).
  return user;
}
