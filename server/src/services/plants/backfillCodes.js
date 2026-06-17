import { randomBytes } from 'node:crypto';
import { Plant } from '../../models/Plant.js';
import { logger } from '../../utils/logger.js';

// Boot-time migration that adds `publicCode` to any pre-existing plants
// that were created before the field existed. Idempotent — once a plant
// has a code we never touch it again.
//
// Why this lives in a script vs. a schema migration tool: this app's
// scale (< 100 active users) doesn't justify a migrations framework,
// and the cost of one pass at boot is trivial.
export async function backfillPlantPublicCodes() {
  const cursor = Plant.find({
    $or: [{ publicCode: { $exists: false } }, { publicCode: null }, { publicCode: '' }],
  })
    .select('_id')
    .cursor();

  let count = 0;
  for await (const plant of cursor) {
    // Retry a couple of times in the astronomically unlikely event of
    // a collision — base64url 9-byte gives us 72 bits of entropy.
    let attempts = 0;
    while (attempts < 3) {
      attempts += 1;
      const code = randomBytes(9).toString('base64url').slice(0, 12);
      try {
        await Plant.updateOne({ _id: plant._id }, { $set: { publicCode: code } });
        count += 1;
        break;
      } catch (err) {
        if (err?.code === 11000 && attempts < 3) continue;
        throw err;
      }
    }
  }
  if (count > 0) {
    logger.info({ count }, 'backfilled publicCode on existing plants');
  }
}
