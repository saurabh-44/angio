import QRCode from 'qrcode';
import { Plant } from '../../models/Plant.js';
import { Site } from '../../models/Site.js';
import { Assignment } from '../../models/Assignment.js';
import { env } from '../../config/env.js';
import { HttpError } from '../../utils/httpError.js';

// What URL goes INSIDE the QR. The phone scanner opens this in the
// browser — we point at the public-facing client route, NOT the API,
// because the client renders the full proof page.
//
// In dev the client lives at CLIENT_ORIGIN (e.g. http://localhost:5173).
// In prod, set CLIENT_ORIGIN to the public URL of your deployed React app.
export function publicTreeUrl(publicCode) {
  return `${env.CLIENT_ORIGIN}/tree/${publicCode}`;
}

// Returns the PNG buffer + content-type for a tree's QR code.
//
// Authorization: NGO admin sees all; site_owner only their own sites;
// volunteer only plants they planted; donor only their own plants. The
// QR itself decodes to a fully public URL, but generating one still
// requires the caller to "own" the tree so we don't expose the public
// code accidentally.
export async function generateQrForPlant({ plantId, actor, size = 512 }) {
  const plant = await Plant.findById(plantId).select('publicCode site donor plantedBy').lean();
  if (!plant) throw HttpError.notFound('Plant not found');

  if (actor.role === 'ngo_admin') {
    // ok
  } else if (actor.role === 'sponsor') {
    if (String(plant.donor) !== actor.userId) {
      throw HttpError.forbidden('You can only download QR codes for trees you funded');
    }
  } else if (actor.role === 'volunteer') {
    if (String(plant.plantedBy) !== actor.userId) {
      throw HttpError.forbidden('You can only download QR codes for trees you planted');
    }
  } else if (actor.role === 'site_owner') {
    const site = await Site.findById(plant.site).select('owner').lean();
    if (!site || String(site.owner) !== actor.userId) {
      throw HttpError.forbidden('You can only download QR codes for trees on your own sites');
    }
  } else {
    throw HttpError.forbidden('You do not have permission to download this QR code');
  }

  const url = publicTreeUrl(plant.publicCode);
  const png = await QRCode.toBuffer(url, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: Math.max(128, Math.min(1024, size | 0)),
    color: {
      dark: '#047857', // emerald-700, matches our brand
      light: '#ffffff',
    },
  });
  return { buffer: png, mimeType: 'image/png', code: plant.publicCode, url };
}

// Public read used by the no-auth tree-detail page. Returns a curated
// subset of the plant — no donor identity, no volunteer name, no
// internal IDs. Anyone with the publicCode can see this.
//
// We DO populate site (name + general address) and the planting photo
// + maintenance gallery, because that's the whole point of a public
// verification page.
export async function getPublicTreeByCode(publicCode) {
  const plant = await Plant.findOne({ publicCode })
    .populate('site', 'name address geo')
    .lean();
  if (!plant) throw HttpError.notFound('Tree not found');

  // Bump scan count + last-scanned-at non-blocking — the donor's UI
  // surfaces this as a "your tree was viewed N times" engagement signal.
  // Failures shouldn't propagate; the user already got their tree page.
  void Plant.updateOne(
    { _id: plant._id },
    { $inc: { scanCount: 1 }, $set: { lastScannedAt: new Date() } },
  ).catch((err) => {
    // Import lazily to avoid a circular hit through logger.
    import('../../utils/logger.js').then(({ logger }) => {
      logger.warn({ err, publicCode }, 'failed to bump plant scanCount');
    });
  });

  // Pull the maintenance gallery — most recent 24 logs, just enough
  // for a half-year of weekly photos. We include the monitoring
  // extension fields so the public page can show "latest measurements"
  // and a health-status chip per log.
  const { MaintenanceLog } = await import('../../models/MaintenanceLog.js');
  const logs = await MaintenanceLog.find({ plant: plant._id })
    .select('photo weekOf createdAt note heightCm dbhCm healthStatus diseaseNotes')
    .sort({ weekOf: -1 })
    .limit(24)
    .lean();

  return {
    publicCode: plant.publicCode,
    name: plant.name ?? null,
    species: plant.species ?? null,
    status: plant.status,
    plantedAt: plant.plantedAt,
    geo: plant.geo,
    plantingPhoto: plant.plantingPhoto
      ? { url: plant.plantingPhoto.url }
      : null,
    site: plant.site
      ? { name: plant.site.name, address: plant.site.address, geo: plant.site.geo }
      : null,
    maintenance: logs.map((l) => ({
      weekOf: l.weekOf,
      createdAt: l.createdAt,
      photo: l.photo ? { url: l.photo.url } : null,
      note: l.note ?? null,
      heightCm: l.heightCm ?? null,
      dbhCm: l.dbhCm ?? null,
      healthStatus: l.healthStatus ?? null,
      diseaseNotes: l.diseaseNotes ?? null,
    })),
  };
}
