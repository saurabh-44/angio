import { randomInt } from 'node:crypto';
import { OtpRequest } from '../../models/OtpRequest.js';
import { User } from '../../models/User.js';
import { sendMail } from '../../config/mail.js';
import { loginOtpTemplate } from '../../mail/templates/loginOtp.js';
import { passwordResetOtpTemplate } from '../../mail/templates/passwordResetOtp.js';
import { HttpError } from '../../utils/httpError.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const SEND_WINDOW_MS = 15 * 60 * 1000;
const SEND_WINDOW_MAX = 3;

function generateOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export async function sendOtp({ email, purpose }) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - SEND_WINDOW_MS);

  const existing = await OtpRequest.findOne({ email, purpose });
  const sameWindow = existing && existing.firstSentAt > windowStart;

  if (sameWindow && existing.sendCount >= SEND_WINDOW_MAX) {
    throw HttpError.tooMany(
      'Too many code requests. Please wait a few minutes and try again.',
    );
  }

  const otp = generateOtp();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

  // Dev convenience: always print the code to the server console so you
  // can sign in with any (even fake) email — no real inbox or SMTP needed.
  // Guarded by NODE_ENV so production logs never leak live OTPs.
  if (!env.isProd) {
    logger.warn(
      { email, purpose, otp },
      `========== DEV OTP  ${otp}  →  ${email} [${purpose}] ==========`,
    );
  }

  if (existing) {
    existing.otp = otp;
    existing.attempts = 0;
    existing.expiresAt = expiresAt;
    if (sameWindow) {
      existing.sendCount += 1;
    } else {
      existing.firstSentAt = now;
      existing.sendCount = 1;
    }
    await existing.save();
  } else {
    await OtpRequest.create({
      email,
      purpose,
      otp,
      attempts: 0,
      expiresAt,
      firstSentAt: now,
      sendCount: 1,
    });
  }

  const user = await User.findOne({ email }).select('name').lean();
  const recipientName = user?.name;

  const subject =
    purpose === 'login' ? 'Your Environ sign-in code' : 'Reset your Environ password';
  const html =
    purpose === 'login'
      ? loginOtpTemplate({ otp, name: recipientName })
      : passwordResetOtpTemplate({ otp, name: recipientName });

  void sendMail({ to: email, subject, html });
}

export async function verifyOtp({ email, purpose, otp }) {
  const record = await OtpRequest.findOne({ email, purpose })
    .sort({ createdAt: -1 })
    .exec();
  if (!record) {
    throw HttpError.badRequest('No active code — please request a new one.');
  }
  if (record.expiresAt.getTime() < Date.now()) {
    await OtpRequest.deleteOne({ _id: record._id });
    throw HttpError.badRequest('Code expired — please request a new one.');
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    await OtpRequest.deleteOne({ _id: record._id });
    throw HttpError.badRequest('Too many wrong attempts — please request a new code.');
  }

  if (record.otp !== otp) {
    record.attempts += 1;
    await record.save();
    throw HttpError.badRequest('Incorrect code.');
  }

  await OtpRequest.deleteOne({ _id: record._id });
}
