import { Schema, model } from 'mongoose';
import { softDeletePlugin } from './plugins/softDelete.js';
import { jsonTransformPlugin } from './plugins/jsonTransform.js';

export const PROJECT_STATUSES = ['active', 'completed', 'archived'];

// A Project groups allocations (and therefore their plants) under a
// shared campaign — e.g. "Monsoon 2026", "TCS Sponsorship", "School
// Outreach". Donors don't see projects directly; they're a reporting
// affordance for the NGO admin to slice impact by initiative.
const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 5000 },
    status: { type: String, enum: PROJECT_STATUSES, default: 'active', index: true },
    startsAt: { type: Date },
    endsAt: { type: Date },
    targetTrees: { type: Number, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'projects' },
);

projectSchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

projectSchema.plugin(jsonTransformPlugin);
projectSchema.plugin(softDeletePlugin);

export const Project = model('Project', projectSchema);
