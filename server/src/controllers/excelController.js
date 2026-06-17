import {
  buildDonationImportTemplate,
  buildDonorImportTemplate,
  exportAuditBundle,
  exportDonationsForAdmin,
  exportMaintenance,
  exportMyTreesForDonor,
  exportPlantsForAdmin,
} from '../services/excel/exporters.js';
import { importDonations, importDonors } from '../services/excel/importers.js';
import { HttpError } from '../utils/httpError.js';

function setXlsxHeaders(res, filename) {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'private, no-cache');
}

const stampedName = (label, ext = 'xlsx') => {
  const ts = new Date().toISOString().slice(0, 10);
  return `${label}-${ts}.${ext}`;
};

// ── Exports ────────────────────────────────────────────────────
export async function exportDonationsHandler(req, res) {
  const buf = await exportDonationsForAdmin({
    actor: req.auth,
    filters: req.query,
  });
  setXlsxHeaders(res, stampedName('ngo-trees-donations'));
  res.send(buf);
}

export async function exportPlantsHandler(req, res) {
  const buf = await exportPlantsForAdmin({
    actor: req.auth,
    filters: req.query,
  });
  setXlsxHeaders(res, stampedName('ngo-trees-plants'));
  res.send(buf);
}

export async function exportMaintenanceHandler(req, res) {
  const buf = await exportMaintenance({
    actor: req.auth,
    filters: req.query,
  });
  setXlsxHeaders(res, stampedName('ngo-trees-maintenance'));
  res.send(buf);
}

export async function exportDonorTreesHandler(req, res) {
  const buf = await exportMyTreesForDonor({ actor: req.auth });
  setXlsxHeaders(res, stampedName('my-ngo-trees'));
  res.send(buf);
}

export async function exportAuditHandler(req, res) {
  const buf = await exportAuditBundle({ actor: req.auth });
  setXlsxHeaders(res, stampedName('ngo-trees-audit'));
  res.send(buf);
}

// ── Templates (downloadable starter files) ─────────────────────
export async function getDonorTemplateHandler(req, res) {
  if (req.auth.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can download import templates');
  }
  const buf = buildDonorImportTemplate();
  setXlsxHeaders(res, 'ngo-trees-donor-template.xlsx');
  res.send(buf);
}

export async function getDonationTemplateHandler(req, res) {
  if (req.auth.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can download import templates');
  }
  const buf = buildDonationImportTemplate();
  setXlsxHeaders(res, 'ngo-trees-donation-template.xlsx');
  res.send(buf);
}

// ── Imports ────────────────────────────────────────────────────
export async function postDonorImportHandler(req, res) {
  if (!req.file) throw HttpError.badRequest('No file uploaded');
  const summary = await importDonors({
    actor: req.auth,
    fileBuffer: req.file.buffer,
  });
  res.json(summary);
}

export async function postDonationImportHandler(req, res) {
  if (!req.file) throw HttpError.badRequest('No file uploaded');
  const summary = await importDonations({
    actor: req.auth,
    fileBuffer: req.file.buffer,
  });
  res.json(summary);
}
