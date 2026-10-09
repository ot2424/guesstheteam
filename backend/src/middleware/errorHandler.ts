import { ZodError } from 'zod';
import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, `Route not found: ${req.method} ${req.path}`));
}

export function errorHandler(error: unknown, _req: Request, res: Response, next: NextFunction) {
  void next;

  if (error instanceof ZodError) return res.status(400).json({ error: 'Ungültige Eingabe.', details: error.issues.map(issue => ({ path: issue.path, message: issue.message })) });

  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  console.error(error);
  return res.status(500).json({ error: 'Internal server error' });
}
