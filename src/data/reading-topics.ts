/**
 * The fifty highest-frequency IELTS topics with an original collocation bank.
 *
 * The topic selection mirrors the frequency lists circulating in open
 * preparation communities (the community practice repository indexed at
 * `/v1/catalog` publishes a matching list of 50 recurring topics for the
 * 2025-2026 cycle). What is *original* here is the study material: each entry
 * pairs the topic with five ready-to-use lexical chunks and one discussion or
 * cue-card prompt, so that researchers can measure lexical preparation coverage
 * and candidates can reuse one bank across Reading, Writing Task 2 and the
 * Speaking test.
 */

import type { ReadingTopic, TopicSurface } from '../types.js';

/** Thematic groups, in canonical order. */
export const READING_TOPIC_GROUPS: readonly string[] = [
  'education',
  'environment',
  'technology',
  'health',
  'society',
  'economy-work',
  'family',
  'science',
  'transport',
  'crime-law',
  'other',
];

/** Compact row: group, title, core-or-lecture, five collocations, prompt. */
type TopicRow = readonly [string, string, 'core' | 'lecture', readonly string[], string];

const CORE_SURFACES: TopicSurface[] = ['reading', 'writing-task-2', 'speaking-part-2', 'speaking-part-3'];
const LECTURE_SURFACES: TopicSurface[] = [...CORE_SURFACES, 'listening'];

