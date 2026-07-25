import {
  attachPlantsSchema,
  createMaintenanceSchema,
  createPlantSchema,
  listMaintenanceQuerySchema,
  listPlantsQuerySchema,
  movePlantsSchema,
  updatePlantSchema,
} from '../validation/plantSchemas.js';
import {
  attachPlantsToAllocation,
  createMaintenanceLog,
  createPlant,
  deleteMaintenance,
  deletePlant,
  getPlant,
  listAttachablePlants,
  listMaintenance,
  listPlants,
  movePlantsToSite,
  updatePlant,
} from '../services/plants/plantService.js';

export async function postPlant(req, res) {
  const input = createPlantSchema.parse(req.body);
  const plant = await createPlant({ input, actor: req.auth });
  res.status(201).json({ plant });
}

export async function getPlants(req, res) {
  const q = listPlantsQuerySchema.parse(req.query);
  const result = await listPlants({ ...q, actor: req.auth });
  res.json(result);
}

export async function getPlantById(req, res) {
  const plant = await getPlant({ id: req.params.id, actor: req.auth });
  res.json({ plant });
}

export async function patchPlant(req, res) {
  const patch = updatePlantSchema.parse(req.body);
  const plant = await updatePlant({ id: req.params.id, patch, actor: req.auth });
  res.json({ plant });
}

export async function deletePlantHandler(req, res) {
  await deletePlant({ id: req.params.id, actor: req.auth });
  res.json({ ok: true });
}

export async function postMaintenance(req, res) {
  const input = createMaintenanceSchema.parse(req.body);
  const log = await createMaintenanceLog({ input, actor: req.auth });
  res.status(201).json({ log });
}

export async function getMaintenance(req, res) {
  const q = listMaintenanceQuerySchema.parse(req.query);
  const result = await listMaintenance({ ...q, actor: req.auth });
  res.json(result);
}

export async function deleteMaintenanceHandler(req, res) {
  await deleteMaintenance({ id: req.params.id, actor: req.auth });
  res.json({ ok: true });
}

// Assigning existing (already-planted, unsponsored) trees to an order.
// Mounted on the allocations router: /api/allocations/:id/attachable-plants
// and /api/allocations/:id/attach-plants.
export async function getAttachablePlants(req, res) {
  const result = await listAttachablePlants({ allocationId: req.params.id, actor: req.auth });
  res.json(result);
}

export async function postAttachPlants(req, res) {
  const { plantIds } = attachPlantsSchema.parse(req.body);
  const result = await attachPlantsToAllocation({
    allocationId: req.params.id,
    plantIds,
    actor: req.auth,
  });
  res.json(result);
}

// Re-home unsponsored trees to a different site: POST /api/plants/move-site
export async function postMovePlants(req, res) {
  const { plantIds, site } = movePlantsSchema.parse(req.body);
  const result = await movePlantsToSite({ plantIds, site, actor: req.auth });
  res.json(result);
}
