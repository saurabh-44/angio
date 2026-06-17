import { Species } from '../../models/Species.js';
import { Plant } from '../../models/Plant.js';
import { HttpError } from '../../utils/httpError.js';

// Species master data is admin-controlled write, but readable by
// volunteers + site_owners + admin so the planting form can offer a
// picker. Donors don't need read access.

function canRead(actor) {
  return ['ngo_admin', 'site_owner', 'volunteer'].includes(actor.role);
}

export async function createSpecies({ input, actor }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can add species');
  }
  const doc = await Species.create({ ...input, createdBy: actor.userId });
  return doc.toObject();
}

export async function listSpecies({ q, active, page, limit, actor }) {
  if (!canRead(actor)) {
    throw HttpError.forbidden('You do not have permission to view species');
  }
  const filter = {};
  // Default for non-admins: only show active species in pickers.
  if (active !== undefined) filter.isActive = active;
  else if (actor.role !== 'ngo_admin') filter.isActive = true;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { scientificName: rx }];
  }
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Species.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Species.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function getSpecies({ id, actor }) {
  if (!canRead(actor)) {
    throw HttpError.forbidden('You do not have permission to view species');
  }
  const doc = await Species.findById(id).lean();
  if (!doc) throw HttpError.notFound('Species not found');
  return doc;
}

export async function updateSpecies({ id, patch, actor }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can update species');
  }
  const doc = await Species.findById(id);
  if (!doc) throw HttpError.notFound('Species not found');
  Object.assign(doc, patch);
  await doc.save();
  return doc.toObject();
}

export async function deleteSpecies({ id, actor }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can remove species');
  }
  const doc = await Species.findById(id);
  if (!doc) throw HttpError.notFound('Species not found');

  // Don't hard-delete the species if any plant references it — instead
  // soft-delete so historical plant rows keep resolving the name. If
  // no plant references it, soft-delete is still fine but quicker to
  // restore later.
  const inUse = await Plant.exists({ speciesRef: doc._id });
  if (inUse) {
    // Mark as inactive AND soft-delete so it disappears from pickers
    // but keeps its identity for historical references.
    doc.isActive = false;
    await doc.save();
  }
  await Species.softDeleteById(id, actor.userId);
}
