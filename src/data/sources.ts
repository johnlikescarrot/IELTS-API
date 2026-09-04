/**
 * Citable external references for factual, non-corpus API fields.
 *
 * These links document the source of compact reference claims. They do not
 * grant a licence to republish official test papers, recordings, answer keys,
 * or commercial preparation books; none of that content is in this project.
 */
export interface ReferenceSource {
  readonly id: string;
  readonly publisher: string;
  readonly title: string;
  readonly url: string;
  readonly accessedOn: string;
  readonly supports: readonly string[];
  readonly caveat?: string;
}

/** Official pages consulted when curating scoring and alignment reference data. */
export const REFERENCE_SOURCES: readonly ReferenceSource[] = [
  {
    id: 'ielts-scoring-detail',
    publisher: 'IELTS',
    title: 'IELTS scoring in detail',
    url: 'https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail',
    accessedOn: '2026-09-04',
    supports: [
      'overall-band rounding',
      'Listening and Reading raw-score guidance',
      'Writing Task 2 weighting',
    ],
    caveat: 'The page notes that the precise raw mark can vary slightly by test version.',
  },
  {
    id: 'british-council-scores',
    publisher: 'British Council',
    title: 'Understanding and explaining IELTS scores',
    url: 'https://takeielts.britishcouncil.org/teach-ielts/test-information/ielts-scores-explained',
    accessedOn: '2026-09-04',
    supports: ['band-scale reporting', 'IELTS and CEFR alignment context'],
    caveat: 'CEFR alignment is a broad reference aid, not an individual diagnostic.',
  },
] as const;

/** A transparent statement of the project’s deliberately narrow data boundary. */
export const CONTENT_POLICY = {
  upstreamRepository: 'https://github.com/zhengyishiming/IELTS',
  upstreamReviewDate: '2026-09-04',
  upstreamMaterialIncluded: false,
  originalPracticeContentLicense: 'MIT',
  policy:
    'No upstream files, official test papers, commercial books, recordings, answer keys, or transcripts are redistributed. Practice content in this repository is originally authored.',
} as const;
