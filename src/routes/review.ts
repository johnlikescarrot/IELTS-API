/** Stateless review endpoints: clients, not the service, own all learning state. */
import { badRequest } from '../lib/errors.js';
import { readObject } from '../lib/input.js';
import { buildReviewQueue, REVIEW_POLICY, scheduleReview } from '../lib/review.js';
import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';
import type { ReviewCard } from '../types.js';

const META = {
  algorithm: REVIEW_POLICY.algorithm,
  storage: 'client-owned',
  note: REVIEW_POLICY.note,
};

/** Reject query inputs so progress is never accidentally submitted in the URL. */
function input(context: RouteContext, keys: readonly string[]): Record<string, unknown> {
  if (context.url.search.length > 0) {
    throw badRequest('Submit review inputs in the JSON body, not the query string.');
  }
  return readObject(context.body, 'body', keys);
}

/** Review policy, a pure state transition and a bounded due queue. */
export const reviewRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/study/review/policy',
    versioned: true,
    summary: 'Versioned SM-2 scheduling policy, recall grades, bounds and limitations.',
    handler: () => ({ data: REVIEW_POLICY }),
  },
  {
    method: 'POST',
    path: '/v1/study/review',
    versioned: true,
    summary: 'Compute one review from client-owned state; nothing is saved.',
    handler: (context: RouteContext): HandlerResult => {
      const body = input(context, ['card', 'grade', 'on']);
      return {
        data: scheduleReview(body.card as ReviewCard, body.grade as number, body.on as string),
        meta: META,
      };
    },
  },
  {
    method: 'POST',
    path: '/v1/study/review/queue',
    versioned: true,
    summary: 'Select due cards before new cards, with explicit review and new-card budgets.',
    handler: (context: RouteContext): HandlerResult => {
      const body = input(context, ['cards', 'on', 'limit', 'newLimit']);
      return {
        data: buildReviewQueue(
          body.cards as ReviewCard[],
          body.on as string,
          body.limit as number | undefined,
          body.newLimit as number | undefined,
        ),
        meta: META,
      };
    },
  },
];
