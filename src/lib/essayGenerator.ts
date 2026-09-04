/**
 * A deterministic essay-prompt generator. Given a seed it always returns the
 * same set of prompts, which makes practice sessions reproducible and lets
 * caching work. Prompts are assembled from original topic and frame text.
 */
import { badRequest } from "./errors.js";
import { mulberry32, pickDistinct, seedToUint32 } from "./random.js";
import { ESSAY_FRAMES, ESSAY_TOPIC_POOL, type WritingPrompt } from "../data/writing.js";

/** Minimum number of generated prompts per call. */
export const MIN_GENERATED = 1;

/** Maximum number of generated prompts per call (the size of the topic pool). */
export const MAX_GENERATED = ESSAY_TOPIC_POOL.length;

/** Advice appended to every generated essay prompt. */
const GENERATED_TIPS =
  "This is a synthetic practice prompt generated from a seed for " +
  "reproducibility. Plan your essay before you write and keep each paragraph " +
  "focused on a single idea.";

/** Capitalise the first character of a string (used for prompt titles). */
function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export interface GenerateEssaysOptions {
  /** Any value; hashed into a 32-bit seed for the PRNG. */
  seed: number | string;
  /** How many prompts to produce (clamped into {@link MIN_GENERATED}..{@link MAX_GENERATED}). */
  count: number;
}

/**
 * Build `count` distinct essay prompts for the supplied seed. Throws a
 * {@link badRequest} error when `count` falls outside the supported range.
 */
export function generateEssays(options: GenerateEssaysOptions): WritingPrompt[] {
  if (!Number.isInteger(options.count)) {
    throw badRequest(
      `generation count must be an integer; received ${JSON.stringify(options.count)}.`,
    );
  }
  const seedNumber = seedToUint32(options.seed);
  const rand = mulberry32(seedNumber);
  const topicCount = Math.min(Math.max(options.count, MIN_GENERATED), MAX_GENERATED);
  const topics = pickDistinct(ESSAY_TOPIC_POOL, topicCount, rand);
  const prompts: WritingPrompt[] = [];
  topics.forEach((topic, index) => {
    const frame = ESSAY_FRAMES[index % ESSAY_FRAMES.length] as string;
    prompts.push({
      id: `gen-${seedNumber}-${index}`,
      task: 2,
      kind: "essay",
      module: "both",
      category: "Practice",
      title: capitalise(topic),
      prompt: frame.replace("{topic}", topic),
      tips: GENERATED_TIPS,
    });
  });
  return prompts;
}
