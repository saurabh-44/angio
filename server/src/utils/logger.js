import pino from 'pino';

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isDev = nodeEnv === 'development';
const isTest = nodeEnv === 'test';

const usePretty = isDev && process.env.LOG_PRETTY !== 'false';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isTest ? 'silent' : isDev ? 'debug' : 'info'),
  ...(usePretty
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }
    : {}),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.refreshToken',
    ],
    censor: '[REDACTED]',
  },
});
