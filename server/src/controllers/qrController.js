import {
  generateQrForPlant,
  getPublicTreeByCode,
} from '../services/plants/qrService.js';
import { streamBulkQrSheet } from '../services/plants/bulkQrService.js';

// Authenticated: returns a PNG of the QR for a tree the caller owns.
// `?size=N` (128–1024) controls pixel size; default 512 (good for
// printing at 1–2 inches).
export async function getPlantQrPng(req, res) {
  const size = Number.parseInt(req.query.size ?? '512', 10);
  const result = await generateQrForPlant({
    plantId: req.params.id,
    actor: req.auth,
    size: Number.isFinite(size) ? size : 512,
  });
  res.set('Content-Type', result.mimeType);
  res.set('Content-Disposition', `inline; filename="tree-${result.code}.png"`);
  res.set('Cache-Control', 'private, max-age=86400'); // cache for the user's session, not shared
  res.send(result.buffer);
}

// Streams a printable A4 PDF of every alive tree's QR sticker on a
// site. NGO admin all sites, site_owner own only (enforced inside the
// service). Optional `?status=` (default 'alive') lets admin pull dead
// or all for archival reprints.
export async function getSiteQrSheet(req, res) {
  const status = req.query.status;
  const filename = `qr-sheet-${req.params.id}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.setHeader('Cache-Control', 'private, no-cache');
  await streamBulkQrSheet({
    siteId: req.params.id,
    actor: req.auth,
    res,
    options: { status },
  });
}

// PUBLIC — no auth required. Scanning the QR sticker on a tree hits the
// client URL, which calls this endpoint to render the verification page.
export async function getPublicTree(req, res) {
  const tree = await getPublicTreeByCode(req.params.code);
  // Public response — never cache personally-identifying info, but
  // tree facts are slow-moving so a short shared cache is fine.
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ tree });
}
