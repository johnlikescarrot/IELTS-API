/**
 * High-frequency IELTS theme bank.
 *
 * The bank catalogue 50 themes that recur most often in IELTS papers, grouped
 * into the eleven thematic categories compiled in the open *UPGRADE YOUR IELTS
 * SKILLS* study set
 * <https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS>. Each theme is
 * tagged with the IELTS skills it supports and the Writing Task 2 question
 * families it fits, so an item can be used as a practice prompt, a Speaking
 * cue, a Reading search term or a writing-idea generator. The prompts in this
 * bank are original items written for this project; only the theme list and
 * its grouping are derived from the upstream study set.
 */

import { paginate, matchesQuery } from '../lib/search.js';
import { seededIndices } from '../lib/rng.js';

import type { Page } from '../lib/search.js';
import type { EssayQuestionType, IeltsTheme, Skill, ThemeMeta, ThemeStats } from '../types.js';

/** Compact theme row: all fields except the derived `id` and `rank`. */
type ThemeRow = readonly [
  name: string,
  category: string,
  group: string,
  skills: readonly Skill[],
  questionTypes: readonly EssayQuestionType[],
  keywords: readonly string[],
  prompts: readonly [string, string, string],
];

/** The fifty high-frequency themes, ordered 1-50 by relative frequency. */
const THEME_ROWS: readonly ThemeRow[] = [
  // ---------------------------------------------------------------- education
  [
    'Higher education vs vocational training',
    'education',
    'Education',
    ['writing', 'speaking', 'reading'],
    ['opinion', 'discussion', 'advantages-disadvantages'],
    ['university', 'vocational', 'apprenticeship', 'tuition', 'graduate', 'skills'],
    [
      'Some people believe a university degree is the surest route to a good career, while others value hands-on vocational training. Discuss both views.',
      'Is it better for a government to fund universities or vocational colleges?',
      'Why do many graduates feel their qualifications do not match the jobs available?',
    ],
  ],
  [
    'Online learning / distance education',
    'education',
    'Education',
    ['writing', 'speaking', 'reading', 'listening'],
    ['advantages-disadvantages', 'discussion', 'problem-solution'],
    ['online', 'distance', 'mooc', 'platform', 'self-paced', 'digital'],
    [
      'Many universities now deliver full degrees online. Assess the advantages and disadvantages of distance learning.',
      'Some argue that online courses widen access to education while others say they are less rigorous. Evaluate both positions.',
      'Why is online enrolment growing, and what can providers do to keep students engaged?',
    ],
  ],
  [
    'Teaching methods & technology in the classroom',
    'education',
    'Education',
    ['writing', 'speaking', 'reading'],
    ['opinion', 'discussion', 'advantages-disadvantages'],
    ['pedagogy', 'classroom', 'interactive', 'edtech', 'teacher', 'personalised'],
    [
      'Some people think technology will eventually replace teachers. Consider the case for and against.',
      'Do interactive teaching methods produce better learning than lectures?',
      'What are the benefits and drawbacks of using tablets in every classroom?',
    ],
  ],
  [
    'Homework & exam pressure on students',
    'education',
    'Education',
    ['writing', 'speaking', 'reading'],
    ['problem-solution', 'discussion', 'opinion'],
    ['homework', 'assessment', 'stress', 'burden', 'curriculum'],
    [
      'Many educators argue that homework is essential, while others say it harms wellbeing. Consider the case that homework should be abolished.',
      'Examination pressure is rising worldwide. What are the causes and what can be done?',
      'Is continuous assessment fairer than high-stakes examinations?',
    ],
  ],
  [
    'Education for children with special needs',
    'education',
    'Education',
    ['writing', 'speaking', 'reading'],
    ['discussion', 'opinion', 'problem-solution'],
    ['inclusion', 'disability', 'support', 'mainstream', 'assistive'],
    [
      'Some argue that children with special needs should be educated in mainstream schools. Evaluate this claim.',
      'Why do many education systems struggle to support learners with disabilities, and how can this be improved?',
      'Should every school be required to provide specialist learning support?',
    ],
  ],
  // -------------------------------------------------------------- environment
  [
    'Climate change & global warming',
    'environment',
    'Environment & Climate',
    ['writing', 'speaking', 'reading', 'listening'],
    ['problem-solution', 'opinion', 'discussion'],
    ['emissions', 'carbon', 'warming', 'mitigation', 'policy', 'sustainability'],
    [
      'Climate change is the greatest challenge facing humanity. What are the main causes and what measures can governments take?',
      'Some people argue that individual action cannot solve climate change and that only governments can. Discuss both views.',
      'Why do some nations fail to honour their climate commitments?',
    ],
  ],
  [
    'Pollution (air, water, plastic)',
    'environment',
    'Environment & Climate',
    ['writing', 'speaking', 'reading', 'listening'],
    ['problem-solution', 'opinion', 'discussion'],
    ['pollution', 'waste', 'plastic', 'industrial', 'environmental'],
    [
      'Air and water pollution are growing problems in many cities. Examine the causes and propose solutions.',
      'Some people think plastic should be banned outright. Consider the case for and against.',
      'Why does pollution often affect poorer communities more severely?',
    ],
  ],
  [
    'Renewable energy vs fossil fuels',
    'environment',
    'Environment & Climate',
    ['writing', 'speaking', 'reading'],
    ['opinion', 'discussion', 'advantages-disadvantages'],
    ['solar', 'wind', 'renewable', 'fossil', 'transition', 'energy'],
    [
      'Some believe that the world should stop using fossil fuels immediately. Evaluate the arguments for and against.',
      'What are the advantages and disadvantages of shifting to renewable energy?',
      'Why is the transition to clean energy slower than scientists would like?',
    ],
  ],
  [
    'Deforestation & wildlife protection',
    'environment',
    'Environment & Climate',
    ['writing', 'speaking', 'reading'],
    ['problem-solution', 'opinion', 'discussion'],
    ['forest', 'habitat', 'biodiversity', 'conservation', 'extinction'],
    [
      'Deforestation continues at an alarming rate. What causes it and what can be done to protect forests?',
      'Some argue that economic development matters more than wildlife protection. Discuss both views.',
      'Why is protecting biodiversity important for humans as well as animals?',
    ],
  ],
  [
    'Recycling & waste management',
    'environment',
    'Environment & Climate',
    ['writing', 'speaking', 'reading', 'listening'],
    ['problem-solution', 'opinion', 'discussion'],
    ['recycling', 'waste', 'landfill', 'circular', 'municipal'],
    [
      'Many countries are failing to recycle enough waste. What are the causes and what measures can increase recycling?',
      'Some people argue that recycling should be compulsory by law. Evaluate this claim.',
      'Is it better to reduce waste at source or to improve recycling?',
    ],
  ],
  // ---------------------------------------------------------------- technology
  [
    'Artificial intelligence & robotics',
    'technology',
    'Technology',
    ['writing', 'speaking', 'reading', 'listening'],
    ['opinion', 'discussion', 'advantages-disadvantages'],
    ['artificial', 'intelligence', 'automation', 'robot', 'algorithm', 'ethics'],
    [
      'Artificial intelligence will transform every industry. Assess the benefits and risks of adopting AI at scale.',
      'Some fear that AI will replace human workers, while others think it will create new jobs. Evaluate both positions.',
      'What steps should governments take to regulate artificial intelligence?',
    ],
  ],
  [
    'Internet & social media impact',
    'technology',
    'Technology',
    ['writing', 'speaking', 'reading', 'listening'],
    ['discussion', 'opinion', 'problem-solution'],
    ['social', 'media', 'connectivity', 'misinformation', 'platforms'],
    [
      'Some people argue that social media strengthens communities, while others say it isolates people. Discuss both views.',
      'Misinformation spreads rapidly online. What causes this and how can it be reduced?',
      'Has the internet made people more or less informed?',
    ],
  ],
  [
    'Smartphones & children',
    'technology',
    'Technology',
    ['writing', 'speaking', 'reading'],
    ['opinion', 'discussion', 'problem-solution'],
    ['smartphone', 'screen', 'adolescent', 'addiction', 'parenting'],
    [
      'Some people think that children under sixteen should not be allowed to use smartphones. Consider the case for and against.',
      'What are the effects of excessive screen time on children, and how can parents respond?',
      'Should schools ban smartphones in the classroom?',
    ],
  ],
  [
    'E-books vs printed books',
    'technology',
    'Technology',
    ['writing', 'speaking', 'reading'],
    ['advantages-disadvantages', 'opinion', 'discussion'],
    ['ebook', 'print', 'reading', 'publishing', 'screen'],
    [
      'Some believe printed books will disappear, while others think they will always exist. Discuss both views.',
      'What are the advantages and disadvantages of reading on a screen instead of on paper?',
      'Why do many people still prefer physical books?',
    ],
  ],
  [
    'Technology in healthcare',
    'technology',
    'Technology',
    ['writing', 'speaking', 'reading'],
    ['advantages-disadvantages', 'opinion', 'discussion'],
    ['telemedicine', 'diagnostic', 'device', 'health', 'data'],
    [
      'Technology is transforming health care. Assess the advantages and disadvantages of telemedicine.',
      'Some argue that remote monitoring will make hospitals obsolete. Evaluate this claim.',
      'Why is health data valuable, and how should it be protected?',
    ],
  ],
  // ---------------------------------------------------------- health & lifestyle
  [
    'Obesity & unhealthy eating habits',
    'health',
    'Health & Lifestyle',
    ['writing', 'speaking', 'reading', 'listening'],
    ['problem-solution', 'opinion', 'discussion'],
    ['obesity', 'diet', 'processed', 'nutrition', 'sedentary'],
    [
      'Obesity is rising in many countries. What are the main causes and what measures can reduce it?',
      'Some argue that unhealthy foods should be taxed more heavily. Discuss both views.',
      'Why do children in many countries eat too much processed food?',
    ],
  ],
  [
    'Exercise & fitness',
    'health',
    'Health & Lifestyle',
    ['writing', 'speaking', 'reading'],
    ['problem-solution', 'opinion', 'advantages-disadvantages'],
    ['exercise', 'fitness', 'physical', 'activity', 'wellbeing'],
    [
      'Many people do not exercise enough. What are the causes and how can governments encourage activity?',
      'Is it the responsibility of individuals or governments to keep people fit?',
      'What are the benefits of regular physical activity for mental health?',
    ],
  ],
  [
    'Mental health & stress',
    'health',
    'Health & Lifestyle',
    ['writing', 'speaking', 'reading'],
    ['problem-solution', 'discussion', 'opinion'],
    ['mental', 'stress', 'anxiety', 'wellbeing', 'counselling'],
    [
      'Mental health problems are increasing among young people. What are the causes and what can be done?',
      'Some argue that employers should be responsible for employee mental health. Evaluate this claim.',
      'Why is mental health still stigmatised in many societies?',
    ],
  ],
  [
    'Alternative medicine vs modern medicine',
    'health',
    'Health & Lifestyle',
    ['writing', 'speaking', 'reading'],
    ['discussion', 'opinion', 'advantages-disadvantages'],
    ['alternative', 'traditional', 'therapy', 'evidence', 'treatment'],
    [
      'Some people rely solely on alternative medicine. Evaluate the claim that it has no place in modern health care.',
      'What are the advantages and disadvantages of traditional remedies?',
      'Why do some patients prefer natural treatments to conventional ones?',
    ],
  ],
  [
    'Aging population & the healthcare system',
    'health',
    'Health & Lifestyle',
    ['writing', 'speaking', 'reading'],
    ['problem-solution', 'discussion', 'opinion'],
    ['ageing', 'pension', 'care', 'demographic', 'dependents'],
    [
      'Many countries have ageing populations. What are the challenges and how can governments respond?',
      'Who should pay for the care of the elderly: families, the state, or the elderly themselves?',
      'Why do some societies struggle to fund pensions and care?',
    ],
  ],
  // ------------------------------------------------------------ society & culture
  [
    'Urbanization & city vs rural life',
    'society',
    'Society & Culture',
    ['writing', 'speaking', 'reading', 'listening'],
    ['advantages-disadvantages', 'discussion', 'opinion'],
    ['urban', 'migration', 'city', 'rural', 'housing'],
    [
      'More people are moving to cities than ever before. Assess the advantages and disadvantages of urbanisation.',
      'Some people think city life is preferable to rural life. Discuss both views.',
      'What problems does rapid urban growth create, and how can they be solved?',
    ],
  ],
  [
    'Immigration & multicultural societies',
    'society',
    'Society & Culture',
    ['writing', 'speaking', 'reading'],
    ['discussion', 'opinion', 'advantages-disadvantages'],
    ['immigration', 'migrant', 'diverse', 'integration', 'culture'],
    [
      'Some believe immigration enriches a society, while others think it creates problems. Discuss both views.',
      'What are the advantages and disadvantages of living in a multicultural society?',
      'What can governments do to help immigrants integrate?',
    ],
  ],
  [
    'Tradition vs modern culture',
    'society',
    'Society & Culture',
    ['writing', 'speaking', 'reading'],
    ['opinion', 'discussion', 'problem-solution'],
    ['tradition', 'custom', 'heritage', 'values', 'globalisation'],
    [
      'Some people fear that globalisation is destroying local traditions. Evaluate this claim.',
      'Should governments spend money preserving traditional customs?',
      'Why is it important to preserve cultural heritage?',
    ],
  ],
  [
    'Gender equality & women’s rights',
    'society',
    'Society & Culture',
    ['writing', 'speaking', 'reading'],
    ['opinion', 'discussion', 'problem-solution'],
    ['gender', 'equality', 'workplace', 'representation', 'rights'],
    [
      'Women remain under-represented in leadership roles. What are the causes and what can be done?',
      'Some argue that quotas are needed to achieve gender equality. Discuss both views.',
      'Is it better for a family if both parents share paid and unpaid work equally?',
    ],
  ],
  [
    'Crime & punishment',
    'society',
    'Society & Culture',
    ['writing', 'speaking', 'reading'],
    ['opinion', 'discussion', 'problem-solution'],
    ['crime', 'punishment', 'deterrence', 'rehabilitation', 'law'],
    [
      'Some people believe that punishment should be designed to rehabilitate rather than to deter. Evaluate this claim.',
      'Why does crime persist even when punishments are severe?',
      'Is prison the best way to deal with criminals?',
    ],
  ],
  // -------------------------------------------------------------- economy & work
  [
    'Globalization & international trade',
    'economy',
    'Economy & Work',
    ['writing', 'speaking', 'reading'],
    ['opinion', 'discussion', 'advantages-disadvantages'],
    ['globalisation', 'trade', 'multinational', 'import', 'export'],
    [
      'Some argue that globalisation benefits everyone, while others think it widens inequality. Discuss both views.',
      'What are the advantages and disadvantages of free trade?',
      'Has globalisation made national borders less meaningful?',
    ],
  ],
  [
    'Remote work / work from home',
    'economy',
    'Economy & Work',
    ['writing', 'speaking', 'reading'],
    ['advantages-disadvantages', 'discussion', 'opinion'],
    ['remote', 'telecommute', 'hybrid', 'office', 'productivity'],
    [
      'Remote work has become common in many industries. Assess the advantages and disadvantages of working from home.',
      'Some employers now require employees to return to the office. Evaluate both positions.',
      'How has remote work changed the relationship between employers and employees?',
    ],
  ],
  [
    'Unemployment & job automation',
    'economy',
    'Economy & Work',
    ['writing', 'speaking', 'reading'],
    ['problem-solution', 'opinion', 'discussion'],
    ['unemployment', 'automation', 'retraining', 'gig', 'jobs'],
    [
      'Automation is destroying some jobs and creating others. What are the causes of unemployment and what can be done?',
      'Should governments provide a guaranteed income for those displaced by automation?',
      'Why do young people in many countries find it hard to get stable work?',
    ],
  ],
  [
    'Tourism industry',
    'economy',
    'Economy & Work',
    ['writing', 'speaking', 'reading', 'listening'],
    ['advantages-disadvantages', 'discussion', 'problem-solution'],
    ['tourism', 'travel', 'revenue', 'overtourism', 'hospitality'],
    [
      'Tourism brings money and jobs but also problems. Assess the advantages and disadvantages of tourism.',
      'Some argue that tourism damages the places it depends on. Evaluate this claim.',
      'What can governments do to reduce the negative effects of overtourism?',
    ],
  ],
  [
    'Consumerism & advertising',
    'economy',
    'Economy & Work',
    ['writing', 'speaking', 'reading'],
    ['opinion', 'discussion', 'problem-solution'],
    ['consumerism', 'advertising', 'materialism', 'spending', 'brand'],
    [
      'Some argue that advertising encourages people to buy things they do not need. Discuss both views.',
      'Why is consumerism so widespread, and what are its effects?',
      'Should advertising aimed at children be restricted?',
    ],
  ],
  // ------------------------------------------------------------ family & life
  [
    'Family size & one-child policies',
    'family',
    'Family & Life',
    ['writing', 'speaking', 'reading'],
    ['discussion', 'opinion', 'advantages-disadvantages'],
    ['family', 'birth', 'population', 'child', 'policy'],
    [
      'Some countries have limited families to one child. Assess the advantages and disadvantages of such policies.',
      'Why are birth rates falling in many countries?',
      'Is it better to have a large or a small family?',
    ],
  ],
  [
    'Divorce & single-parent families',
    'family',
    'Family & Life',
    ['writing', 'speaking', 'reading'],
    ['problem-solution', 'discussion', 'opinion'],
    ['divorce', 'single-parent', 'custody', 'children', 'marriage'],
    [
      'Divorce rates are high in many countries. What are the causes and how can the effects on children be reduced?',
      'Some argue that marriage should be harder to end. Discuss both views.',
      'How do single-parent families influence children’s development?',
    ],
  ],
  [
    'Raising children & parenting',
    'family',
    'Family & Life',
    ['writing', 'speaking', 'reading'],
    ['opinion', 'discussion', 'advantages-disadvantages'],
    ['parenting', 'upbringing', 'discipline', 'role', 'childhood'],
    [
      'Some believe that grandparents should help raise children, while others think parents should do it alone. Discuss both views.',
      'What is the best way to discipline a child?',
      'Should both parents work, or is one at home better for young children?',
    ],
  ],
  [
    'Work-life balance',
    'family',
    'Family & Life',
    ['writing', 'speaking', 'reading'],
    ['problem-solution', 'discussion', 'opinion'],
    ['balance', 'burnout', 'leisure', 'flexible', 'hours'],
    [
      'Many people struggle to balance work and family. What are the causes and how can this be improved?',
      'Should employers be required to offer flexible working hours?',
      'Is a shorter working week a good idea?',
    ],
  ],
  [
    'Happiness & success in life',
    'family',
    'Family & Life',
    ['writing', 'speaking', 'reading'],
    ['opinion', 'discussion', 'advantages-disadvantages'],
    ['happiness', 'success', 'ambition', 'wealth', 'meaning'],
    [
      'Some people measure success by wealth, others by happiness. Discuss both views.',
      'What makes people happy, and how much of it is within their control?',
      'Is ambition always a positive quality?',
    ],
  ],
  // --------------------------------------------------------- science & research
  [
    'Space exploration',
    'science',
    'Science & Research',
    ['reading', 'writing', 'speaking'],
    ['opinion', 'discussion', 'advantages-disadvantages'],
    ['space', 'satellite', 'exploration', 'mars', 'cost'],
    [
      'Some argue that money spent on space exploration should be spent on problems on Earth. Evaluate both views.',
      'What are the benefits of space exploration for ordinary people?',
      'Should private companies lead the exploration of space?',
    ],
  ],
  [
    'Genetic engineering & cloning',
    'science',
    'Science & Research',
    ['reading', 'writing', 'speaking'],
    ['opinion', 'discussion', 'advantages-disadvantages'],
    ['genetic', 'engineering', 'cloning', 'crispr', 'ethics'],
    [
      'Genetic engineering could cure disease but raises ethical questions. Assess the benefits and risks.',
      'Should parents be able to select the genetic traits of their children?',
      'Why do many people distrust genetic modification?',
    ],
  ],
  [
    'Animal testing',
    'science',
    'Science & Research',
    ['reading', 'writing', 'speaking'],
    ['opinion', 'discussion', 'problem-solution'],
    ['animal', 'testing', 'research', 'alternative', 'ethics'],
    [
      'Some argue that animal testing is essential for medical progress, while others oppose it. Discuss both views.',
      'Should animal testing be banned, and if so, what alternative methods exist?',
      'Is it ever acceptable to use animals in research?',
    ],
  ],
  [
    'Scientific research funding',
    'science',
    'Science & Research',
    ['reading', 'writing', 'speaking'],
    ['opinion', 'discussion', 'problem-solution'],
    ['funding', 'public', 'private', 'research', 'innovation'],
    [
      'Some believe governments should fund scientific research, while others think the private sector should. Discuss both views.',
      'Why are some fields of science better funded than others?',
      'Should research that has no immediate application be funded at all?',
    ],
  ],
  [
    'Nuclear energy',
    'science',
    'Science & Research',
    ['reading', 'writing', 'speaking'],
    ['opinion', 'discussion', 'advantages-disadvantages'],
    ['nuclear', 'reactor', 'radiation', 'waste', 'energy'],
    [
      'Some argue that nuclear power is essential to fight climate change. Evaluate both views.',
      'What are the advantages and disadvantages of nuclear energy?',
      'How should countries deal with nuclear waste?',
    ],
  ],
  // ------------------------------------------------------------ transport & travel
  [
    'Public transport vs private cars',
    'transport',
    'Transport & Travel',
    ['writing', 'speaking', 'reading'],
    ['opinion', 'discussion', 'problem-solution'],
    ['transport', 'bus', 'rail', 'car', 'congestion'],
    [
      'Some argue that cities should reduce car use and invest in public transport. Evaluate this claim.',
      'Why do many people prefer driving even when public transport is available?',
      'What would encourage more people to use public transport?',
    ],
  ],
  [
    'International travel & tourism',
    'transport',
    'Transport & Travel',
    ['writing', 'speaking', 'reading', 'listening'],
    ['advantages-disadvantages', 'discussion', 'opinion'],
    ['tourism', 'travel', 'airfare', 'visa', 'destination'],
    [
      'International travel has become cheaper and more common. Assess the advantages and disadvantages.',
      'Some argue that tourism does more harm than good. Discuss both views.',
      'Why do people travel to other countries?',
    ],
  ],
  [
    'Electric vehicles',
    'transport',
    'Transport & Travel',
    ['writing', 'speaking', 'reading'],
    ['opinion', 'discussion', 'advantages-disadvantages'],
    ['electric', 'vehicle', 'battery', 'charging', 'emissions'],
    [
      'Some argue that governments should require all new cars to be electric. Evaluate both views.',
      'What are the advantages and disadvantages of electric vehicles?',
      'Why is the uptake of electric vehicles uneven across countries?',
    ],
  ],
  [
    'Traffic congestion in cities',
    'transport',
    'Transport & Travel',
    ['writing', 'speaking', 'reading'],
    ['problem-solution', 'opinion', 'discussion'],
    ['congestion', 'traffic', 'commute', 'infrastructure', 'urban'],
    [
      'Traffic congestion is worsening in many cities. What are the causes and how can they be solved?',
      'Should cities charge drivers for entering the centre?',
      'Would building more roads reduce congestion or make it worse?',
    ],
  ],
  // -------------------------------------------------------------------- crime & law
  [
    'Youth crime & juvenile delinquency',
    'crime',
    'Crime & Law',
    ['writing', 'speaking', 'reading'],
    ['problem-solution', 'discussion', 'opinion'],
    ['youth', 'juvenile', 'delinquency', 'offender', 'rehabilitation'],
    [
      'Youth crime is rising in some countries. What are the causes and how can it be addressed?',
      'Should young offenders be treated differently from adults?',
      'What role do schools and families play in preventing youth crime?',
    ],
  ],
  [
    'Prison vs community service',
    'crime',
    'Crime & Law',
    ['writing', 'speaking', 'reading'],
    ['opinion', 'discussion', 'problem-solution'],
    ['prison', 'community', 'sentence', 'rehabilitation', 'offender'],
    [
      'Some argue that community service is more effective than prison for minor crimes. Discuss both views.',
      'What is the purpose of prison: punishment or rehabilitation?',
      'Why do many prisons fail to reduce reoffending?',
    ],
  ],
  [
    'CCTV & privacy',
    'crime',
    'Crime & Law',
    ['writing', 'speaking', 'reading'],
    ['opinion', 'discussion', 'advantages-disadvantages'],
    ['cctv', 'surveillance', 'privacy', 'monitoring', 'security'],
    [
      'Some argue that surveillance cameras make cities safer, while others say they invade privacy. Discuss both views.',
      'What are the advantages and disadvantages of widespread CCTV?',
      'Is privacy a right that should never be surrendered for security?',
    ],
  ],
  // ------------------------------------------------------------- other popular topics
  [
    'Animal rights & zoos',
    'culture',
    'Other Popular Topics',
    ['writing', 'speaking', 'reading'],
    ['opinion', 'discussion', 'advantages-disadvantages'],
    ['animal', 'zoo', 'welfare', 'captivity', 'conservation'],
    [
      'Some argue that zoos should be closed, while others say they help conservation. Discuss both views.',
      'What are the advantages and disadvantages of keeping animals in captivity?',
      'Should animals have legal rights?',
    ],
  ],
  [
    'Sports & international events',
    'culture',
    'Other Popular Topics',
    ['writing', 'speaking', 'reading', 'listening'],
    ['advantages-disadvantages', 'discussion', 'opinion'],
    ['sport', 'olympics', 'mega-event', 'athlete', 'hosting'],
    [
      'Some argue that hosting the Olympics brings lasting benefits, while others say it wastes money. Discuss both views.',
      'What are the advantages and disadvantages of hosting a major sporting event?',
      'Why do governments want to host international sporting events?',
    ],
  ],
  [
    'Language learning & the importance of English',
    'culture',
    'Other Popular Topics',
    ['writing', 'speaking', 'reading', 'listening'],
    ['opinion', 'discussion', 'advantages-disadvantages'],
    ['language', 'english', 'bilingual', 'global', 'learning'],
    [
      'Some argue that learning a global language such as English should be compulsory at school. Discuss both views.',
      'What are the advantages and disadvantages of speaking more than one language?',
      'Why is English so widely used internationally?',
    ],
  ],
];

