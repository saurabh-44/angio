import { Plant } from '../../models/Plant.js';
import { Site } from '../../models/Site.js';
import { Allocation } from '../../models/Allocation.js';
import { MaintenanceLog } from '../../models/MaintenanceLog.js';
import { HttpError } from '../../utils/httpError.js';

// Returns a Mongoose filter scoping plant reads to the actor.
//   ngo_admin → all
//   site_owner → plants on their sites (resolved via site list)
//   donor → plants linked to their donations (uses cached `donor` field)
//   volunteer → plants they planted
export async function plantReadFilter(actor) {
  if (actor.role === 'ngo_admin') return {};
  if (actor.role === 'sponsor') return { donor: actor.userId };
  if (actor.role === 'volunteer') return { plantedBy: actor.userId };
  if (actor.role === 'site_owner') {
    const sites = await Site.find({ owner: actor.userId }).select('_id').lean();
    return { site: { $in: sites.map((s) => s._id) } };
  }
  throw HttpError.forbidden('You do not have permission to view plants');
}

// Volunteer / site_owner / ngo_admin can record a planting. The allocation
// pins the plant to a donor + site, so we re-validate that the allocation
// actually belongs to the requested site.
export async function createPlant({ input, actor }) {
  if (!['volunteer', 'site_owner', 'ngo_admin'].includes(actor.role)) {
    throw HttpError.forbidden('You do not have permission to record plantings');
  }

  const [site, allocation] = await Promise.all([
    Site.findById(input.site).select('_id owner').lean(),
    Allocation.findById(input.allocation).select('_id site donor targetPlants').lean(),
  ]);
  if (!site) throw HttpError.badRequest('Site not found');
  if (!allocation) throw HttpError.badRequest('Allocation not found');
  if (String(allocation.site) !== String(input.site)) {
    throw HttpError.badRequest('Allocation does not belong to the selected site');
  }

  // Site owner can only plant on their own site.
  if (actor.role === 'site_owner' && String(site.owner) !== actor.userId) {
    throw HttpError.forbidden('You can only record plantings on your own site');
  }

  // Don't overplant past the allocation's target (a soft check — admin
  // can still bump targetPlants if needed).
  const planted = await Plant.countDocuments({ allocation: allocation._id });
  if (planted >= allocation.targetPlants) {
    throw HttpError.badRequest('This allocation has already met its target plant count');
  }

  // Retry on the (vanishingly unlikely) publicCode unique-index
  // collision so a volunteer's upload-then-submit doesn't get wasted by
  // a one-in-2^72 birthday. After 3 attempts something else is wrong —
  // surface it as a 500.
  let plant;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      plant = await Plant.create({
        site: input.site,
        allocation: input.allocation,
        donor: allocation.donor,
        name: input.name,
        species: input.species,
        speciesRef: input.speciesRef,
        plantedBy: actor.userId,
        plantedAt: input.plantedAt ?? new Date(),
        geo: input.geo,
        plantingPhoto: input.plantingPhoto,
        heightCm: input.heightCm,
        growthStage: input.growthStage,
        dryBiomassKg: input.dryBiomassKg,
        notes: input.notes,
      });
      break;
    } catch (err) {
      if (err?.code === 11000 && err?.keyPattern?.publicCode && attempt < 2) continue;
      throw err;
    }
  }
  if (!plant) throw HttpError.server('Could not assign a unique tree code');
  return plant.toObject();
}

// Volunteers don't need to know which donor funded a tree they planted —
// scoping is enforced via plant.donor server-side, but we don't surface
// the donor's identity to them.
function includeDonorPopulate(actor) {
  return actor.role !== 'volunteer';
}

