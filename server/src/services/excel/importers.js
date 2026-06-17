import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { User } from '../../models/User.js';
import { Donation, PAYMENT_METHODS } from '../../models/Donation.js';
import { HttpError } from '../../utils/httpError.js';
import { sendMail } from '../../config/mail.js';
import { accountCreatedTemplate } from '../../mail/templates/accountCreated.js';
import { env } from '../../config/env.js';
import { parseUploadedXlsx } from './excelService.js';

const BCRYPT_ROUNDS = 12;

function generateTempPassword() {
  return randomBytes(9).toString('base64url').slice(0, 12);
}

// Excel cells can come back as numbers, strings, or Date objects
// depending on the type SheetJS infers — normalise to a clean string.
function asString(v) {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

const donorRowSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().toLowerCase(),
  phone: z.string().max(32).optional().nullable(),
  is_active: z.string().optional().nullable(),
});

// Bulk donor importer. NGO admin uploads an .xlsx; for each row:
//   - validate shape
//   - skip if a donor already exists for that email (don't overwrite)
//   - else create the User with a temp password + accountCreated email
// We collect successes + failures per row so the user gets a complete
// report even when a few rows are malformed.
export async function importDonors({ actor, fileBuffer }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can import donors');
  }
  const rows = parseUploadedXlsx(fileBuffer);
  if (!Array.isArray(rows) || rows.length === 0) {
    throw HttpError.badRequest('No rows found in the uploaded workbook');
  }
  if (rows.length > 2000) {
    throw HttpError.badRequest('Up to 2000 rows per import');
  }

  const summary = { rows: rows.length, created: 0, skipped: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];
    const lineNo = i + 2; // header row + 1-indexed
    try {
      const parsed = donorRowSchema.parse({
        name: asString(r.name ?? r.Name ?? r['Donor name']),
        email: asString(r.email ?? r.Email ?? r['Donor email']).toLowerCase(),
        phone: asString(r.phone ?? r.Phone) || null,
        is_active: asString(r.is_active ?? r['Active']) || null,
      });
      const existing = await User.findOne({ email: parsed.email }).select('_id').lean();
      if (existing) {
        summary.skipped += 1;
        continue;
      }
      const tempPassword = generateTempPassword();
      const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
      const isActive = parsed.is_active ? /^(true|1|yes|y)$/i.test(parsed.is_active) : true;
      await User.create({
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone || undefined,
        role: 'sponsor',
        passwordHash,
        forcePasswordChange: true,
        isActive,
        createdBy: actor.userId,
      });
      // Fire-and-forget email — same flow as a manually-created donor.
      void sendMail({
        to: parsed.email,
        subject: 'Your NGO Trees account is ready',
        html: accountCreatedTemplate({
          name: parsed.name,
          role: 'sponsor',
          email: parsed.email,
          tempPassword,
          signInUrl: env.CLIENT_ORIGIN,
        }),
      });
      summary.created += 1;
    } catch (err) {
      summary.failed += 1;
      const msg =
        err?.errors?.[0]?.message ??
        err?.message ??
        'Validation failed';
      summary.errors.push({ row: lineNo, message: String(msg).slice(0, 280) });
    }
  }

  return summary;
}

const donationRowSchema = z.object({
  donor_email: z.string().email().toLowerCase(),
  amount: z.number().positive(),
  method: z.enum(PAYMENT_METHODS).default('other'),
  paid_at: z.coerce.date().optional().nullable(),
  tree_count: z.coerce.number().int().positive().optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
});

export async function importDonations({ actor, fileBuffer }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can import donations');
  }
  const rows = parseUploadedXlsx(fileBuffer);
  if (!Array.isArray(rows) || rows.length === 0) {
    throw HttpError.badRequest('No rows found in the uploaded workbook');
  }
  if (rows.length > 5000) {
    throw HttpError.badRequest('Up to 5000 rows per import');
  }

  // Pre-resolve donors in one query to avoid N+1 lookups.
  const emails = Array.from(
    new Set(
      rows
        .map((r) => asString(r.donor_email ?? r['Donor email']).toLowerCase())
        .filter(Boolean),
    ),
  );
  const donors = await User.find({ email: { $in: emails }, role: 'sponsor' })
    .select('_id email')
    .lean();
  const donorByEmail = Object.fromEntries(donors.map((d) => [d.email, d]));

  const summary = { rows: rows.length, created: 0, failed: 0, errors: [] };
  const docsToInsert = [];

  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];
    const lineNo = i + 2;
    try {
      const amountRaw = r.amount ?? r.Amount ?? r['Amount'];
      const parsed = donationRowSchema.parse({
        donor_email: asString(r.donor_email ?? r['Donor email']).toLowerCase(),
        amount: typeof amountRaw === 'string' ? Number(amountRaw.replace(/[, ]/g, '')) : amountRaw,
        method: asString(r.method ?? r.Method) || 'other',
        paid_at: r.paid_at ?? r['Paid at'] ?? null,
        tree_count: r.tree_count ?? r['Trees sponsored'] ?? null,
        note: asString(r.note ?? r.Note) || null,
      });
      const donor = donorByEmail[parsed.donor_email];
      if (!donor) {
        throw new Error(`No donor found for ${parsed.donor_email}`);
      }
      docsToInsert.push({
        donor: donor._id,
        amount: parsed.amount,
        currency: 'INR',
        method: parsed.method,
        status: 'paid',
        paidAt: parsed.paid_at ?? new Date(),
        treeCount: parsed.tree_count ?? undefined,
        note: parsed.note || undefined,
        recordedBy: actor.userId,
      });
    } catch (err) {
      summary.failed += 1;
      const msg =
        err?.errors?.[0]?.message ??
        err?.message ??
        'Validation failed';
      summary.errors.push({ row: lineNo, message: String(msg).slice(0, 280) });
    }
  }

  if (docsToInsert.length) {
    await Donation.insertMany(docsToInsert, { ordered: false });
    summary.created = docsToInsert.length;
  }
  return summary;
}
