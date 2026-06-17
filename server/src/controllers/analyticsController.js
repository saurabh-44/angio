import { HttpError } from '../utils/httpError.js';
import { adminOverview } from '../services/analytics/analyticsService.js';

export async function getAdminOverview(req, res) {
  if (req.auth.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can view system analytics');
  }
  const data = await adminOverview();
  // Lightweight client cache so dashboard navigations don't re-query
  // every aggregation on each visit.
  res.set('Cache-Control', 'private, max-age=15');
  res.json(data);
}
