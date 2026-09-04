/** Minimal OpenAPI 3.1 description of the public surface. */
export function openApiDocument(): Record<string, unknown> {
  const jsonOk = (description: string): Record<string, unknown> => ({
    '200': { description, content: { 'application/json': {} } },
  });

  return {
    openapi: '3.1.0',
    info: {
      title: 'IELTS API',
      version: '1.0.0',
      description:
        'Free, open, no-authentication IELTS API. Band score conversion, CEFR alignment, deterministic writing analytics and openly licensed practice content.',
      license: { name: 'MIT', identifier: 'MIT' },
    },
    servers: [{ url: '/' }],
    security: [],
    paths: {
      '/health': { get: { summary: 'Liveness probe', responses: jsonOk('Service is healthy') } },
      '/v1/meta': {
        get: { summary: 'Dataset and capability metadata', responses: jsonOk('Metadata') },
      },
      '/v1/sources': {
        get: {
          summary: 'Citable source records and content-provenance boundary',
          responses: jsonOk('Sources and content policy'),
        },
      },
      '/v1/band/overall': {
        post: {
          summary: 'Compute overall band from four skill bands',
          responses: jsonOk('Overall band'),
        },
      },
      '/v1/band/convert': {
        get: {
          summary: 'Convert a raw score out of 40 into a band',
          responses: jsonOk('Band score'),
        },
      },
      '/v1/band/target': {
        get: { summary: 'Marks needed to reach a target band', responses: jsonOk('Gap analysis') },
      },
      '/v1/band/round': {
        get: {
          summary: 'Round a value to the nearest reportable band',
          responses: jsonOk('Rounded band'),
        },
      },
      '/v1/cefr': {
        get: { summary: 'Full IELTS to CEFR mapping table', responses: jsonOk('CEFR table') },
      },
      '/v1/cefr/band/{band}': {
        get: { summary: 'CEFR level for a band score', responses: jsonOk('CEFR level') },
      },
      '/v1/cefr/level/{level}': {
        get: { summary: 'Band range for a CEFR level', responses: jsonOk('Band range') },
      },
      '/v1/vocabulary': {
        get: { summary: 'Academic vocabulary list', responses: jsonOk('Entries') },
      },
      '/v1/vocabulary/{headword}': {
        get: { summary: 'Single vocabulary entry', responses: jsonOk('Entry') },
      },
      '/v1/cohesive-devices': {
        get: {
          summary: 'Discourse markers for coherence and cohesion',
          responses: jsonOk('Devices'),
        },
      },
      '/v1/prompts/writing': {
        get: { summary: 'Writing task prompts', responses: jsonOk('Prompts') },
      },
      '/v1/prompts/writing/{id}': {
        get: { summary: 'One writing prompt', responses: jsonOk('Prompt') },
      },
      '/v1/prompts/speaking': {
        get: { summary: 'Speaking prompts', responses: jsonOk('Prompts') },
      },
      '/v1/prompts/speaking/{id}': {
        get: { summary: 'One speaking prompt', responses: jsonOk('Prompt') },
      },
      '/v1/reading/passages': {
        get: { summary: 'Reading passage index', responses: jsonOk('Passages') },
      },
      '/v1/reading/passages/{id}': {
        get: { summary: 'One reading passage', responses: jsonOk('Passage') },
      },
      '/v1/reading/passages/{id}/check': {
        post: { summary: 'Mark answers for a passage', responses: jsonOk('Marked answers') },
      },
      '/v1/writing/analyze': {
        post: { summary: 'Deterministic writing band estimate', responses: jsonOk('Estimate') },
      },
      '/v1/text/metrics': {
        post: { summary: 'Readability and lexical metrics', responses: jsonOk('Metrics') },
      },
    },
  };
}
