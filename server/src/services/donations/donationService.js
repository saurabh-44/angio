import { Donation } from '../../models/Donation.js';
import { Allocation } from '../../models/Allocation.js';
import { Site } from '../../models/Site.js';
import { User } from '../../models/User.js';
import { HttpError } from '../../utils/httpError.js';

async function assertDonorIsDonor(donorId) {
  const donor = await User.findById(donorId).select('role isActive').lean();
  if (!donor || !donor.isActive) throw HttpError.badRequest('Donor not found');
  if (donor.role !== 'donor') throw HttpError.badRequest('Selected user is not a donor');
}

// Returns a filter scoping donation reads to the actor.
//   ngo_admin → all
//   donor → only their own donations
//   site_owner → donations that have at least one allocation on their site
//                — caller resolves this via a follow-up query because it
//                requires a join
function donorScopeFilter(actor) {
  if (actor.role === 'ngo_admin') return {};
  if (actor.role === 'donor') return { donor: actor.userId };
  throw HttpError.forbidden('You do not have permission to view donations');
}

export async function createDonation({ input, actor }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can record donations');
  }
  await assertDonorIsDonor(input.donor);
  const donation = await Donation.create({
    ...input,
    recordedBy: actor.userId,
  });
  return donation.toObject();
}

export async function listDonations({ donor, page, limit, actor }) {
  const filter = { ...donorScopeFilter(actor) };
  if (donor && actor.role === 'ngo_admin') filter.donor = donor;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Donation.find(filter)
      .populate('donor', 'name email phone')
      .sort({ paidAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Donation.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function getDonation({ id, actor }) {
  const filter = { _id: id, ...donorScopeFilter(actor) };
  const donation = await Donation.findOne(filter)
    .populate('donor', 'name email phone')
    .lean();
  if (!donation) throw HttpError.notFound('Donation not found');
  return donation;
}

export async function updateDonation({ id, patch, actor }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can update donations');
  }
  const donation = await Donation.findById(id);
  if (!donation) throw HttpError.notFound('Donation not found');

  // Guard: shrinking the donation amount below what's already allocated
  // would leave allocations under-funded on paper.
  if (patch.amount !== undefined) {
    const allocated = await Allocation.aggregate([
      { $match: { donation: donation._id } },
      { $group: { _id: null, sum: { $sum: '$allocatedAmount' } } },
    ]);
    const totalAllocated = allocated[0]?.sum ?? 0;
    if (patch.amount < totalAllocated) {
      throw HttpError.badRequest(
        `Cannot reduce donation below ${totalAllocated} (already allocated). Remove allocations first.`,
      );
    }
  }

  Object.assign(donation, patch);
  await donation.save();
  return donation.toObject();
}

// ---------- Allocations ----------

async function loadSiteForAllocation(siteId) {
  const site = await Site.findById(siteId).select('_id owner').lean();
  if (!site) throw HttpError.badRequest('Site not found');
  return site;
}

export async function createAllocation({ input, actor }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can allocate donations');
  }
  const donation = await Donation.findById(input.donation).lean();
  if (!donation) throw HttpError.badRequest('Donation not found');
  await loadSiteForAllocation(input.site);

  // The sum of allocations for a donation can't exceed the donation amount.
  const allocated = await Allocation.aggregate([
    { $match: { donation: donation._id } },
    { $group: { _id: null, sum: { $sum: '$allocatedAmount' } } },
  ]);
  const totalAllocated = allocated[0]?.sum ?? 0;
  if (totalAllocated + input.allocatedAmount > donation.amount) {
    throw HttpError.badRequest(
      `Allocation exceeds remaining donation balance (${donation.amount - totalAllocated})`,
    );
  }

  const allocation = await Allocation.create({
    ...input,
    donor: donation.donor,
    createdBy: actor.userId,
  });
  return allocation.toObject();
}

function allocationReadFilter(actor) {
  if (actor.role === 'ngo_admin') return {};
  if (actor.role === 'donor') return { donor: actor.userId };
  // site_owner is scoped via $in over their sites; resolved in listAllocations.
  if (actor.role === 'site_owner') return { __siteOwnerScope: true };
  throw HttpError.forbidden('You do not have permission to view allocations');
}

async function resolveSiteOwnerScope(actor, baseFilter) {
  if (!baseFilter.__siteOwnerScope) return baseFilter;
  const sites = await Site.find({ owner: actor.userId }).select('_id').lean();
  const ids = sites.map((s) => s._id);
  const { __siteOwnerScope, ...rest } = baseFilter;
  return { ...rest, site: { $in: ids } };
}

export async function listAllocations({ donation, donor, site, page, limit, actor }) {
  let filter = { ...allocationReadFilter(actor) };
  filter = await resolveSiteOwnerScope(actor, filter);
  if (donation) filter.donation = donation;
  if (donor && actor.role === 'ngo_admin') filter.donor = donor;
  if (site) {
    // Already constrained by scope; just narrow further if requested.
    if (filter.site?.$in) {
      const allowed = filter.site.$in.map(String);
      if (!allowed.includes(String(site))) {
        return { items: [], total: 0, page, limit };
      }
      filter.site = site;
    } else {
      filter.site = site;
    }
  }
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Allocation.find(filter)
      .populate('donor', 'name email phone')
      .populate('site', 'name address geo')
      .populate('donation', 'amount paidAt method')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Allocation.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function updateAllocation({ id, patch, actor }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can update allocations');
  }
  const allocation = await Allocation.findById(id);
  if (!allocation) throw HttpError.notFound('Allocation not found');

  if (patch.allocatedAmount !== undefined) {
    const donation = await Donation.findById(allocation.donation).lean();
    if (!donation) throw HttpError.notFound('Donation not found');
    const other = await Allocation.aggregate([
      { $match: { donation: donation._id, _id: { $ne: allocation._id } } },
      { $group: { _id: null, sum: { $sum: '$allocatedAmount' } } },
    ]);
    const otherSum = other[0]?.sum ?? 0;
    if (otherSum + patch.allocatedAmount > donation.amount) {
      throw HttpError.badRequest(
        `Allocation exceeds remaining donation balance (${donation.amount - otherSum})`,
      );
    }
  }

  Object.assign(allocation, patch);
  await allocation.save();
  return allocation.toObject();
}

export async function deleteAllocation({ id, actor }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can remove allocations');
  }
  const allocation = await Allocation.findById(id);
  if (!allocation) throw HttpError.notFound('Allocation not found');
  await Allocation.softDeleteById(id, actor.userId);
}
