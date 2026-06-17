// Thin wrapper around SheetJS so each call-site doesn't reimport XLSX
// + repeat the same options. Read + write + the few formatting bits we
// actually use across exports/imports.
import * as XLSX from 'xlsx';

// Build a workbook from a list of named sheets, each with `headers`
// (column order + display labels) and `rows` (already shaped objects
// matching the header keys).
//
// We map column keys → labels manually so we can use snake_case keys
// internally but human-readable labels in the actual cells.
export function buildWorkbook(sheets) {
  const wb = XLSX.utils.book_new();
  for (const { name, columns, rows } of sheets) {
    const keys = columns.map((c) => c.key);
    const labels = columns.map((c) => c.label);

    // Render rows in column order; missing keys become empty strings so
    // an Excel viewer doesn't show `undefined`.
    const aoa = [labels];
    for (const row of rows) {
      aoa.push(keys.map((k) => formatCell(row?.[k])));
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    // Auto-fit-ish column widths. SheetJS doesn't compute real pixel
    // widths so we estimate from the longest visible string. Cap at 60
    // to avoid one giant column blowing the layout.
    ws['!cols'] = columns.map((c, ci) => {
      const max = Math.max(
        c.label.length,
        ...rows.map((r) => String(r?.[c.key] ?? '').length),
      );
      return { wch: Math.min(60, Math.max(10, max + 2)) };
    });
    XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(name));
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function formatCell(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return value;
}

// Excel caps sheet names at 31 chars and bans `\/?*[]:` — silently
// truncate + replace so a long site name doesn't blow up the export.
function sanitizeSheetName(name) {
  return String(name).replace(/[\\/?*[\]:]/g, '_').slice(0, 31);
}

// Parses an uploaded xlsx into JSON rows.
// - `sheet` picks the named sheet (defaults to the first one)
// - `defval` decides what missing cells become — null keeps row shape
//   uniform so downstream validation sees explicit nulls vs undefined.
export function parseUploadedXlsx(buffer, options = {}) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = options.sheet ?? wb.SheetNames[0];
  if (!sheetName) throw new Error('Workbook has no sheets');
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });
  return rows;
}
