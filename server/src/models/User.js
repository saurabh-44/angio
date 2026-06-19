import { Schema, model } from 'mongoose';
import { softDeletePlugin } from './plugins/softDelete.js';
import { jsonTransformPlugin } from './plugins/jsonTransform.js';

export const ROLES = ['ngo_admin', 'sponsor', 'site_owner', 'volunteer'];

// Every role completes an emailed OTP after entering their password —
// sponsors and volunteers included. Trust matters more than friction here,
// and email auth doubles as the verification trail for new accounts.
export const OTP_LOGIN_ROLES = new Set(['ngo_admin', 'site_owner', 'sponsor', 'volunteer']);

export const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'];

// Reusable postal address shape (billing/shipping).
const addressSchema = new Schema(
  {
    line1: { type: String, trim: true, maxlength: 200 },
    line2: { type: String, trim: true, maxlength: 200 },
    city: { type: String, trim: true, maxlength: 120 },
    state: { type: String, trim: true, maxlength: 120 },
    pinCode: { type: String, trim: true, maxlength: 16 },
    country: { type: String, trim: true, maxlength: 120 },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    // Denormalised display name. Kept in sync from firstName + lastName by
    // the pre-save hook below when those are set, so every existing
    // populate('...','name') read keeps working unchanged.
    name: { type: String, required: true, trim: true, maxlength: 120 },
    // Split name parts (the spec's First / Last Name).
    firstName: { type: String, trim: true, maxlength: 60 },
    lastName: { type: String, trim: true, maxlength: 60 },
    // Date of birth + gender — captured for every account per the spec.
    dob: { type: Date },
    gender: { type: String, enum: GENDERS },
    // Saved billing address — set when a sponsor opts to "save for next
    // time" during the order flow. Optional.
    address: { type: addressSchema },
    phone: { type: String, trim: true, maxlength: 32 },
    role: { type: String, enum: ROLES, required: true, index: true },

    // Sites a volunteer indicated a preference for when the account was
    // set up. Informational — actual fieldwork is driven by Assignment.
    preferredSites: [{ type: Schema.Types.ObjectId, ref: 'Site' }],

    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    // Last authenticated activity on any endpoint (throttled write in
    // requireAuth). Distinct from lastLoginAt, which is set only at sign-in.
    lastActiveAt: { type: Date },
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

// Phone is unique among live users that actually have one. The partial
// filter lets multiple (admin-created) users omit a phone, and lets a
// number be re-used after the holder is soft-deleted.
userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string' }, isDeleted: false } },
);

// Keep the denormalised `name` in sync with the split parts. Runs on
// `validate` (NOT `save`) so the composed `name` exists before the
// required-field check — registration sends only firstName/lastName.
// Only fires when first/last are present, so direct `name`-only creates
// (seed users, Excel import) keep working untouched.
userSchema.pre('validate', function syncName() {
  if (this.isModified('firstName') || this.isModified('lastName')) {
    const composed = [this.firstName, this.lastName].filter(Boolean).join(' ').trim();
    if (composed) this.name = composed;
  }
});

userSchema.plugin(jsonTransformPlugin);
userSchema.plugin(softDeletePlugin);

export const User = model('User', userSchema);
