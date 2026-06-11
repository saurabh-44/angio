import {
  createSiteSchema,
  listSitesQuerySchema,
  updateSiteSchema,
} from '../validation/siteSchemas.js';
import {
  createSite,
  deleteSite,
  getSite,
  listSites,
  updateSite,
} from '../services/sites/siteService.js';

export async function postSite(req, res) {
  const input = createSiteSchema.parse(req.body);
  const site = await createSite({ input, actor: req.auth });
  res.status(201).json({ site });
}

export async function getSites(req, res) {
  const q = listSitesQuerySchema.parse(req.query);
  const result = await listSites({ ...q, actor: req.auth });
  res.json(result);
}

export async function getSiteById(req, res) {
  const site = await getSite({ id: req.params.id, actor: req.auth });
  res.json({ site });
}

export async function patchSite(req, res) {
  const patch = updateSiteSchema.parse(req.body);
  const site = await updateSite({ id: req.params.id, patch, actor: req.auth });
  res.json({ site });
}

export async function deleteSiteHandler(req, res) {
  await deleteSite({ id: req.params.id, actor: req.auth });
  res.json({ ok: true });
}