const ROWS: readonly TopicRow[] = [
  [
    'education',
    'Higher education vs Vocational training',
    'lecture',
    [
      'vocational pathway — work-based training route',
      'graduate premium — extra lifetime earnings from a degree',
      'skills gap — mismatch between labour demand and worker skills',
      'on-the-job training — learning inside the workplace',
      'academic rigour — theoretical depth of university study',
    ],
    'Some believe universities overprepare some careers and underprepare others. Evaluate the role of vocational training.',
  ],
  [
    'education',
    'Online learning / Distance education',
    'lecture',
    [
      'asynchronous lectures — recorded classes watched on one\u2019s own schedule',
      'digital divide — unequal access to devices and connectivity',
      'completion rates — how far learners finish what they enrol in',
      'screen fatigue — exhaustion from prolonged study online',
      'self-directed pacing — control over one\u2019s own study speed',
    ],
    'Does online learning widen or narrow educational opportunity? Argue a position.',
  ],
  [
    'education',
    'Teaching methods & Technology in the classroom',
    'lecture',
    [
      'rote learning — memorisation without deep understanding',
      'blended instruction — mixing face-to-face and digital teaching',
      'formative assessment — low-stakes checking during a course',
      'interactive whiteboard — shared digital display for lessons',
      'learner autonomy — capacity to study without supervision',
    ],
    'Should classroom technology be judged by outcomes rather than novelty?',
  ],
  [
    'education',
    'Homework & Exam pressure on students',
    'core',
    [
      'high-stakes examinations — tests that decide futures',
      'burnout — collapse from chronic study stress',
      'spare-time erosion — loss of leisure due to workload',
      'healthy competition — pressure that motivates rather than harms',
      'sleep deprivation — insufficient rest during exam terms',
    ],
    'Is homework worth its cost in children\u2019s well-being?',
  ],
  [
    'education',
    'Education for children with special needs',
    'lecture',
    [
      'inclusive schooling — educating all children together',
      'learning support assistant — aide working with individual pupils',
      'individualised plan — tailored targets for one learner',
      'sensory-friendly environment — space adjusted for processing needs',
      'speech and language therapy — professional help with communication',
    ],
    'Should mainstream schools absorb special-needs provision entirely?',
  ],
  [
    'environment',
    'Climate change & Global warming',
    'lecture',
    [
      'carbon budget — remaining emissions compatible with a target',
      'tipping point — threshold beyond which change self-perpetuates',
      'climate migration — relocation driven by environmental change',
      'adaptation measures — adjustments that reduce climate damage',
      'net-zero commitment — pledge to balance emitted and removed carbon',
    ],
    'Do pledges to reach net zero change behaviour or merely reassure it?',
  ],
  [
    'environment',
    'Pollution (air, water, plastic)',
    'lecture',
    [
      'particulate matter — tiny airborne particles harming lungs',
      'single-use plastics — disposable packaging and cutlery',
      'runoff — polluted water draining from land',
      'air-quality index — scale grading how clean the air is',
      'microplastic contamination — plastic fragments in food chains',
    ],
    'Which pollution source deserves the first regulatory dollar?',
  ],
  [
    'environment',
    'Renewable energy vs Fossil fuels',
    'lecture',
    [
      'intermittent supply — power that varies with weather',
      'grid storage — batteries or reservoirs buffering electricity',
      'stranded assets — fossil investments devalued by transition',
      'levelised cost — average generation cost per unit',
      'energy security — independence from imported fuel',
    ],
    'Should subsidies follow the cheapest renewable source or the fastest transition?',
  ],
  [
    'environment',
    'Deforestation & Wildlife protection',
    'lecture',
    [
      'habitat fragmentation — splitting ecosystems into isolated patches',
      'keystone species — organisms whose loss collapses an ecosystem',
      'illegal logging — timber extraction outside the law',
      'biodiversity hotspot — region of exceptional species richness',
      'reforestation programme — planned replanting of cleared land',
    ],
    'Can conservation survive when local livelihoods depend on forests?',
  ],
  [
    'environment',
    'Recycling & Waste management',
    'core',
    [
      'circular economy — design that keeps materials in use',
      'landfill capacity — room left for buried waste',
      'extended producer responsibility — makers liable for disposal',
      'source separation — sorting waste where it is produced',
      'waste-to-energy — burning refuse to generate power',
    ],
    'Is recycling overrated as an environmental strategy?',
  ],
  [
    'technology',
    'Artificial Intelligence & Robotics',
    'lecture',
    [
      'algorithmic bias — systematic unfairness baked into models',
      'labour displacement — jobs lost to automation',
      'human-in-the-loop — a person validating machine output',
      'predictive analytics — forecasting behaviour from data',
      'general-purpose technology — innovation that reshapes many sectors',
    ],
    'Should deployment of AI outrun its regulation?',
  ],
  [
    'technology',
    'Internet & Social media impact',
    'core',
    [
      'filter bubble — feed narrowed to one\u2019s existing views',
      'viral misinformation — falsehoods spreading faster than corrections',
      'digital footprint — trail of data left by online activity',
      'platform moderation — enforcement of speech rules at scale',
      'fear of missing out — anxiety driven by curated feeds',
    ],
    'Do social platforms owe users an attention economy truce?',
  ],
  [
    'technology',
    'Smartphones & Children',
    'core',
    [
      'screen-time limits — caps on device use',
      'parental controls — software restricting content and contact',
      'cyberbullying — harassment through digital channels',
      'developmental milestones — age-typical cognitive and motor gains',
      'constant connectivity — never being out of reach',
    ],
    'Should primary schools ban smartphones outright?',
  ],
  [
    'technology',
    'E-books vs Printed books',
    'core',
    [
      'e-reader — dedicated device for digital texts',
      'annotation tools — digital highlighting and notes',
      'tactile reading — paper\u2019s physical reading experience',
      'subscription lending — borrowing paid for by monthly plans',
      'retention of detail — how much of a text is remembered',
    ],
    'Does the medium change what readers keep from a book?',
  ],
  [
    'technology',
    'Technology in healthcare',
    'lecture',
    [
      'telemedicine — care delivered remotely',
      'electronic health records — digitised patient files',
      'diagnostic accuracy — correctness of detection',
      'wearable sensors — devices tracking vital signs continuously',
      'data privacy safeguards — protections for medical information',
    ],
    'Will remote-first medicine deepen or reduce health inequalities?',
  ],
  [
    'health',
    'Obesity & Unhealthy eating habits',
    'core',
    [
      'processed food — industrially formulated eating',
      'sugar tax — levy designed to curb consumption',
      'calorie labelling — menu energy disclosure',
      'food desert — area without affordable fresh food',
      'sedentary lifestyle — long sitting, little movement',
    ],
    'Should governments treat obesity like tobacco?',
  ],
  [
    'health',
    'Exercise & Fitness',
    'core',
    [
      'moderate-intensity activity — effort that raises the pulse',
      'public gyms — municipally operated fitness centres',
      'active transport — walking or cycling for commuting',
      'rest and recovery — repair time between training load',
      'preventive health — keeping illness away before treatment',
    ],
    'Is exercise infrastructure a healthier investment than hospitals?',
  ],
  [
    'health',
    'Mental health & Stress',
    'core',
    [
      'psychological well-being — state of mental health',
      'coping strategies — techniques for managing stress',
      'stigma — shame attached to seeking help',
      'workplace counselling — employer-provided therapy access',
      'mindfulness practice — attention training for calm',
    ],
    'Should schools teach mental hygiene as formally as mathematics?',
  ],
  [
    'health',
    'Alternative medicine vs Modern medicine',
    'core',
    [
      'evidence-based practice — treatment justified by trials',
      'placebo effect — improvement from belief in treatment',
      'holistic remedies — therapies treating the whole person',
      'integrative care — combining conventional and alternative therapy',
      'unproven claims — assertions lacking clinical support',
    ],
    'Should publicly funded systems reimburse alternative therapies?',
  ],
  [
    'health',
    'Aging population & Healthcare systems',
    'lecture',
    [
      'demographic shift — ageing of the population structure',
      'pension burden — retirement payouts as a share of income',
      'elderly care — support for older adults',
      'multigenerational workforce — all ages working side by side',
      'life expectancy — average years lived',
    ],
    'Who should finance longer retirements: workers, employers or the state?',
  ],
  [
    'society',
    'Urbanisation & City life vs Rural life',
    'lecture',
    [
      'rural depopulation — drift of people away from the countryside',
      'urban sprawl — low-density expansion of cities',
      'counter-urbanisation — movement from cities to smaller towns',
      'public amenities — shared facilities such as pools and libraries',
      'housing affordability — income relative to home prices',
    ],
    'Do governments exaggerate city growth problems and rural ones alike?',
  ],
  [
    'society',
    'Immigration & Multicultural societies',
    'core',
    [
      'skilled migration — movement of qualified workers',
      'brain drain — emigration of a country\u2019s educated class',
      'cultural integration — blending while keeping distinct identities',
      'asylum seeker — person requesting protection',
      'labour shortage — vacancies domestic workers will not or cannot fill',
    ],
    'Is integration the duty of the host society, the newcomer, or both?',
  ],
  [
    'society',
    'Tradition vs Modern culture',
    'core',
    [
      'cultural heritage — inherited practices and monuments',
      'global homogenisation — the world adopting one popular culture',
      'intangible traditions — festivals, crafts and oral customs',
      'cultural appropriation — borrowing without right or respect',
      'generational rift — values gap between age cohorts',
    ],
    'Can global media coexist with distinct local cultures?',
  ],
  [
    'society',
    'Gender equality & Women\u2019s rights',
    'core',
    [
      'glass ceiling — invisible barrier to advancement',
      'gender pay gap — systematic earnings difference',
      'parental leave for fathers — paternity entitlement',
      'unpaid care work — domestic labour outside the wage economy',
      'boardroom representation — share of leadership seats held',
    ],
    'Which single policy best closes the unpaid care gap?',
  ],
  [
    'society',
    'Crime & Punishment',
    'core',
    [
      'deterrent effect — punishment\u2019s power to prevent crime',
      'rehabilitation programmes — re-entry training for offenders',
      'recidivism rates — how often ex-offenders reoffend',
      'restorative justice — repairing harm through dialogue',
      'mandatory sentencing — fixed terms removing judicial discretion',
    ],
    'Should prison exist mainly to punish, protect or reform?',
  ],
  [
    'economy-work',
    'Globalization & International trade',
    'lecture',
    [
      'free-trade agreement — pact lowering barriers between states',
      'protectionist measures — tariffs and quotas shielding domestic firms',
      'supply-chain resilience — ability to absorb disruption',
      'outsourcing — contracting work abroad',
      'comparative advantage — specialising where opportunity cost is lowest',
    ],
    'Should trade policy prize efficiency or resilience after recent shocks?',
  ],
  [
    'economy-work',
    'Remote work / Work from home',
    'core',
    [
      'hybrid schedule — split between office and home',
      'commute savings — recovered travel time and cost',
      'knowledge spillover — learning by proximity to colleagues',
      'digital nomad — location-independent worker',
      'performance metrics — measurable output replacing presence',
    ],
    'Does remote work quietly shift costs from employers to employees?',
  ],
  [
    'economy-work',
    'Unemployment & Job automation',
    'lecture',
    [
      'structural unemployment — joblessness from economic reorganisation',
      'reskilling initiatives — programmes rebuilding worker capability',
      'automation dividend — gains from replacing labour with machines',
      'gig economy — short contract work via platforms',
      'labour force participation — share of adults working or seeking work',
    ],
    'Should the gains from automation be shared through taxation?',
  ],
  [
    'economy-work',
    'Tourism industry',
    'core',
    [
      'overtourism — visitor numbers beyond carrying capacity',
      'seasonal employment — work concentrated in peak months',
      'eco-certification — environmental standards for operators',
      'leakage of revenue — tourism income escaping the local economy',
      'cultural commodification — traditions packaged for sale',
    ],
    'Should popular destinations cap visitor numbers?',
  ],
  [
    'economy-work',
    'Consumerism & Advertising',
    'core',
    [
      'planned obsolescence — products designed to expire',
      'brand loyalty — repeat purchase of one label',
      'targeted advertising — marketing narrowed to user profiles',
      'conspicuous consumption — buying to display status',
      'ethical consumerism — purchases weighted by producer conduct',
    ],
    'Do advertising regulations protect choice or suppress competition?',
  ],
  [
    'family',
    'Family size & One-child policy',
    'core',
    [
      'demographic imbalance — distorted age or sex ratios',
      'only-child upbringing — growing up without siblings',
      'fertility incentives — payments or leave to encourage births',
      'kinship networks — extended-family support webs',
      'replacement rate — births needed to hold a population steady',
    ],
    'Do states have any business in family size?',
  ],
  [
    'family',
    'Divorce & Single-parent families',
    'core',
    [
      'custody arrangements — agreed care of children after separation',
      'child support — regular payments for upkeep',
      'blended family — household combining previous marriages',
      'co-parenting — separated parents raising jointly',
      'stigma attached to separation — social cost of divorce',
    ],
    'Should family law presume shared parenting after divorce?',
  ],
  [
    'family',
    'Raising children & Parenting',
    'core',
    [
      'helicopter parenting — constant supervision of a child',
      'authoritative discipline — warm but firm boundary-setting',
      'unscheduled play — free time without organised activity',
      'emotional intelligence — capacity to read and manage feelings',
      'screen boundaries — household rules for media use',
    ],
    'Which single parenting freedom most builds resilience?',
  ],
  [
    'family',
    'Work-life balance',
    'core',
    [
      'flexitime — adjustable working hours',
      'right to disconnect — no obligation to answer after hours',
      'burnout culture — overwork normalised at an organisation',
      'caregiving responsibilities — duties toward children or elders',
      'presenteeism — being at work while unproductive',
    ],
    'Should a four-day week be law or option?',
  ],
  [
    'family',
    'Happiness & Success in life',
    'core',
    [
      'material aspiration — goal-setting around possessions',
      'subjective well-being — self-rated happiness',
      'social bonds — relationships anchoring life satisfaction',
      'career milestones — markers such as promotion or pay rise',
      'sense of purpose — meaning derived from goals',
    ],
    'Does success measured by income make societies happier?',
  ],
  [
    'science',
    'Space exploration',
    'lecture',
    [
      'orbital debris — discarded hardware circling the Earth',
      'manned mission — flight carrying a crew',
      'terrestrial benefits — spin-off technology for life on Earth',
      'budgetary trade-off — spending choices between priorities',
      'planetary protection — avoiding contamination of other worlds',
    ],
    'Is spending on space justified while Earth has pressing needs?',
  ],
  [
    'science',
    'Genetic engineering & Cloning',
    'lecture',
    [
      'gene editing — precise alteration of DNA',
      'designer babies — selection of embryo traits',
      'genetically modified crops — engineered food plants',
      'bioethics concerns — moral limits on biological research',
      'therapeutic cloning — cell lines grown for treatment',
    ],
    'Where should the line fall between therapy and enhancement?',
  ],
  [
    'science',
    'Animal testing',
    'core',
    [
      'regulatory requirement — safety testing mandated by law',
      'humane alternatives — non-animal methods such as cell models',
      'welfare standards — conditions imposed on laboratory animals',
      'translational research — from animal result to human therapy',
      'moral status of animals — how much their suffering counts',
    ],
    'Should any consumer product testing on animals be permitted?',
  ],
  [
    'science',
    'Scientific research funding',
    'lecture',
    [
      'peer review — expert screening before publication or grant',
      'blue-sky research — curiosity-driven enquiry',
      'research impact — measurable benefit of findings',
      'public subsidy — taxpayer funding of science',
      'grant applications — competitive proposals for money',
    ],
    'Should public funders demand economic impact from all research?',
  ],
  [
    'science',
    'Nuclear energy',
    'lecture',
    [
      'low-carbon baseload — steady clean generation',
      'radioactive waste — long-lived reactor by-product',
      'meltdown risk — catastrophic failure scenario',
      'decommissioning costs — price of retiring reactors',
      'non-proliferation — preventing spread of weapons material',
    ],
    'Is nuclear power indispensable to a carbon-neutral grid?',
  ],
  [
    'transport',
    'Public transport vs Private cars',
    'core',
    [
      'last-mile connection — getting riders the final distance',
      'congestion charging — tolling entry to busy zones',
      'modal shift — movement from cars to transit',
      'subsidised fares — tickets priced below cost',
      'park-and-ride — peripheral lots linked by shuttles',
    ],
    'Would free public transport beat road pricing?',
  ],
  [
    'transport',
    'International travel & Tourism',
    'core',
    [
      'aviation emissions — climate cost of flying',
      'visa liberalisation — easing entry rules',
      'tourism tax — levy on visitors',
      'cultural exchange — mutual learning through travel',
      'flight shame — social pressure against flying',
    ],
    'Should long-haul flights be priced to reflect their emissions?',
  ],
  [
    'transport',
    'Electric vehicles',
    'core',
    [
      'charging infrastructure — network of replenishment points',
      'range anxiety — fear of running out of charge',
      'battery minerals — lithium and cobalt supply chains',
      'total cost of ownership — purchase plus running cost',
      'grid load management — balancing mass overnight charging',
    ],
    'Do incentives for electric cars help the wrong drivers most?',
  ],
  [
    'transport',
    'Traffic congestion in cities',
    'core',
    [
      'peak-hour gridlock — standstill at rush hour',
      'road capacity — throughput of a street network',
      'induced demand — new roads generating new trips',
      'low-emission zone — restricted access for polluting vehicles',
      'smart signals — adaptive traffic lights',
    ],
    'Can congestion ever be engineered away?',
  ],
  [
    'crime-law',
    'Youth crime & Juvenile delinquency',
    'core',
    [
      'anti-social behaviour — conduct harming community order',
      'curfew orders — mandated home hours for minors',
      'peer influence — pressure from friendship groups',
      'early intervention — support before reoffending begins',
      'age of criminal responsibility — threshold for prosecution',
    ],
    'Should minors be tried as adults for serious offences?',
  ],
  [
    'crime-law',
    'Prison vs Community service',
    'core',
    [
      'unpaid work orders — mandated hours for the community',
      'prison overcrowding — capacity exceeded',
      'reoffending — returning to crime',
      'victim reparation — making good to those harmed',
      'probation supervision — monitoring outside custody',
    ],
    'For which crimes is community service the just outcome?',
  ],
  [
    'crime-law',
    'CCTV & Privacy',
    'core',
    [
      'surveillance cameras — monitoring devices in public space',
      'mass data collection — gathering records on everyone',
      'civil liberties — freedoms protected from state power',
      'facial recognition — identity matching from images',
      'audit trail — logged record of who watched what',
    ],
    'Does public monitoring deter crime more than it chills liberty?',
  ],
  [
    'other',
    'Animal rights & Zoos',
    'core',
    [
      'captivity debate — dispute over confining animals',
      'conservation breeding — programmes to sustain species',
      'sanctuaries over spectacle — care prioritised over display',
      'enclosure standards — space and enrichment rules',
      'ethical tourism — visitor choices weighing animal welfare',
    ],
    'Can any zoo justify keeping wide-ranging mammals?',
  ],
  [
    'other',
    'Sports & International events',
    'core',
    [
      'host-city legacy — what remains after an event',
      'sportswashing — sport used to launder reputations',
      'elite funding — state money for medal-winning disciplines',
      'grassroots participation — community-level play',
      'commercial sponsorship — brand financing of events',
    ],
    'Should mega-events be awarded only when they pay for public sport?',
  ],
  [
    'other',
    'Language learning & Importance of English',
    'lecture',
    [
      'lingua franca — shared bridge language',
      'mother-tongue instruction — schooling in the first language',
      'language attrition — loss of an unused language',
      'communicative competence — ability to use language in real tasks',
      'linguistic imperialism — dominance of one language\u2019s culture',
    ],
    'Does global English homogenise thought?',
  ],
];

