import { createApp } from './app.js';
import { connectDb, disconnectDb } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { seedNgoAdmin } from './services/auth/seedNgoAdmin.js';
import { seedDevUsers } from './services/auth/seedDevUsers.js';
import { backfillPlantPublicCodes } from './services/plants/backfillCodes.js';
import { seedHistoricalPlants } from './services/plants/seedHistoricalPlants.js';

async function main() {
  await connectDb();
  await seedNgoAdmin();
  await seedDevUsers();
  await backfillPlantPublicCodes();
  // One-time seed of the NGO's pre-app plantation records (from
  // src/data/historicalPlants.json). Idempotent + non-fatal, so it's safe to
  // leave running across restarts. It needs NO pre-existing site — the trees
  // land in an auto-created "Unassigned — Historical Import" holding site;
  // afterwards, move them to their real sites from Admin → Plants. ONCE the
  // data is in your production DB, comment out the line below and redeploy.
  await seedHistoricalPlants();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'angio server listening');
  });

  const shutdown = async (signal) => {
    logger.info({ signal }, 'shutting down');
    server.close();
    await disconnectDb();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'unhandledRejection');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaughtException');
    process.exit(1);
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'failed to start');
  process.exit(1);
});