/** Every theme in the bank, with derived `id` and `rank`. */
export const THEMES: readonly IeltsTheme[] = THEME_ROWS.map(
  ([name, category, group, skills, questionTypes, keywords, prompts], index) => ({
    id: `th-${String(index + 1).padStart(3, '0')}`,
    name,
    category,
    group,
    rank: index + 1,
    skills: [...skills],
    questionTypes: [...questionTypes],
    keywords: [...keywords],
    prompts: [...prompts],
  }),
);

/** Unique, sorted thematic categories. */
export const THEME_CATEGORIES: readonly string[] = [...new Set(THEMES.map((theme) => theme.category))].sort();

/** Unique groups in the order of appearance. */
export const THEME_GROUPS: readonly string[] = [...new Set(THEMES.map((theme) => theme.group))];

/** Every IELTS skill referenced by the theme bank. */
export const THEME_SKILLS: readonly Skill[] = ['listening', 'reading', 'writing', 'speaking'];

/** Provenance metadata for the theme bank. */
export const THEME_META: ThemeMeta = {
  name: 'High-frequency IELTS theme bank',
  source: 'UPGRADE YOUR IELTS SKILLS study set',
  sourceUrl: 'https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS',
  themes: THEMES.length,
  categories: THEME_CATEGORIES.length,
  skills: THEME_SKILLS.length,
  license: 'CC BY 4.0',
  attribution:
    'Theme list and grouping derived from the open study set; all prompts and keyword annotations are original.',
  note: 'Themes are ranked by relative frequency across recent IELTS papers.',
};

