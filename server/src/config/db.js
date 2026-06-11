import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

mongoose.set('strictQuery', true);

// JSON/toObject transform (id-vs-_id, password-hash stripping) lives in
// each model's schema via models/plugins/jsonTransform.js, not as a
// global mongoose.plugin(). A global plugin only applies to schemas
// registered AFTER it's installed, and our entrypoint imports models
// before config/db.js — a global plugin here would silently never fire.

export async function connectDb() {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  logger.info('MongoDB connected');
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
