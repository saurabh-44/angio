import { Schema, model } from 'mongoose';
import { softDeletePlugin } from './plugins/softDelete.js';
import { jsonTransformPlugin } from './plugins/jsonTransform.js';

const photoSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false },
);

const maintenanceLogSchema = new Schema(
  {
    plant: { type: Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
    // Denormalised for fast scope reads.
    site: { type: Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    donor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    volunteer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Snapped-to-Monday date of the week this log covers. Two logs in
    // the same week for the same plant collapse to the latest.
    weekOf: { type: Date, required: true },

    photo: { type: photoSchema, required: true },
    note: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true, collection: 'maintenanceLogs' },
);

maintenanceLogSchema.index({ plant: 1, weekOf: -1 });
maintenanceLogSchema.index({ site: 1, weekOf: -1 });
maintenanceLogSchema.index({ donor: 1, weekOf: -1 });

maintenanceLogSchema.plugin(jsonTransformPlugin);
maintenanceLogSchema.plugin(softDeletePlugin);

export const MaintenanceLog = model('MaintenanceLog', maintenanceLogSchema);
