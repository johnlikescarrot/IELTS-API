/**
 * Communicative-context taxonomy for the receptive papers.
 *
 * Listening sections and Reading passages recycle a small set of real-world
 * contexts: Section 1 is almost always an everyday transaction, Section 4 is
 * always an academic monologue, and the Reading passages rotate through the
 * same families of expository domains. Naming those contexts turns “practise
 * more listening” into “practise Section 1 accommodation dialogues”, which is
 * how the open mock-exam centre <https://github.com/wanli4473/yysd-testcenter>
 * organises its drill-down practice (`library/listening-taxonomy.json` with 16
 * scenes and `library/reading-taxonomy.json` with 8 domains). This module is
 * an original English taxonomy in the same spirit: 12 listening scenes and 8
 * reading domains, each linked to the canonical question types it favours,
 * the signals to listen or skim for, and keyword queries into the vocabulary
 * dataset.
 */

import type { QuestionTypeId } from '../types.js';

/** Receptive skills covered by the taxonomy. */
export const SCENE_SKILLS = ['listening', 'reading'] as const;

/** One of the receptive skills. */
export type SceneSkill = (typeof SCENE_SKILLS)[number];

/** Language register a context is set in. */
export type SceneRegister = 'everyday' | 'academic';

/** One communicative context. */
export type Scene = {
  /** Stable kebab-case identifier. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Receptive skill the context belongs to. */
  skill: SceneSkill;
  /** Sections (listening 1-4) or passages (reading 1-3) the context favours. */
  sections: readonly number[];
  /** Language register of the context. */
  register: SceneRegister;
  /** What the context covers and why it recurs on the test. */
  description: string;
  /** Canonical question types the context favours, in taxonomy order. */
  typicalQuestionTypes: readonly QuestionTypeId[];
  /** Signals to listen for (listening) or text features to exploit (reading). */
  signals: readonly string[];
  /** Seed keywords for vocabulary queries into `/v1/vocabulary`. */
  keywords: readonly string[];
};

