import { Schema, model } from 'mongoose';
import { softDeletePlugin } from './plugins/softDelete.js';
import { jsonTransformPlugin } from './plugins/jsonTransform.js';

export const ASSIGNMENT_KINDS = ['planting', 'maintenance'];

const assignmentSchema = new Schema(
  {
    volunteer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    site: { type: Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    kind: { type: String, enum: ASSIGNMENT_KINDS, required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startsAt: { type: Date, required: true, default: () => new Date() },
    endsAt: { type: Date },
    note: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true, collection: 'assignments' },
);

assignmentSchema.index({ volunteer: 1, kind: 1, startsAt: -1 });
assignmentSchema.index({ site: 1, kind: 1, startsAt: -1 });

assignmentSchema.plugin(jsonTransformPlugin);
assignmentSchema.plugin(softDeletePlugin);

export const Assignment = model('Assignment', assignmentSchema);
