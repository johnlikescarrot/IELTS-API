/**
 * Recurring IELTS exam themes.
 *
 * Task prompts recycle a small number of themes across all four papers, which
 * is why theme-based preparation dominates published study plans. The fifty
 * themes below are the union of the themes that recur in the practice corpus
 * indexed by `/v1/tests`, grouped into eleven families; the keyword sets are
 * original collocation lists written for this project so the themes can be
 * matched against candidate texts programmatically.
 */

import { matchesQuery } from '../lib/search.js';

import type { ExamTheme, Skill } from '../types.js';

/** Compact theme row: group, name, keywords, papers. */
type ThemeRow = readonly [string, string, readonly string[], readonly Skill[]];

const ALL: readonly Skill[] = ['listening', 'reading', 'writing', 'speaking'];
const ACADEMIC: readonly Skill[] = ['reading', 'writing', 'speaking'];
const PRODUCTIVE: readonly Skill[] = ['writing', 'speaking'];

const THEME_ROWS: readonly ThemeRow[] = [
  // ------------------------------------------------------------- education
  [
    'education',
    'Higher education and vocational training',
    ['university degree', 'apprenticeship', 'trade school', 'employability', 'tuition fees'],
    ACADEMIC,
  ],
  [
    'education',
    'Online learning and distance education',
    ['virtual classroom', 'self-paced study', 'drop-out rate', 'digital divide', 'blended learning'],
    ALL,
  ],
  [
    'education',
    'Teaching methods and classroom technology',
    ['rote learning', 'group work', 'interactive whiteboard', 'flipped classroom', 'teacher training'],
    ACADEMIC,
  ],
  [
    'education',
    'Homework and examination pressure',
    ['revision', 'standardised testing', 'burnout', 'continuous assessment', 'academic stress'],
    ALL,
  ],
  [
    'education',
    'Education for children with special needs',
    ['inclusive education', 'learning difficulty', 'teaching assistant', 'individual plan', 'accessibility'],
    ACADEMIC,
  ],
  // ----------------------------------------------------------- environment
  [
    'environment',
    'Climate change and global warming',
    ['greenhouse gas', 'carbon footprint', 'sea level', 'extreme weather', 'emissions target'],
    ALL,
  ],
  [
    'environment',
    'Air, water and plastic pollution',
    ['particulate matter', 'single-use plastic', 'microplastic', 'water quality', 'smog'],
    ALL,
  ],
  [
    'environment',
    'Renewable energy and fossil fuels',
    ['solar power', 'wind farm', 'coal-fired', 'energy transition', 'grid capacity'],
    ACADEMIC,
  ],
  [
    'environment',
    'Deforestation and wildlife protection',
    ['habitat loss', 'biodiversity', 'endangered species', 'logging', 'nature reserve'],
    ACADEMIC,
  ],
  [
    'environment',
    'Recycling and waste management',
    ['landfill', 'composting', 'circular economy', 'packaging', 'household waste'],
    ALL,
  ],
  // ------------------------------------------------------------ technology
  [
    'technology',
    'Artificial intelligence and robotics',
    ['machine learning', 'automation', 'algorithmic bias', 'chatbot', 'industrial robot'],
    ACADEMIC,
  ],
  [
    'technology',
    'The internet and social media',
    ['misinformation', 'screen time', 'online community', 'influencer', 'data privacy'],
    ALL,
  ],
  [
    'technology',
    'Smartphones and children',
    ['parental control', 'attention span', 'cyberbullying', 'age limit', 'app design'],
    ALL,
  ],
  [
    'technology',
    'E-books and printed books',
    ['e-reader', 'library lending', 'publishing industry', 'reading habit', 'annotation'],
    ACADEMIC,
  ],
  [
    'technology',
    'Technology in healthcare',
    ['telemedicine', 'wearable device', 'electronic record', 'diagnostic imaging', 'remote monitoring'],
    ACADEMIC,
  ],
  // --------------------------------------------------------------- health
  [
    'health',
    'Obesity and unhealthy eating',
    ['processed food', 'sugar tax', 'portion size', 'food labelling', 'fast food'],
    ALL,
  ],
  [
    'health',
    'Exercise and fitness',
    ['sedentary lifestyle', 'gym membership', 'physical education', 'active commuting', 'sports facility'],
    ALL,
  ],
  [
    'health',
    'Mental health and stress',
    ['anxiety', 'work pressure', 'counselling', 'mindfulness', 'social isolation'],
    ALL,
  ],
  [
    'health',
    'Alternative and modern medicine',
    ['herbal remedy', 'clinical trial', 'placebo', 'acupuncture', 'evidence base'],
    ACADEMIC,
  ],
  [
    'health',
    'Ageing populations and healthcare systems',
    ['life expectancy', 'pension', 'care home', 'dependency ratio', 'public funding'],
    ACADEMIC,
  ],
  // -------------------------------------------------------------- society
  [
    'society',
    'Urbanisation, city life and rural life',
    ['overcrowding', 'housing shortage', 'commuting', 'rural depopulation', 'green space'],
    ALL,
  ],
  [
    'society',
    'Immigration and multicultural societies',
    ['integration', 'diaspora', 'language barrier', 'labour shortage', 'cultural exchange'],
    ACADEMIC,
  ],
  [
    'society',
    'Tradition and modern culture',
    ['heritage', 'festival', 'globalisation', 'cultural identity', 'craft'],
    ALL,
  ],
  [
    'society',
    'Gender equality',
    ['pay gap', 'representation', 'parental leave', 'stereotype', 'quota'],
    ACADEMIC,
  ],
  [
    'society',
    'Crime and punishment',
    ['deterrence', 'rehabilitation', 'sentencing', 'reoffending', 'community service'],
    ACADEMIC,
  ],
  // -------------------------------------------------------- economy, work
  [
    'economy',
    'Globalisation and international trade',
    ['supply chain', 'tariff', 'multinational', 'outsourcing', 'trade agreement'],
    ACADEMIC,
  ],
  [
    'economy',
    'Remote work',
    ['hybrid working', 'productivity', 'office space', 'collaboration', 'work-from-home'],
    ALL,
  ],
  [
    'economy',
    'Unemployment and job automation',
    ['reskilling', 'redundancy', 'gig economy', 'labour market', 'job security'],
    ACADEMIC,
  ],
  [
    'economy',
    'The tourism industry',
    ['overtourism', 'seasonal work', 'heritage site', 'ecotourism', 'visitor numbers'],
    ALL,
  ],
  [
    'economy',
    'Consumerism and advertising',
    ['brand loyalty', 'impulse buying', 'sponsorship', 'targeted advertising', 'planned obsolescence'],
    ACADEMIC,
  ],
  // --------------------------------------------------------- family, life
  [
    'family',
    'Family size and population policy',
    ['birth rate', 'only child', 'extended family', 'childcare cost', 'population growth'],
    ACADEMIC,
  ],
  [
    'family',
    'Divorce and single-parent families',
    ['custody', 'lone parent', 'family support', 'stability', 'stigma'],
    PRODUCTIVE,
  ],
  [
    'family',
    'Raising children and parenting styles',
    ['discipline', 'screen rules', 'role model', 'independence', 'early years'],
    ALL,
  ],
  [
    'family',
    'Work-life balance',
    ['flexible hours', 'overtime', 'annual leave', 'burnout', 'four-day week'],
    ALL,
  ],
  [
    'family',
    'Happiness and success',
    ['life satisfaction', 'material wealth', 'personal goals', 'well-being index', 'community ties'],
    PRODUCTIVE,
  ],
  // ------------------------------------------------------------- science
  [
    'science',
    'Space exploration',
    ['satellite', 'mars mission', 'space debris', 'research budget', 'telescope'],
    ACADEMIC,
  ],
  [
    'science',
    'Genetic engineering and cloning',
    ['gene editing', 'GM crop', 'bioethics', 'inherited disease', 'regulation'],
    ACADEMIC,
  ],
  [
    'science',
    'Animal testing',
    ['laboratory animal', 'alternative method', 'cosmetics ban', 'medical research', 'animal welfare'],
    ACADEMIC,
  ],
  [
    'science',
    'Funding scientific research',
    ['public grant', 'private sponsor', 'basic research', 'peer review', 'commercial application'],
    ACADEMIC,
  ],
  [
    'science',
    'Nuclear energy',
    ['reactor', 'radioactive waste', 'safety record', 'baseload power', 'decommissioning'],
    ACADEMIC,
  ],
  // ----------------------------------------------------- transport, travel
  [
    'transport',
    'Public transport and private cars',
    ['bus network', 'congestion charge', 'car ownership', 'fare subsidy', 'park and ride'],
    ALL,
  ],
  [
    'transport',
    'International travel',
    ['budget airline', 'visa', 'aviation emissions', 'cultural exchange', 'tourist season'],
    ALL,
  ],
  [
    'transport',
    'Electric vehicles',
    ['charging point', 'battery range', 'purchase subsidy', 'emissions standard', 'second-hand market'],
    ACADEMIC,
  ],
  [
    'transport',
    'Traffic congestion in cities',
    ['rush hour', 'road pricing', 'cycle lane', 'urban planning', 'travel time'],
    ALL,
  ],
  // ------------------------------------------------------------- crime, law
  [
    'law',
    'Youth crime',
    ['juvenile offender', 'youth centre', 'early intervention', 'peer pressure', 'school exclusion'],
    ACADEMIC,
  ],
  [
    'law',
    'Prison and community sentences',
    ['incarceration rate', 'restorative justice', 'probation', 'prison overcrowding', 'reintegration'],
    ACADEMIC,
  ],
  [
    'law',
    'Surveillance and privacy',
    ['CCTV', 'facial recognition', 'data protection', 'civil liberty', 'crime prevention'],
    ACADEMIC,
  ],
  // ----------------------------------------------------------------- other
  [
    'other',
    'Animal rights and zoos',
    ['captive breeding', 'conservation programme', 'animal welfare', 'wildlife park', 'public education'],
    ACADEMIC,
  ],
  [
    'other',
    'Sport and international events',
    ['olympic games', 'host city', 'sponsorship', 'legacy', 'doping'],
    ALL,
  ],
  [
    'other',
    'Language learning and English',
    ['second language', 'immersion', 'lingua franca', 'minority language', 'language death'],
    ALL,
  ],
];

