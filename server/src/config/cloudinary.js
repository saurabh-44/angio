import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';
import { HttpError } from '../utils/httpError.js';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw HttpError.server('Cloudinary is not configured on the server');
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

// Signed upload params for direct-from-browser uploads. The client then
// POSTs the file to https://api.cloudinary.com/v1_1/<cloud>/image/upload
// with: file, api_key, timestamp, signature, folder, public_id.
//
// Volunteers in the field upload phone photos that can be several MB —
// keeping that traffic off our Node server matters.
export function buildUploadSignature({ publicId, folder }) {
  ensureConfigured();
  const timestamp = Math.floor(Date.now() / 1000);

  // Signature pins exactly the params we want enforced. If the client
  // tries to upload to a different folder the signature won't match.
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder, public_id: publicId },
    env.CLOUDINARY_API_SECRET,
  );

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    folder,
    publicId,
    timestamp,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
  };
}

export function buildSecureUrl(publicId) {
  ensureConfigured();
  return cloudinary.url(publicId, { secure: true });
}

export { cloudinary };
