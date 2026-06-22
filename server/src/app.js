import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { sitesRouter } from './routes/sites.js';
import { donationsRouter } from './routes/donations.js';
import { allocationsRouter } from './routes/allocations.js';
import { plantsRouter } from './routes/plants.js';
import { maintenanceRouter } from './routes/maintenance.js';
import { assignmentsRouter } from './routes/assignments.js';
import { uploadsRouter } from './routes/uploads.js';
import { paymentsRouter } from './routes/payments.js';
import { publicTreesRouter } from './routes/publicTrees.js';
import { co2Router } from './routes/co2.js';
import { certificatesRouter } from './routes/certificates.js';
import { analyticsRouter } from './routes/analytics.js';
import { excelRouter } from './routes/excel.js';
import { speciesRouter } from './routes/species.js';
import { projectsRouter } from './routes/projects.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: env.isProd ? undefined : false,
    }),
  );

  // Web origin uses cookies (credentials). Capacitor native shells load
  // from a fixed local origin and authenticate with Bearer tokens, so
  // they must be allowed through too. Requests with no Origin header
  // (native HTTP plugin, curl) are allowed.
  const allowedOrigins = new Set([
    env.CLIENT_ORIGIN,
    'capacitor://localhost', // iOS
    'http://localhost', // Android webview
    'https://localhost', // Android webview (https scheme)
  ]);
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || allowedOrigins.has(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(compression());

  app.use(
    pinoHttp({
      logger,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        return 'silent';
      },
      serializers: {
        req(req) {
          return { id: req.id, method: req.method, url: req.url };
        },
        res(res) {
          return { statusCode: res.statusCode };
        },
      },
      autoLogging: { ignore: (req) => req.url === '/api/health' },
    }),
  );

  app.use('/api', generalLimiter);

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/sites', sitesRouter);
  app.use('/api/donations', donationsRouter);
  app.use('/api/allocations', allocationsRouter);
  app.use('/api/plants', plantsRouter);
  app.use('/api/maintenance', maintenanceRouter);
  app.use('/api/assignments', assignmentsRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/co2', co2Router);
  app.use('/api/certificates', certificatesRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/excel', excelRouter);
  app.use('/api/species', speciesRouter);
  app.use('/api/projects', projectsRouter);

  // No-auth public surface. Mounted last to keep its scope small and
  // obvious — only the QR scan flow uses it.
  app.use('/api/public/trees', publicTreesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
