import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// (We intentionally do NOT augment express-serve-static-core's Request here
//  because pino-http brings in a conflicting Node IncomingMessage shape
//  that breaks express handler overload resolution. Callers access via
//  `(req as { id?: string }).id` which is fine and explicit.)

/**
 * Attach a stable per-request ID. Accepts an inbound `X-Request-Id` header
 * (when callers want to correlate across systems) or mints a fresh UUID.
 * Always echoes the chosen ID back on the response so users can quote it.
 */
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const inbound = req.header('x-request-id');
  // Basic sanity: ignore wildly long or unsafe values.
  const id =
    inbound && inbound.length > 0 && inbound.length <= 128 && /^[A-Za-z0-9._\-:]+$/.test(inbound)
      ? inbound
      : uuidv4();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
};