export async function listPlants({ site, donor, allocation, status, page, limit, actor }) {
  const scope = await plantReadFilter(actor);
  const filter = { ...scope };
  if (site) filter.site = site;
  if (donor && actor.role === 'ngo_admin') filter.donor = donor;
  if (allocation) filter.allocation = allocation;
  if (status) filter.status = status;
  const skip = (page - 1) * limit;
  let query = Plant.find(filter)
    .populate('site', 'name address geo')
    .populate('plantedBy', 'name email')
    .populate('speciesRef', 'name scientificName co2PerYearKg')
    .sort({ plantedAt: -1 })
    .skip(skip)
    .limit(limit);
  if (includeDonorPopulate(actor)) {
    query = query.populate('donor', 'name email');
  }
  const [items, total] = await Promise.all([
    query.lean(),
    Plant.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function getPlant({ id, actor }) {
  const scope = await plantReadFilter(actor);
  let query = Plant.findOne({ _id: id, ...scope })
    .populate('site', 'name address geo')
    .populate('plantedBy', 'name email')
    .populate('speciesRef', 'name scientificName co2PerYearKg')
    .populate('allocation', 'targetPlants allocatedAmount project');
  if (includeDonorPopulate(actor)) {
    query = query.populate('donor', 'name email');
  }
  const plant = await query.lean();
  if (!plant) throw HttpError.notFound('Plant not found');
  return plant;
}

export async function updatePlant({ id, patch, actor }) {
  const plant = await Plant.findById(id);
  if (!plant) throw HttpError.notFound('Plant not found');

  if (actor.role === 'ngo_admin') {
    // full access
  } else if (actor.role === 'site_owner') {
    const site = await Site.findById(plant.site).select('owner').lean();
    if (!site || String(site.owner) !== actor.userId) {
      throw HttpError.forbidden('You can only update plants on your own site');
    }
  } else if (actor.role === 'volunteer') {
    if (String(plant.plantedBy) !== actor.userId) {
      throw HttpError.forbidden('Volunteers can only update plants they themselves planted');
    }
    // Volunteers can update species/status/notes only — no field-level
    // narrowing beyond what the schema already allows.
  } else {
    throw HttpError.forbidden('You do not have permission to update plants');
  }

  Object.assign(plant, patch);
  await plant.save();
  return plant.toObject();
}

export async function deletePlant({ id, actor }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can remove plants');
  }
  const plant = await Plant.findById(id);
  if (!plant) throw HttpError.notFound('Plant not found');
  await Plant.softDeleteById(id, actor.userId);
}

// ---------- Maintenance ----------

// Snap a date to the Monday 00:00:00 of its week. Two logs in the same
// week for the same plant collapse via overwrite.
function startOfWeek(d) {
  const date = new Date(d);
  const day = (date.getUTCDay() + 6) % 7; // 0 = Monday
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - day);
  return date;
}

export async function createMaintenanceLog({ input, actor }) {
  if (!['volunteer', 'site_owner', 'ngo_admin'].includes(actor.role)) {
    throw HttpError.forbidden('You do not have permission to record maintenance');
  }
  const plant = await Plant.findById(input.plant)
    .select('_id site donor status')
    .lean();
  if (!plant) throw HttpError.badRequest('Plant not found');
  if (plant.status !== 'alive') {
    throw HttpError.badRequest('Cannot record maintenance for a non-living plant');
  }

  if (actor.role === 'site_owner') {
    const site = await Site.findById(plant.site).select('owner').lean();
    if (!site || String(site.owner) !== actor.userId) {
      throw HttpError.forbidden('You can only record maintenance on your own site');
    }
  }

  const weekOf = startOfWeek(input.weekOf ?? new Date());

  // Upsert by (plant, weekOf) — replaces an earlier same-week log so
  // donors see the latest weekly proof, not a duplicate.
  //
  // For the monitoring extensions (heightCm/dbhCm/healthStatus/
  // diseaseNotes) we only $set the ones the volunteer actually
  // submitted. Skipping an optional field on re-record shouldn't wipe
  // a measurement that came in earlier this week.
  const update = {
    plant: input.plant,
    site: plant.site,
    donor: plant.donor,
    volunteer: actor.userId,
    weekOf,
    photo: input.photo,
    note: input.note,
  };
  if (input.heightCm != null) update.heightCm = input.heightCm;
  if (input.dbhCm != null) update.dbhCm = input.dbhCm;
  if (input.healthStatus) update.healthStatus = input.healthStatus;
  if (input.diseaseNotes != null) update.diseaseNotes = input.diseaseNotes;

  const log = await MaintenanceLog.findOneAndUpdate(
    { plant: input.plant, weekOf },
    { $set: update },
    { new: true, upsert: true },
  ).lean();
  return log;
}

export async function listMaintenance({ plant, site, donor, page, limit, actor }) {
  let filter = {};
  if (actor.role === 'sponsor') {
    filter.donor = actor.userId;
  } else if (actor.role === 'volunteer') {
    filter.volunteer = actor.userId;
  } else if (actor.role === 'site_owner') {
    const sites = await Site.find({ owner: actor.userId }).select('_id').lean();
    filter.site = { $in: sites.map((s) => s._id) };
  } else if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('You do not have permission to view maintenance');
  }
  if (plant) filter.plant = plant;
  if (donor && actor.role === 'ngo_admin') filter.donor = donor;
  if (site) {
    if (filter.site?.$in) {
      const allowed = filter.site.$in.map(String);
      if (!allowed.includes(String(site))) return { items: [], total: 0, page, limit };
      filter.site = site;
    } else {
      filter.site = site;
    }
  }
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    MaintenanceLog.find(filter)
      .populate('plant', 'species geo plantingPhoto')
      .populate('volunteer', 'name email')
      .populate('site', 'name')
      .sort({ weekOf: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    MaintenanceLog.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function deleteMaintenance({ id, actor }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can remove maintenance logs');
  }
  const log = await MaintenanceLog.findById(id);
  if (!log) throw HttpError.notFound('Maintenance log not found');
  await MaintenanceLog.softDeleteById(id, actor.userId);
}