/** Search options accepted by {@link searchThemes}. */
export type ThemeQuery = {
  /** Free-text search over name, keywords, group and prompts. */
  query?: string;
  /** Restrict to one thematic category slug. */
  category?: string;
  /** Restrict to one skill. */
  skill?: Skill;
  /** Restrict to one Writing Task 2 question family. */
  questionType?: EssayQuestionType;
  /** Page size. */
  limit: number;
  /** Offset. */
  offset: number;
};

/**
 * Search, filter and paginate the theme bank.
 *
 * @param options - Search options.
 * @returns A page of matching themes, ordered by frequency rank.
 */
export function searchThemes(options: ThemeQuery): Page<IeltsTheme> {
  const query = options.query ?? '';
  const filtered = THEMES.filter((theme) => {
    if (
      query.length > 0 &&
      !matchesQuery([theme.name, theme.group, ...theme.keywords, ...theme.prompts], query)
    ) {
      return false;
    }
    if (options.category !== undefined && theme.category !== options.category) {
      return false;
    }
    if (options.skill !== undefined && !theme.skills.includes(options.skill)) {
      return false;
    }
    if (options.questionType !== undefined && !theme.questionTypes.includes(options.questionType)) {
      return false;
    }
    return true;
  });
  return paginate(filtered, options.limit, options.offset);
}

