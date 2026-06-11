import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { User } from '../../models/User.js';
import { HttpError } from '../../utils/httpError.js';
import { sendMail } from '../../config/mail.js';
import { accountCreatedTemplate } from '../../mail/templates/accountCreated.js';
import { env } from '../../config/env.js';

const BCRYPT_ROUNDS = 12;

// 12-char URL-safe temp password. Enough entropy for a one-shot value
// the recipient rotates on first login.
function generateTempPassword() {
  return randomBytes(9).toString('base64url').slice(0, 12);
}

// Creates a donor / site_owner / volunteer / ngo_admin account and emails
// the recipient a temporary password. The new user is forced to change
// the password on first sign-in (forcePasswordChange=true).
//
// `actor` is the authenticated principal performing the create.
// Authorization: only ngo_admin may create users; only the PRIMARY
// ngo_admin may create another ngo_admin. (The route layer enforces this
// before calling, but we double-check defensively.)
export async function createUser({ name, email, phone, role, actor }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can create accounts');
  }
  if (role === 'ngo_admin' && !actor.isPrimary) {
    throw HttpError.forbidden(
      'Only the primary NGO admin can create additional NGO admins',
    );
  }

  const existing = await User.findOne({ email }).select('_id').lean();
  if (existing) throw HttpError.conflict('An account with this email already exists');

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

  const user = await User.create({
    name,
    email,
    phone: phone || undefined,
    role,
    passwordHash,
    forcePasswordChange: true,
    isActive: true,
    createdBy: actor.userId,
  });

  void sendMail({
    to: email,
    subject: 'Your NGO Trees account is ready',
    html: accountCreatedTemplate({
      name,
      role,
      email,
      tempPassword,
      signInUrl: env.CLIENT_ORIGIN,
    }),
  });

  return user.toObject();
}

export async function listUsers({ role, q, page, limit, actor }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can list users');
  }
  const filter = {};
  if (role) filter.role = role;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function getUser({ id, actor }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can view users');
  }
  const user = await User.findById(id).lean();
  if (!user) throw HttpError.notFound('User not found');
  return user;
}

export async function updateUser({ id, patch, actor }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can update users');
  }
  const target = await User.findById(id);
  if (!target) throw HttpError.notFound('User not found');

  // Non-primary ngo_admins cannot modify another ngo_admin.
  if (target.role === 'ngo_admin' && !actor.isPrimary && String(target._id) !== actor.userId) {
    throw HttpError.forbidden('Only the primary NGO admin can modify another NGO admin');
  }

  if (patch.name !== undefined) target.name = patch.name;
  if (patch.phone !== undefined) target.phone = patch.phone || undefined;
  if (patch.isActive !== undefined) {
    // Guard: an admin can't deactivate themselves (locks them out of
    // every endpoint instantly), and the primary NGO admin can't be
    // deactivated by anyone (org would lose root access).
    if (target.isActive && patch.isActive === false) {
      if (String(target._id) === actor.userId) {
        throw HttpError.badRequest('You cannot deactivate your own account');
      }
      if (target.isPrimary) {
        throw HttpError.forbidden('The primary NGO admin cannot be deactivated');
      }
      // Deactivating someone kills every outstanding session for them.
      target.tokenVersion = (target.tokenVersion ?? 0) + 1;
    }
    target.isActive = patch.isActive;
  }
  await target.save();
  return target.toObject();
}

export async function deactivateUser({ id, actor }) {
  return updateUser({ id, patch: { isActive: false }, actor });
}

export async function deleteUser({ id, actor }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can remove users');
  }
  const target = await User.findById(id);
  if (!target) throw HttpError.notFound('User not found');
  if (target.role === 'ngo_admin' && !actor.isPrimary) {
    throw HttpError.forbidden('Only the primary NGO admin can remove an NGO admin');
  }
  if (target.isPrimary) {
    throw HttpError.forbidden('The primary NGO admin cannot be removed');
  }
  // Bump tokenVersion to kill the user's sessions, then soft-delete.
  target.tokenVersion = (target.tokenVersion ?? 0) + 1;
  target.isActive = false;
  await target.save();
  await User.softDeleteById(id, actor.userId);
}

// Issue a fresh temp password and email it. Useful when the user can't
// log in and forgot-password isn't available to them (e.g. they don't
// own the email anymore — NGO admin handles this manually).
export async function resetUserPassword({ id, actor }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can reset passwords');
  }
  const target = await User.findById(id);
  if (!target) throw HttpError.notFound('User not found');

  const tempPassword = generateTempPassword();
  target.passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
  target.forcePasswordChange = true;
  target.tokenVersion = (target.tokenVersion ?? 0) + 1;
  await target.save();

  void sendMail({
    to: target.email,
    subject: 'Your NGO Trees password was reset',
    html: accountCreatedTemplate({
      name: target.name,
      role: target.role,
      email: target.email,
      tempPassword,
      signInUrl: env.CLIENT_ORIGIN,
    }),
  });
}
