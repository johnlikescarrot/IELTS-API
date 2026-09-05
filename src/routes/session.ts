/**
 * Anonymous, deterministic practice-session route.
 *
 * The referenced YYSD test center uses a manifest to assemble an exam viewer
 * without accounts. This API applies the same useful idea to its metadata-only
 * contract: a client can request a reproducible study session, while the
 * response links to upstream material rather than redistributing it.
 */

import { SPEAKING_TOPICS, WRITING_TOPICS } from '../data/topics.js';
import { randomEntries } from '../data/vocabulary.js';
import { searchPracticeItems } from '../data/practiceTests.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';
import { hashString, seededIndices } from '../lib/rng.js';

import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';
import type { JsonValue, PracticeItem, Skill } from '../types.js';

const SKILLS = ['reading', 'listening', 'writing', 'speaking'] as const satisfies readonly Skill[];
const SESSION_COUNTS = { min: 1, max: 10 } as const;

/** A small response-safe activity generated from the public indexes. */
export type PracticeSession = {
  id: string;
  seed: string;
  skill: Skill;
  vocabulary: ReturnType<typeof randomEntries>;
  activity: JsonValue;
  provenance: {
    contentPolicy: string;
    reproducible: boolean;
  };
};

/** Select one activity from the requested skill without using Math.random. */
function chooseActivity(seed: string, skill: Skill, index: number): JsonValue {
  if (skill === 'writing') {
    const topic =
      WRITING_TOPICS[seededIndices(`${seed}|writing|${index}`, WRITING_TOPICS.length, 1)[0] as number];
    return { kind: 'writing-topic', ...topic };
  }
  if (skill === 'speaking') {
    const topic =
      SPEAKING_TOPICS[seededIndices(`${seed}|speaking|${index}`, SPEAKING_TOPICS.length, 1)[0] as number];
    return { kind: 'speaking-topic', ...topic };
  }
  const page = searchPracticeItems({
    limit: 10,
    offset: 0,
    collections: skill === 'reading' ? ['reading-full-test', 'graded-reading'] : ['listening-full-test'],
    skills: [skill],
    sort: 'id',
    order: 'asc',
  });
  const selected = page.items[
    seededIndices(`${seed}|${skill}|${index}`, page.items.length, 1)[0] as number
  ] as PracticeItem;
  return {
    kind: 'practice-index',
    id: selected.id,
    title: selected.title,
    collection: selected.collection,
    sourceUrl: selected.sourceUrl,
    note: 'Metadata only; fetch the source material from its publisher.',
  };
}

/** Build one reproducible session. */
function session(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const seed = getString(params, 'seed') ?? 'today';
  const requestedSkill = getEnum(params, 'skill', SKILLS);
  const skill = requestedSkill ?? (SKILLS[hashString(seed) % SKILLS.length] as Skill);
  const count = getInt(params, 'count', SESSION_COUNTS.min, SESSION_COUNTS.max, 1);
  const activity = chooseActivity(seed, skill, count);
  const vocabulary = randomEntries(`${seed}|vocabulary|${skill}`, count);
  const id = `s-${hashString(`${seed}|${skill}|${count}`).toString(16).padStart(8, '0')}`;
  return {
    data: {
      id,
      seed,
      skill,
      vocabulary,
      activity,
      provenance: {
        contentPolicy: 'Derived metadata and original prompts only; no copyrighted source content is served.',
        reproducible: true,
      },
    },
    meta: {
      count,
      availableSkills: SKILLS,
      expires: null,
      note: 'Persist the seed and session id client-side to resume an anonymous session.',
    },
  };
}

/** Routes for account-free practice session assembly. */
export const sessionRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/study/session',
    versioned: true,
    summary: 'Build a deterministic, anonymous practice session from the public indexes.',
    handler: session,
  },
];
