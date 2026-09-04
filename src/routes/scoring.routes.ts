/**
 * Scoring routes: raw-to-band conversion tables and overall band calculation.
 */

import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { cacheLong } from '../lib/etag.js';
import { parseInput } from '../lib/validation.js';
import * as scoring from '../services/scoring.service.js';

const conversionQuerySchema = z.object({
  module: z.enum(['listening', 'reading-academic', 'reading-general-training']),
  raw: z.coerce.number().int().min(0).max(40)
});

const overallBodySchema = z.object({
  listening: z.number().min(0).max(9),
  reading: z.number().min(0).max(9),
  writing: z.number().min(0).max(9),
  speaking: z.number().min(0).max(9)
});

export async function scoringRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/scoring/tables', async (_request, reply) => {
    cacheLong(reply);
    return {
      data: {
        modules: scoring.SCORE_MODULES.map((module) => ({
          module,
          table: scoring.fullTable(module)
        })),
        note: scoring.DISCLAIMER
      }
    };
  });

  app.get('/v1/scoring/conversion', async (request, reply) => {
    cacheLong(reply);
    const query = parseInput(conversionQuerySchema, request.query, 'query parameters');
    const result = scoring.rawToBand(query.module, query.raw);
    return { data: result };
  });

  app.post('/v1/scoring/overall', async (request, reply) => {
    const body = parseInput(overallBodySchema, request.body, 'request body');
    const result = scoring.overallBand(body);
    reply.header('cache-control', 'no-store');
    return { data: result };
  });
}