/**
 * Look up a single theme by identifier (case-insensitive).
 *
 * @param id - Theme identifier, e.g. `th-001`.
 */
export function findTheme(id: string): IeltsTheme | undefined {
  const needle = id.trim().toLowerCase();
  return THEMES.find((theme) => theme.id.toLowerCase() === needle);
}

/**
 * Deterministically choose a page of themes for a seed.
 *
 * @param seed - Seed string.
 * @param count - How many themes to return.
 */
export function randomThemes(seed: string, count: number): IeltsTheme[] {
  return seededIndices(seed, THEMES.length, count).map((index) => THEMES[index] as IeltsTheme);
}

/**
 * Compute aggregate statistics over the theme bank.
 */
export function themeStats(): ThemeStats {
  const bySkill: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  let totalPrompts = 0;

  for (const theme of THEMES) {
    byCategory[theme.category] = (byCategory[theme.category] ?? 0) + 1;
    for (const skill of theme.skills) {
      bySkill[skill] = (bySkill[skill] ?? 0) + 1;
    }
    totalPrompts += theme.prompts.length;
  }

  return {
    themes: THEMES.length,
    categories: THEME_CATEGORIES.length,
    totalPrompts,
    meanPrompts: Math.round((totalPrompts / Math.max(1, THEMES.length)) * 100) / 100,
    bySkill,
    byCategory,
  };
}
