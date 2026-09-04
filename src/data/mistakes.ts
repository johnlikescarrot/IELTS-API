/**
 * A rule base of frequent, mechanically detectable errors in IELTS Writing.
 *
 * The catalogue is organised the way remedial IELTS materials organise their
 * "common mistakes" chapters: countability, subject-verb agreement, preposition
 * choice, register, redundancy and high-frequency misspellings. Each rule is a
 * self-contained, side-effect-free regular expression with a documented
 * replacement suggestion, which makes the rule base auditable and extensible
 * without touching the detection engine.
 *
 * @packageDocumentation
 */

/** Broad linguistic category a rule belongs to. */
export const MISTAKE_CATEGORIES = [
  "countability",
  "agreement",
  "preposition",
  "article",
  "word-form",
  "register",
  "redundancy",
  "spelling",
  "punctuation",
  "collocation",
] as const;

/** A linguistic category. */
export type MistakeCategory = (typeof MISTAKE_CATEGORIES)[number];

/** How strongly a rule signals a problem. */
export const MISTAKE_SEVERITIES = ["error", "warning", "style"] as const;

/** Severity of a rule. */
export type MistakeSeverity = (typeof MISTAKE_SEVERITIES)[number];

/** A single detection rule. */
export interface MistakeRule {
  /** Stable identifier, safe to use as a citation key. */
  readonly id: string;
  /** Linguistic category. */
  readonly category: MistakeCategory;
  /** Severity of the signal. */
  readonly severity: MistakeSeverity;
  /** Regular-expression source, applied case-insensitively and globally. */
  readonly pattern: string;
  /** Explanation of why the match is a problem. */
  readonly message: string;
  /** Concrete corrective advice. */
  readonly suggestion: string;
  /** A minimal illustrative example that the rule matches. */
  readonly example: string;
}

