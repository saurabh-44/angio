import { Schema, model } from 'mongoose';
import { jsonTransformPlugin } from './plugins/jsonTransform.js';

export const EVENT_STATUSES = ['active', 'cancelled'];
export const EVENT_AUDIENCES = ['all', 'site'];
export const EVENT_RESPONSES = ['accepted', 'rejected'];

// A volunteering event at a site (a planting drive, a clean-up). An NGO
// admin or the site's in-charge posts it; everyone invited gets an email
// and an in-app request, and volunteers accept or reject it once — a
// response is final. Past events stay in the DB but drop off every list
// once their date is over.
const responseSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    response: { type: String, enum: EVENT_RESPONSES, required: true },
    respondedAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false },
);

const eventSchema = new Schema(
  {
    site: { type: Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    // Calendar day of the event (stored at UTC midnight) + local "HH:mm".
    date: { type: Date, required: true, index: true },
    time: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    note: { type: String, trim: true, maxlength: 1000 },
    volunteersNeeded: { type: Number, min: 1, max: 10000, default: 10 },
    // Who was invited: 'all' = every active volunteer / site in-charge /
    // admin; 'site' = only people linked to this site. `invitees` is the
    // resolved list (after exclusions) — it decides who sees the request.
    audience: { type: String, enum: EVENT_AUDIENCES, default: 'all' },
    invitees: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    responses: { type: [responseSchema], default: [] },
    status: { type: String, enum: EVENT_STATUSES, default: 'active', index: true },
    cancelledAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'events' },
);

eventSchema.plugin(jsonTransformPlugin);

export const Event = model('Event', eventSchema);
