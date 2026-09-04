/**
 * Common IELTS writing mistakes (20 entries).
 *
 * High-frequency learner errors collected from public exam-prep categories:
 * each entry pairs the incorrect form with a correction and a short
 * explanation of the underlying rule. Examples are original (MIT).
 */

import type { WritingMistake } from "../types.js";

export const writingMistakes: readonly WritingMistake[] = [
  {
    id: "wm-001",
    category: "grammar",
    incorrect: "The government should discuss about this issue.",
    corrected: "The government should discuss this issue.",
    explanation:
      "'Discuss' is transitive: it takes a direct object with no preposition. 'Discuss about' is always wrong.",
  },
  {
    id: "wm-002",
    category: "grammar",
    incorrect: "The internet gives us access to many informations.",
    corrected: "The internet gives us access to a great deal of information.",
    explanation:
      "'Information' is uncountable: it has no plural form and takes singular agreement. Use 'a great deal of', 'much', or 'a wide range of'.",
  },
  {
    id: "wm-003",
    category: "word_choice",
    incorrect: "Cars are convenient. In the other hand, they pollute.",
    corrected: "Cars are convenient. On the other hand, they pollute.",
    explanation:
      "The fixed phrase is 'on the other hand'. 'In the other hand' literally describes holding something.",
  },
  {
    id: "wm-004",
    category: "grammar",
    incorrect: "Many people thinks that education is important.",
    corrected: "Many people think that education is important.",
    explanation:
      "'People' is a plural noun, so the verb has no third-person '-s'. The '-s' ending belongs to singular subjects only.",
  },
  {
    id: "wm-005",
    category: "spelling",
    incorrect: "The goverment should invest in public transport.",
    corrected: "The government should invest in public transport.",
    explanation:
      "'Government' keeps the '-n-' from 'govern'. Missing it is one of the most frequent spelling errors in IELTS essays.",
  },
  {
    id: "wm-006",
    category: "punctuation",
    incorrect: "The city lost it's industrial base.",
    corrected: "The city lost its industrial base.",
    explanation:
      "'Its' is the possessive; 'it's' is always a contraction of 'it is' or 'it has'.",
  },
  {
    id: "wm-007",
    category: "word_choice",
    incorrect: "Tourism can effect the local culture.",
    corrected: "Tourism can affect the local culture.",
    explanation:
      "'Affect' is the verb ('to influence'); 'effect' is usually the noun ('a lasting effect').",
  },
  {
    id: "wm-008",
    category: "grammar",
    incorrect: "The scheme comprises of three stages.",
    corrected: "The scheme comprises three stages.",
    explanation:
      "'Comprise' already means 'consist of', so 'comprises of' doubles the preposition. Alternatives: 'consists of' or 'is composed of'.",
  },
  {
    id: "wm-009",
    category: "grammar",
    incorrect: "I look forward to hear from you.",
    corrected: "I look forward to hearing from you.",
    explanation:
      "After the preposition 'to' in this phrase, use the gerund ('-ing' form), not the infinitive.",
  },
  {
    id: "wm-010",
    category: "style",
    incorrect: "The museum is very unique.",
    corrected: "The museum is unique.",
    explanation:
      "'Unique' is an absolute adjective: something cannot be 'slightly' or 'very' one of a kind.",
  },
  {
    id: "wm-011",
    category: "grammar",
    incorrect: "In nowadays, many families own two cars.",
    corrected: "Nowadays, many families own two cars.",
    explanation:
      "'Nowadays' is an adverb, not a noun, so it takes no preposition or article.",
  },
  {
    id: "wm-012",
    category: "grammar",
    incorrect: "Recent researches show that cities are warming.",
    corrected: "Recent research shows that cities are warming.",
    explanation:
      "'Research' is uncountable. Refer to individual studies as 'studies' or 'pieces of research'.",
  },
  {
    id: "wm-013",
    category: "grammar",
    incorrect: "The school bought new furnitures.",
    corrected: "The school bought new furniture.",
    explanation:
      "'Furniture' is uncountable: use 'a piece of furniture' or 'items of furniture' for countable references.",
  },
  {
    id: "wm-014",
    category: "word_choice",
    incorrect: "My teacher gave me many useful advices.",
    corrected: "My teacher gave me a lot of useful advice.",
    explanation:
      "'Advice' is uncountable. A single countable item is 'a piece of advice'; 'advices' does not exist.",
  },
  {
    id: "wm-015",
    category: "grammar",
    incorrect: "Could you explain me the graph?",
    corrected: "Could you explain the graph to me?",
    explanation:
      "'Explain' cannot take an indirect object directly: the pattern is 'explain something to someone'.",
  },
  {
    id: "wm-016",
    category: "word_choice",
    incorrect: "She is married with a dentist.",
    corrected: "She is married to a dentist.",
    explanation:
      "The fixed collocation is 'married to'. Compare 'engaged to', 'related to', 'linked to'.",
  },
  {
    id: "wm-017",
    category: "word_choice",
    incorrect: "The result depends of the weather.",
    corrected: "The result depends on the weather.",
    explanation:
      "'Depend' is always followed by 'on' (or 'upon'), never 'of' - a pattern that trips up speakers of many languages.",
  },
  {
    id: "wm-018",
    category: "style",
    incorrect: "There are many people think that taxes are too high.",
    corrected: "Many people think that taxes are too high.",
    explanation:
      "'There are' cannot be followed directly by a verb. Either drop the dummy subject or add a relative pronoun: 'There are many people who think...'.",
  },
  {
    id: "wm-019",
    category: "grammar",
    incorrect: "In addition of low fares, the service is frequent.",
    corrected: "In addition to low fares, the service is frequent.",
    explanation:
      "The connector is 'in addition to'. The same rule applies to 'in addition to doing something'.",
  },
  {
    id: "wm-020",
    category: "punctuation",
    incorrect: "Sales rose sharply, they peaked in 2010.",
    corrected:
      "Sales rose sharply and peaked in 2010. (Or: 'Sales rose sharply; they peaked in 2010.')",
    explanation:
      "Joining two independent clauses with only a comma is a comma splice. Use a semicolon, a full stop, or a conjunction such as 'and'.",
  },
];
