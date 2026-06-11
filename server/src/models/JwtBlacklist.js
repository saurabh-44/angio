import { Schema, model } from 'mongoose';
import { jsonTransformPlugin } from './plugins/jsonTransform.js';

const jwtBlacklistSchema = new Schema(
  {
    jti: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'jwtBlacklist' },
);

jwtBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

jwtBlacklistSchema.plugin(jsonTransformPlugin);

export const JwtBlacklist = model('JwtBlacklist', jwtBlacklistSchema);
