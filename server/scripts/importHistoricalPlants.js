/**
 * Import the NGO's existing (pre-app) plantation records from an .xlsx
 * survey sheet into the `plants` collection as historical trees.
 *
 * These trees have no sponsor, allocation, or planting photo — and dead
 * ones may have no GPS — so they are stored with `origin: 'historical'`
 * and the extra survey measurements go in the `historical` sub-document.
 * The live app planting flow is untouched (it still requires a sponsor,
 * allocation, GPS and photo via createPlantSchema).
 *
 * The script is IDEMPOTENT: each tree is keyed by (site, sourceRowId), so
 * re-running skips rows already imported for that site.
 *
 * Usage (from server/):
 *   node scripts/importHistoricalPlants.js \
 *     --file "C:/Users/USER/Downloads/DataBase.xlsx" \
 *     --site "Chandkheda" \
 *     [--planted-by <email|userId>] \
 *     [--batch "DataBase.xlsx 2026-07"] \
 *     [--sheet "Dataset"] \
 *     [--dry-run]
 *
 * --dry-run parses, validates and reports WITHOUT writing anything.
 */
import path from 'node:path';
import XLSX from 'xlsx';
import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { Plant } from '../src/models/Plant.js';
import { Site } from '../src/models/Site.js';
import { Species } from '../src/models/Species.js';
import { User } from '../src/models/User.js';

// ── tiny arg parser ─────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { dryRun: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--file') out.file = argv[++i];
    else if (a === '--site') out.site = argv[++i];
    else if (a === '--planted-by') out.plantedBy = argv[++i];
    else if (a === '--batch') out.batch = argv[++i];
    else if (a === '--sheet') out.sheet = argv[++i];
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!out.file) throw new Error('Missing --file <path to .xlsx>');
  if (!out.site) throw new Error('Missing --site <site name or id>');
  return out;
}

// ── value helpers ───────────────────────────────────────────────────────
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
function toBoolYesNo(v) {
  if (v == null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (/^(y|yes|true|1)$/.test(s)) return true;
  if (/^(n|no|false|0)$/.test(s)) return false;
  return undefined;
}
function titleCase(v) {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
// Convert whatever the date cell holds into a UTC-midnight Date for the
// intended calendar day, so the planting day is timezone-stable (an Excel
// serial read as local midnight otherwise drifts a day under toISOString).
function parsePlantedAt(raw) {
  if (raw == null || raw === '') return undefined;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    // Excel 1900 date system: day 0 = 1899-12-30 (accounts for the 1900
    // leap-year bug for all modern dates).
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(raw) * 86_400_000);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return new Date(Date.UTC(raw.getFullYear(), raw.getMonth(), raw.getDate()));
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function validCoords(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false; // 0/0 = "location not surveyed"
  return true;
}

// Fixed column layout of the survey sheet, relative to the "Tree ID"
// header cell in column A. (Verified against the file; the header spans
// two rows — labels then units — and data begins two rows below.)
const COL = {
  treeId: 0,
  date: 1,
  species: 2,
  age: 3,
  survival: 4,
  heightFeet: 5,
  heightM: 6,
  trunkCircM: 7,
  rcdCm: 8,
  canopyNS: 9,
  canopyEW: 10,
  canopyTotal: 11,
  canopyM: 12,
  health: 13,
  disease: 14,
  lat: 15,
  lng: 16,
  // 17 is a spacer column
  agb: 18,
  bgb: 19,
  tb: 20,
  carbon: 21,
  co2: 22,
  co2ton: 23,
};

function readRows(file, sheetName) {
  // Read dates as raw Excel serials (not cellDates) so parsePlantedAt can
  // convert them deterministically to a UTC calendar day.
  const wb = XLSX.readFile(file);
  const name = sheetName || wb.SheetNames[0];
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`Sheet "${name}" not found. Sheets: ${wb.SheetNames.join(', ')}`);
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });
  // Find the header row (the one whose column A is "Tree ID").
  const headerIdx = grid.findIndex((r) => String(r?.[COL.treeId] ?? '').trim().toLowerCase() === 'tree id');
  if (headerIdx === -1) throw new Error('Could not find the "Tree ID" header row in the sheet');
  // Data starts two rows below the header (skip the units sub-header row).
  const dataRows = grid.slice(headerIdx + 2);
  return { sheetName: name, dataRows };
}

