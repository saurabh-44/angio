import { Event } from '../../models/Event.js';
import { Site } from '../../models/Site.js';
import { User } from '../../models/User.js';
import { Assignment } from '../../models/Assignment.js';
import { HttpError } from '../../utils/httpError.js';
import { sendMail } from '../../config/mail.js';
import { env } from '../../config/env.js';
import { eventCancelledTemplate, eventInviteTemplate } from '../../mail/templates/eventInvite.js';
import { logger } from '../../utils/logger.js';

// Volunteering events. NGO admins post at any site, site in-charges at
// the sites they own. Invitations go to volunteers, site in-charges and
// admins (never sponsors); volunteers accept or reject once, and the
// creator sees who accepted. Events disappear from every list after their
// day is over, but stay in the DB.

const INVITED_ROLES = ['volunteer', 'site_owner', 'ngo_admin'];

function canManage(actor) {
  return actor.role === 'ngo_admin' || actor.role === 'site_owner';
}

// The NGO works in India — "today" is the IST calendar day. Event dates are
// stored as UTC midnight of their day, so compare against today's midnight.
function startOfTodayIst() {
  const ymd = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return new Date(`${ymd}T00:00:00.000Z`);
}

function siteLabel(site) {
  return [site.name, site.city].filter(Boolean).join(', ');
}

