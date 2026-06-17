import {
  createSpeciesSchema,
  listSpeciesQuerySchema,
  updateSpeciesSchema,
} from '../validation/speciesSchemas.js';
import {
  createSpecies,
  deleteSpecies,
  getSpecies,
  listSpecies,
  updateSpecies,
} from '../services/species/speciesService.js';

export async function postSpecies(req, res) {
  const input = createSpeciesSchema.parse(req.body);
  const species = await createSpecies({ input, actor: req.auth });
  res.status(201).json({ species });
}

export async function getSpeciesList(req, res) {
  const q = listSpeciesQuerySchema.parse(req.query);
  const result = await listSpecies({ ...q, actor: req.auth });
  res.json(result);
}

export async function getSpeciesById(req, res) {
  const species = await getSpecies({ id: req.params.id, actor: req.auth });
  res.json({ species });
}

export async function patchSpecies(req, res) {
  const patch = updateSpeciesSchema.parse(req.body);
  const species = await updateSpecies({ id: req.params.id, patch, actor: req.auth });
  res.json({ species });
}

export async function deleteSpeciesHandler(req, res) {
  await deleteSpecies({ id: req.params.id, actor: req.auth });
  res.json({ ok: true });
}
