import { z } from 'zod';
import { Types } from 'mongoose';

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), {
  message: 'Invalid id',
});

export const uploadSignatureSchema = z.object({
  purpose: z.enum(['plant', 'maintenance']),
  siteId: objectId.optional(),
  plantId: objectId.optional(),
});