async function resolveSite(siteArg) {
  if (mongoose.isValidObjectId(siteArg)) {
    const byId = await Site.findById(siteArg);
    if (byId) return byId;
  }
  const byName = await Site.find({ name: new RegExp(`^${siteArg.trim()}$`, 'i') });
  if (byName.length === 1) return byName[0];
  const all = await Site.find({}).select('name').lean();
  if (byName.length > 1) {
    throw new Error(
      `Multiple sites named "${siteArg}". Pass --site <id> instead. Sites: ` +
        all.map((s) => `${s.name} (${s._id})`).join(', '),
    );
  }
  throw new Error(
    `No site matched "${siteArg}". Available: ${all.map((s) => `${s.name} (${s._id})`).join(', ')}`,
  );
}

async function resolvePlantedBy(plantedByArg, site) {
  if (plantedByArg) {
    if (mongoose.isValidObjectId(plantedByArg)) {
      const u = await User.findById(plantedByArg).select('_id name role').lean();
      if (u) return u;
    }
    const byEmail = await User.findOne({ email: String(plantedByArg).toLowerCase() })
      .select('_id name role')
      .lean();
    if (byEmail) return byEmail;
    throw new Error(`--planted-by "${plantedByArg}" did not match any user`);
  }
  // Default: the site's owner (the incharge). Fall back to the primary admin.
  if (site.owner) {
    const owner = await User.findById(site.owner).select('_id name role').lean();
    if (owner) return owner;
  }
  const admin =
    (await User.findOne({ role: 'ngo_admin', isPrimary: true }).select('_id name role').lean()) ||
    (await User.findOne({ role: 'ngo_admin' }).select('_id name role').lean());
  if (!admin) throw new Error('No user available to set as plantedBy (no site owner, no ngo_admin)');
  return admin;
}

async function ensureSpecies(name, createdBy) {
  const existing = await Species.findOne({ name: new RegExp(`^${name}$`, 'i') })
    .select('_id name')
    .lean();
  if (existing) return existing;
  const created = await Species.create({
    name,
    scientificName: name.toLowerCase() === 'neem' ? 'Azadirachta indica' : undefined,
    createdBy,
  });
  return { _id: created._id, name: created.name };
}

