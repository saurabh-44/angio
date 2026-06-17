import { Project } from '../../models/Project.js';
import { Allocation } from '../../models/Allocation.js';
import { HttpError } from '../../utils/httpError.js';

// Projects are admin-only at the management layer, but read access is
// open to ngo_admin and site_owner so the allocation form's project
// picker can populate for both. Volunteers + donors never see them.

function canRead(actor) {
  return ['ngo_admin', 'site_owner'].includes(actor.role);
}

export async function createProject({ input, actor }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can add projects');
  }
  const doc = await Project.create({ ...input, createdBy: actor.userId });
  return doc.toObject();
}

export async function listProjects({ q, status, page, limit, actor }) {
  if (!canRead(actor)) {
    throw HttpError.forbidden('You do not have permission to view projects');
  }
  const filter = {};
  if (status) filter.status = status;
  else if (actor.role !== 'ngo_admin') filter.status = { $ne: 'archived' };
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { description: rx }];
  }
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Project.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Project.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function getProject({ id, actor }) {
  if (!canRead(actor)) {
    throw HttpError.forbidden('You do not have permission to view projects');
  }
  const doc = await Project.findById(id).lean();
  if (!doc) throw HttpError.notFound('Project not found');

  // Quick rollup — how many allocations point at this project, plus
  // total trees planned + amount allocated under it.
  const stats = await Allocation.aggregate([
    { $match: { project: doc._id } },
    {
      $group: {
        _id: null,
        allocationCount: { $sum: 1 },
        targetPlants: { $sum: '$targetPlants' },
        allocatedAmount: { $sum: '$allocatedAmount' },
      },
    },
  ]);
  doc.stats = stats[0]
    ? {
        allocationCount: stats[0].allocationCount,
        targetPlants: stats[0].targetPlants,
        allocatedAmount: stats[0].allocatedAmount,
      }
    : { allocationCount: 0, targetPlants: 0, allocatedAmount: 0 };
  return doc;
}

export async function updateProject({ id, patch, actor }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can update projects');
  }
  const doc = await Project.findById(id);
  if (!doc) throw HttpError.notFound('Project not found');
  Object.assign(doc, patch);
  await doc.save();
  return doc.toObject();
}

export async function deleteProject({ id, actor }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can remove projects');
  }
  const doc = await Project.findById(id);
  if (!doc) throw HttpError.notFound('Project not found');
  // Soft-delete only — allocations still need to resolve the project
  // name for historical reports.
  await Project.softDeleteById(id, actor.userId);
}
