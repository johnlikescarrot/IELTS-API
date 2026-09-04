/**
 * Environment-driven configuration with validation. No secrets, no auth:
 * this API is intentionally 100% free and open.
 */

import { z } from 'zod';
import { ConfigError, type ErrorDetails } from './lib/errors.js';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  HOST: z.string().min(1).default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGINS: z.string().default('*')
});

export type AppEnv = z.infer<typeof envSchema>['NODE_ENV'];

export interface AppConfig {
  readonly env: AppEnv;
  readonly port: number;
  readonly host: string;
  readonly logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  /** `true` reflects any origin; otherwise an explicit allow-list. */
  readonly corsOrigins: true | readonly string[];
}

export function loadConfig(
  env: Readonly<Record<string, string | undefined>> = process.env
): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const fieldErrors: ErrorDetails = { fields: parsed.error.flatten().fieldErrors };
    throw new ConfigError('Invalid environment configuration', fieldErrors);
  }
  const { NODE_ENV, PORT, HOST, LOG_LEVEL, CORS_ORIGINS } = parsed.data;
  const corsOrigins: true | readonly string[] =
    CORS_ORIGINS.trim() === '*'
      ? true
      : CORS_ORIGINS.split(',')
          .map((origin) => origin.trim())
          .filter((origin) => origin.length > 0);
  return {
    env: NODE_ENV,
    port: PORT,
    host: HOST,
    logLevel: LOG_LEVEL,
    corsOrigins
  };
}
