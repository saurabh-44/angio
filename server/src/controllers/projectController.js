import {
  createProjectSchema,
  listProjectsQuerySchema,
  updateProjectSchema,
} from '../validation/projectSchemas.js';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from '../services/projects/projectService.js';

export async function postProject(req, res) {
  const input = createProjectSchema.parse(req.body);
  const project = await createProject({ input, actor: req.auth });
  res.status(201).json({ project });
}

export async function getProjectList(req, res) {
  const q = listProjectsQuerySchema.parse(req.query);
  const result = await listProjects({ ...q, actor: req.auth });
  res.json(result);
}

export async function getProjectById(req, res) {
  const project = await getProject({ id: req.params.id, actor: req.auth });
  res.json({ project });
}

export async function patchProject(req, res) {
  const patch = updateProjectSchema.parse(req.body);
  const project = await updateProject({ id: req.params.id, patch, actor: req.auth });
  res.json({ project });
}

export async function deleteProjectHandler(req, res) {
  await deleteProject({ id: req.params.id, actor: req.auth });
  res.json({ ok: true });
}
