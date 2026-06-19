import { Donation } from '../../models/Donation.js';
import { User } from '../../models/User.js';
import { Site } from '../../models/Site.js';
import { Allocation } from '../../models/Allocation.js';
import { Plant } from '../../models/Plant.js';
import { env } from '../../config/env.js';
import { isRazorpayConfigured, razorpay, verifyPaymentSignature } from '../../config/razorpay.js';
import { HttpError } from '../../utils/httpError.js';
import { sendMail } from '../../config/mail.js';
import { donationReceivedTemplate } from '../../mail/templates/donationReceived.js';
import { remainingCapacityForSite } from '../sites/siteService.js';
import { co2KgForPlant } from '../co2/co2Service.js';
import { logger } from '../../utils/logger.js';

// Step 1 of the sponsor flow. Creates a pending Donation row + a
// Razorpay order, returns the order details the browser needs to open
// the checkout modal.
//
// Why we persist the donation here (before payment): so the order ID is
// reliably tied to a row we can find later in the webhook/verify step,
// and so an abandoned checkout still leaves a 'pending' record the NGO
// admin can audit.
export async function createSponsorOrder({ treeCount, site, donationDate, note, address, saveAddress, actor }) {
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

  // Resolve the per-tree price: the chosen site's price if set, else the
  // global default. Site is optional — a sponsor can fund the pool and let
  // the admin place the trees. When a site IS chosen, reject orders that
  // overflow its remaining capacity.
  let unitPrice = env.TREE_UNIT_PRICE_INR;
  let intendedSite;
  if (site) {
    const siteDoc = await Site.findById(site).select('pricePerTreeInr').lean();
    if (!siteDoc) throw HttpError.badRequest('Selected site not found');
    if (typeof siteDoc.pricePerTreeInr === 'number' && siteDoc.pricePerTreeInr > 0) {
      unitPrice = siteDoc.pricePerTreeInr;
    }
    const remaining = await remainingCapacityForSite(site);
    if (remaining !== null && remaining !== Infinity && treeCount > remaining) {
      throw HttpError.badRequest(`This site only has room for ${remaining} more tree(s)`);
    }
    intendedSite = site;
  }

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
    donationDate: donationDate ?? new Date(),
    method: 'online',
    status: 'pending',
    razorpay: { orderId: order.id },
    treeCount,
    intendedSite,
    billingAddress: address,
    note: note?.trim() || undefined,
    recordedBy: actor.userId, // sponsor records their own self-service donation
  });

  // Persist the address to the sponsor's profile if they opted to save it.
  const addressHasContent =
    address && Object.values(address).some((v) => typeof v === 'string' && v.trim());
  if (saveAddress && addressHasContent) {
    await User.updateOne({ _id: actor.userId }, { $set: { address } });
  }

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

  // Self-service order with a chosen site → reserve the trees against that
  // site now (create the Allocation) so volunteers can plant. Idempotent.
  // Non-fatal: payment already succeeded, so a hiccup here just leaves the
  // donation unallocated for the admin to place — never error the verify.
  if (donation.intendedSite) {
    try {
      const existing = await Allocation.findOne({ donation: donation._id })
        .select('_id')
        .lean();
      if (!existing) {
        await Allocation.create({
          donation: donation._id,
          donor: donation.donor,
          site: donation.intendedSite,
          targetPlants: donation.treeCount,
          allocatedAmount: donation.amount,
          createdBy: donation.donor,
          note: 'Self-service sponsor order',
        });
      }
    } catch (err) {
      logger.error({ err, donation: String(donation._id) }, 'auto-allocation failed (non-fatal)');
    }
  }

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

// ───────────────────────── Orders (status views) ─────────────────────────

export const ORDER_STATUSES = [
  'pending', // payment not completed
  'processing', // paid, awaiting site placement (no allocation yet)
  'yet_to_plant', // allocated to a site, nothing planted yet
  'in_progress', // some trees planted
  'planted', // target met
  'failed',
  'refunded',
];

function deriveOrderStatus({ paymentStatus, hasAllocation, planted, target }) {
  if (paymentStatus !== 'paid') return paymentStatus; // pending / failed / refunded
  if (!hasAllocation) return 'processing';
  if (planted <= 0) return 'yet_to_plant';
  if (planted < target) return 'in_progress';
  return 'planted';
}

// Turns one Donation into a sponsor-facing "order" — joins its
// allocation(s) + plants to derive a status and CO₂ figure.
async function decorateOrder(donation) {
  const allocations = await Allocation.find({ donation: donation._id })
    .populate('site', 'name address geo')
    .lean();
  const target =
    allocations.reduce((s, a) => s + (a.targetPlants ?? 0), 0) || donation.treeCount || 0;

  let planted = 0;
  let co2Kg = 0;
  if (allocations.length) {
    const plants = await Plant.find({ allocation: { $in: allocations.map((a) => a._id) } })
      .select('plantedAt status speciesRef')
      .populate('speciesRef', 'co2PerYearKg')
      .lean();
    planted = plants.length;
    for (const p of plants) co2Kg += co2KgForPlant(p);
  }

  const firstSite = allocations[0]?.site;
  return {
    id: String(donation._id),
    date: donation.donationDate ?? donation.paidAt ?? donation.createdAt,
    treeCount: donation.treeCount ?? target,
    amount: donation.amount,
    currency: donation.currency ?? 'INR',
    paymentStatus: donation.status,
    method: donation.method,
    status: deriveOrderStatus({
      paymentStatus: donation.status,
      hasAllocation: allocations.length > 0,
      planted,
      target,
    }),
    planted,
    target,
    co2Kg: Math.round(co2Kg * 10) / 10,
    site: firstSite
      ? { id: String(firstSite._id ?? firstSite), name: firstSite.name ?? null }
      : null,
    createdAt: donation.createdAt,
  };
}

export async function listSponsorOrders({ actor }) {
  if (actor.role !== 'sponsor') {
    throw HttpError.forbidden('Only sponsors can view their orders');
  }
  const donations = await Donation.find({ donor: actor.userId }).sort({ createdAt: -1 }).lean();
  const items = await Promise.all(donations.map((d) => decorateOrder(d)));
  return { items };
}

export async function getSponsorOrder({ id, actor }) {
  if (actor.role !== 'sponsor') {
    throw HttpError.forbidden('Only sponsors can view their orders');
  }
  const donation = await Donation.findOne({ _id: id, donor: actor.userId }).lean();
  if (!donation) throw HttpError.notFound('Order not found');
  return decorateOrder(donation);
}

// Sponsor's "what's it cost?" + "is online payment available?" view used
// on the sponsor page. Cheap, no auth needed beyond sponsor.
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
