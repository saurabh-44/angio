import { Site } from '../../models/Site.js';
import { User } from '../../models/User.js';
import { Allocation } from '../../models/Allocation.js';
import { HttpError } from '../../utils/httpError.js';

// Sites a sponsor can fund right now. A site is "available" when it has
// no capacity cap (capacity 0 = unlimited) or still has room after the
// trees already committed to it (sum of allocation targetPlants). Full
// sites are omitted. Returns a curated, non-sensitive shape — any
// authenticated user may read it (used by the sponsor order wizard).
export async function listAvailableSites() {
  const sites = await Site.find({})
    .select('name address city state country pinCode geo capacity pricePerTreeInr')
    .sort({ name: 1 })
    .lean();
  if (sites.length === 0) return { items: [] };

  const committedAgg = await Allocation.aggregate([
    { $group: { _id: '$site', trees: { $sum: '$targetPlants' } } },
  ]);
  const committedBySite = new Map(committedAgg.map((c) => [String(c._id), c.trees]));

  const items = [];
  for (const s of sites) {
    const committed = committedBySite.get(String(s._id)) ?? 0;
    const unlimited = !s.capacity || s.capacity <= 0;
    const remaining = unlimited ? null : Math.max(0, s.capacity - committed);
    if (!unlimited && remaining <= 0) continue; // full — hide from sponsors
    items.push({
      id: String(s._id),
      name: s.name,
      address: s.address ?? null,
      city: s.city ?? null,
      state: s.state ?? null,
      country: s.country ?? null,
      pinCode: s.pinCode ?? null,
      geo: s.geo ?? null,
      pricePerTreeInr: s.pricePerTreeInr ?? null,
      remaining, // null = unlimited
    });
  }
  return { items };
}

// Remaining capacity for ONE site (null = unlimited). Used at order time
// to reject a sponsor funding more trees than the site can still hold.
export async function remainingCapacityForSite(siteId) {
  const site = await Site.findById(siteId).select('capacity').lean();
  if (!site) return null;
  if (!site.capacity || site.capacity <= 0) return Infinity;
  const agg = await Allocation.aggregate([
    { $match: { site: site._id } },
    { $group: { _id: null, trees: { $sum: '$targetPlants' } } },
  ]);
  const committed = agg[0]?.trees ?? 0;
  return Math.max(0, site.capacity - committed);
}

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
