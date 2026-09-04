/**
 * Conditional-request support: weak ETags on successful GET/HEAD responses
 * with If-None-Match handling, plus generous cache headers for the
 * (static) study datasets. Free CDNs can therefore front this API.
 */

import { createHash } from 'node:crypto';
import type { FastifyReply, FastifyRequest, onSendHookHandler } from 'fastify';

export function computeEtag(payload: string): string {
  const digest = createHash('sha1').update(payload).digest('hex');
  return `W/"${digest}"`;
}

/**
 * Compares an If-None-Match header value with an ETag by their opaque parts,
 * accepting strong/weak variations on either side.
 */
export function etagMatches(ifNoneMatch: string, etag: string): boolean {
  const opaque = (value: string): string =>
    value.trim().replace(/^W\//, '').replace(/^"/, '').replace(/"$/, '');
  const expected = opaque(etag);
  return ifNoneMatch.split(',').some((candidate) => opaque(candidate) === expected);
}

function headerToString(value: string | string[] | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value.join(',') : value;
}

export const etagOnSend: onSendHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
  payload: unknown
): Promise<unknown> => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return payload;
  }
  if (reply.statusCode !== 200) {
    return payload;
  }
  if (typeof payload !== 'string') {
    return payload;
  }
  const etag = computeEtag(payload);
  reply.header('etag', etag);
  const ifNoneMatch = headerToString(request.headers['if-none-match']);
  if (ifNoneMatch !== undefined && etagMatches(ifNoneMatch, etag)) {
    reply.code(304);
    return '';
  }
  return payload;
};

/** Sets long-lived public caching for immutable dataset responses. */
export function cacheLong(reply: FastifyReply): void {
  reply.header('cache-control', 'public, max-age=86400, stale-while-revalidate=604800');
}