/** Every communicative context, listening scenes first. */
export const SCENES: readonly Scene[] = [
  {
    id: 'accommodation',
    name: 'Accommodation and housing',
    skill: 'listening',
    sections: [1],
    register: 'everyday',
    description:
      'Renting a flat, joining a homestay or sorting out halls of residence. The archetypal Section 1 transaction: two speakers exchange concrete details that must be captured exactly.',
    typicalQuestionTypes: ['sentence-completion', 'short-answer', 'multiple-choice'],
    signals: [
      'Numbers, prices and dates — the answer is often corrected mid-sentence.',
      'Spelled names of streets, suburbs and tenants.',
      'Conditions and rules: bills, pets, notice periods, deposits.',
    ],
    keywords: ['rent', 'lease', 'landlord', 'deposit', 'tenant'],
  },
  {
    id: 'travel-transport',
    name: 'Travel and transport',
    skill: 'listening',
    sections: [1, 2],
    register: 'everyday',
    description:
      'Booking tickets, planning a trip or asking the way. Timetables and itineraries reward listeners who track times, places and changes of plan.',
    typicalQuestionTypes: ['sentence-completion', 'matching', 'multiple-choice'],
    signals: [
      'Departure and arrival times, platforms and gate numbers.',
      'Distances, fares and discount conditions.',
      'Changes of plan: delays, cancellations and alternatives offered.',
    ],
    keywords: ['itinerary', 'fare', 'timetable', 'booking', 'commute'],
  },
  {
    id: 'health-medical',
    name: 'Health and medical services',
    skill: 'listening',
    sections: [1, 2],
    register: 'everyday',
    description:
      'Making an appointment, describing symptoms or registering with a surgery. Polite service English layered over precise personal and medical detail.',
    typicalQuestionTypes: ['sentence-completion', 'multiple-choice', 'short-answer'],
    signals: [
      'Personal details: dates of birth, addresses, insurance numbers.',
      'Symptom descriptions and their duration.',
      'Instructions: dosage, referrals and follow-up appointments.',
    ],
    keywords: ['appointment', 'symptom', 'prescription', 'diagnosis', 'insurance'],
  },
  {
    id: 'employment',
    name: 'Employment and recruitment',
    skill: 'listening',
    sections: [1, 2],
    register: 'everyday',
    description:
      'Enquiring about a vacancy, discussing shifts or reporting a workplace problem. Factual exchanges about duties, hours and pay.',
    typicalQuestionTypes: ['sentence-completion', 'matching-features', 'multiple-choice'],
    signals: [
      'Job titles, duties and required experience.',
      'Hours, shifts, hourly rates and overtime rules.',
      'Named people matched to roles, departments or opinions.',
    ],
    keywords: ['vacancy', 'shift', 'wage', 'recruit', 'supervisor'],
  },
  {
    id: 'enrolment-orientation',
    name: 'Course enrolment and orientation',
    skill: 'listening',
    sections: [1, 2],
    register: 'everyday',
    description:
      'Registering for a course, choosing modules or finding your way around campus. Administrative detail plus orientation talks that preview academic life.',
    typicalQuestionTypes: ['sentence-completion', 'multiple-choice', 'matching'],
    signals: [
      'Course codes, module names and credit requirements.',
      'Deadlines for enrolment, payment and withdrawal.',
      'Campus locations matched to services or opening hours.',
    ],
    keywords: ['enrolment', 'tuition', 'campus', 'semester', 'orientation'],
  },
  {
    id: 'library-facilities',
    name: 'Library and study facilities',
    skill: 'listening',
    sections: [2],
    register: 'everyday',
    description:
      'Joining a library, booking equipment or learning the study centre rules. The classic Section 2 guided tour: one speaker, many facilities, easy to lose your place.',
    typicalQuestionTypes: ['sentence-completion', 'matching', 'multiple-choice'],
    signals: [
      'Floor numbers, room names and opening hours.',
      'Borrowing rules: loan periods, fines and reservations.',
      'Facilities matched to floors, services or user groups.',
    ],
    keywords: ['catalogue', 'loan', 'membership', 'archive', 'librarian'],
  },
  {
    id: 'shopping-consumer',
    name: 'Shopping and consumer issues',
    skill: 'listening',
    sections: [1],
    register: 'everyday',
    description:
      'Returning faulty goods, comparing products or arranging a delivery. Complaints and comparisons, where negatives and corrections carry the marks.',
    typicalQuestionTypes: ['sentence-completion', 'short-answer', 'multiple-choice'],
    signals: [
      'Product names, model numbers and fault descriptions.',
      'Prices, refunds, warranties and delivery charges.',
      'Negatives and corrections: what was *not* offered, what changed.',
    ],
    keywords: ['refund', 'warranty', 'receipt', 'complaint', 'delivery'],
  },
  {
    id: 'finance-banking',
    name: 'Finance and banking',
    skill: 'listening',
    sections: [1, 2],
    register: 'everyday',
    description:
      'Opening an account, disputing a charge or choosing an insurance plan. Dense with figures, conditions and small-print exceptions.',
    typicalQuestionTypes: ['sentence-completion', 'multiple-choice', 'short-answer'],
    signals: [
      'Account types, balances and interest rates.',
      'Charges, thresholds and eligibility conditions.',
      'Reference numbers and dates for disputed transactions.',
    ],
    keywords: ['account', 'interest', 'statement', 'premium', 'transaction'],
  },
  {
    id: 'leisure-events',
    name: 'Leisure and public events',
    skill: 'listening',
    sections: [2],
    register: 'everyday',
    description:
      'Festival programmes, museum tours and community announcements. One speaker maps activities to times, venues or prices while the listener keeps up.',
    typicalQuestionTypes: ['matching', 'multiple-choice', 'sentence-completion'],
    signals: [
      'Events matched to dates, venues or ticket prices.',
      'What is new, free, restricted or fully booked.',
      'Recommendations and warnings from the speaker.',
    ],
    keywords: ['festival', 'venue', 'exhibition', 'admission', 'itinerary'],
  },
  {
    id: 'academic-discussion',
    name: 'Academic discussion and tutorials',
    skill: 'listening',
    sections: [3],
    register: 'academic',
    description:
      'Two or three students planning an assignment with a tutor. Opinions, tentative plans and feedback overlap, so tracking who says what matters more than catching facts.',
    typicalQuestionTypes: ['multiple-choice', 'multiple-choice-multiple-answer', 'matching'],
    signals: [
      'Agreement and disagreement markers: *actually*, *I see your point, but…*.',
      'Named students matched to tasks, topics or opinions.',
      'Deadlines, word counts and assessment criteria.',
    ],
    keywords: ['tutorial', 'assignment', 'deadline', 'feedback', 'seminar'],
  },
  {
    id: 'fieldwork-project',
    name: 'Fieldwork and research projects',
    skill: 'listening',
    sections: [3],
    register: 'academic',
    description:
      'Designing a survey, reporting field observations or dividing up a group project. Methodology vocabulary plus a sequence of stages to follow.',
    typicalQuestionTypes: ['matching-features', 'sentence-completion', 'diagram-label-completion'],
    signals: [
      'Research stages in order: aims, method, data, analysis.',
      'Named researchers, sites or samples matched to findings.',
      'Quantities, proportions and comparisons of results.',
    ],
    keywords: ['survey', 'sample', 'hypothesis', 'observation', 'methodology'],
  },
  {
    id: 'academic-lecture',
    name: 'Academic lecture monologue',
    skill: 'listening',
    sections: [4],
    register: 'academic',
    description:
      'A single uninterrupted lecture on an academic topic — the environment, history or human behaviour. Dense, structured and impossible to replay: signpost language is the lifeline.',
    typicalQuestionTypes: ['sentence-completion', 'summary-completion', 'matching', 'short-answer'],
    signals: [
      'Signposts: *first*, *in contrast*, *to sum up*, *the key point is…*.',
      'Definitions and examples that restate the same idea twice.',
      'Causes, effects and chronological sequences.',
    ],
    keywords: ['lecture', 'theory', 'evidence', 'phenomenon', 'conclusion'],
  },
  {
    id: 'history-civilisation',
    name: 'History and civilisation',
    skill: 'reading',
    sections: [1, 2, 3],
    register: 'academic',
    description:
      'How societies rose, traded, built and collapsed. Chronological narratives with named periods, peoples and artefacts that reward timeline thinking.',
    typicalQuestionTypes: ['true-false-not-given', 'matching-headings', 'summary-completion'],
    signals: [
      'Dates and periods that anchor the narrative in order.',
      'Causes of change versus descriptions of change.',
      'Named civilisations, rulers and inventions.',
    ],
    keywords: ['century', 'empire', 'artefact', 'chronology', 'civilisation'],
  },
  {
    id: 'science-technology',
    name: 'Science and technology',
    skill: 'reading',
    sections: [2, 3],
    register: 'academic',
    description:
      'Discoveries, inventions and the arguments around them. Processes, experiments and expert disagreement produce the densest passages on the paper.',
    typicalQuestionTypes: ['matching-headings', 'yes-no-not-given', 'summary-completion'],
    signals: [
      'Process stages in strict sequence.',
      'Named researchers matched to claims or findings.',
      'Hedged conclusions: *suggests*, *may indicate*, *remains unclear*.',
    ],
    keywords: ['experiment', 'hypothesis', 'innovation', 'laboratory', 'discovery'],
  },
  {
    id: 'society-culture',
    name: 'Society and culture',
    skill: 'reading',
    sections: [1, 2],
    register: 'academic',
    description:
      'Migration, cities, traditions and social change. Accessible topics written up with data, case studies and competing explanations.',
    typicalQuestionTypes: ['true-false-not-given', 'matching-information', 'multiple-choice'],
    signals: [
      'Statistics that support or qualify a general claim.',
      'Case studies: which city, group or country illustrates what.',
      'Comparisons between past and present, or between societies.',
    ],
    keywords: ['community', 'tradition', 'migration', 'urbanisation', 'culture'],
  },
  {
    id: 'environment-ecology',
    name: 'Environment and ecology',
    skill: 'reading',
    sections: [1, 2, 3],
    register: 'academic',
    description:
      'Habitats under pressure and the attempts to protect them. Cause-and-effect chains link human activity to ecological outcomes across every passage position.',
    typicalQuestionTypes: ['matching-headings', 'summary-completion', 'sentence-completion'],
    signals: [
      'Problem–solution structures spanning several paragraphs.',
      'Species, habitats and places matched to threats or measures.',
      'Quantified change: rates, percentages and projections.',
    ],
    keywords: ['habitat', 'conservation', 'emissions', 'biodiversity', 'sustainable'],
  },
  {
    id: 'language-education',
    name: 'Language and education',
    skill: 'reading',
    sections: [2, 3],
    register: 'academic',
    description:
      'How languages are learned, taught and lost. Research-heavy passages where theories, studies and classroom practice intersect.',
    typicalQuestionTypes: ['matching-headings', 'yes-no-not-given', 'matching-sentence-endings'],
    signals: [
      'Theories attributed to named researchers or schools of thought.',
      'Study designs: who was tested, on what, against which control.',
      'Unfinished-sentence stems that echo paragraph topic sentences.',
    ],
    keywords: ['bilingual', 'literacy', 'curriculum', 'acquisition', 'pedagogy'],
  },
  {
    id: 'biology-research',
    name: 'Biology and life sciences',
    skill: 'reading',
    sections: [2, 3],
    register: 'academic',
    description:
      'Animal behaviour, evolution and the machinery of life. Observation-driven passages where findings, mechanisms and exceptions interleave.',
    typicalQuestionTypes: ['true-false-not-given', 'summary-completion', 'matching-information'],
    signals: [
      'Species and behaviours matched to explanations.',
      'Experimental manipulations and their outcomes.',
      'Exceptions to a general biological rule.',
    ],
    keywords: ['species', 'evolution', 'behaviour', 'organism', 'genetics'],
  },
  {
    id: 'business-economics',
    name: 'Business and economics',
    skill: 'reading',
    sections: [1, 2],
    register: 'academic',
    description:
      'Markets, firms and the people who run them. Case-study passages built on figures, motives and outcomes.',
    typicalQuestionTypes: ['matching-information', 'multiple-choice', 'summary-completion'],
    signals: [
      'Companies, leaders and strategies matched to outcomes.',
      'Financial figures: growth, profit, market share.',
      'Reasons given for success or failure.',
    ],
    keywords: ['market', 'profit', 'trade', 'enterprise', 'consumer'],
  },
  {
    id: 'health-medicine',
    name: 'Health and medicine',
    skill: 'reading',
    sections: [1, 2, 3],
    register: 'academic',
    description:
      'Nutrition, disease and public health. Findings-first passages where trials, recommendations and caveats follow a predictable arc.',
    typicalQuestionTypes: ['true-false-not-given', 'matching-headings', 'summary-completion'],
    signals: [
      'Trial results: who improved, by how much, compared to whom.',
      'Recommendations versus the evidence behind them.',
      'Risk factors matched to conditions or populations.',
    ],
    keywords: ['patient', 'treatment', 'nutrition', 'prevention', 'clinical'],
  },
];

/**
 * Look up one context by identifier.
 *
 * @param id - Case-insensitive context identifier.
 * @returns The matching context, or `undefined` when there is none.
 */
export function findScene(id: string): Scene | undefined {
  const needle = id.trim().toLowerCase();
  return SCENES.find((scene) => scene.id === needle);
}
