import type { SynonymGroup } from "../types.js";

/**
 * Paraphrase banks. Each group is a headword with alternative words that mean
 * roughly the same thing, tagged by register so learners can raise or lower
 * the formality of their writing.
 */
export const synonymGroups: SynonymGroup[] = [
  {
    id: "syn-important",
    headword: "important",
    wordClass: "adjective",
    meanings: [
      {
        definition: "of great importance",
        words: ["crucial", "vital", "essential"],
        register: "formal",
      },
      {
        definition: "of great importance",
        words: ["significant", "key", "major"],
        register: "neutral",
      },
      { definition: "of great importance", words: ["big", "huge", "key"], register: "informal" },
    ],
  },
  {
    id: "syn-very",
    headword: "very",
    wordClass: "adverb",
    meanings: [
      {
        definition: "to a high degree",
        words: ["exceedingly", "profoundly", "immensely"],
        register: "formal",
      },
      { definition: "to a high degree", words: ["really", "quite", "highly"], register: "neutral" },
      { definition: "to a high degree", words: ["so", "super", "totally"], register: "informal" },
    ],
  },
  {
    id: "syn-problem",
    headword: "problem",
    wordClass: "noun",
    meanings: [
      {
        definition: "a difficulty",
        words: ["dilemma", "predicament", "obstacle"],
        register: "formal",
      },
      {
        definition: "a difficulty",
        words: ["issue", "concern", "difficulty"],
        register: "neutral",
      },
      { definition: "a difficulty", words: ["trouble", "hassle", "mess"], register: "informal" },
    ],
  },
  {
    id: "syn-solution",
    headword: "solution",
    wordClass: "noun",
    meanings: [
      {
        definition: "an answer to a problem",
        words: ["resolution", "remedy", "answer"],
        register: "formal",
      },
      {
        definition: "an answer to a problem",
        words: ["way", "approach", "fix"],
        register: "neutral",
      },
      {
        definition: "an answer to a problem",
        words: ["fix", "answer", "workaround"],
        register: "informal",
      },
    ],
  },
  {
    id: "syn-grow",
    headword: "grow",
    wordClass: "verb",
    meanings: [
      {
        definition: "to increase in size or amount",
        words: ["expand", "escalate", "proliferate"],
        register: "formal",
      },
      {
        definition: "to increase in size or amount",
        words: ["increase", "rise", "develop"],
        register: "neutral",
      },
      {
        definition: "to increase in size or amount",
        words: ["get bigger", "go up", "boom"],
        register: "informal",
      },
    ],
  },
  {
    id: "syn-manage",
    headword: "manage",
    wordClass: "verb",
    meanings: [
      {
        definition: "to deal with a situation",
        words: ["administer", "orchestrate", "navigate"],
        register: "formal",
      },
      {
        definition: "to deal with a situation",
        words: ["handle", "deal with", "run"],
        register: "neutral",
      },
      {
        definition: "to deal with a situation",
        words: ["sort out", "juggle", "cope"],
        register: "informal",
      },
    ],
  },
  {
    id: "syn-child",
    headword: "child",
    wordClass: "noun",
    meanings: [
      {
        definition: "a young person",
        words: ["minor", "juvenile", "youngster"],
        register: "formal",
      },
      {
        definition: "a young person",
        words: ["kid", "young person", "youth"],
        register: "neutral",
      },
      { definition: "a young person", words: ["kid", "tot", "little one"], register: "informal" },
    ],
  },
  {
    id: "syn-expensive",
    headword: "expensive",
    wordClass: "adjective",
    meanings: [
      {
        definition: "costing a lot",
        words: ["exorbitant", "premium", "costly"],
        register: "formal",
      },
      {
        definition: "costing a lot",
        words: ["pricey", "high-priced", "dear"],
        register: "neutral",
      },
      {
        definition: "costing a lot",
        words: ["steep", "pricey", "overpriced"],
        register: "informal",
      },
    ],
  },
  {
    id: "syn-improve",
    headword: "improve",
    wordClass: "verb",
    meanings: [
      {
        definition: "to make or become better",
        words: ["enhance", "ameliorate", "bolster"],
        register: "formal",
      },
      {
        definition: "to make or become better",
        words: ["develop", "upgrade", "strengthen"],
        register: "neutral",
      },
      {
        definition: "to make or become better",
        words: ["boost", "beef up", "polish"],
        register: "informal",
      },
    ],
  },
  {
    id: "syn-clear",
    headword: "clear",
    wordClass: "adjective",
    meanings: [
      {
        definition: "easy to understand",
        words: ["lucid", "explicit", "unequivocal"],
        register: "formal",
      },
      {
        definition: "easy to understand",
        words: ["obvious", "evident", "plain"],
        register: "neutral",
      },
      {
        definition: "easy to understand",
        words: ["clear-cut", "blatant", "as clear as day"],
        register: "informal",
      },
    ],
  },
];

/** Find a synonym group by id. */
export function getSynonymById(id: string): SynonymGroup | undefined {
  return synonymGroups.find((group) => group.id === id);
}

/** Search synonym groups by headword or the words inside them. */
export function searchSynonyms(query: string): SynonymGroup[] {
  const q = query.trim().toLowerCase();
  if (q === "") {
    return synonymGroups;
  }
  return synonymGroups.filter((group) => {
    const haystack = [group.headword, ...group.meanings.flatMap((meaning) => meaning.words)]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
