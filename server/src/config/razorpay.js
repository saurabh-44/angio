import Razorpay from 'razorpay';
import crypto from 'node:crypto';
import { env } from './env.js';
import { HttpError } from '../utils/httpError.js';

let instance = null;

// Lazy — Razorpay isn't imported eagerly so the server still boots fine
// without keys (offline donation recording keeps working). Online-only
// endpoints call this and get a clear 503 if keys aren't configured.
export function razorpay() {
  if (instance) return instance;
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new HttpError(
      503,
      'RAZORPAY_NOT_CONFIGURED',
      'Online payments are not configured on the server. Ask the NGO admin to add Razorpay keys.',
    );
  }
  instance = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
  return instance;
}

// HMAC-SHA256 signature verification per Razorpay's recommended flow.
// The signature posted back by checkout is computed as:
//   HMAC_SHA256(orderId + "|" + paymentId, key_secret)
// We re-compute and compare in constant time.
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!env.RAZORPAY_KEY_SECRET) {
    throw HttpError.server('Razorpay secret missing on server');
  }
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  // crypto.timingSafeEqual throws if lengths differ — guard first.
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Public flag the API can return so the donor UI knows whether the
// "Sponsor a tree" button is wired up.
export function isRazorpayConfigured() {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

// Verifies a Razorpay webhook: HMAC-SHA256(rawBody, webhookSecret) must
// equal the X-Razorpay-Signature header. rawBody is the unparsed request
// buffer (parsing then re-stringifying would change the bytes).
export function verifyWebhookSignature(rawBody, signature) {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !rawBody || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
