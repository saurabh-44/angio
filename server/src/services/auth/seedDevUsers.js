import bcrypt from 'bcryptjs';
import { User } from '../../models/User.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

// Seeded dev-only accounts. Every email uses the `.test` TLD which the
// mail config short-circuits to the console — so signing in as any of
// these surfaces the OTP in the server logs instead of bouncing real
// Gmail.
//
// All accounts share a single known password so a developer can sign in
// without having to read the temp-password email flow each time.
const DEV_PASSWORD = 'Test1234!';

const DEV_USERS = [
  // Unassigned volunteers — pick any of these from the assignments page
  { name: 'Aarav Sharma',  email: 'volunteer1@angio.test', role: 'volunteer' },
  { name: 'Vihaan Verma',  email: 'volunteer2@angio.test', role: 'volunteer' },
  { name: 'Diya Patel',    email: 'volunteer3@angio.test', role: 'volunteer' },
  { name: 'Ishaan Singh',  email: 'volunteer4@angio.test', role: 'volunteer' },
  // Unassigned sponsors — record a donation for any of these from /admin
  { name: 'Ananya Rao',    email: 'sponsor1@angio.test',   role: 'sponsor' },
  { name: 'Rohan Mehta',   email: 'sponsor2@angio.test',   role: 'sponsor' },
  { name: 'Sneha Kapoor',  email: 'sponsor3@angio.test',   role: 'sponsor' },
];

export async function seedDevUsers() {
  // Never seed in production. The .test domain trick would still
  // technically work but we don't want demo users sitting in a real DB.
  if (env.isProd) return;

  const created = [];
  for (const u of DEV_USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) continue;

    const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);
    await User.create({
      ...u,
      passwordHash,
      isActive: true,
      // Skip the temp-password rotation so a dev can sign in with the
      // shared password directly. OTP step still applies — that's
      // where you'll see the code in the logs.
      forcePasswordChange: false,
    });
    created.push(u);
  }

  if (created.length === 0) {
    logger.debug('dev users already exist, skip seed');
    return;
  }

  logger.warn(
    {
      count: created.length,
      sharedPassword: DEV_PASSWORD,
      accounts: created.map((u) => `${u.role.padEnd(10)}  ${u.email}`),
    },
    `========== SEEDED ${created.length} DEV USERS — log in with the shared password, OTP prints to console ==========`,
  );
}
