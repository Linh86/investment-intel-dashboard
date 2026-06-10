import { z } from "zod";
import rubricJson from "@/data/rubric/risk-rubric.v1.json";

export const DIMENSIONS = [
  "market",
  "execution",
  "regulatory",
  "supply-chain",
  "financial",
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

const rubricSchema = z
  .object({
    version: z.string().min(1),
    weights: z.record(z.enum(DIMENSIONS), z.number().min(0).max(1)),
  })
  .refine(
    (rubric) =>
      Math.abs(
        DIMENSIONS.reduce((sum, d) => sum + (rubric.weights[d] ?? 0), 0) - 1,
      ) < 1e-9,
    { message: "Rubric weights must sum to 1" },
  );

export interface Rubric {
  version: string;
  weights: Record<Dimension, number>;
}

export const RUBRIC: Rubric = rubricSchema.parse(rubricJson) as Rubric;
