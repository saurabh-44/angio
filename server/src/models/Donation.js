import { Schema, model } from 'mongoose';
import { softDeletePlugin } from './plugins/softDelete.js';
import { jsonTransformPlugin } from './plugins/jsonTransform.js';

export const PAYMENT_METHODS = ['cash', 'upi', 'bank_transfer', 'cheque', 'online', 'other'];
export const DONATION_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

// Razorpay-specific fields live on the same document so the donation row
// is the canonical record — payment IDs go here for audit, no separate
// transactions collection needed for our scale.
const razorpaySchema = new Schema(
  {
    orderId: { type: String, index: true },
    paymentId: { type: String, index: true },
    signature: { type: String },
  },
  { _id: false },
);

const donationSchema = new Schema(
  {
    donor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', maxlength: 8 },
    paidAt: { type: Date, required: true, default: () => new Date() },
    method: { type: String, enum: PAYMENT_METHODS, default: 'other' },
    // Defaults to 'paid' for offline NGO-admin records (the money was
    // already received). Razorpay orders start 'pending' and move to
    // 'paid' after signature verification.
    status: { type: String, enum: DONATION_STATUSES, default: 'paid', index: true },
    razorpay: { type: razorpaySchema, default: undefined },
    // Donor-side intent at the time of payment. NGO admin allocates
    // these target trees across sites once payment is verified.
    treeCount: { type: Number, min: 0 },
    // Self-service order intent. `intendedSite` is the site the sponsor
    // chose to fund — on payment-verify we auto-create the Allocation to
    // it. Null for admin-recorded donations (allocated manually later).
    // `donationDate` is the sponsor-set date (defaults to "now").
    intendedSite: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    donationDate: { type: Date },
    note: { type: String, trim: true, maxlength: 1000 },
    // recordedBy is the NGO admin for offline donations, OR the donor
    // themselves for self-service Razorpay donations.
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'donations' },
);

donationSchema.index({ donor: 1, paidAt: -1 });
donationSchema.index({ status: 1, createdAt: -1 });

donationSchema.plugin(jsonTransformPlugin);
donationSchema.plugin(softDeletePlugin);

export const Donation = model('Donation', donationSchema);
