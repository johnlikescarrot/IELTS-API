/** Original task-family strategies, distinct from the upstream practice inventory. */
import { findReceptiveTasks, RECEPTIVE_TASK_SOURCES } from '../data/receptive-tasks.js';
import { envelopeSchema } from '../lib/schemas.js';
import { PRACTICE_SKILLS } from '../data/practice-source.js';
import { getBoundedString, getEnum, strictParams } from '../lib/query.js';
import type { RouteDefinition } from '../lib/route.js';

/** Academic Reading and Listening guides with official source attribution. */
export const receptiveTaskRoutes: readonly RouteDefinition[] = PRACTICE_SKILLS.map((skill) => ({
  method: 'GET',
  path: `/v1/tasks/${skill}`,
  versioned: true,
  response: {
    contentType: 'application/json',
    schema: envelopeSchema({
      type: 'array',
      maxItems: findReceptiveTasks(skill).length,
      items: { $ref: '#/components/schemas/ReceptiveTask' },
    }),
  },
  summary: `Original ${skill} question-family guidance with authoritative format references.`,
  handler: (context) => {
    const params = strictParams(context.url, ['q', 'type']);
    const query = getBoundedString(params, 'q', 200);
    const type = getEnum(
      params,
      'type',
      findReceptiveTasks(skill).map((item) => item.id),
    );
    const items = findReceptiveTasks(skill, query, type);
    return {
      data: items,
      meta: {
        count: items.length,
        skill,
        scope: skill === 'reading' ? 'academic' : 'academic-and-general-training',
        sourceUrl: RECEPTIVE_TASK_SOURCES[skill],
        reviewedOn: '2026-09-05',
        license: 'CC-BY-4.0',
        note: 'Original guidance, not official marking rules or a prediction of band scores. Individual practice units are not annotated with unverified task types.',
      },
    };
  },
}));
