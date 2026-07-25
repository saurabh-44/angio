import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Plant } from '../../models/Plant.js';
import { Site } from '../../models/Site.js';
import { Species } from '../../models/Species.js';
import { User } from '../../models/User.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The NGO's existing (pre-app) survey data, generated from DataBase.xlsx by
// scripts/generateHistoricalJson.js. Committed to the repo so production
// needs no spreadsheet — the data ships with the code.
const RECORDS = JSON.parse(
  readFileSync(path.resolve(__dirname, '../../data/historicalPlants.json'), 'utf8'),
);

// The historical trees are seeded into a neutral HOLDING site so the seed
// depends on NO pre-existing, environment-specific site. After it runs, an
// admin opens Plants, filters by this site, and moves the trees to their
// real sites (and later assigns them to sponsor orders). The holding site
// is auto-created on first seed and can be deleted once it's emptied.
const HOLDING_SITE_NAME = 'Unassigned — Historical Import';
const SPECIES_NAME = 'Neem';
const BATCH = 'DataBase.xlsx (historical import)';

// Boot-time seed of the NGO's pre-app plantation records.
//
// SAFETY CONTRACT — designed to run on every server start until you remove
// the call, WITHOUT ever losing or corrupting data:
//   • Idempotent (GLOBAL) — keyed by historical.sourceRowId across ALL
//     sites, so a tree that's already been moved/assigned is recognised and
//     never re-created. No duplicates, ever.
//   • Insert-only — never updates or deletes an existing plant.
//   • Self-contained — needs no pre-existing site; it creates its own
//     holding site only when there is actually something to seed.
//   • Non-fatal — any error is logged and swallowed so the server still boots.
//   • Quiet once done — when everything is already seeded it returns silently.
//
// Once the data is in your production DB, comment out the call in server.js
// and redeploy. Trees already moved to real sites or attached to an order are
// safe: they exist, so they're simply skipped.
export async function seedHistoricalPlants({ holdingSiteName = HOLDING_SITE_NAME } = {}) {
  if (env.isTest) return; // never touch the DB during automated tests
  try {
    // An admin owns the holding site and is recorded as the plantedBy of
    // these pre-app trees (there is no real field-planter to attribute).
    const admin =
      (await User.findOne({ role: 'ngo_admin', isPrimary: true }).select('_id').lean()) ||
      (await User.findOne({ role: 'ngo_admin' }).select('_id').lean());
    if (!admin) {
      logger.warn('historical seed: no ngo_admin to own the import — skipping');
      return { created: 0, skipped: 0, reason: 'no-admin' };
    }

    // Idempotency: which source rows already exist ANYWHERE (any site)?
    const existing = await Plant.find({ origin: 'historical' })
      .select('historical.sourceRowId')
      .lean();
    const seen = new Set(existing.map((p) => p.historical?.sourceRowId).filter((n) => n != null));
    const pending = RECORDS.filter((r) => !seen.has(r.sourceRowId));
    if (pending.length === 0) return { created: 0, skipped: RECORDS.length }; // fully seeded — stay quiet

    // Find or create the holding site (only now that we have rows to insert).
    let site = await Site.findOne({ name: new RegExp(`^${escapeRegExp(holdingSiteName)}$`, 'i') })
      .select('_id name')
      .lean();
    if (!site) {
      const doc = await Site.create({
        name: holdingSiteName,
        owner: admin._id,
        createdBy: admin._id,
        notes: 'Auto-created to hold bulk-imported historical trees until an admin moves them to their real sites.',
      });
      site = { _id: doc._id, name: doc.name };
    }

    // Ensure the species master row exists.
    let species = await Species.findOne({ name: new RegExp(`^${escapeRegExp(SPECIES_NAME)}$`, 'i') })
      .select('_id')
      .lean();
    if (!species) {
      species = await Species.create({
        name: SPECIES_NAME,
        scientificName: SPECIES_NAME.toLowerCase() === 'neem' ? 'Azadirachta indica' : undefined,
        createdBy: admin._id,
      });
    }

    // create() (not insertMany) so the publicCode default + name hook run
    // per document, and one bad row can't abort the whole batch.
    let created = 0;
    for (const r of pending) {
      try {
        await Plant.create(buildDoc(r, { site, species, plantedBy: admin }));
        created += 1;
      } catch (err) {
        logger.warn({ err, sourceRowId: r.sourceRowId }, 'historical seed: row failed');
      }
    }
    logger.info(
      { created, skipped: RECORDS.length - pending.length, holdingSite: site.name },
      'historical plants seeded into holding site — move them to real sites from Admin → Plants',
    );
    return { created, skipped: RECORDS.length - pending.length, site: site.name };
  } catch (err) {
    // Never let a seeding problem stop the server from booting.
    logger.error({ err }, 'historical seed failed (non-fatal)');
    return { created: 0, skipped: 0, error: true };
  }
}

function buildDoc(r, { site, species, plantedBy }) {
  return {
    site: site._id,
    origin: 'historical',
    name: `${r.species} #${r.sourceRowId}`,
    species: r.species,
    speciesRef: species._id,
    status: r.status,
    heightCm: r.heightCm ?? undefined,
    geo: r.geo ?? undefined,
    plantedBy: plantedBy._id,
    plantedAt: r.plantedAt ? new Date(r.plantedAt) : new Date(),
    // No donor-facing `notes` — a sponsor's tree view must look identical to a
    // volunteer-planted one. Import provenance lives in `historical.batch`.
    historical: {
      sourceRowId: r.sourceRowId,
      batch: BATCH,
      survival: r.survival ?? undefined,
      healthScore: r.healthScore ?? undefined,
      trunkCircumferenceM: r.trunkCircumferenceM ?? undefined,
      rcdCm: r.rcdCm ?? undefined,
      canopyDiameterM: r.canopyDiameterM ?? undefined,
      agbTon: r.agbTon ?? undefined,
      bgbTon: r.bgbTon ?? undefined,
      totalBiomassTon: r.totalBiomassTon ?? undefined,
      carbonTon: r.carbonTon ?? undefined,
      co2Ton: r.co2Ton ?? undefined,
    },
  };
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
