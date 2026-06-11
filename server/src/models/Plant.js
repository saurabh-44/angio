import { Schema, model } from 'mongoose';
import { softDeletePlugin } from './plugins/softDelete.js';
import { jsonTransformPlugin } from './plugins/jsonTransform.js';

export const PLANT_STATUSES = ['alive', 'dead', 'removed'];

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

const plantSchema = new Schema(
  {
    site: { type: Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    allocation: { type: Schema.Types.ObjectId, ref: 'Allocation', required: true, index: true },
    // Denormalised for fast donor-scoped reads.
    donor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    species: { type: String, trim: true, maxlength: 120 },

    plantedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plantedAt: { type: Date, required: true, default: () => new Date() },

    // GPS where the tree was planted. This is the data donors rely on
    // to verify the trees actually exist — it MUST be set at create time.
    geo: { type: geoSchema, required: true },

    // First-day photo. Cloudinary publicId so we can render at any size.
    plantingPhoto: { type: photoSchema, required: true },

    status: { type: String, enum: PLANT_STATUSES, default: 'alive', index: true },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true, collection: 'plants' },
);

plantSchema.index({ site: 1, status: 1 });
plantSchema.index({ donor: 1, status: 1 });

plantSchema.plugin(jsonTransformPlugin);
plantSchema.plugin(softDeletePlugin);

export const Plant = model('Plant', plantSchema);
