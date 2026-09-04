import { z } from "zod";

import { skillIds } from "./catalog.js";

export const overallScoreQuerySchema = z
  .object({
    listening: bandScoreSchema(),
    reading: bandScoreSchema(),
    writing: bandScoreSchema(),
    speaking: bandScoreSchema(),
  })
  .strict();

export const rawScoreQuerySchema = z
  .object({
    test: z.enum(["listening", "reading_academic", "reading_general_training"]),
    target: z.coerce.number().int().min(4).max(8),
  })
  .strict();

export const practiceQuerySchema = z
  .object({
    skill: z.enum(["writing", "speaking"]).optional(),
    module: z.enum(["academic", "general_training"]).optional(),
    limit: z.coerce.number().int().min(1).max(20).default(10),
  })
  .strict();

export const skillParamsSchema = z.object({
  skill: z.enum(skillIds),
});

export const promptParamsSchema = z.object({
  id: z.string().min(1).max(120),
});

function bandScoreSchema() {
  return z
    .string()
    .regex(
      /^(?:[0-8](?:\.0|\.5)?|9(?:\.0)?)$/,
      "Use a score from 0 to 9 in 0.5 steps.",
    )
    .transform(Number);
}
