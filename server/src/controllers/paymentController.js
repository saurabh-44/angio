import {
  createSponsorOrderSchema,
  verifyPaymentSchema,
} from '../validation/paymentSchemas.js';
import {
  createSponsorOrder,
  getSponsorOrder,
  handleRazorpayWebhook,
  listSponsorOrders,
  sponsorshipInfo,
  verifySponsorPayment,
} from '../services/payments/paymentService.js';
import { verifyWebhookSignature } from '../config/razorpay.js';

export async function getSponsorshipInfo(req, res) {
  const result = sponsorshipInfo({ actor: req.auth });
  res.json(result);
}

export async function postSponsorOrder(req, res) {
  const input = createSponsorOrderSchema.parse(req.body);
  const result = await createSponsorOrder({ ...input, actor: req.auth });
  res.status(201).json(result);
}

export async function postVerifyPayment(req, res) {
  const input = verifyPaymentSchema.parse(req.body);
  const donation = await verifySponsorPayment({
    orderId: input.razorpay_order_id,
    paymentId: input.razorpay_payment_id,
    signature: input.razorpay_signature,
    actor: req.auth,
  });
  res.json({ ok: true, donation });
}

// Razorpay webhook. Verify the HMAC signature against the RAW body, then
// hand the parsed event to the service. Always 200 on a valid signature so
// Razorpay doesn't retry-storm us; 400 only for a bad/absent signature.
export async function postWebhook(req, res) {
  const signature = req.headers['x-razorpay-signature'];
  if (!verifyWebhookSignature(req.rawBody, signature)) {
    res.status(400).json({ ok: false });
    return;
  }
  await handleRazorpayWebhook(req.body);
  res.json({ ok: true });
}

export async function getOrders(req, res) {
  const result = await listSponsorOrders({ actor: req.auth });
  res.json(result);
}

export async function getOrderById(req, res) {
  const order = await getSponsorOrder({ id: req.params.id, actor: req.auth });
  res.json({ order });
}
