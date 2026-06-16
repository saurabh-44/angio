import { Schema, model } from 'mongoose';
import { softDeletePlugin } from './plugins/softDelete.js';
import { jsonTransformPlugin } from './plugins/jsonTransform.js';

export const ROLES = ['ngo_admin', 'donor', 'site_owner', 'volunteer'];

// Every role completes an emailed OTP after entering their password —
// donors and volunteers included. Trust matters more than friction here,
// and email auth doubles as the verification trail for new accounts.
export const OTP_LOGIN_ROLES = new Set(['ngo_admin', 'site_owner', 'donor', 'volunteer']);

const userSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 32 },
    role: { type: String, enum: ROLES, required: true, index: true },

    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    failedLoginCount: { type: Number, default: 0 },
    lockedUntil: { type: Date },

    // True for accounts created by NGO admin via the temp-password flow.
    // While set, requireAuth allows only password-change / me / logout.
    forcePasswordChange: { type: Boolean, default: false },

    // Bump to invalidate every outstanding session at once (password
    // change, deactivation, soft delete). requireAuth rejects any token
    // whose embedded `tv` doesn't match this.
    tokenVersion: { type: Number, default: 0 },

    // Only the seeded primary NGO admin gets this; reserved for ops actions
    // that should be limited to one root operator (e.g. removing other
    // ngo_admin accounts).
    isPrimary: { type: Boolean, default: false, index: true },

    // The NGO admin who created this account (null for the seeded primary).
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'users' },
);

// Email is unique among live users only — a soft-deleted record never
// blocks re-adding the same email later.
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

userSchema.plugin(jsonTransformPlugin);
userSchema.plugin(softDeletePlugin);

export const User = model('User', userSchema);