/**
 * Convert a topic title into its slug identifier.
 *
 * @param title - Human title.
 */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** The full topic bank. */
export const READING_TOPICS: readonly ReadingTopic[] = ROWS.map((row, position) => ({
  id: slugifyTitle(row[1]),
  rank: position + 1,
  group: row[0],
  title: row[1],
  collocations: [...row[3]],
  studyPrompt: row[4],
  commonIn: row[2] === 'core' ? [...CORE_SURFACES] : [...LECTURE_SURFACES],
}));

/**
 * Aggregate statistics about the topic bank.
 *
 * @returns totals per group plus the topic count.
 */
/** Topic bank totals plus per-group counts. */
export interface ReadingTopicStats {
  /** Total topics. */
  topics: number;
  /** Number of thematic groups. */
  groups: number;
}

export function readingTopicStats(): ReadingTopicStats & Record<string, number> {
  const byGroup: Record<string, number> = {};
  for (const topic of READING_TOPICS) {
    byGroup[topic.group] = (byGroup[topic.group] ?? 0) + 1;
  }
  return { topics: READING_TOPICS.length, groups: READING_TOPIC_GROUPS.length, ...byGroup };
}

/**
 * Find one topic by slug identifier.
 *
 * @param id - Slug identifier.
 */
export function findReadingTopic(id: string): ReadingTopic | undefined {
  return READING_TOPICS.find((topic) => topic.id === id);
}
