import { HttpError } from '../utils/httpError.js';
import { streamCertificate } from '../services/certificates/certificateService.js';

const ALLOWED = new Set(['plantation', 'co2']);

// GET /api/certificates/:type.pdf — donor downloads their plantation
// or CO₂ certificate. We stream the PDF directly to the response so we
// never buffer the full file in memory.
export async function getCertificatePdf(req, res) {
  if (req.auth.role !== 'sponsor') {
    throw HttpError.forbidden('Only sponsors can download their certificates');
  }
  const type = req.params.type;
  if (!ALLOWED.has(type)) throw HttpError.notFound('Unknown certificate type');

  // Browsers respect `Content-Disposition: attachment` and use
  // the suggested filename. `inline` would render in the tab — we
  // pick `inline` so the donor can preview it before saving, and a
  // browser still gives them a Save button.
  const filename = `NGO-Trees-${type}-${Date.now()}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');

  await streamCertificate({ donorId: req.auth.userId, type, res });
}
