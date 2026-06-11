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

const siteSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    address: { type: String, trim: true, maxlength: 500 },
    geo: { type: geoSchema, required: true },
    capacity: { type: Number, min: 0, default: 0 },
    notes: { type: String, trim: true, maxlength: 2000 },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'sites' },
);

siteSchema.index({ name: 1 });

siteSchema.plugin(jsonTransformPlugin);
siteSchema.plugin(softDeletePlugin);

export const Site = model('Site', siteSchema);
