/**
 * Structured logger built on pino.
 *
 * - JSON in production (one log line per event, easy to ship to log aggregators).
 * - Pretty-printed in development.
 * - Auto-redacts common secret-bearing fields.
 *
 * Each log entry should carry a `requestId` (from the request-id middleware)
 * so support can quote it back at us. Use `req.log` from `pino-http` inside
 * handlers, or `logger` for boot/background work.
 */
import pino, { Logger } from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const baseOptions: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  base: {
    service: 'swipehire-server',
    env: process.env.NODE_ENV || 'development',
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.password_hash',
      '*.refreshToken',
      '*.accessToken',
      '*.access_token',
      '*.refresh_token',
      '*.token',
      '*.STRIPE_SECRET_KEY',
      '*.JWT_SECRET',
      '*.JWT_REFRESH_SECRET',
      '*.REDIS_URL',
      '*.DATABASE_URL',
    ],
    censor: '[REDACTED]',
  },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

const prettyTransport =
  !isProduction && !isTest
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname,service,env',
        },
      }
    : undefined;

const basePino: Logger = prettyTransport
  ? pino({ ...baseOptions, transport: prettyTransport })
  : pino(baseOptions);

/**
 * Thin wrapper around pino that accepts BOTH calling conventions so we
 * don't have to rewrite every existing call site at once:
 *
 *   logger.info('msg', { userId })  → winston style
 *   logger.info({ userId }, 'msg')  → pino style
 *
 * Both end up as a single structured log line.
 */
type LogFn = (...args: unknown[]) => void;

const makeLevelFn = (level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'): LogFn => {
  // Cast at the boundary: pino's overloads are strict, but we deliberately
  // accept the union of (obj,msg) and (msg,obj) for migration ergonomics.
  const fn = (basePino[level] as (...a: unknown[]) => void).bind(basePino);
  return (a: unknown, b?: unknown, ...rest: unknown[]) => {
    // pino style: (obj, msg)
    if (a && typeof a === 'object' && (typeof b === 'string' || b === undefined)) {
      fn(a, b, ...rest);
      return;
    }
    // winston style: (msg, obj)
    if (typeof a === 'string' && b && typeof b === 'object') {
      fn(b, a, ...rest);
      return;
    }
    // bare string / bare object
    fn(a, b, ...rest);
  };
};

export const logger = {
  trace: makeLevelFn('trace'),
  debug: makeLevelFn('debug'),
  info: makeLevelFn('info'),
  warn: makeLevelFn('warn'),
  error: makeLevelFn('error'),
  fatal: makeLevelFn('fatal'),
  // Expose the raw pino logger for libraries like pino-http that expect a real instance.
  _pino: basePino,
};

export type AppLogger = typeof logger;

/**
 * Redact a Redis URL for safe logging: keeps the scheme/host/port,
 * replaces the password with `***` if present.
 *
 *   redis://user:supersecret@host:6379  →  redis://user:***@host:6379
 *   redis://host:6379                   →  redis://host:6379
 */
export const redactRedisUrl = (url: string | undefined): string => {
  if (!url) return '(unset)';
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    // Not a URL — best-effort scrub
    return url.replace(/(:)([^@/]+)(@)/, '$1***$3');
  }
};