/** The complete rule base. */
export const MISTAKE_RULES: readonly MistakeRule[] = Object.freeze([
  {
    id: "uncountable-plural",
    category: "countability",
    severity: "error",
    pattern:
      "\\b(informations|advices|researches|equipments|furnitures|knowledges|softwares|staffs|evidences|homeworks|moneys|traffics)\\b",
    message: "This noun is uncountable in English and has no plural form.",
    suggestion:
      "Use the singular form, or quantify it with a phrase such as 'pieces of' or 'items of'.",
    example: "Many informations are available online.",
  },
  {
    id: "many-with-uncountable",
    category: "countability",
    severity: "error",
    pattern:
      "\\bmany\\s+(information|advice|research|equipment|furniture|knowledge|money|homework|traffic|progress)\\b",
    message: "'many' quantifies countable nouns only.",
    suggestion: "Use 'much', 'a great deal of' or 'a large amount of'.",
    example: "There are many information about this topic.",
  },
  {
    id: "much-with-countable",
    category: "countability",
    severity: "error",
    pattern:
      "\\bmuch\\s+(people|students|children|jobs|cars|problems|advantages|reasons|countries|companies)\\b",
    message: "'much' quantifies uncountable nouns only.",
    suggestion: "Use 'many' or 'a large number of'.",
    example: "Much people commute by train.",
  },
  {
    id: "amount-with-countable",
    category: "countability",
    severity: "warning",
    pattern:
      "\\bamount of\\s+(people|students|children|jobs|cars|problems|countries|companies)\\b",
    message: "'amount of' is used with uncountable nouns.",
    suggestion: "Use 'number of' with countable nouns.",
    example: "A large amount of people disagree.",
  },
  {
    id: "less-with-countable",
    category: "countability",
    severity: "warning",
    pattern:
      "\\bless\\s+(people|students|children|jobs|cars|problems|opportunities)\\b",
    message: "'less' is used with uncountable nouns in formal writing.",
    suggestion: "Use 'fewer' with countable nouns.",
    example: "Less people cycle to work.",
  },
  {
    id: "people-singular-verb",
    category: "agreement",
    severity: "error",
    pattern: "\\bpeople\\s+(is|was|has\\b(?!\\s+been\\s+being))",
    message: "'people' is a plural noun and takes a plural verb.",
    suggestion: "Use 'people are', 'people were' or 'people have'.",
    example: "People is worried about the environment.",
  },
  {
    id: "there-is-plural",
    category: "agreement",
    severity: "error",
    pattern:
      "\\bthere\\s+is\\s+(many|several|numerous|two|three|four|five|a lot of|lots of|plenty of)\\b",
    message: "A plural subject requires 'there are'.",
    suggestion: "Change 'there is' to 'there are'.",
    example: "There is many reasons for this trend.",
  },
  {
    id: "chart-singular-agreement",
    category: "agreement",
    severity: "error",
    pattern:
      "\\bthe\\s+(graph|chart|table|diagram|figure|map|pie chart|bar chart)\\s+(show|indicate|illustrate|present|compare|reveal|suggest)\\b",
    message: "A singular subject requires the third-person singular verb form.",
    suggestion: "Add '-s' to the verb, for example 'the chart shows'.",
    example: "The chart show three categories.",
  },
  {
    id: "is-consist-of",
    category: "word-form",
    severity: "error",
    pattern: "\\b(is|are|was|were)\\s+consist(s|ed)?\\s+of\\b",
    message: "'consist of' is not used in the passive voice.",
    suggestion: "Use 'consists of' or 'is composed of'.",
    example: "The report is consisted of three sections.",
  },
  {
    id: "discuss-about",
    category: "preposition",
    severity: "error",
    pattern: "\\bdiscuss(es|ed|ing)?\\s+about\\b",
    message: "'discuss' is a transitive verb and takes no preposition.",
    suggestion: "Delete 'about', or use 'talk about'.",
    example: "This essay will discuss about both views.",
  },
  {
    id: "depend-of",
    category: "preposition",
    severity: "error",
    pattern: "\\bdepend(s|ed|ing)?\\s+of\\b",
    message: "The verb 'depend' collocates with 'on'.",
    suggestion: "Use 'depend on' or 'depending on'.",
    example: "The outcome depends of the policy.",
  },
  {
    id: "emphasise-on",
    category: "preposition",
    severity: "error",
    pattern: "\\b(emphasi[sz]e[sd]?|stress(es|ed)?|mention(s|ed)?)\\s+on\\b",
    message: "These verbs are transitive and take no preposition.",
    suggestion: "Delete the preposition, or use 'place emphasis on'.",
    example: "The author emphasises on the risk.",
  },
  {
    id: "different-than",
    category: "preposition",
    severity: "style",
    pattern: "\\bdifferent\\s+than\\b",
    message: "'different than' is informal in British academic English.",
    suggestion: "Use 'different from'.",
    example: "The result is different than expected.",
  },
  {
    id: "in-the-other-hand",
    category: "preposition",
    severity: "error",
    pattern: "\\bin\\s+the\\s+other\\s+hand\\b",
    message: "The fixed phrase uses 'on', not 'in'.",
    suggestion: "Use 'on the other hand'.",
    example: "In the other hand, costs would rise.",
  },
  {
    id: "in-nowadays",
    category: "preposition",
    severity: "error",
    pattern: "\\bin\\s+nowadays\\b",
    message: "'nowadays' is an adverb and takes no preposition.",
    suggestion: "Use 'nowadays' on its own, or 'these days'.",
    example: "In nowadays, transport is faster.",
  },
  {
    id: "married-with",
    category: "collocation",
    severity: "error",
    pattern: "\\bmarried\\s+with\\s+(?!children\\b)",
    message: "The collocation is 'married to' a person.",
    suggestion: "Use 'married to'.",
    example: "She is married with a doctor.",
  },
  {
    id: "explain-me",
    category: "collocation",
    severity: "error",
    pattern:
      "\\b(explain|suggest|describe)(s|ed|ing)?\\s+(me|us|him|her|them)\\b",
    message: "These verbs require 'to' before an indirect object.",
    suggestion: "Use 'explain to me' or restructure the clause.",
    example: "The article explains us the process.",
  },
  {
    id: "most-of-people",
    category: "article",
    severity: "error",
    pattern: "\\bmost\\s+of\\s+people\\b",
    message: "'most of' requires a determiner before the noun.",
    suggestion: "Use 'most people' or 'most of the people surveyed'.",
    example: "Most of people prefer online shopping.",
  },
  {
    id: "the-most-of",
    category: "article",
    severity: "error",
    pattern: "\\bthe\\s+most\\s+of\\s+(the\\s+)?[a-z]+\\b",
    message: "'the most of' is not an English quantifier.",
    suggestion: "Use 'most of the' or simply 'most'.",
    example: "The most of students agree.",
  },
  {
    id: "generic-the-society",
    category: "article",
    severity: "style",
    pattern: "\\bthe\\s+society\\s+(is|has|should|must|will)\\b",
    message: "Abstract generic nouns usually take no definite article.",
    suggestion: "Use 'society' without 'the' when speaking generally.",
    example: "The society should invest more.",
  },
  {
    id: "double-comparative",
    category: "word-form",
    severity: "error",
    pattern: "\\bmore\\s+[a-z]+er\\b",
    message:
      "A comparative is formed either with '-er' or with 'more', not both.",
    suggestion: "Delete 'more', or use the base adjective after 'more'.",
    example: "This option is more cheaper.",
  },
  {
    id: "double-superlative",
    category: "word-form",
    severity: "error",
    pattern: "\\bmost\\s+[a-z]+est\\b",
    message:
      "A superlative is formed either with '-est' or with 'most', not both.",
    suggestion: "Delete 'most', or use the base adjective after 'most'.",
    example: "It is the most largest city.",
  },
  {
    id: "can-able-to",
    category: "word-form",
    severity: "error",
    pattern: "\\bcan\\s+(not\\s+)?able\\s+to\\b",
    message: "'can' and 'be able to' express the same modality.",
    suggestion: "Use 'can', 'cannot' or 'is able to'.",
    example: "Governments can able to reduce emissions.",
  },
  {
    id: "according-to-me",
    category: "register",
    severity: "error",
    pattern: "\\baccording\\s+to\\s+(me|my\\s+opinion)\\b",
    message: "'according to' introduces an external source, not the writer.",
    suggestion: "Use 'in my view' or 'I would argue that'.",
    example: "According to me, the policy failed.",
  },
  {
    id: "contraction",
    category: "register",
    severity: "style",
    pattern:
      "\\b(don't|doesn't|didn't|can't|won't|isn't|aren't|wasn't|weren't|it's|i'm|you're|we're|they're|there's|that's|shouldn't|couldn't|wouldn't)\\b",
    message: "Contractions are informal and are avoided in academic writing.",
    suggestion:
      "Write the full form, for example 'do not' instead of \"don't\".",
    example: "It's clear that costs don't fall.",
  },
  {
    id: "informal-vocabulary",
    category: "register",
    severity: "style",
    pattern:
      "\\b(kids|stuff|guys|gonna|wanna|kinda|a lot of|lots of|big time|and so on)\\b",
    message:
      "This item is conversational and lowers the formality of the response.",
    suggestion:
      "Use a neutral or academic equivalent such as 'children', 'items' or 'a considerable number of'.",
    example: "Lots of kids use smartphones.",
  },
  {
    id: "text-abbreviation",
    category: "register",
    severity: "error",
    pattern: "(?<![\\p{L}'])(u|ur|thx|pls|plz|asap|btw|imo)(?![\\p{L}'])",
    message: "Messaging abbreviations are not acceptable in the Writing paper.",
    suggestion: "Write the full word.",
    example: "IMO u should invest more.",
  },
  {
    id: "opinion-redundancy",
    category: "redundancy",
    severity: "style",
    pattern: "\\bin\\s+my\\s+opinion,?\\s+i\\s+(think|believe|feel)\\b",
    message: "'in my opinion' and 'I think' duplicate the same stance marker.",
    suggestion: "Keep one of the two.",
    example: "In my opinion, I think the plan is sound.",
  },
  {
    id: "intensifier-repetition",
    category: "redundancy",
    severity: "style",
    pattern: "\\bvery\\s+very\\b|\\breally\\s+really\\b",
    message: "Repeated intensifiers weaken academic tone.",
    suggestion: "Use a single stronger adjective such as 'considerable'.",
    example: "The rise was very very sharp.",
  },
  {
    id: "immediate-word-repetition",
    category: "redundancy",
    severity: "warning",
    pattern: "\\b(?!had\\b|that\\b|is\\b)([\\p{L}]{3,})\\s+\\1\\b",
    message:
      "The same word is repeated immediately, which is usually a typing slip.",
    suggestion: "Delete the duplicate.",
    example: "The the government must act.",
  },
  {
    id: "frequent-misspelling",
    category: "spelling",
    severity: "error",
    pattern:
      "\\b(recieve|seperate|definately|goverment|enviroment|beleive|occured|accomodation|neccessary|independant|arguement|thier|untill|wich|becuase|alot|inspite|sucessful|comunication|responsability)\\b",
    message: "This spelling is not a standard English form.",
    suggestion: "Check the spelling against a dictionary.",
    example: "The goverment recieved the report.",
  },
  {
    id: "missing-comma-after-however",
    category: "punctuation",
    severity: "style",
    pattern: "(?:^|[.!?]\\s+)however\\s+(?![,;])[\\p{L}]",
    message: "A sentence-initial 'however' is normally followed by a comma.",
    suggestion: "Write 'However, ...'.",
    example: "However the trend reversed.",
  },
  {
    id: "comma-splice-connector",
    category: "punctuation",
    severity: "warning",
    pattern:
      ",\\s+(however|therefore|moreover|furthermore|consequently|nevertheless)\\s+[\\p{L}]+\\s+[\\p{L}]+",
    message:
      "A conjunctive adverb cannot join two independent clauses with only a comma.",
    suggestion: "Use a semicolon or start a new sentence.",
    example: "Costs fell, however demand rose sharply.",
  },
]);

/** Rule lookup by identifier. */
export const MISTAKE_RULES_BY_ID: ReadonlyMap<string, MistakeRule> = new Map(
  MISTAKE_RULES.map((rule) => [rule.id, rule]),
);