function buildPlantDoc(row, ctx) {
  const treeId = num(row[COL.treeId]);
  if (treeId == null) return null; // not a data row

  const speciesName = (row[COL.species] && String(row[COL.species]).trim()) || ctx.defaultSpeciesName;
  const survival = toBoolYesNo(row[COL.survival]);
  const heightM = num(row[COL.heightM]);
  const lat = num(row[COL.lat]);
  const lng = num(row[COL.lng]);
  const geo = validCoords(lat, lng) ? { lat, lng } : undefined;

  const plantedAt = parsePlantedAt(row[COL.date]);

  const historical = {
    sourceRowId: treeId,
    batch: ctx.batch,
    survival,
    healthScore: titleCase(row[COL.health]),
    trunkCircumferenceM: num(row[COL.trunkCircM]),
    rcdCm: num(row[COL.rcdCm]),
    canopyDiameterM: num(row[COL.canopyM]),
    agbTon: num(row[COL.agb]),
    bgbTon: num(row[COL.bgb]),
    totalBiomassTon: num(row[COL.tb]),
    carbonTon: num(row[COL.carbon]),
    co2Ton: num(row[COL.co2ton]),
  };

  return {
    site: ctx.siteId,
    origin: 'historical',
    name: `${speciesName} #${treeId}`,
    species: speciesName,
    speciesRef: ctx.speciesId,
    status: survival === false ? 'dead' : 'alive',
    heightCm: heightM != null && heightM > 0 ? Math.round(heightM * 100) : undefined,
    geo,
    plantedBy: ctx.plantedById,
    plantedAt: plantedAt ?? ctx.fallbackDate,
    notes: `Imported from ${ctx.batch}`,
    historical,
    _sourceRowId: treeId, // internal, stripped before insert
    _hasDate: !!plantedAt,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const file = path.resolve(args.file);
  const batch = args.batch || `${path.basename(file)} ${new Date().toISOString().slice(0, 10)}`;

  console.log('── Historical plant import ──────────────────────────────');
  console.log('file      :', file);
  console.log('batch     :', batch);
  console.log('mode      :', args.dryRun ? 'DRY RUN (no writes)' : 'LIVE (will write)');

  const { sheetName, dataRows } = readRows(file, args.sheet);
  console.log('sheet     :', sheetName, '| candidate rows:', dataRows.length);

  await connectDb();
  try {
    const site = await resolveSite(args.site);
    const plantedBy = await resolvePlantedBy(args.plantedBy, site);
    const species = await ensureSpecies('Neem', plantedBy._id);
    console.log('site      :', site.name, `(${site._id})`);
    console.log('plantedBy :', plantedBy.name, `(${plantedBy.role})`);
    console.log('species   :', species.name, `(${species._id})`);

    // Idempotency: which source rows are already imported for this site?
    const already = await Plant.find({ site: site._id, origin: 'historical' })
      .select('historical.sourceRowId')
      .lean();
    const seen = new Set(already.map((p) => p.historical?.sourceRowId).filter((n) => n != null));
    if (seen.size) console.log('note      :', seen.size, 'rows already imported for this site — will skip them');

    const ctx = {
      siteId: site._id,
      plantedById: plantedBy._id,
      speciesId: species._id,
      defaultSpeciesName: 'Neem',
      batch,
      fallbackDate: new Date(),
    };

    const summary = {
      candidates: 0,
      created: 0,
      skipped: 0,
      failed: 0,
      noGeo: 0,
      noDate: 0,
      dead: 0,
      errors: [],
    };
    const preview = [];

    for (const row of dataRows) {
      const doc = buildPlantDoc(row, ctx);
      if (!doc) continue; // blank / non-data row
      summary.candidates += 1;
      const rowId = doc._sourceRowId;
      const hasDate = doc._hasDate;
      delete doc._sourceRowId;
      delete doc._hasDate;

      if (seen.has(rowId)) {
        summary.skipped += 1;
        continue;
      }
      if (!doc.geo) summary.noGeo += 1;
      if (!hasDate) summary.noDate += 1;
      if (doc.status === 'dead') summary.dead += 1;

      try {
        if (!args.dryRun) {
          await Plant.create(doc);
        }
        summary.created += 1;
        if (preview.length < 3) {
          preview.push({
            tree: doc.name,
            status: doc.status,
            heightCm: doc.heightCm ?? null,
            geo: doc.geo ? `${doc.geo.lat},${doc.geo.lng}` : null,
            plantedAt: doc.plantedAt?.toISOString().slice(0, 10),
            health: doc.historical.healthScore ?? null,
            co2Ton: doc.historical.co2Ton ?? null,
          });
        }
      } catch (err) {
        summary.failed += 1;
        summary.errors.push({ row: rowId, message: String(err?.message ?? err).slice(0, 200) });
      }
    }

    console.log('\n── Summary ──────────────────────────────────────────────');
    console.log('candidate data rows :', summary.candidates);
    console.log(args.dryRun ? 'would create        :' : 'created             :', summary.created);
    console.log('skipped (dup)       :', summary.skipped);
    console.log('failed              :', summary.failed);
    console.log('   ↳ without GPS    :', summary.noGeo, '(stored without coordinates)');
    console.log('   ↳ without date   :', summary.noDate, '(fell back to today)');
    console.log('   ↳ marked dead    :', summary.dead, '(survival = No)');
    if (preview.length) {
      console.log('\nSample of imported trees:');
      for (const p of preview) console.log('  ', JSON.stringify(p));
    }
    if (summary.errors.length) {
      console.log('\nErrors:');
      for (const e of summary.errors.slice(0, 20)) console.log(`   row ${e.row}: ${e.message}`);
    }
    if (args.dryRun) console.log('\nDRY RUN — nothing was written. Re-run without --dry-run to import.');
  } finally {
    await disconnectDb();
  }
}

main().catch((err) => {
  console.error('\nImport failed:', err.message);
  process.exitCode = 1;
});
