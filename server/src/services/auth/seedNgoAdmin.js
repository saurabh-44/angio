import bcrypt from 'bcryptjs';
import { User } from '../../models/User.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

// Seeds the primary NGO admin from env vars when no ngo_admin exists.
// Idempotent — safe to run on every boot. The seeded account is created
// with forcePasswordChange=true so the delivery password is rotated on
// first login.
export async function seedNgoAdmin() {
  if (!env.PRIMARY_NGO_ADMIN_EMAIL || !env.PRIMARY_NGO_ADMIN_PASSWORD) {
    logger.info(
      'PRIMARY_NGO_ADMIN_EMAIL/PASSWORD not set, skipping primary NGO admin seed',
    );
    return;
  }

  const existing = await User.findOne({ email: env.PRIMARY_NGO_ADMIN_EMAIL });
  if (existing) {
    logger.debug('primary NGO admin already exists, skip seed');
    return;
  }

  // If no primary ngo_admin exists yet (first boot, or the original was
  // removed from the DB), seed this one as primary — they get the
  // "remove other ngo_admins" privilege.
  const hasPrimary = Boolean(await User.exists({ role: 'ngo_admin', isPrimary: true }));

  const passwordHash = await bcrypt.hash(env.PRIMARY_NGO_ADMIN_PASSWORD, 12);
  await User.create({
    email: env.PRIMARY_NGO_ADMIN_EMAIL,
    passwordHash,
    name: env.PRIMARY_NGO_ADMIN_NAME,
    role: 'ngo_admin',
    isActive: true,
    forcePasswordChange: true,
    isPrimary: !hasPrimary,
  });
  logger.info(
    { email: env.PRIMARY_NGO_ADMIN_EMAIL, primary: !hasPrimary },
    'seeded primary NGO admin (force password change on first login)',
  );
}
