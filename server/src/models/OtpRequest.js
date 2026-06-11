import { Schema, model } from 'mongoose';
import { jsonTransformPlugin } from './plugins/jsonTransform.js';

const otpRequestSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    purpose: { type: String, enum: ['reset', 'login'], required: true },
    otp: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    sendCount: { type: Number, default: 1 },
    firstSentAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'otpRequests' },
);

otpRequestSchema.index({ email: 1, purpose: 1, createdAt: -1 });
otpRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

otpRequestSchema.plugin(jsonTransformPlugin);

export const OtpRequest = model('OtpRequest', otpRequestSchema);
