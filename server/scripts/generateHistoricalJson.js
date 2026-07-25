/**
 * One-off generator: parse the NGO's survey .xlsx and emit a committed
 * JSON file the startup seed consumes. Run this again only if the source
 * spreadsheet changes.
 *
 *   node scripts/generateHistoricalJson.js ["C:/path/DataBase.xlsx"] [SheetName]
 *
 * Output: src/data/historicalPlants.json (one normalised record per tree,
 * in the exact shape the seed maps into the plants collection).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || 'C:/Users/USER/Downloads/DataBase.xlsx';
const SHEET = process.argv[3];
const OUT = path.resolve(__dirname, '../src/data/historicalPlants.json');

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
function validCoords(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}
function parsePlantedAt(raw) {
  if (raw == null || raw === '') return undefined;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(raw) * 86_400_000);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return new Date(Date.UTC(raw.getFullYear(), raw.getMonth(), raw.getDate()));
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// Fixed column layout of the survey sheet, relative to "Tree ID" in col A.
const COL = {
  treeId: 0, date: 1, species: 2, survival: 4, heightM: 6, trunkCircM: 7,
  rcdCm: 8, canopyM: 12, health: 13, lat: 15, lng: 16,
  agb: 18, bgb: 19, tb: 20, carbon: 21, co2ton: 23,
};

const wb = XLSX.readFile(FILE);
const name = SHEET || wb.SheetNames[0];
const ws = wb.Sheets[name];
if (!ws) throw new Error(`Sheet "${name}" not found. Sheets: ${wb.SheetNames.join(', ')}`);
const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });
const headerIdx = grid.findIndex(
  (r) => String(r?.[COL.treeId] ?? '').trim().toLowerCase() === 'tree id',
);
if (headerIdx === -1) throw new Error('Could not find the "Tree ID" header row');
const dataRows = grid.slice(headerIdx + 2);

const records = [];
for (const row of dataRows) {
  const treeId = num(row[COL.treeId]);
  if (treeId == null) continue;
  const species = (row[COL.species] && String(row[COL.species]).trim()) || 'Neem';
  const survival = toBoolYesNo(row[COL.survival]);
  const heightM = num(row[COL.heightM]);
  const lat = num(row[COL.lat]);
  const lng = num(row[COL.lng]);
  const plantedAt = parsePlantedAt(row[COL.date]);
  records.push({
    sourceRowId: treeId,
    species,
    plantedAt: plantedAt ? plantedAt.toISOString() : null,
    status: survival === false ? 'dead' : 'alive',
    heightCm: heightM != null && heightM > 0 ? Math.round(heightM * 100) : null,
    geo: validCoords(lat, lng) ? { lat, lng } : null,
    survival: survival ?? null,
    healthScore: titleCase(row[COL.health]) ?? null,
    trunkCircumferenceM: num(row[COL.trunkCircM]) ?? null,
    rcdCm: num(row[COL.rcdCm]) ?? null,
    canopyDiameterM: num(row[COL.canopyM]) ?? null,
    agbTon: num(row[COL.agb]) ?? null,
    bgbTon: num(row[COL.bgb]) ?? null,
    totalBiomassTon: num(row[COL.tb]) ?? null,
    carbonTon: num(row[COL.carbon]) ?? null,
    co2Ton: num(row[COL.co2ton]) ?? null,
  });
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
console.log(`Wrote ${records.length} records to ${OUT}`);
console.log('  alive:', records.filter((r) => r.status === 'alive').length,
  '| dead:', records.filter((r) => r.status === 'dead').length,
  '| without geo:', records.filter((r) => !r.geo).length);
