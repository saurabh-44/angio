import { Schema, model } from 'mongoose';
import { softDeletePlugin } from './plugins/softDelete.js';
import { jsonTransformPlugin } from './plugins/jsonTransform.js';

const geoSchema = new Schema(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false },
);

// Optional cover photo for the site (Cloudinary). publicId lets us render
// at any size / delete later.
const photoSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false },
);

const siteSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    address: { type: String, trim: true, maxlength: 500 },
    // Structured address parts (the spec's PIN / City / State / Country).
    // Optional + back-compat — older sites keep just the free-text address.
    city: { type: String, trim: true, maxlength: 120 },
    state: { type: String, trim: true, maxlength: 120 },
    country: { type: String, trim: true, maxlength: 120 },
    pinCode: { type: String, trim: true, maxlength: 16 },
    // Optional: an admin often creates a site off-location, so they may save
    // it with just the address and add precise coordinates later.
    geo: { type: geoSchema },
    photo: { type: photoSchema },
    capacity: { type: Number, min: 0, default: 0 },
    // Price per tree a sponsor pays to fund a planting at this site, in
    // INR. Admin-set; falls back to the global TREE_UNIT_PRICE_INR when
    // unset (or when a sponsor funds without choosing a site).
    pricePerTreeInr: { type: Number, min: 0 },
    notes: { type: String, trim: true, maxlength: 2000 },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // When the current owner (Site Incharge) took over this site. Set on
    // create and refreshed whenever ownership changes (see hook below).
    ownerAssignedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'sites' },
);

siteSchema.index({ name: 1 });

// Stamp ownerAssignedAt whenever ownership is set or changed. Fires on
// create (owner is "modified") and on any later owner transfer.
siteSchema.pre('save', function stampOwnerAssignment() {
  if (this.isModified('owner')) this.ownerAssignedAt = new Date();
});

siteSchema.plugin(jsonTransformPlugin);
siteSchema.plugin(softDeletePlugin);

export const Site = model('Site', siteSchema);
