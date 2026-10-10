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
  if (res.headersSent) return next(error);
  const parserError = error as { type?: string; code?: string };
  if (parserError?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Ungültiges JSON.' });
  if (parserError?.type === 'entity.too.large') return res.status(413).json({ error: 'Die Anfrage ist zu groß.' });
  if (parserError?.type === 'charset.unsupported' || parserError?.type === 'encoding.unsupported') return res.status(415).json({ error: 'Nicht unterstützte Kodierung.' });
  if (['57014', '55P03', '53300', '57P01', 'ECONNREFUSED', 'ETIMEDOUT'].includes(parserError?.code ?? '')) {
    res.setHeader('Retry-After', '2');
    return res.status(503).json({ error: 'Der Dienst ist gerade ausgelastet. Bitte versuche es erneut.' });
  }

  if (error instanceof ZodError) return res.status(400).json({ error: 'Ungültige Eingabe.', details: error.issues.map(issue => ({ path: issue.path, message: issue.message })) });

  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  console.error(error);
  return res.status(500).json({ error: 'Internal server error' });
}
