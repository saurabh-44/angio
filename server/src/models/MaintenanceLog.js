import { Schema, model } from 'mongoose';
import { softDeletePlugin } from './plugins/softDelete.js';
import { jsonTransformPlugin } from './plugins/jsonTransform.js';

export const HEALTH_STATUSES = ['healthy', 'stressed', 'diseased', 'dying'];

const photoSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false },
);

// Where the volunteer physically stood when logging this watering.
// Captured from the device's live GPS (never typed by hand). Optional at
// the model level so older logs and non-field callers stay valid; the
// field app requires it before a watering can be submitted.
const geoSchema = new Schema(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false },
);

const maintenanceLogSchema = new Schema(
  {
    plant: { type: Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
    // Denormalised for fast scope reads.
    site: { type: Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    // Copied from the plant's donor. Optional because an unsponsored
    // (e.g. bulk-imported historical) tree can still be watered before it
    // is linked to a sponsor — its logs then carry no donor, and simply
    // never surface in a donor-scoped read. App-recorded plants always
    // have a donor, so their logs always carry one.
    donor: { type: Schema.Types.ObjectId, ref: 'User', index: true },

    volunteer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Snapped-to-Monday date of the week this log covers. Two logs in
    // the same week for the same plant collapse to the latest.
    weekOf: { type: Date, required: true },

    photo: { type: photoSchema, required: true },
    // Live GPS location captured at the time of the watering check.
    geo: { type: geoSchema },
    note: { type: String, trim: true, maxlength: 1000 },

    // ── Monitoring extensions ────────────────────────────────────
    // All optional. Volunteers may or may not carry measuring tape;
    // the absence of a value just means "wasn't measured this week"
    // (vs. zero, which would be a real reading).
    //
    // heightCm: tree height in centimetres (allows decimals, but we
    //   coerce to integer cm on input). Up to 50 m for very rare
    //   mature trees.
    heightCm: { type: Number, min: 0, max: 5000 },
    // dbhCm: diameter at breast height, ~1.3 m above ground. Standard
    //   forestry measurement. Up to 500 cm for absurdly large trunks.
    dbhCm: { type: Number, min: 0, max: 500 },
    // healthStatus: overall vibe at the moment of inspection. Not the
    //   same as Plant.status — a plant can be `alive` but `stressed`.
    healthStatus: { type: String, enum: HEALTH_STATUSES },
    // diseaseNotes: free text used when healthStatus is diseased/dying
    //   so the site owner or NGO admin has context to act on.
    diseaseNotes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true, collection: 'maintenanceLogs' },
);

maintenanceLogSchema.index({ plant: 1, weekOf: -1 });
maintenanceLogSchema.index({ site: 1, weekOf: -1 });
maintenanceLogSchema.index({ donor: 1, weekOf: -1 });

maintenanceLogSchema.plugin(jsonTransformPlugin);
maintenanceLogSchema.plugin(softDeletePlugin);

export const MaintenanceLog = model('MaintenanceLog', maintenanceLogSchema);
