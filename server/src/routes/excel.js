import { Router } from 'express';
import {
  blockIfForcedPasswordChange,
  requireAuth,
  requireRole,
} from '../middleware/auth.js';
import { uploadXlsxMiddleware } from '../middleware/uploadXlsx.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  exportAuditHandler,
  exportDonationsHandler,
  exportDonorTreesHandler,
  exportMaintenanceHandler,
  exportPlantsHandler,
  getDonationTemplateHandler,
  getDonorTemplateHandler,
  postDonationImportHandler,
  postDonorImportHandler,
} from '../controllers/excelController.js';

export const excelRouter = Router();

excelRouter.use(requireAuth, blockIfForcedPasswordChange);

// ─── Exports ───────────────────────────────────────────────────
// Per-role guards live inside each service so the route layer stays flat.
excelRouter.get('/export/donations.xlsx', requireRole('ngo_admin'), asyncHandler(exportDonationsHandler));
excelRouter.get('/export/plants.xlsx', requireRole('ngo_admin', 'site_owner'), asyncHandler(exportPlantsHandler));
excelRouter.get('/export/maintenance.xlsx', requireRole('ngo_admin', 'site_owner', 'sponsor'), asyncHandler(exportMaintenanceHandler));
excelRouter.get('/export/audit.xlsx', requireRole('ngo_admin'), asyncHandler(exportAuditHandler));
excelRouter.get('/export/my-trees.xlsx', requireRole('sponsor'), asyncHandler(exportDonorTreesHandler));

// ─── Templates ─────────────────────────────────────────────────
excelRouter.get('/templates/donors.xlsx', requireRole('ngo_admin'), asyncHandler(getDonorTemplateHandler));
excelRouter.get('/templates/donations.xlsx', requireRole('ngo_admin'), asyncHandler(getDonationTemplateHandler));

// ─── Imports ───────────────────────────────────────────────────
// uploadXlsxMiddleware parses one `file` field (multipart/form-data) into
// memoryStorage, capped at 2 MB, only accepting xlsx mime/extensions.
excelRouter.post(
  '/import/donors',
  requireRole('ngo_admin'),
  uploadXlsxMiddleware,
  asyncHandler(postDonorImportHandler),
);
excelRouter.post(
  '/import/donations',
  requireRole('ngo_admin'),
  uploadXlsxMiddleware,
  asyncHandler(postDonationImportHandler),
);
