/**
 * Band descriptor routes.
 */

import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { cacheLong } from '../lib/etag.js';
import { parseInput } from '../lib/validation.js';
import * as bands from '../services/bands.service.js';

const bandParamSchema = z.object({
  band: z.coerce.number().int().min(1).max(9)
});

const writingTaskParamSchema = z.object({
  task: z.coerce.number().int().min(1).max(2)
});

const writingTaskQuerySchema = z.object({
  criterion: z.string().trim().min(1).max(60).optional()
});

const speakingQuerySchema = z.object({
  criterion: z.string().trim().min(1).max(60).optional()
});

export async function bandRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/bands/writing/:task', async (request, reply) => {
    cacheLong(reply);
    const { task } = parseInput(writingTaskParamSchema, request.params, 'task parameter');
    const query = parseInput(writingTaskQuerySchema, request.query, 'query parameters');
    const criteria = bands.writingCriteria(task === 1 ? 1 : 2);
    const selected =
      query.criterion === undefined
        ? criteria
        : [bands.getWritingCriterion(task === 1 ? 1 : 2, query.criterion)];
    return {
      data: {
        paper: 'writing',
        task: task === 1 ? 1 : 2,
        note: 'Condensed paraphrase of the publicly published descriptors; official descriptors are the authoritative source.',
        criteria: selected
      }
    };
  });

  app.get('/v1/bands/speaking', async (request, reply) => {
    cacheLong(reply);
    const query = parseInput(speakingQuerySchema, request.query, 'query parameters');
    const criteria =
      query.criterion === undefined
        ? bands.speakingCriteria()
        : [bands.getSpeakingCriterion(query.criterion)];
    return {
      data: {
        paper: 'speaking',
        note: 'Condensed paraphrase of the publicly published descriptors; official descriptors are the authoritative source.',
        criteria
      }
    };
  });

  app.get('/v1/bands', async (_request, reply) => {
    cacheLong(reply);
    return { data: { scale: bands.listBandOverviews() } };
  });

  app.get('/v1/bands/:band', async (request, reply) => {
    cacheLong(reply);
    const { band } = parseInput(bandParamSchema, request.params, 'band parameter');
    return { data: bands.getBandOverview(band) };
  });
}
