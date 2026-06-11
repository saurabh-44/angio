import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
} from '../validation/userSchemas.js';
import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  resetUserPassword,
  updateUser,
} from '../services/users/userService.js';
import { HttpError } from '../utils/httpError.js';

export async function postUser(req, res) {
  const input = createUserSchema.parse(req.body);
  const user = await createUser({ ...input, actor: req.auth });
  res.status(201).json({ user });
}

export async function getUsers(req, res) {
  const q = listUsersQuerySchema.parse(req.query);
  const result = await listUsers({ ...q, actor: req.auth });
  res.json(result);
}

export async function getUserById(req, res) {
  const user = await getUser({ id: req.params.id, actor: req.auth });
  res.json({ user });
}

export async function patchUser(req, res) {
  const patch = updateUserSchema.parse(req.body);
  const user = await updateUser({ id: req.params.id, patch, actor: req.auth });
  res.json({ user });
}

export async function deleteUserHandler(req, res) {
  if (req.params.id === req.auth.userId) {
    throw HttpError.badRequest('You cannot remove your own account');
  }
  await deleteUser({ id: req.params.id, actor: req.auth });
  res.json({ ok: true });
}

export async function postResetUserPassword(req, res) {
  await resetUserPassword({ id: req.params.id, actor: req.auth });
  res.json({ ok: true });
}
