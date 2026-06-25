import { randomUUID } from 'node:crypto';
import { uploadSignatureSchema } from '../validation/uploadSchemas.js';
import { buildUploadSignature } from '../config/cloudinary.js';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

// Issues Cloudinary signed-upload params so the browser can POST the
// file directly to api.cloudinary.com without proxying through Express.
// The returned `publicId` MUST be sent back when creating the Plant or
// MaintenanceLog so the server records the exact asset that was uploaded.
export async function postUploadSignature(req, res) {
  const input = uploadSignatureSchema.parse(req.body);

  // Any authenticated user can upload their own avatar.
  if (input.purpose === 'avatar') {
    const folder = `${env.CLOUDINARY_UPLOAD_FOLDER}/avatars/${req.auth.userId}`;
    const publicId = `avatar-${randomUUID()}`;
    return res.json(buildUploadSignature({ publicId, folder }));
  }

  // Site cover photos — only the NGO admin (who owns site creation).
  if (input.purpose === 'site') {
    if (req.auth.role !== 'ngo_admin') {
      throw HttpError.forbidden('Only the NGO admin can upload site photos');
    }
    const folder = `${env.CLOUDINARY_UPLOAD_FOLDER}/sites`;
    const publicId = `site-${randomUUID()}`;
    return res.json(buildUploadSignature({ publicId, folder }));
  }

  if (!['volunteer', 'site_owner', 'ngo_admin'].includes(req.auth.role)) {
    throw HttpError.forbidden('You do not have permission to upload photos');
  }

  if (input.purpose === 'plant' && !input.siteId) {
    throw HttpError.badRequest('siteId is required for plant uploads');
  }
  if (input.purpose === 'maintenance' && !input.plantId) {
    throw HttpError.badRequest('plantId is required for maintenance uploads');
  }

  const base = env.CLOUDINARY_UPLOAD_FOLDER;
  const folder =
    input.purpose === 'plant'
      ? `${base}/plants/${input.siteId}`
      : `${base}/maintenance/${input.plantId}`;

  const publicId = `${input.purpose}-${randomUUID()}`;
  const sig = buildUploadSignature({ publicId, folder });
  res.json(sig);
}
