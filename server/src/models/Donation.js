import { Schema, model } from 'mongoose';
import { softDeletePlugin } from './plugins/softDelete.js';
import { jsonTransformPlugin } from './plugins/jsonTransform.js';

export const PAYMENT_METHODS = ['cash', 'upi', 'bank_transfer', 'cheque', 'other'];

const donationSchema = new Schema(
  {
    donor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    paidAt: { type: Date, required: true, default: () => new Date() },
    method: { type: String, enum: PAYMENT_METHODS, default: 'other' },
    note: { type: String, trim: true, maxlength: 1000 },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'donations' },
);

donationSchema.index({ donor: 1, paidAt: -1 });

donationSchema.plugin(jsonTransformPlugin);
donationSchema.plugin(softDeletePlugin);

export const Donation = model('Donation', donationSchema);
