import PDFDocument from 'pdfkit';
import { User } from '../../models/User.js';
import { Donation } from '../../models/Donation.js';
import { Site } from '../../models/Site.js';
import { Plant } from '../../models/Plant.js';
import { Allocation } from '../../models/Allocation.js';
import { HttpError } from '../../utils/httpError.js';
import { summaryForDonor } from '../co2/co2Service.js';

// Certificate types — plantation = "you sponsored X trees", co2 =
// "you offset N kg CO₂". They share a layout; only the title + body
// blurb + the highlighted number differ.
const TITLES = {
  plantation: {
    title: 'Certificate of Plantation',
    badge: 'Verified plantation impact',
  },
  co2: {
    title: 'CO2 Offset Certificate',
    badge: 'Verified climate impact',
  },
};

// Brand-aligned colour tokens. pdfkit accepts CSS-style hex.
const COLORS = {
  primary: '#047857', // emerald-700
  primarySoft: '#ECFDF5', // emerald-50
  accent: '#F59E0B', // amber-500
  text: '#0F172A', // slate-900
  muted: '#64748B', // slate-500
  border: '#E2E8F0', // slate-200
};

// Streams a one-page A4 PDF certificate to `res`. The caller is
// responsible for setting Content-Type + Content-Disposition before
// calling — that way the controller can set a friendly filename.
export async function streamCertificate({ donorId, type, res }) {
  if (!TITLES[type]) throw HttpError.badRequest('Unknown certificate type');

  const donor = await User.findById(donorId).select('name email role').lean();
  if (!donor || donor.role !== 'sponsor') {
    throw HttpError.notFound('Sponsor not found');
  }

  const [summary, donations, allocations] = await Promise.all([
    summaryForDonor({ donorId }),
    Donation.find({ donor: donorId, status: { $ne: 'pending' } })
      .select('amount currency paidAt method')
      .sort({ paidAt: -1 })
      .lean(),
    Allocation.find({ donor: donorId })
      .select('site allocatedAmount targetPlants')
      .populate('site', 'name address')
      .lean(),
  ]);

  const totalDonated = donations.reduce((s, d) => s + (d.amount ?? 0), 0);
  const siteNames = Array.from(
    new Set(allocations.map((a) => a.site?.name).filter(Boolean)),
  );

  // Set up the document and pipe to response.
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'portrait',
    margin: 50,
    info: {
      Title: TITLES[type].title,
      Author: 'Environ',
      Subject: `${TITLES[type].title} for ${donor.name}`,
    },
  });
  doc.pipe(res);

  renderCertificate(doc, {
    type,
    donor,
    summary,
    totalDonated,
    siteNames,
    donations,
  });

  doc.end();
}

