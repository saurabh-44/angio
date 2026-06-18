import {
  createSponsorOrderSchema,
  verifyPaymentSchema,
} from '../validation/paymentSchemas.js';
import {
  createSponsorOrder,
  getSponsorOrder,
  listSponsorOrders,
  sponsorshipInfo,
  verifySponsorPayment,
} from '../services/payments/paymentService.js';

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

export async function getOrders(req, res) {
  const result = await listSponsorOrders({ actor: req.auth });
  res.json(result);
}

export async function getOrderById(req, res) {
  const order = await getSponsorOrder({ id: req.params.id, actor: req.auth });
  res.json({ order });
}
