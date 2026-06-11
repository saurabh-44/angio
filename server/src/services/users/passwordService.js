import bcrypt from 'bcryptjs';
import { User } from '../../models/User.js';
import { HttpError } from '../../utils/httpError.js';

const BCRYPT_ROUNDS = 12;

export async function changePassword({ userId, currentPassword, newPassword }) {
  const account = await User.findById(userId).select('+passwordHash');
  if (!account) throw HttpError.unauthorized('Account not found');

  const ok = await bcrypt.compare(currentPassword, account.passwordHash);
  if (!ok) throw HttpError.unauthorized('Current password is incorrect');

  if (currentPassword === newPassword) {
    throw HttpError.badRequest('New password must differ from the current one');
  }

  account.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  // First-login flag clears the moment the user picks their own password.
  account.forcePasswordChange = false;
  // Bump tokenVersion so every OTHER session (other devices) dies.
  // The caller re-issues fresh cookies for THIS session.
  account.tokenVersion = (account.tokenVersion ?? 0) + 1;
  await account.save();

  return { tokenVersion: account.tokenVersion };
}
