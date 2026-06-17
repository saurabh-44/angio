import { HttpError } from '../utils/httpError.js';
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
