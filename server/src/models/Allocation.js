import { Schema, model } from 'mongoose';
import { softDeletePlugin } from './plugins/softDelete.js';
import { jsonTransformPlugin } from './plugins/jsonTransform.js';

const allocationSchema = new Schema(
  {
    donation: { type: Schema.Types.ObjectId, ref: 'Donation', required: true, index: true },
    // Cached for fast donor-scoped reads without joining through Donation.
    donor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    site: { type: Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    targetPlants: { type: Number, required: true, min: 1 },
    allocatedAmount: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true, maxlength: 1000 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'allocations' },
);

allocationSchema.index({ donation: 1, site: 1 });
allocationSchema.index({ site: 1, donor: 1 });

allocationSchema.plugin(jsonTransformPlugin);
allocationSchema.plugin(softDeletePlugin);

export const Allocation = model('Allocation', allocationSchema);
