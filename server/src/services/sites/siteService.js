import { Site } from '../../models/Site.js';
import { User } from '../../models/User.js';
import { HttpError } from '../../utils/httpError.js';

async function assertOwnerIsSiteOwner(ownerId) {
  const owner = await User.findById(ownerId).select('role isActive').lean();
  if (!owner || !owner.isActive) {
    throw HttpError.badRequest('Site owner not found');
  }
  if (owner.role !== 'site_owner') {
    throw HttpError.badRequest('Selected user is not a site owner');
  }
}

// Returns the Mongoose filter that scopes site reads to the actor's role.
//   ngo_admin → no extra filter
//   site_owner → only their own sites
//   volunteer / donor → no direct access (they read sites indirectly via
//     plants/assignments, which have their own scoped endpoints)
export function siteReadFilter(actor) {
  if (actor.role === 'ngo_admin') return {};
  if (actor.role === 'site_owner') return { owner: actor.userId };
  throw HttpError.forbidden('You do not have permission to view sites');
}

export async function createSite({ input, actor }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can create sites');
  }
  await assertOwnerIsSiteOwner(input.owner);
  const site = await Site.create({ ...input, createdBy: actor.userId });
  return site.toObject();
}

export async function listSites({ q, owner, page, limit, actor }) {
  const filter = { ...siteReadFilter(actor) };
  if (owner) filter.owner = owner;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { address: rx }];
  }
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Site.find(filter)
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Site.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function getSite({ id, actor }) {
  const filter = { _id: id, ...siteReadFilter(actor) };
  const site = await Site.findOne(filter).populate('owner', 'name email phone').lean();
  if (!site) throw HttpError.notFound('Site not found');
  return site;
}

export async function updateSite({ id, patch, actor }) {
  const site = await Site.findById(id);
  if (!site) throw HttpError.notFound('Site not found');
  if (actor.role !== 'ngo_admin' && String(site.owner) !== actor.userId) {
    throw HttpError.forbidden('You do not have permission to update this site');
  }
  // Only ngo_admin can reassign ownership.
  if (patch.owner && actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can transfer site ownership');
  }
  if (patch.owner) await assertOwnerIsSiteOwner(patch.owner);

  Object.assign(site, patch);
  await site.save();
  return site.toObject();
}

export async function deleteSite({ id, actor }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can remove sites');
  }
  const site = await Site.findById(id);
  if (!site) throw HttpError.notFound('Site not found');
  await Site.softDeleteById(id, actor.userId);
}
