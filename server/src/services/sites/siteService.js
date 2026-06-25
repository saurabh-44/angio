import { Site } from '../../models/Site.js';
import { User } from '../../models/User.js';
import { Allocation } from '../../models/Allocation.js';
import { Assignment } from '../../models/Assignment.js';
import { Plant } from '../../models/Plant.js';
import { MaintenanceLog } from '../../models/MaintenanceLog.js';
import { co2KgForPlant } from '../co2/co2Service.js';
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
  const { volunteers, ...siteInput } = input;
  await assertOwnerIsSiteOwner(siteInput.owner);
  const site = await Site.create({ ...siteInput, createdBy: actor.userId });

  // Optionally assign volunteers to the new site (planting assignments).
  // Invalid / non-volunteer ids are silently skipped so one bad id can't
  // fail the whole site creation.
  if (Array.isArray(volunteers) && volunteers.length > 0) {
    const ids = [...new Set(volunteers.map(String))];
    const valid = await User.find({ _id: { $in: ids }, role: 'volunteer', isActive: true })
      .select('_id')
      .lean();
    const docs = valid.map((v) => ({
      volunteer: v._id,
      site: site._id,
      kind: 'planting',
      assignedBy: actor.userId,
      startsAt: new Date(),
    }));
    if (docs.length > 0) await Assignment.insertMany(docs);
  }

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

  // Attach the count of distinct volunteers assigned to each site (any kind
  // of assignment). Soft-deleted assignments are excluded by the plugin's
  // aggregate hook.
  if (items.length > 0) {
    const siteIds = items.map((s) => s._id);
    const volAgg = await Assignment.aggregate([
      { $match: { site: { $in: siteIds } } },
      { $group: { _id: { site: '$site', volunteer: '$volunteer' } } },
      { $group: { _id: '$_id.site', count: { $sum: 1 } } },
    ]);
    const countBySite = new Map(volAgg.map((v) => [String(v._id), v.count]));
    for (const s of items) s.volunteerCount = countBySite.get(String(s._id)) ?? 0;
  }

  return { items, total, page, limit };
}

export async function getSite({ id, actor }) {
  const filter = { _id: id, ...siteReadFilter(actor) };
  const site = await Site.findOne(filter).populate('owner', 'name email phone').lean();
  if (!site) throw HttpError.notFound('Site not found');
  return site;
}

// Rich detail for one site: the site itself + headline stats (CO₂, trees,
// survival, volunteers, pending orders) and the three related lists the
// detail page shows — recent trees, contributors (sponsors), and volunteers.
// Scoped by role via siteReadFilter (admin: all; site_owner: own sites).
export async function getSiteOverview({ id, actor }) {
  const filter = { _id: id, ...siteReadFilter(actor) };
  const site = await Site.findOne(filter).populate('owner', 'name email phone').lean();
  if (!site) throw HttpError.notFound('Site not found');

  // Plants on this site (species rate populated so CO₂ uses the right figure).
  const plants = await Plant.find({ site: site._id })
    .select('publicCode name species status plantedAt plantedBy speciesRef allocation')
    .populate('plantedBy', 'name')
    .populate('speciesRef', 'co2PerYearKg')
    .sort({ plantedAt: -1 })
    .lean();

  const totalTrees = plants.length;
  const aliveTrees = plants.filter((p) => p.status === 'alive').length;
  const co2Kg = plants.reduce((sum, p) => sum + co2KgForPlant(p), 0);

  // Latest maintenance (last-watered) per plant.
  const plantIds = plants.map((p) => p._id);
  let lastWateredByPlant = new Map();
  if (plantIds.length > 0) {
    const mAgg = await MaintenanceLog.aggregate([
      { $match: { plant: { $in: plantIds } } },
      { $group: { _id: '$plant', last: { $max: '$weekOf' } } },
    ]);
    lastWateredByPlant = new Map(mAgg.map((m) => [String(m._id), m.last]));
  }

  const trees = plants.slice(0, 8).map((p) => ({
    id: String(p._id),
    code: p.publicCode,
    name: p.name ?? p.species ?? 'Tree',
    status: p.status,
    plantedAt: p.plantedAt,
    plantedBy: p.plantedBy?.name ?? '—',
    lastWateredAt: lastWateredByPlant.get(String(p._id)) ?? null,
    co2Kg: Math.round(co2KgForPlant(p) * 10) / 10,
  }));

  // Volunteers assigned to this site (distinct, latest first).
  const assignments = await Assignment.find({ site: site._id })
    .populate('volunteer', 'name email')
    .sort({ startsAt: -1 })
    .lean();
  const seenVol = new Set();
  const volunteers = [];
  for (const a of assignments) {
    if (!a.volunteer) continue;
    const vid = String(a.volunteer._id ?? a.volunteer);
    if (seenVol.has(vid)) continue;
    seenVol.add(vid);
    volunteers.push({
      id: vid,
      name: a.volunteer.name,
      email: a.volunteer.email,
      assignedAt: a.startsAt ?? a.createdAt,
      kind: a.kind,
    });
  }

  // Orders (allocations) to this site → contributors + pending-order count.
  const plantedAgg = await Plant.aggregate([
    { $match: { site: site._id, allocation: { $ne: null } } },
    { $group: { _id: '$allocation', planted: { $sum: 1 } } },
  ]);
  const plantedByAlloc = new Map(plantedAgg.map((p) => [String(p._id), p.planted]));

  const allocations = await Allocation.find({ site: site._id })
    .populate('donor', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  let pendingOrders = 0;
  const contributors = allocations.map((a) => {
    const planted = plantedByAlloc.get(String(a._id)) ?? 0;
    let status = 'pending';
    if (planted >= a.targetPlants) status = 'completed';
    else if (planted > 0) status = 'in_progress';
    if (status !== 'completed') pendingOrders += 1;
    return {
      id: String(a._id),
      name: a.donor?.name ?? '—',
      email: a.donor?.email ?? '',
      date: a.createdAt,
      treeCount: a.targetPlants,
      amount: a.allocatedAmount,
      status,
    };
  });

  return {
    site,
    stats: {
      co2Kg: Math.round(co2Kg * 10) / 10,
      totalTrees,
      aliveTrees,
      volunteerCount: seenVol.size,
      pendingOrders,
    },
    trees,
    contributors,
    volunteers,
  };
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
