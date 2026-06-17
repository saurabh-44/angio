import 'dotenv/config';
import { z } from 'zod';

const truthy = (v) => v === 'true' || v === '1';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  PUBLIC_URL: z.string().url().default('http://localhost:4000'),

  MONGODB_URI: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_TTL_MIN: z.coerce.number().int().positive().default(15),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(2),

  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z.string().optional(),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  PRIMARY_NGO_ADMIN_EMAIL: z.string().email().optional().or(z.literal('')),
  PRIMARY_NGO_ADMIN_PASSWORD: z.string().optional(),
  PRIMARY_NGO_ADMIN_NAME: z.string().default('NGO Admin'),

  RESEND_API_KEY: z.string().optional(),

  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().int().positive().default(587),
  MAIL_USER: z.string().optional(),
  MAIL_PASS: z.string().optional(),
  MAIL_FROM_NAME: z.string().default('NGO Trees'),
  MAIL_FROM_EMAIL: z.string().email().optional().or(z.literal('')),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default('angio'),

  // Razorpay — used by the donor "Sponsor a tree" online-payment flow.
  // Both must be set for online donations; offline NGO-admin recording
  // works regardless.
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  // What a donor pays per tree they sponsor. Configurable so the NGO can
  // raise/lower prices without a deploy.
  TREE_UNIT_PRICE_INR: z.coerce.number().int().positive().default(200),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  COOKIE_SECURE: truthy(raw.COOKIE_SECURE),
  isProd: raw.NODE_ENV === 'production',
  isDev: raw.NODE_ENV === 'development',
  isTest: raw.NODE_ENV === 'test',
};
