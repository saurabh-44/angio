import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const skipInTest = () => env.isTest;

export const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTest,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many auth attempts' } },
});

export const generalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTest,
});