function dateLabel(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

async function loadManagedSite(siteId, actor) {
  const site = await Site.findById(siteId).select('name city address owner').lean();
  if (!site) throw HttpError.notFound('Site not found');
  if (actor.role === 'site_owner' && String(site.owner) !== String(actor.userId)) {
    throw HttpError.forbidden('You can only post events for your own sites');
  }
  return site;
}

async function loadManagedEvent(id, actor) {
  if (!canManage(actor)) throw HttpError.forbidden('Only admins and site in-charges can manage events');
  const event = await Event.findById(id).lean();
  if (!event) throw HttpError.notFound('Event not found');
  if (actor.role === 'site_owner') {
    const site = await Site.findById(event.site).select('owner').lean();
    if (!site || String(site.owner) !== String(actor.userId)) {
      throw HttpError.forbidden('This event belongs to another site');
    }
  }
  return event;
}

// Everyone an event at `site` would invite. 'all' = every active volunteer,
// site in-charge and admin. 'site' = admins + this site's in-charge + the
// volunteers assigned to it. The creator is left out — they don't need
// their own invitation.
async function resolveAudience({ site, audience, actor }) {
  const filter = { role: { $in: INVITED_ROLES }, isActive: true, _id: { $ne: actor.userId } };
  if (audience === 'site') {
    const volunteerIds = await Assignment.distinct('volunteer', { site: site._id });
    filter.$or = [
      { role: 'ngo_admin' },
      { _id: site.owner },
      { role: 'volunteer', _id: { $in: volunteerIds } },
    ];
  }
  return User.find(filter).select('name email role').sort({ role: 1, name: 1 }).lean();
}

export async function previewAudience({ site: siteId, audience, actor }) {
  if (!canManage(actor)) throw HttpError.forbidden('Only admins and site in-charges can post events');
  const site = await loadManagedSite(siteId, actor);
  const users = await resolveAudience({ site, audience, actor });
  return {
    items: users.map((u) => ({ id: String(u._id), name: u.name, email: u.email, role: u.role })),
  };
}

// Resend allows a couple of requests a second, so invitations go out one
// at a time in the background instead of a burst that would get throttled.
function mailInBackground(messages) {
  void (async () => {
    for (const m of messages) {
      try {
        await sendMail(m);
      } catch (err) {
        logger.error({ err, to: m.to }, 'event email failed');
      }
      await new Promise((r) => setTimeout(r, 600));
    }
  })();
}

export async function createEvent({ input, actor }) {
  if (!canManage(actor)) throw HttpError.forbidden('Only admins and site in-charges can post events');
  const site = await loadManagedSite(input.site, actor);
  const date = new Date(`${input.date}T00:00:00.000Z`);
  if (date < startOfTodayIst()) throw HttpError.badRequest('Pick today or a future date');

  const excluded = new Set(input.excludedUsers);
  const invitees = (await resolveAudience({ site, audience: input.audience, actor })).filter(
    (u) => !excluded.has(String(u._id)),
  );

  const event = await Event.create({
    site: site._id,
    name: input.name,
    date,
    time: input.time,
    note: input.note || undefined,
    volunteersNeeded: input.volunteersNeeded,
    audience: input.audience,
    invitees: invitees.map((u) => u._id),
    createdBy: actor.userId,
  });

  const details = {
    eventName: event.name,
    siteLabel: siteLabel(site),
    dateLabel: dateLabel(event.date),
    time: event.time,
    note: event.note,
  };
  mailInBackground(
    invitees.map((u) => ({
      to: u.email,
      subject: `New event: ${event.name}`,
      html: eventInviteTemplate({
        ...details,
        name: u.name,
        url: `${env.CLIENT_ORIGIN}/login`,
        canRespond: u.role === 'volunteer',
      }),
    })),
  );

  return { id: String(event._id), invited: invitees.length };
}

function shapeListItem(e) {
  const accepted = e.responses.filter((r) => r.response === 'accepted').length;
  return {
    id: String(e._id),
    name: e.name,
    date: e.date,
    time: e.time,
    note: e.note ?? null,
    status: e.status,
    volunteersNeeded: e.volunteersNeeded,
    acceptedCount: accepted,
    site: e.site
      ? { id: String(e.site._id), name: e.site.name, city: e.site.city ?? null, address: e.site.address ?? null }
      : null,
    createdBy: e.createdBy ? { name: e.createdBy.name, email: e.createdBy.email } : null,
  };
}

// Admin / site in-charge table: upcoming events (today onwards), soonest
// first. Site in-charges only see their own sites' events.
export async function listEvents({ q, actor }) {
  if (!canManage(actor)) throw HttpError.forbidden('Only admins and site in-charges can view events');
  const filter = { date: { $gte: startOfTodayIst() } };
  if (actor.role === 'site_owner') {
    filter.site = { $in: await Site.distinct('_id', { owner: actor.userId }) };
  }
  if (q) {
    filter.name = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }
  const events = await Event.find(filter)
    .sort({ date: 1, time: 1 })
    .limit(500)
    .populate('site', 'name city address')
    .populate('createdBy', 'name email')
    .lean();
  return { items: events.map(shapeListItem) };
}

// One event + the volunteers who accepted it (name, email, phone).
export async function getEvent({ id, actor }) {
  const event = await loadManagedEvent(id, actor);
  const acceptedIds = event.responses.filter((r) => r.response === 'accepted').map((r) => r.user);
  const [site, createdBy, people] = await Promise.all([
    Site.findById(event.site).select('name city address').lean(),
    User.findById(event.createdBy).select('name email').lean(),
    User.find({ _id: { $in: acceptedIds } }).select('name email phone').lean(),
  ]);
  const byId = new Map(people.map((p) => [String(p._id), p]));
  const accepted = event.responses
    .filter((r) => r.response === 'accepted' && byId.has(String(r.user)))
    .map((r) => {
      const p = byId.get(String(r.user));
      return { id: String(p._id), name: p.name, email: p.email, phone: p.phone ?? null, respondedAt: r.respondedAt };
    });
  return {
    ...shapeListItem({ ...event, site, createdBy }),
    accepted,
    rejectedCount: event.responses.filter((r) => r.response === 'rejected').length,
    invitedCount: event.invitees.length,
  };
}

// The signed-in volunteer's open requests: upcoming, active events they
// were invited to and haven't answered yet. Drives the header bell.
export async function listMyInvites({ actor }) {
  if (actor.role !== 'volunteer') return { items: [] };
  const events = await Event.find({
    status: 'active',
    date: { $gte: startOfTodayIst() },
    invitees: actor.userId,
    'responses.user': { $ne: actor.userId },
  })
    .sort({ date: 1, time: 1 })
    .limit(100)
    .populate('site', 'name city address')
    .populate('createdBy', 'name email')
    .lean();
  return { items: events.map(shapeListItem) };
}

// A volunteer's answer is final — the conditional update only matches
// while they have no response yet, so a second click (or a race between
// two tabs) can't flip it.
export async function respondToEvent({ id, response, actor }) {
  if (actor.role !== 'volunteer') throw HttpError.forbidden('Only volunteers can respond to events');
  const result = await Event.updateOne(
    {
      _id: id,
      status: 'active',
      date: { $gte: startOfTodayIst() },
      invitees: actor.userId,
      'responses.user': { $ne: actor.userId },
    },
    { $push: { responses: { user: actor.userId, response, respondedAt: new Date() } } },
  );
  if (result.modifiedCount === 1) return { ok: true, response };

  const event = await Event.findById(id).select('status date invitees responses').lean();
  if (!event || !event.invitees.some((u) => String(u) === String(actor.userId))) {
    throw HttpError.notFound('Event not found');
  }
  if (event.responses.some((r) => String(r.user) === String(actor.userId))) {
    throw HttpError.conflict('You have already responded to this event');
  }
  if (event.status === 'cancelled') throw HttpError.conflict('This event was cancelled');
  throw HttpError.conflict('This event is over');
}

// Cancel: the event stays (for the record) but leaves the volunteers' bell,
// and everyone who accepted is told by email.
export async function cancelEvent({ id, actor }) {
  const event = await loadManagedEvent(id, actor);
  if (event.status === 'cancelled') return { ok: true };
  await Event.updateOne({ _id: event._id }, { status: 'cancelled', cancelledAt: new Date() });

  const acceptedIds = event.responses.filter((r) => r.response === 'accepted').map((r) => r.user);
  if (acceptedIds.length) {
    const [site, people] = await Promise.all([
      Site.findById(event.site).select('name city').lean(),
      User.find({ _id: { $in: acceptedIds }, isActive: true }).select('name email').lean(),
    ]);
    mailInBackground(
      people.map((p) => ({
        to: p.email,
        subject: `Cancelled: ${event.name}`,
        html: eventCancelledTemplate({
          name: p.name,
          eventName: event.name,
          siteLabel: site ? siteLabel(site) : '',
          dateLabel: dateLabel(event.date),
          time: event.time,
        }),
      })),
    );
  }
  return { ok: true };
}
