import { randomBytes } from 'node:crypto';
import { Schema, model } from 'mongoose';
import { softDeletePlugin } from './plugins/softDelete.js';
import { jsonTransformPlugin } from './plugins/jsonTransform.js';

export const PLANT_STATUSES = ['alive', 'dead', 'removed'];
export const PLANT_GROWTH_STAGES = ['seedling', 'sapling', 'young', 'mature'];

// 12-char URL-safe random code used in the public tree URL
// (e.g. /tree/abc123-def_GH). Non-guessable so we don't enumerate the
// donor → plant graph by hand. crypto.randomBytes is cryptographically
// strong; base64url avoids unsafe URL characters.
function generatePublicCode() {
  return randomBytes(9).toString('base64url').slice(0, 12);
}

export { generatePublicCode };

const geoSchema = new Schema(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false },
);

const photoSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false },
);

// Rich per-tree measurements from a bulk import of the NGO's existing
// (pre-app) plantation records — data the live field forms don't capture.
// Present only on plants with origin === 'historical'.
const historicalSchema = new Schema(
  {
    // The tree's ID in the source spreadsheet — makes re-imports
    // idempotent and traces a row back to its origin.
    sourceRowId: { type: Number },
    // Free-text label for the import run (e.g. the file name + date).
    batch: { type: String, trim: true, maxlength: 120 },
    // Survival rate from the field survey ("Yes"/"No" in the sheet).
    survival: { type: Boolean },
    // Qualitative health at survey time (Good / Fair / Poor).
    healthScore: { type: String, trim: true, maxlength: 40 },
    // Root-collar circumference (m) and diameter (cm).
    trunkCircumferenceM: { type: Number, min: 0 },
    rcdCm: { type: Number, min: 0 },
    // Average canopy diameter (m).
    canopyDiameterM: { type: Number, min: 0 },
    // Carbon figures exactly as calculated in the source sheet (tonnes).
    agbTon: { type: Number, min: 0 },
    bgbTon: { type: Number, min: 0 },
    totalBiomassTon: { type: Number, min: 0 },
    carbonTon: { type: Number, min: 0 },
    co2Ton: { type: Number, min: 0 },
  },
  { _id: false },
);

const plantSchema = new Schema(
  {
    // 12-char public code embedded in the tree's QR. Non-enumerable so
    // anyone scanning a sticker can only see THIS tree, not browse the
    // collection. Auto-generated on create; never user-supplied.
    publicCode: {
      type: String,
      default: generatePublicCode,
      required: true,
      unique: true,
      index: true,
    },

    site: { type: Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    // Allocation + donor are OPTIONAL at the model level so historical
    // (pre-app) trees with no sponsor can be imported. The live planting
    // API still requires them via createPlantSchema (zod), so every
    // app-recorded plant continues to carry both. Donor-scoped reads
    // simply never match an unsponsored tree.
    allocation: { type: Schema.Types.ObjectId, ref: 'Allocation', index: true },
    // Denormalised for fast donor-scoped reads.
    donor: { type: Schema.Types.ObjectId, ref: 'User', index: true },

    // Human-friendly name for the tree. Optional on input — the pre-save
    // hook below fills a sensible default (the species name, else
    // "Tree <publicCode>") when nobody types one. Fully editable later.
    name: { type: String, trim: true, maxlength: 120 },

    // Free-text species name. Retained for back-compat with plants
    // recorded before the Species master data existed AND for
    // volunteers who type a custom name when their tree isn't in the
    // dropdown yet. The denormalised string also makes donor exports
    // self-contained — no join needed.
    species: { type: String, trim: true, maxlength: 120 },
    // Optional reference to the Species master row when the volunteer
    // picked from the dropdown. Used by the CO₂ service to look up a
    // per-species annual rate.
    speciesRef: { type: Schema.Types.ObjectId, ref: 'Species', index: true },

    // ── Growth attributes (the spec's Plant Growth / Height / Biomass) ──
    // All optional. Current height in cm — the headline value on the
    // plant itself (volunteers also log per-week heights on
    // MaintenanceLog). Coarse growth stage and estimated dry biomass (kg)
    // support carbon math and reporting. Age is NOT stored — it's derived
    // from plantedAt (see the `ageDays` virtual below).
    heightCm: { type: Number, min: 0, max: 5000 },
    growthStage: { type: String, enum: PLANT_GROWTH_STAGES },
    dryBiomassKg: { type: Number, min: 0, max: 100000 },

    plantedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plantedAt: { type: Date, required: true, default: () => new Date() },

    // GPS where the tree was planted. The live planting API requires it
    // (createPlantSchema) — every app-recorded tree is geo-tagged for
    // donor verification. Optional at the model level only so historical
    // imports of trees whose location was never surveyed can still be saved.
    geo: { type: geoSchema },

    // First-day photo. Cloudinary publicId so we can render at any size.
    // Required by the live planting API; optional at the model level so
    // historical trees (which predate the app) can be imported without one.
    plantingPhoto: { type: photoSchema },

    // Provenance. 'field' = recorded live through the app (the default, so
    // every existing plant reads as 'field'); 'historical' = bulk-imported
    // from the NGO's pre-app records (may lack a sponsor, allocation,
    // photo, or GPS). See historicalSchema for the extra survey fields.
    origin: { type: String, enum: ['field', 'historical'], default: 'field', index: true },
    historical: { type: historicalSchema, default: undefined },

    status: { type: String, enum: PLANT_STATUSES, default: 'alive', index: true },
    notes: { type: String, trim: true, maxlength: 2000 },

    // QR scan tracking. The public verification page bumps `scanCount`
    // and sets `lastScannedAt` on every hit. We surface these in the
    // donor's detail panel as a "your tree was viewed N times" signal.
    scanCount: { type: Number, default: 0 },
    lastScannedAt: { type: Date },
  },
  { timestamps: true, collection: 'plants' },
);

plantSchema.index({ site: 1, status: 1 });
plantSchema.index({ donor: 1, status: 1 });

// Age of the plant in whole days since planting. Derived, never stored.
// Surfaces via toObject()/toJSON() (the transform enables virtuals) — so
// a freshly-created plant carries it. Note `.lean()` reads skip virtuals,
// so the list/detail endpoints compute age on the client from plantedAt.
plantSchema.virtual('ageDays').get(function () {
  if (!this.plantedAt) return null;
  const ms = Date.now() - new Date(this.plantedAt).getTime();
  return ms > 0 ? Math.floor(ms / 86400000) : 0;
});

// Give every tree a name. Runs after defaults (so publicCode is set) —
// prefers the species name, falling back to "Tree <publicCode>".
plantSchema.pre('save', function defaultName() {
  if (!this.name || !this.name.trim()) {
    this.name = (this.species && this.species.trim()) || `Tree ${this.publicCode}`;
  }
});

plantSchema.plugin(jsonTransformPlugin);
plantSchema.plugin(softDeletePlugin);

export const Plant = model('Plant', plantSchema);
