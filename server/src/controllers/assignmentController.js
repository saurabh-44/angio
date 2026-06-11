import {
  createAssignmentSchema,
  listAssignmentsQuerySchema,
  updateAssignmentSchema,
} from '../validation/assignmentSchemas.js';
import {
  createAssignment,
  deleteAssignment,
  listAssignments,
  updateAssignment,
} from '../services/assignments/assignmentService.js';

export async function postAssignment(req, res) {
  const input = createAssignmentSchema.parse(req.body);
  const assignment = await createAssignment({ input, actor: req.auth });
  res.status(201).json({ assignment });
}

export async function getAssignments(req, res) {
  const q = listAssignmentsQuerySchema.parse(req.query);
  const result = await listAssignments({ ...q, actor: req.auth });
  res.json(result);
}

export async function patchAssignment(req, res) {
  const patch = updateAssignmentSchema.parse(req.body);
  const assignment = await updateAssignment({ id: req.params.id, patch, actor: req.auth });
  res.json({ assignment });
}

export async function deleteAssignmentHandler(req, res) {
  await deleteAssignment({ id: req.params.id, actor: req.auth });
  res.json({ ok: true });
}
