import {
  createAllocationSchema,
  createDonationSchema,
  listAllocationsQuerySchema,
  listDonationsQuerySchema,
  updateAllocationSchema,
  updateDonationSchema,
} from '../validation/donationSchemas.js';
import {
  createAllocation,
  createDonation,
  deleteAllocation,
  getDonation,
  listAllocations,
  listDonations,
  updateAllocation,
  updateDonation,
} from '../services/donations/donationService.js';

export async function postDonation(req, res) {
  const input = createDonationSchema.parse(req.body);
  const donation = await createDonation({ input, actor: req.auth });
  res.status(201).json({ donation });
}

export async function getDonations(req, res) {
  const q = listDonationsQuerySchema.parse(req.query);
  const result = await listDonations({ ...q, actor: req.auth });
  res.json(result);
}

export async function getDonationById(req, res) {
  const donation = await getDonation({ id: req.params.id, actor: req.auth });
  res.json({ donation });
}

export async function patchDonation(req, res) {
  const patch = updateDonationSchema.parse(req.body);
  const donation = await updateDonation({ id: req.params.id, patch, actor: req.auth });
  res.json({ donation });
}

export async function postAllocation(req, res) {
  const input = createAllocationSchema.parse(req.body);
  const allocation = await createAllocation({ input, actor: req.auth });
  res.status(201).json({ allocation });
}

export async function getAllocations(req, res) {
  const q = listAllocationsQuerySchema.parse(req.query);
  const result = await listAllocations({ ...q, actor: req.auth });
  res.json(result);
}

export async function patchAllocation(req, res) {
  const patch = updateAllocationSchema.parse(req.body);
  const allocation = await updateAllocation({ id: req.params.id, patch, actor: req.auth });
  res.json({ allocation });
}

export async function deleteAllocationHandler(req, res) {
  await deleteAllocation({ id: req.params.id, actor: req.auth });
  res.json({ ok: true });
}
