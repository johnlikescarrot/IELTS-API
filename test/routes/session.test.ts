import { beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

type SessionData = {
  id: string;
  skill: string;
  vocabulary: unknown[];
  activity: { kind: string; note?: string; collection?: string };
  provenance: { reproducible: boolean };
};

describe('anonymous practice sessions', () => {
  let server: Awaited<ReturnType<typeof startTestServer>>;
  beforeAll(async () => {
    server = await startTestServer();
  });

  it('returns a reproducible writing session with vocabulary drills', async () => {
    const first = await server.json<SessionData>('/v1/study/session?seed=research&skill=writing&count=3');
    const second = await server.json<SessionData>('/v1/study/session?seed=research&skill=writing&count=3');
    expect(first.status).toBe(200);
    expect(JSON.stringify(first.data)).toBe(JSON.stringify(second.data));
    expect(first.data.skill).toBe('writing');
    expect(first.data.vocabulary).toHaveLength(3);
    expect(first.data.activity.kind).toBe('writing-topic');
    expect(first.data.provenance.reproducible).toBe(true);
    expect(first.meta.expires).toBeNull();
  });

  it('selects receptive and speaking activities without serving source content', async () => {
    const reading = await server.json<SessionData>('/v1/study/session?seed=read&skill=reading');
    expect(reading.data.activity.kind).toBe('practice-index');
    expect(reading.data.activity.note).toContain('Metadata only');

    const listening = await server.json<SessionData>('/v1/study/session?seed=listen&skill=listening');
    expect(listening.data.activity.collection).toBe('listening-full-test');

    const speaking = await server.json<SessionData>('/v1/study/session?seed=speak&skill=speaking');
    expect(speaking.data.activity.kind).toBe('speaking-topic');
  });

  it('chooses a stable skill when omitted and validates query values', async () => {
    const omitted = await server.json<SessionData>('/v1/study/session?seed=stable');
    expect(['reading', 'listening', 'writing', 'speaking']).toContain(omitted.data.skill);
    expect(omitted.data.id).toMatch(/^s-[0-9a-f]{8}$/);

    const invalidSkill = await server.json<SessionData>('/v1/study/session?skill=grammar');
    expect(invalidSkill.status).toBe(400);
    const invalidCount = await server.json<SessionData>('/v1/study/session?count=11');
    expect(invalidCount.status).toBe(400);
  });
});
