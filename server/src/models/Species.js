import { Schema, model } from 'mongoose';
import { softDeletePlugin } from './plugins/softDelete.js';
import { jsonTransformPlugin } from './plugins/jsonTransform.js';

// Reference table for tree species, used to (a) drive a dropdown in the
// volunteer planting form, and (b) feed an accurate per-species CO₂
// rate into the certificate generator. Free-text `Plant.species` stays
// as a fallback for back-compat.
const speciesSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    scientificName: { type: String, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    // kg of CO₂ a mature tree of this species sequesters annually.
    // Optional — the CO₂ service falls back to a conservative flat
    // rate when this is unset.
    co2PerYearKg: { type: Number, min: 0, max: 1000 },
    maxHeightCm: { type: Number, min: 0, max: 10000 },
    maxDbhCm: { type: Number, min: 0, max: 1000 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'species' },
);

// Unique among live rows — a soft-deleted species shouldn't block
// adding a same-named one later.
speciesSchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

speciesSchema.plugin(jsonTransformPlugin);
speciesSchema.plugin(softDeletePlugin);

export const Species = model('Species', speciesSchema);
