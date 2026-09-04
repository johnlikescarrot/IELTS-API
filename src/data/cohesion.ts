/**
 * Cohesive devices grouped by rhetorical function.
 *
 * Coherence and cohesion is one of the four criteria for both Writing tasks.
 * The inventory below is used to measure the density and the functional variety
 * of linking devices in a candidate response, which is a better proxy for the
 * criterion than raw counts of a handful of connectives.
 *
 * @packageDocumentation
 */

/** Rhetorical functions a cohesive device can perform. */
export const COHESION_FUNCTIONS = [
  "addition",
  "contrast",
  "cause",
  "result",
  "exemplification",
  "sequence",
  "concession",
  "comparison",
  "emphasis",
  "summary",
] as const;

/** A rhetorical function of a cohesive device. */
export type CohesionFunction = (typeof COHESION_FUNCTIONS)[number];

/** A group of interchangeable cohesive devices. */
export interface CohesionGroup {
  /** The rhetorical function shared by the devices. */
  readonly function: CohesionFunction;
  /** Lower-cased device strings, single or multi-word. */
  readonly devices: readonly string[];
}

/** The full inventory of cohesive devices recognised by the analyser. */
export const COHESION_DEVICES: readonly CohesionGroup[] = Object.freeze([
  {
    function: "addition",
    devices: [
      "in addition",
      "furthermore",
      "moreover",
      "additionally",
      "besides",
      "what is more",
      "as well as",
      "not only",
    ],
  },
  {
    function: "contrast",
    devices: [
      "however",
      "on the other hand",
      "in contrast",
      "conversely",
      "by contrast",
      "whereas",
      "while",
      "unlike",
    ],
  },
  {
    function: "cause",
    devices: [
      "because",
      "since",
      "due to",
      "owing to",
      "as a result of",
      "on account of",
      "given that",
    ],
  },
  {
    function: "result",
    devices: [
      "therefore",
      "consequently",
      "as a result",
      "thus",
      "hence",
      "accordingly",
      "for this reason",
    ],
  },
  {
    function: "exemplification",
    devices: [
      "for example",
      "for instance",
      "such as",
      "to illustrate",
      "namely",
      "in particular",
    ],
  },
  {
    function: "sequence",
    devices: [
      "firstly",
      "secondly",
      "thirdly",
      "first of all",
      "subsequently",
      "finally",
      "then",
      "afterwards",
    ],
  },
  {
    function: "concession",
    devices: [
      "although",
      "even though",
      "despite",
      "in spite of",
      "nevertheless",
      "nonetheless",
      "admittedly",
      "granted that",
    ],
  },
  {
    function: "comparison",
    devices: [
      "similarly",
      "likewise",
      "in the same way",
      "compared with",
      "compared to",
      "just as",
    ],
  },
  {
    function: "emphasis",
    devices: [
      "indeed",
      "in fact",
      "clearly",
      "undoubtedly",
      "particularly",
      "above all",
    ],
  },
  {
    function: "summary",
    devices: [
      "in conclusion",
      "to conclude",
      "in summary",
      "to sum up",
      "overall",
      "on balance",
      "all in all",
    ],
  },
]);

/** A cohesive device detected in a text. */
export interface CohesionHit {
  /** The matched device, lower cased. */
  readonly device: string;
  /** The rhetorical function of the device. */
  readonly function: CohesionFunction;
  /** Number of occurrences in the text. */
  readonly count: number;
}

/** Aggregate view of cohesive-device usage in a text. */
export interface CohesionProfile {
  /** Every device found, ordered by descending count then alphabetically. */
  readonly devices: readonly CohesionHit[];
  /** Total device occurrences. */
  readonly total: number;
  /** Number of distinct rhetorical functions represented. */
  readonly distinctFunctions: number;
  /** Device occurrences per 100 word tokens. */
  readonly densityPer100Words: number;
}

const DEVICE_INDEX: readonly {
  readonly device: string;
  readonly function: CohesionFunction;
  readonly pattern: RegExp;
}[] = COHESION_DEVICES.flatMap((group) =>
  group.devices.map((device) => ({
    device,
    function: group.function,
    pattern: new RegExp(
      `(?<![\\p{L}])${device.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`,
      "giu",
    ),
  })),
);

/**
 * Counts cohesive devices in a text.
 *
 * @param text - Arbitrary input text.
 * @param tokenCount - Number of word tokens, used for the density figure.
 */
export function cohesionProfile(
  text: string,
  tokenCount: number,
): CohesionProfile {
  const lowered = text.toLowerCase();
  const hits: CohesionHit[] = [];
  const functions = new Set<CohesionFunction>();
  let total = 0;

  for (const entry of DEVICE_INDEX) {
    entry.pattern.lastIndex = 0;
    const matches = lowered.match(entry.pattern);
    if (matches === null) {
      continue;
    }
    hits.push({
      device: entry.device,
      function: entry.function,
      count: matches.length,
    });
    functions.add(entry.function);
    total += matches.length;
  }

  hits.sort(
    (left, right) =>
      right.count - left.count || left.device.localeCompare(right.device),
  );

  return {
    devices: hits,
    total,
    distinctFunctions: functions.size,
    densityPer100Words:
      tokenCount === 0 ? 0 : Math.round((total / tokenCount) * 10000) / 100,
  };
}