/** Every recurring exam theme. */
export const EXAM_THEMES: readonly ExamTheme[] = THEME_ROWS.map(([group, name, keywords, skills], index) => ({
  id: `th-${String(index + 1).padStart(2, '0')}`,
  group,
  name,
  keywords: [...keywords],
  skills: [...skills],
}));

/** Thematic groups, in the order they first occur. */
export const THEME_GROUPS: readonly string[] = [...new Set(EXAM_THEMES.map((theme) => theme.group))];

/** Options accepted by {@link findThemes}. */
export type ThemeQuery = {
  /** Restrict to one thematic group. */
  group?: string;
  /** Restrict to themes commonly set in one paper. */
  skill?: Skill;
  /** Free-text search over name, group and keywords. */
  query?: string;
};

/**
 * Filter the theme bank.
 *
 * @param options - Filter options.
 */
export function findThemes(options: ThemeQuery = {}): ExamTheme[] {
  const query = options.query ?? '';
  return EXAM_THEMES.filter((theme) => {
    if (options.group !== undefined && theme.group !== options.group) {
      return false;
    }
    if (options.skill !== undefined && !theme.skills.includes(options.skill)) {
      return false;
    }
    if (query.length > 0 && !matchesQuery([theme.name, theme.group, ...theme.keywords], query)) {
      return false;
    }
    return true;
  });
}
