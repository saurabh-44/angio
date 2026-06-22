import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Plant } from '../../models/Plant.js';
import { Site } from '../../models/Site.js';
import { HttpError } from '../../utils/httpError.js';
import { publicTreeUrl } from './qrService.js';

// Layout — 3 columns × 5 rows per A4 page, 15 stickers per sheet.
// Larger cells than a tight grid so each QR scans cleanly even after
// the sticker has been exposed to weather for a few months.
const COLS = 3;
const ROWS = 5;
const PER_PAGE = COLS * ROWS;

const PALETTE = {
  primary: '#047857',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
};

// Streams an A4 PDF of QR stickers for every alive plant on a site.
// Caller decides Content-Type / filename headers; this just pipes bytes.
//
// `options.status` accepts 'alive' (default), 'all', or any valid Plant
// status — useful for an admin who wants to reprint after a re-survey.
export async function streamBulkQrSheet({ siteId, actor, res, options = {} }) {
  const site = await Site.findById(siteId).select('name address owner').lean();
  if (!site) throw HttpError.notFound('Site not found');

  // Authorization — NGO admin everywhere, site_owner own sites only.
  if (actor.role === 'ngo_admin') {
    // ok
  } else if (actor.role === 'site_owner') {
    if (String(site.owner) !== actor.userId) {
      throw HttpError.forbidden('You can only print QR sheets for your own sites');
    }
  } else {
    throw HttpError.forbidden('You do not have permission to print QR sheets');
  }

  const filter = { site: site._id };
  if (options.status && options.status !== 'all') {
    filter.status = options.status;
  } else if (!options.status) {
    filter.status = 'alive';
  }

  // Safety cap — a site shouldn't realistically have > 2000 alive
  // plants; if it does we still print the first 2000 sorted by
  // planted-at desc (most recent first).
  const plants = await Plant.find(filter)
    .select('publicCode species plantedAt status')
    .sort({ plantedAt: 1 })
    .limit(2000)
    .lean();

  if (plants.length === 0) {
    throw HttpError.badRequest('No plants on this site to print');
  }

  // Render every QR up-front so the PDF stream can include them in
  // any order. 240px PNG → scaled down to the cell size in the PDF,
  // gives a crisp print at 600 dpi.
  const qrPngs = await Promise.all(
    plants.map((p) =>
      QRCode.toBuffer(publicTreeUrl(p.publicCode), {
        type: 'png',
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 240,
        color: { dark: PALETTE.primary, light: '#ffffff' },
      }),
    ),
  );

  const doc = new PDFDocument({
    size: 'A4',
    // margin:0 — we position everything absolutely with our own `margin`
    // constant below. A non-zero pdfkit margin sets maxY = height - margin,
    // and the footer (drawn at height-24) sits past it, which made
    // doc.text() auto-add blank pages (1 sheet rendered as 3 pages).
    margin: 0,
    info: {
      Title: `Tree QR stickers — ${site.name}`,
      Author: 'Environ',
      Subject: `QR sheet for ${plants.length} trees at ${site.name}`,
    },
  });
  doc.pipe(res);

  const margin = 28;
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const contentWidth = pageWidth - margin * 2;
  const headerHeight = 64;
  const footerHeight = 24;
  const cellAreaHeight = pageHeight - margin * 2 - headerHeight - footerHeight;
  const cellWidth = contentWidth / COLS;
  const cellHeight = cellAreaHeight / ROWS;
  // QR fills ~62% of the smaller dimension — leaves room for two
  // lines of label text below.
  const qrSize = Math.min(cellWidth, cellHeight) * 0.62;

  const totalPages = Math.ceil(plants.length / PER_PAGE);
  let pageNum = 1;
  renderHeader(doc, { site, totalCount: plants.length, pageNum, totalPages });
  renderFooter(doc, { pageNum, totalPages });

  for (let i = 0; i < plants.length; i += 1) {
    const localIdx = i % PER_PAGE;

    // New page on overflow (after the first sticker is rendered).
    if (i > 0 && localIdx === 0) {
      doc.addPage();
      pageNum += 1;
      renderHeader(doc, { site, totalCount: plants.length, pageNum, totalPages });
      renderFooter(doc, { pageNum, totalPages });
    }

    const row = Math.floor(localIdx / COLS);
    const col = localIdx % COLS;
    const cellX = margin + col * cellWidth;
    const cellY = margin + headerHeight + row * cellHeight;

    // Cut-line border — light grey, helps when scissors come out.
    doc.strokeColor(PALETTE.border).lineWidth(0.5);
    doc.rect(cellX + 1, cellY + 1, cellWidth - 2, cellHeight - 2).stroke();

    // QR — centred in cell, 8pt down from top.
    const qrX = cellX + (cellWidth - qrSize) / 2;
    const qrY = cellY + 10;
    doc.image(qrPngs[i], qrX, qrY, { width: qrSize, height: qrSize });

    // Label block under QR — species (bold) + code (mono).
    const labelY = qrY + qrSize + 6;
    doc.fillColor(PALETTE.text)
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(plants[i].species ?? 'Tree', cellX + 4, labelY, {
        width: cellWidth - 8,
        align: 'center',
        ellipsis: true,
      });
    doc.fillColor(PALETTE.muted)
      .font('Courier')
      .fontSize(7)
      .text(plants[i].publicCode, cellX + 4, labelY + 12, {
        width: cellWidth - 8,
        align: 'center',
      });
  }

  doc.end();
}

function renderHeader(doc, { site, totalCount, pageNum, totalPages }) {
  const margin = 28;
  doc.rect(0, 0, doc.page.width, 6).fill(PALETTE.primary);

  doc.fillColor(PALETTE.primary)
    .font('Helvetica-Bold')
    .fontSize(13)
    .text('Environ', margin, 16);
  doc.fillColor(PALETTE.text)
    .font('Helvetica-Bold')
    .fontSize(15)
    .text(site.name, margin, 32);
  doc.fillColor(PALETTE.muted)
    .font('Helvetica')
    .fontSize(9)
    .text(
      `Tree stickers · ${totalCount} ${totalCount === 1 ? 'tree' : 'trees'} · Page ${pageNum} / ${totalPages}`,
      margin,
      52,
    );

  doc.strokeColor(PALETTE.border)
    .lineWidth(0.5)
    .moveTo(margin, 70)
    .lineTo(doc.page.width - margin, 70)
    .stroke();
}

function renderFooter(doc, { pageNum, totalPages }) {
  const margin = 28;
  const y = doc.page.height - 24;
  doc.fillColor(PALETTE.muted)
    .font('Helvetica')
    .fontSize(8);
  doc.text(
    `Scan any code to see the tree's verified record.`,
    margin,
    y,
    { width: doc.page.width - margin * 2, align: 'left' },
  );
  doc.text(`${pageNum} / ${totalPages}`, margin, y, {
    width: doc.page.width - margin * 2,
    align: 'right',
  });
}
