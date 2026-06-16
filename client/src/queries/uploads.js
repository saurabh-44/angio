import { api, uploadToCloudinary } from '@/lib/api.js';

// Two-step upload: ask backend for a signed payload, then push the file
// directly to Cloudinary. Returns { url, publicId } you can persist on a
// Plant or MaintenanceLog.
export async function uploadPhoto(file, opts) {
  const signature = await api.post('/api/uploads/signature', opts);
  return uploadToCloudinary(file, signature);
}
