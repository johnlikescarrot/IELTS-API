/**
 * A small curated IELTS academic-word bank organised by exam essay topic.
 * Definitions and example sentences are written originally for this project.
 */
export interface WordEntry {
  word: string;
  partOfSpeech: string;
  meaning: string;
  example: string;
  synonyms: readonly string[];
}

export interface WordCategory {
  id: string;
  name: string;
  words: readonly WordEntry[];
}

export const VOCABULARY: readonly WordCategory[] = [
  {
    id: "education",
    name: "Education",
    words: [
      {
        word: "curriculum",
        partOfSpeech: "noun",
        meaning: "The subjects and content taught in a course or school.",
        example: "The new curriculum places greater emphasis on practical skills.",
        synonyms: ["syllabus", "programme", "course of study"],
      },
      {
        word: "vocational",
        partOfSpeech: "adjective",
        meaning: "Relating to training for a specific job rather than academic study.",
        example: "Vocational courses prepare students for careers such as nursing or plumbing.",
        synonyms: ["professional", "job-oriented", "trade"],
      },
      {
        word: "literacy",
        partOfSpeech: "noun",
        meaning: "The ability to read and write.",
        example: "Rising literacy rates have transformed access to information.",
        synonyms: ["reading ability", "education"],
      },
      {
        word: "tuition",
        partOfSpeech: "noun",
        meaning: "Money paid for instruction, or teaching itself.",
        example: "Rising tuition fees make university inaccessible for many families.",
        synonyms: ["fees", "instruction", "teaching"],
      },
      {
        word: "critical",
        partOfSpeech: "adjective",
        meaning: "Involving careful judgement and questioning rather than passive acceptance.",
        example: "Universities should teach students to think critically about evidence.",
        synonyms: ["analytical", "evaluative", "questioning"],
      },
      {
        word: "lifelong",
        partOfSpeech: "adjective",
        meaning: "Continuing throughout a person's whole life.",
        example: "Rapid change makes lifelong learning a necessity, not a luxury.",
        synonyms: ["ongoing", "continuous", "permanent"],
      },
    ],
  },
  {
    id: "environment",
    name: "Environment",
    words: [
      {
        word: "sustainable",
        partOfSpeech: "adjective",
        meaning: "Able to continue without depleting natural resources.",
        example: "Cities must invest in sustainable transport to reduce pollution.",
        synonyms: ["renewable", "eco-friendly", "viable"],
      },
      {
        word: "emission",
        partOfSpeech: "noun",
        meaning: "The release of gas or other substances into the air.",
        example: "Tightening regulations can cut carbon emissions from factories.",
        synonyms: ["discharge", "release", "output"],
      },
      {
        word: "deforestation",
        partOfSpeech: "noun",
        meaning: "The clearing of forests on a large scale.",
        example: "Deforestation accelerates soil erosion and habitat loss.",
        synonyms: ["clearance", "logging", "forest loss"],
      },
      {
        word: "biodiversity",
        partOfSpeech: "noun",
        meaning: "The variety of plant and animal life in an area.",
        example: "Protecting wetlands is essential to maintaining biodiversity.",
        synonyms: ["variety of life", "biological diversity"],
      },
      {
        word: "renewable",
        partOfSpeech: "adjective",
        meaning: "From a source that is not used up, such as the sun or wind.",
        example: "Solar and wind power are the fastest-growing renewable sources.",
        synonyms: ["clean", "green", "sustainable"],
      },
      {
        word: "conservation",
        partOfSpeech: "noun",
        meaning: "The protection and careful management of the natural world.",
        example: "Conservation efforts have helped several species recover.",
        synonyms: ["protection", "preservation", "safeguarding"],
      },
    ],
  },
  {
    id: "technology",
    name: "Technology",
    words: [
      {
        word: "innovation",
        partOfSpeech: "noun",
        meaning: "A new idea, method or device.",
        example: "Rapid innovation has reshaped how people work and communicate.",
        synonyms: ["invention", "advance", "breakthrough"],
      },
      {
        word: "automation",
        partOfSpeech: "noun",
        meaning: "Use of machines to do work that people previously performed.",
        example: "Automation can raise productivity but displace some workers.",
        synonyms: ["mechanisation", "computerisation"],
      },
      {
        word: "disruptive",
        partOfSpeech: "adjective",
        meaning: "Causing major, often unexpected change to an industry.",
        example: "Streaming was a disruptive technology for traditional television.",
        synonyms: ["transformative", "revolutionary", "groundbreaking"],
      },
      {
        word: "digital",
        partOfSpeech: "adjective",
        meaning: "Relating to information stored and processed electronically.",
        example: "The digital divide leaves some communities without reliable internet.",
        synonyms: ["electronic", "online", "virtual"],
      },
      {
        word: "surveillance",
        partOfSpeech: "noun",
        meaning: "Close watching of people, often by governments or companies.",
        example: "Widespread surveillance raises important questions about privacy.",
        synonyms: ["monitoring", "observation", "watch"],
      },
      {
        word: "obsolete",
        partOfSpeech: "adjective",
        meaning: "No longer used or useful because something newer exists.",
        example: "Compact discs have become largely obsolete for music listening.",
        synonyms: ["outdated", "outmoded", "superseded"],
      },
    ],
  },
  {
    id: "health",
    name: "Health & Lifestyle",
    words: [
      {
        word: "sedentary",
        partOfSpeech: "adjective",
        meaning: "Involving little physical activity; sitting for long periods.",
        example: "Sedentary lifestyles contribute to a rise in obesity.",
        synonyms: ["inactive", "stationary", "desk-bound"],
      },
      {
        word: "obesity",
        partOfSpeech: "noun",
        meaning: "The condition of being very overweight in a way that harms health.",
        example: "Childhood obesity is linked to poor diet and limited exercise.",
        synonyms: ["overweight", "excess weight"],
      },
      {
        word: "preventive",
        partOfSpeech: "adjective",
        meaning: "Intended to stop illness before it starts.",
        example: "Preventive care such as vaccination reduces long-term costs.",
        synonyms: ["precautionary", "prophylactic", "protective"],
      },
      {
        word: "nutrition",
        partOfSpeech: "noun",
        meaning: "The food people eat and how it affects their health.",
        example: "Good nutrition in childhood supports healthy development.",
        synonyms: ["diet", "nourishment", "food"],
      },
      {
        word: "wellbeing",
        partOfSpeech: "noun",
        meaning: "The state of being comfortable, healthy and content.",
        example: "Employers increasingly consider the wellbeing of their staff.",
        synonyms: ["welfare", "health", "happiness"],
      },
      {
        word: "epidemic",
        partOfSpeech: "noun",
        meaning: "A rapid spread of a disease or of an unhealthy trend.",
        example: "Many countries face an epidemic of lifestyle-related illness.",
        synonyms: ["outbreak", "surge", "wave"],
      },
    ],
  },
  {
    id: "work",
    name: "Work & Business",
    words: [
      {
        word: "entrepreneur",
        partOfSpeech: "noun",
        meaning: "Someone who starts and runs a business, taking financial risks.",
        example: "The entrepreneur built a successful company from a single idea.",
        synonyms: ["businessperson", "founder", "innovator"],
      },
      {
        word: "productivity",
        partOfSpeech: "noun",
        meaning: "The amount of work produced relative to effort or time.",
        example: "Flexible hours can improve employee productivity.",
        synonyms: ["output", "efficiency", "yield"],
      },
      {
        word: "remuneration",
        partOfSpeech: "noun",
        meaning: "Payment or reward for work done.",
        example: "Salaries are not the only form of remuneration employees value.",
        synonyms: ["pay", "compensation", "wages"],
      },
      {
        word: "commute",
        partOfSpeech: "verb",
        meaning: "To travel regularly between home and work.",
        example: "Many people commute for over an hour each day.",
        synonyms: ["travel", "journey"],
      },
      {
        word: "entrepreneurial",
        partOfSpeech: "adjective",
        meaning: "Showing initiative and a willingness to take risks in business.",
        example: "An entrepreneurial culture encourages people to start ventures.",
        synonyms: ["enterprising", "resourceful", "initiative-driven"],
      },
      {
        word: "redundancy",
        partOfSpeech: "noun",
        meaning: "The loss of a job because an employer no longer needs the worker.",
        example: "Automation has led to redundancies in some manufacturing sectors.",
        synonyms: ["layoff", "dismissal", "job loss"],
      },
    ],
  },
  {
    id: "society",
    name: "Society & Culture",
    words: [
      {
        word: "cohesion",
        partOfSpeech: "noun",
        meaning: "The way people in a group stay united and work together.",
        example: "Community events strengthen social cohesion in diverse neighbourhoods.",
        synonyms: ["unity", "solidarity", "togetherness"],
      },
      {
        word: "inequality",
        partOfSpeech: "noun",
        meaning: "Unfair differences in wealth, opportunity or status.",
        example: "Rising inequality can undermine trust in public institutions.",
        synonyms: ["disparity", "imbalance", "discrepancy"],
      },
      {
        word: "multicultural",
        partOfSpeech: "adjective",
        meaning: "Made up of many different cultural or ethnic groups.",
        example: "Multicultural cities often benefit from a rich mix of ideas.",
        synonyms: ["diverse", "cosmopolitan", "plural"],
      },
      {
        word: "heritage",
        partOfSpeech: "noun",
        meaning: "Traditions, buildings and values passed down from the past.",
        example: "Restoring old quarters preserves a city's cultural heritage.",
        synonyms: ["legacy", "tradition", "inheritance"],
      },
      {
        word: "urbanisation",
        partOfSpeech: "noun",
        meaning: "The growth of cities as people move from rural areas.",
        example: "Rapid urbanisation strains housing and public transport.",
        synonyms: ["city growth", "urban growth", "migration"],
      },
      {
        word: "integration",
        partOfSpeech: "noun",
        meaning: "The process of becoming part of a community or society.",
        example: "Language classes can ease the integration of newcomers.",
        synonyms: ["assimilation", "inclusion", "incorporation"],
      },
    ],
  },
];

/** Flat list of vocabulary category ids. */
export const VOCAB_CATEGORY_IDS: readonly string[] = VOCABULARY.map((category) => category.id);

/** Look up a category by id. */
export function getVocabCategory(id: string): WordCategory | undefined {
  return VOCABULARY.find((category) => category.id === id);
}
