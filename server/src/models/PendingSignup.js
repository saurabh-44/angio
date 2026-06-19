import { Schema, model } from 'mongoose';

// Holds a sponsor's self-registration between step 1 (register) and step 2
// (email-OTP verification). The real User is created ONLY when the OTP is
// verified — so unverified / spam signups never become accounts. A TTL
// index auto-purges abandoned signups. Internal-only: never serialized to
// the client, so no transform/soft-delete plugins.
const pendingSignupSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true },
    dob: { type: Date },
    gender: { type: String },
    passwordHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: 'pendingSignups' },
);

// Mongo deletes the doc once `expiresAt` passes.
pendingSignupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PendingSignup = model('PendingSignup', pendingSignupSchema);
