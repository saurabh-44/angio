import { Assignment } from '../../models/Assignment.js';
import { Site } from '../../models/Site.js';
import { User } from '../../models/User.js';
import { HttpError } from '../../utils/httpError.js';

async function assertVolunteer(volunteerId) {
  const v = await User.findById(volunteerId).select('role isActive createdBy').lean();
  if (!v || !v.isActive) throw HttpError.badRequest('Volunteer not found');
  if (v.role !== 'volunteer') throw HttpError.badRequest('Selected user is not a volunteer');
  return v;
}

async function assertCanWriteForSite(actor, siteId) {
  if (actor.role === 'ngo_admin') return;
  if (actor.role === 'site_owner') {
    const site = await Site.findById(siteId).select('owner').lean();
    if (!site || String(site.owner) !== actor.userId) {
      throw HttpError.forbidden('You can only assign volunteers to your own sites');
    }
    return;
  }
  throw HttpError.forbidden('You do not have permission to manage assignments');
}

// A site_owner may only assign a volunteer they control: one they created
// themselves, OR one already assigned to one of their sites by the NGO
// admin (which is how the NGO "shares" a volunteer across owners).
async function assertVolunteerAvailable(actor, volunteer) {
  if (actor.role !== 'site_owner') return;

  // Volunteers I created are always available.
  if (volunteer.createdBy && String(volunteer.createdBy) === actor.userId) return;

  // Otherwise they must already have an assignment on one of my sites
  // (an NGO admin must have shared them with me first).
  const mySites = await Site.find({ owner: actor.userId }).select('_id').lean();
  const siteIds = mySites.map((s) => s._id);
  if (siteIds.length === 0) {
    throw HttpError.forbidden('This volunteer is not available to you');
  }
  const sharedAssignment = await Assignment.exists({
    volunteer: volunteer._id,
    site: { $in: siteIds },
  });
  if (!sharedAssignment) {
    throw HttpError.forbidden(
      'This volunteer was added by another site owner. Ask the NGO admin to assign them to one of your sites first.',
    );
  }
}

export async function createAssignment({ input, actor }) {
  await assertCanWriteForSite(actor, input.site);
  const volunteer = await assertVolunteer(input.volunteer);
  await assertVolunteerAvailable(actor, volunteer);
  const a = await Assignment.create({ ...input, assignedBy: actor.userId });
  return a.toObject();
}

async function readFilter(actor) {
  if (actor.role === 'ngo_admin') return {};
  if (actor.role === 'volunteer') return { volunteer: actor.userId };
  if (actor.role === 'site_owner') {
    const sites = await Site.find({ owner: actor.userId }).select('_id').lean();
    return { site: { $in: sites.map((s) => s._id) } };
  }
  throw HttpError.forbidden('You do not have permission to view assignments');
}

export async function listAssignments({ volunteer, site, kind, active, page, limit, actor }) {
  const filter = await readFilter(actor);
  if (volunteer && actor.role === 'ngo_admin') filter.volunteer = volunteer;
  if (site) {
    if (filter.site?.$in) {
      const allowed = filter.site.$in.map(String);
      if (!allowed.includes(String(site))) return { items: [], total: 0, page, limit };
      filter.site = site;
    } else {
      filter.site = site;
    }
  }
  if (kind) filter.kind = kind;
  if (active) {
    const now = new Date();
    filter.startsAt = { $lte: now };
    filter.$or = [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gt: now } }];
  }
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Assignment.find(filter)
      .populate('volunteer', 'name email phone')
      .populate('site', 'name address')
      .sort({ startsAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Assignment.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function updateAssignment({ id, patch, actor }) {
  const a = await Assignment.findById(id);
  if (!a) throw HttpError.notFound('Assignment not found');
  await assertCanWriteForSite(actor, a.site);
  Object.assign(a, patch);
  await a.save();
  return a.toObject();
}

export async function deleteAssignment({ id, actor }) {
  const a = await Assignment.findById(id);
  if (!a) throw HttpError.notFound('Assignment not found');
  await assertCanWriteForSite(actor, a.site);
  await Assignment.softDeleteById(id, actor.userId);
}
