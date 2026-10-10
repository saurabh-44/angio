import { z } from 'zod';
import {
  audienceQuerySchema,
  createEventSchema,
  respondEventSchema,
} from '../validation/eventSchemas.js';
import {
  cancelEvent,
  createEvent,
  getEvent,
  listEvents,
  listMyInvites,
  previewAudience,
  respondToEvent,
} from '../services/events/eventService.js';

const listQuerySchema = z.object({ q: z.string().trim().max(200).optional() });

export async function postEvent(req, res) {
  const input = createEventSchema.parse(req.body);
  const result = await createEvent({ input, actor: req.auth });
  res.status(201).json(result);
}

export async function getEventList(req, res) {
  const { q } = listQuerySchema.parse(req.query);
  res.json(await listEvents({ q, actor: req.auth }));
}

export async function getEventAudience(req, res) {
  const q = audienceQuerySchema.parse(req.query);
  res.json(await previewAudience({ ...q, actor: req.auth }));
}

export async function getMyInvites(req, res) {
  res.json(await listMyInvites({ actor: req.auth }));
}

export async function getEventById(req, res) {
  res.json({ event: await getEvent({ id: req.params.id, actor: req.auth }) });
}

export async function postEventResponse(req, res) {
  const { response } = respondEventSchema.parse(req.body);
  res.json(await respondToEvent({ id: req.params.id, response, actor: req.auth }));
}

export async function postEventCancel(req, res) {
  res.json(await cancelEvent({ id: req.params.id, actor: req.auth }));
}
