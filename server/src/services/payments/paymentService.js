import { Donation } from '../../models/Donation.js';
import { User } from '../../models/User.js';
import { env } from '../../config/env.js';
import { isRazorpayConfigured, razorpay, verifyPaymentSignature } from '../../config/razorpay.js';
import { HttpError } from '../../utils/httpError.js';
import { sendMail } from '../../config/mail.js';
import { donationReceivedTemplate } from '../../mail/templates/donationReceived.js';
import { logger } from '../../utils/logger.js';

// Step 1 of the sponsor flow. Creates a pending Donation row + a
// Razorpay order, returns the order details the browser needs to open
// the checkout modal.
//
// Why we persist the donation here (before payment): so the order ID is
// reliably tied to a row we can find later in the webhook/verify step,
// and so an abandoned checkout still leaves a 'pending' record the NGO
// admin can audit.
export async function createSponsorOrder({ treeCount, note, actor }) {
  if (actor.role !== 'sponsor') {
    throw HttpError.forbidden('Only sponsors can sponsor trees');
  }
  if (!isRazorpayConfigured()) {
    throw new HttpError(
      503,
      'RAZORPAY_NOT_CONFIGURED',
      'Online donations are not enabled. Ask the NGO to configure Razorpay.',
    );
  }

  const unitPrice = env.TREE_UNIT_PRICE_INR;
  const amount = treeCount * unitPrice;
  if (amount <= 0) throw HttpError.badRequest('Invalid amount');

  // Receipt is a Razorpay-side reference (max 40 chars). Our future
  // webhook lookup uses the order id, not the receipt, but we still set
  // a descriptive value for dashboard scanning.
  const receipt = `donor-${String(actor.userId).slice(-8)}-${Date.now().toString(36)}`;
  let order;
  try {
    order = await razorpay().orders.create({
      amount: amount * 100, // Razorpay works in paise.
      currency: 'INR',
      receipt,
      notes: {
        donor: String(actor.userId),
        treeCount: String(treeCount),
      },
    });
  } catch (err) {
    logger.error({ err: err?.error ?? err }, 'razorpay order create failed');
    throw HttpError.server('Could not start payment. Please try again.');
  }

  const donation = await Donation.create({
    donor: actor.userId,
    amount,
    currency: 'INR',
    paidAt: new Date(),
    method: 'online',
    status: 'pending',
    razorpay: { orderId: order.id },
    treeCount,
    note: note?.trim() || undefined,
    recordedBy: actor.userId, // donor records their own self-service donation
  });

  return {
    donation: donation.toObject(),
    razorpay: {
      keyId: env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    },
    unitPrice,
  };
}

// Step 2. Razorpay's checkout returns three fields after a successful
// payment; the browser posts them to us. We re-derive the signature
// from order_id + "|" + payment_id and compare. If valid, we flip the
// matching Donation from 'pending' to 'paid' and email a receipt.
export async function verifySponsorPayment({ orderId, paymentId, signature, actor }) {
  if (actor.role !== 'sponsor') {
    throw HttpError.forbidden('Only sponsors can verify their own donations');
  }

  const ok = verifyPaymentSignature({ orderId, paymentId, signature });
  if (!ok) {
    throw HttpError.badRequest('Payment signature did not match');
  }

  const donation = await Donation.findOne({
    'razorpay.orderId': orderId,
    donor: actor.userId,
  });
  if (!donation) throw HttpError.notFound('Donation not found for that order');

  // Idempotent — replay of a verify call returns the same successful
  // result rather than double-emailing.
  if (donation.status === 'paid') return donation.toObject();

  donation.status = 'paid';
  donation.paidAt = new Date();
  donation.razorpay = {
    orderId,
    paymentId,
    signature,
  };
  await donation.save();

  // Fire-and-forget receipt email (Gmail SMTP can take 10–15s; we
  // don't want the verify response blocked on that).
  void (async () => {
    try {
      const donor = await User.findById(actor.userId).select('name email').lean();
      if (!donor) return;
      await sendMail({
        to: donor.email,
        subject: 'Thanks for sponsoring trees',
        html: donationReceivedTemplate({
          name: donor.name,
          amount: donation.amount,
          currency: donation.currency ?? 'INR',
          treeCount: donation.treeCount,
          paymentId,
        }),
      });
    } catch (err) {
      logger.warn({ err }, 'donation receipt email failed (non-fatal)');
    }
  })();

  return donation.toObject();
}

// Donor's "what's it cost?" + "is online payment available?" view used
// on the sponsor page. Cheap, no auth needed beyond donor.
export function sponsorshipInfo({ actor }) {
  if (actor.role !== 'sponsor') {
    throw HttpError.forbidden('Only sponsors can view sponsorship pricing');
  }
  return {
    unitPriceInr: env.TREE_UNIT_PRICE_INR,
    currency: 'INR',
    razorpayEnabled: isRazorpayConfigured(),
    razorpayKeyId: env.RAZORPAY_KEY_ID ?? null,
  };
}
