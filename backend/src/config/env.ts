import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1).optional(),
  HOST: z.string().default('127.0.0.1'),
  AUTH_FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  AUTH_SESSION_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  GUESSTHETEAM_TEAM_SOURCE: z.enum(['seed', 'postgres']).default('seed'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4.1-mini'),
  TRANSFERMARKT_BACKUP_ENABLED: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
  TRANSFERMARKT_API_BASE_URL: z.string().url().default('https://transfermarkt-api.fly.dev'),
  TRANSFERMARKT_API_TIMEOUT_MS: z.coerce.number().int().positive().default(3500),
});

export const env = envSchema.parse(process.env);

if (env.NODE_ENV === 'production' && !env.DATABASE_URL) throw new Error('DATABASE_URL is required in production');

if (env.NODE_ENV === 'production' && (!env.SMTP_HOST || !env.SMTP_FROM || !env.AUTH_FRONTEND_URL.startsWith('https://'))) {
  throw new Error('Production auth requires SMTP_HOST, SMTP_FROM and an HTTPS AUTH_FRONTEND_URL');
}
