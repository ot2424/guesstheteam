import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  TRANSFERMARKT_BACKUP_ENABLED: z.coerce.boolean().default(false),
  TRANSFERMARKT_API_BASE_URL: z.string().url().default('https://transfermarkt-api.fly.dev'),
  TRANSFERMARKT_API_TIMEOUT_MS: z.coerce.number().int().positive().default(3500),
});

export const env = envSchema.parse(process.env);
