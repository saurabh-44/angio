// Per-schema plugin that:
//   1. Replaces Mongo's `_id` with a string `id` in toObject/toJSON output.
//   2. Drops `__v` (version key) — clients don't need it.
//   3. Strips `passwordHash` defensively, so even an accidental
//      res.json(userDoc) can't leak the bcrypt hash.
//
// Why per-schema instead of a global mongoose.plugin(): global plugins
// only apply to schemas registered AFTER the plugin is installed. Our
// entrypoint imports the route tree (which imports every model) before
// it imports config/db.js, so a global plugin registered in db.js silently
// never fires for any of our models. Per-schema is order-independent.
export function jsonTransformPlugin(schema) {
  const transform = (_doc, ret) => {
    if (ret._id) ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    if ('passwordHash' in ret) delete ret.passwordHash;
    return ret;
  };
  schema.set('toJSON', { virtuals: true, versionKey: false, transform });
  schema.set('toObject', { virtuals: true, versionKey: false, transform });
}
