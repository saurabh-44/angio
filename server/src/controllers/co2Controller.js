import { HttpError } from '../utils/httpError.js';
import { Site } from '../models/Site.js';
import {
  CO2_RATE,
  summaryForDonor,
  summaryForSystem,
} from '../services/co2/co2Service.js';

// Donor's own CO₂ summary across all trees their money funded.
export async function getDonorCo2(req, res) {
  if (req.auth.role !== 'sponsor') {
    throw HttpError.forbidden('Only sponsors can view their CO₂ summary');
  }
  const summary = await summaryForDonor({ donorId: req.auth.userId });
  res.json({ summary, rate: CO2_RATE });
}

// System-wide CO₂ summary — NGO admin only.
export async function getSystemCo2(req, res) {
  if (req.auth.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can view system-wide CO₂');
  }
  const summary = await summaryForSystem();
  res.json({ summary, rate: CO2_RATE });
}

// Public, no-auth headline numbers for the landing page hero: how many
// plantation sites exist and the total CO₂ absorbed so far across every
// tree (same per-tree estimate the dashboards use). Aggregates only — no
// names, no donors.
export async function getPublicImpact(_req, res) {
  const [sites, summary] = await Promise.all([Site.countDocuments(), summaryForSystem()]);
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ sites, co2Tonnes: summary.co2Tonnes });
}