function renderCertificate(doc, { type, donor, summary, totalDonated, siteNames, donations }) {
  const pageWidth = doc.page.width;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  // ── Top brand strip + header ────────────────────────────────────
  doc.rect(0, 0, pageWidth, 14).fill(COLORS.primary);

  doc.fillColor(COLORS.primary)
    .font('Helvetica-Bold')
    .fontSize(20)
    .text('Environ', margin, 38);
  doc.fillColor(COLORS.muted)
    .font('Helvetica')
    .fontSize(10)
    .text('Transparent tree-planting', margin, 62);

  // Eyebrow badge top-right
  const badgeText = TITLES[type].badge;
  const badgeWidth = doc.widthOfString(badgeText) + 24;
  doc.roundedRect(pageWidth - margin - badgeWidth, 42, badgeWidth, 24, 12)
    .fillAndStroke(COLORS.primarySoft, COLORS.primary);
  doc.fillColor(COLORS.primary)
    .font('Helvetica')
    .fontSize(10)
    .text(badgeText, pageWidth - margin - badgeWidth + 12, 50);

  // ── Title block ────────────────────────────────────────────────
  let y = 130;
  doc.fillColor(COLORS.text)
    .font('Helvetica-Bold')
    .fontSize(32)
    .text(TITLES[type].title, margin, y, { width: contentWidth, align: 'center' });

  y += 60;
  doc.fillColor(COLORS.muted)
    .font('Helvetica')
    .fontSize(13)
    .text('This is to certify that', margin, y, {
      width: contentWidth,
      align: 'center',
    });

  // Recipient name — big, primary colour
  y += 28;
  doc.fillColor(COLORS.primary)
    .font('Helvetica-Bold')
    .fontSize(28)
    .text(donor.name, margin, y, { width: contentWidth, align: 'center' });

  // ── Body: type-specific narrative ──────────────────────────────
  y += 60;
  doc.fillColor(COLORS.text).font('Helvetica').fontSize(13);
  if (type === 'plantation') {
    doc.text(
      `has sponsored ${summary.treesTotal} ${summary.treesTotal === 1 ? 'tree' : 'trees'} ` +
      `through Environ, of which ${summary.treesAlive} are alive and growing today` +
      (siteNames.length ? ` across ${siteNames.length} planting ${siteNames.length === 1 ? 'site' : 'sites'}` : '') +
      `. Each tree is geo-tagged, photographed at planting, and tracked with weekly maintenance proof.`,
      margin,
      y,
      { width: contentWidth, align: 'center' },
    );
  } else {
    doc.text(
      `has, through ${summary.treesTotal} sponsored ${summary.treesTotal === 1 ? 'tree' : 'trees'} ` +
      `(${summary.treesAlive} currently alive), contributed to an estimated lifetime ` +
      `carbon-dioxide absorption of`,
      margin,
      y,
      { width: contentWidth, align: 'center' },
    );
    y += 56;
    doc.fillColor(COLORS.primary)
      .font('Helvetica-Bold')
      .fontSize(40)
      .text(`${summary.co2Kg.toLocaleString()} kg CO2`, margin, y, {
        width: contentWidth,
        align: 'center',
      });
    y += 50;
    doc.fillColor(COLORS.muted)
      .font('Helvetica')
      .fontSize(11)
      .text(
        `Estimated using a conservative ${22} kg/tree/year sequestration rate. ` +
        `Annualised rate for living trees: ${summary.annualRateKg.toLocaleString()} kg/year.`,
        margin,
        y,
        { width: contentWidth, align: 'center' },
      );
  }

  // ── Stats box ──────────────────────────────────────────────────
  const boxTop = 480;
  const boxHeight = 130;
  doc.roundedRect(margin, boxTop, contentWidth, boxHeight, 12)
    .fillAndStroke('#FFFFFF', COLORS.border);

  const columns = [
    { label: 'Trees sponsored', value: String(summary.treesTotal) },
    { label: 'Trees alive', value: String(summary.treesAlive) },
    {
      label: 'CO2 (estimated)',
      value: `${summary.co2Kg.toLocaleString()} kg`,
    },
    {
      label: 'Total donated',
      value: totalDonated > 0 ? `Rs. ${totalDonated.toLocaleString('en-IN')}` : '—',
    },
  ];
  const colWidth = contentWidth / columns.length;
  columns.forEach((col, i) => {
    const x = margin + colWidth * i;
    doc.fillColor(COLORS.muted)
      .font('Helvetica')
      .fontSize(9)
      .text(col.label.toUpperCase(), x, boxTop + 20, {
        width: colWidth,
        align: 'center',
        characterSpacing: 1.5,
      });
    doc.fillColor(COLORS.text)
      .font('Helvetica-Bold')
      .fontSize(20)
      .text(col.value, x, boxTop + 50, {
        width: colWidth,
        align: 'center',
      });
  });

  // ── Site list (optional, only when fits) ───────────────────────
  if (siteNames.length > 0) {
    const sitesY = boxTop + boxHeight + 32;
    doc.fillColor(COLORS.muted)
      .font('Helvetica')
      .fontSize(10)
      .text('Funded sites:', margin, sitesY, { width: contentWidth, align: 'center' });
    doc.fillColor(COLORS.text)
      .font('Helvetica')
      .fontSize(11)
      .text(siteNames.slice(0, 6).join(' · '), margin, sitesY + 16, {
        width: contentWidth,
        align: 'center',
      });
    if (siteNames.length > 6) {
      doc.fillColor(COLORS.muted)
        .font('Helvetica-Oblique')
        .fontSize(9)
        .text(`+${siteNames.length - 6} more`, margin, sitesY + 36, {
          width: contentWidth,
          align: 'center',
        });
    }
  }

  // ── Footer: date + reference ──────────────────────────────────
  const footerY = doc.page.height - 100;
  doc.strokeColor(COLORS.border)
    .lineWidth(0.5)
    .moveTo(margin, footerY - 10)
    .lineTo(pageWidth - margin, footerY - 10)
    .stroke();

  const issuedOn = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const refId = `NGO-${type.toUpperCase()}-${donor._id?.toString().slice(-8) ?? ''}-${Date.now().toString(36).toUpperCase()}`;

  doc.fillColor(COLORS.muted)
    .font('Helvetica')
    .fontSize(9);
  doc.text(`Issued on ${issuedOn}`, margin, footerY, { continued: false });
  doc.text(`Reference: ${refId}`, margin, footerY + 14);

  doc.fillColor(COLORS.muted)
    .font('Helvetica')
    .fontSize(9)
    .text('Verify online at the donor dashboard', margin, footerY, {
      width: contentWidth,
      align: 'right',
    });
  doc.text('ngotrees.example / donor', margin, footerY + 14, {
    width: contentWidth,
    align: 'right',
  });

  // Discarded but kept for future signature panel position reference.
  void donations;
}
