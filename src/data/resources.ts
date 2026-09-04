import type { ResourceLink } from '../types.js';

/**
 * Curated links to free, external IELTS collections and official practice
 * sources. Link only — no third-party files are vendored into this repo.
 * Verify a URL still resolves before adding it here.
 */
export const resources: ResourceLink[] = [
  {
    id: 'r-01',
    title: 'Community IELTS study collection (inspiration for this API)',
    category: 'community-collection',
    format: 'mixed',
    url: 'https://github.com/zhengyishiming/IELTS',
    description:
      'Large community file-sharing collection of IELTS textbooks and study files whose topic coverage inspired this API’s domain model.',
  },
  {
    id: 'r-02',
    title: 'IELTS official site — sample test questions',
    category: 'official',
    format: 'web',
    url: 'https://www.ielts.org',
    description:
      'Official IELTS site with free sample questions for Listening, Reading, Writing and Speaking.',
  },
  {
    id: 'r-03',
    title: 'British Council — Take IELTS practice materials',
    category: 'official',
    format: 'web',
    url: 'https://takeielts.britishcouncil.org',
    description:
      'British Council portal with free practice tests, webinars and preparation guides.',
  },
  {
    id: 'r-04',
    title: 'Cambridge English — free test preparation',
    category: 'official',
    format: 'web',
    url: 'https://www.cambridgeenglish.org',
    description: 'Cambridge preparation pages with sample papers and examiner guidance.',
  },
  {
    id: 'r-05',
    title: 'IELTS-API — this project’s source and dataset',
    category: 'open-data',
    format: 'api',
    url: 'https://github.com/johnlikescarrot/IELTS-API',
    description:
      'MIT-licensed TypeScript API and open dataset backing every endpoint here.',
  },
  {
    id: 'r-06',
    title: 'IELTS-API — machine-readable OpenAPI contract',
    category: 'open-data',
    format: 'api',
    url: 'https://github.com/johnlikescarrot/IELTS-API/blob/arena/01a06c9f-ielts-api/src/openapi.ts',
    description:
      'OpenAPI 3.0 contract describing all endpoints (also served at /openapi.json).',
  },
];
