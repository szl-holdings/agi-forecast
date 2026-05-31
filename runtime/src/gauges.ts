// SPDX-License-Identifier: Apache-2.0
// Author: Lutar, Stephen P. | ORCID 0009-0001-0110-4173 | SZL Holdings
// Module: agi-forecast — FG-01..FG-12 gauge implementations
// Doctrine V7 preflight: ✓

import { z } from "zod";
import type { Gauge, GaugeResult } from "./gauge-types.js";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function clamp(v: number): number { return Math.min(1, Math.max(0, v)); }

function makeResult(id: string, label: string, value: number): GaugeResult {
  return { gaugeId: id, value: clamp(value), brier_input: clamp(value), label, timestamp: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// FG-01: Capability overhang — ratio of deployed / best-known capability
// ---------------------------------------------------------------------------
export const FG01Schema = z.object({ deployed: z.number().min(0).max(1), bestKnown: z.number().min(0).max(1) });
export type FG01Input = z.infer<typeof FG01Schema>;
export const FG01: Gauge<FG01Input> = {
  id: "FG-01", label: "Capability Overhang",
  schema: FG01Schema,
  evaluate: (i) => makeResult("FG-01", "Capability Overhang", i.bestKnown > 0 ? i.deployed / i.bestKnown : 0),
};

// ---------------------------------------------------------------------------
// FG-02: Interpretability coverage — fraction of model internals explained
// ---------------------------------------------------------------------------
export const FG02Schema = z.object({ explainedParams: z.number().min(0), totalParams: z.number().min(1) });
export type FG02Input = z.infer<typeof FG02Schema>;
export const FG02: Gauge<FG02Input> = {
  id: "FG-02", label: "Interpretability Coverage",
  schema: FG02Schema,
  evaluate: (i) => makeResult("FG-02", "Interpretability Coverage", i.explainedParams / i.totalParams),
};

// ---------------------------------------------------------------------------
// FG-03: Alignment confidence — composite self-reported score [0,1]
// ---------------------------------------------------------------------------
export const FG03Schema = z.object({ alignmentScore: z.number().min(0).max(1) });
export const FG03: Gauge<z.infer<typeof FG03Schema>> = {
  id: "FG-03", label: "Alignment Confidence",
  schema: FG03Schema,
  evaluate: (i) => makeResult("FG-03", "Alignment Confidence", i.alignmentScore),
};

// ---------------------------------------------------------------------------
// FG-04: Task generalisation — fraction of novel tasks solved
// ---------------------------------------------------------------------------
export const FG04Schema = z.object({ novelTasksSolved: z.number().min(0), novelTasksTotal: z.number().min(1) });
export const FG04: Gauge<z.infer<typeof FG04Schema>> = {
  id: "FG-04", label: "Task Generalisation",
  schema: FG04Schema,
  evaluate: (i) => makeResult("FG-04", "Task Generalisation", i.novelTasksSolved / i.novelTasksTotal),
};

// ---------------------------------------------------------------------------
// FG-05: Compute doubling time — normalised days since last doubling (lower=faster)
// ---------------------------------------------------------------------------
export const FG05Schema = z.object({ daysSinceDoubling: z.number().min(0) });
export const FG05: Gauge<z.infer<typeof FG05Schema>> = {
  id: "FG-05", label: "Compute Doubling Rate",
  schema: FG05Schema,
  // Score = 1 - normalised days (faster doubling → higher score)
  evaluate: (i) => makeResult("FG-05", "Compute Doubling Rate", clamp(1 - i.daysSinceDoubling / 365)),
};

// ---------------------------------------------------------------------------
// FG-06: Oversight coverage — fraction of model decisions audited
// ---------------------------------------------------------------------------
export const FG06Schema = z.object({ auditedDecisions: z.number().min(0), totalDecisions: z.number().min(1) });
export const FG06: Gauge<z.infer<typeof FG06Schema>> = {
  id: "FG-06", label: "Oversight Coverage",
  schema: FG06Schema,
  evaluate: (i) => makeResult("FG-06", "Oversight Coverage", i.auditedDecisions / i.totalDecisions),
};

// ---------------------------------------------------------------------------
// FG-07: Goal stability — cosine similarity of goal embeddings over time
// ---------------------------------------------------------------------------
export const FG07Schema = z.object({ goalSimilarity: z.number().min(0).max(1) });
export const FG07: Gauge<z.infer<typeof FG07Schema>> = {
  id: "FG-07", label: "Goal Stability",
  schema: FG07Schema,
  evaluate: (i) => makeResult("FG-07", "Goal Stability", i.goalSimilarity),
};

// ---------------------------------------------------------------------------
// FG-08: Value lock-in risk — estimated probability of value lock-in [0,1]
// ---------------------------------------------------------------------------
export const FG08Schema = z.object({ lockInProbability: z.number().min(0).max(1) });
export const FG08: Gauge<z.infer<typeof FG08Schema>> = {
  id: "FG-08", label: "Value Lock-in Risk",
  schema: FG08Schema,
  evaluate: (i) => makeResult("FG-08", "Value Lock-in Risk", i.lockInProbability),
};

// ---------------------------------------------------------------------------
// FG-09: Deception rate — fraction of detected deceptive outputs
// ---------------------------------------------------------------------------
export const FG09Schema = z.object({ deceptiveOutputs: z.number().min(0), totalOutputs: z.number().min(1) });
export const FG09: Gauge<z.infer<typeof FG09Schema>> = {
  id: "FG-09", label: "Deception Rate",
  schema: FG09Schema,
  evaluate: (i) => makeResult("FG-09", "Deception Rate", i.deceptiveOutputs / i.totalOutputs),
};

// ---------------------------------------------------------------------------
// FG-10: Cooperation index — fraction of cooperative vs defective game outcomes
// ---------------------------------------------------------------------------
export const FG10Schema = z.object({ cooperativeOutcomes: z.number().min(0), totalOutcomes: z.number().min(1) });
export const FG10: Gauge<z.infer<typeof FG10Schema>> = {
  id: "FG-10", label: "Cooperation Index",
  schema: FG10Schema,
  evaluate: (i) => makeResult("FG-10", "Cooperation Index", i.cooperativeOutcomes / i.totalOutcomes),
};

// ---------------------------------------------------------------------------
// FG-11: Recursive self-improvement rate — iterations per week
// ---------------------------------------------------------------------------
export const FG11Schema = z.object({ improvementsThisWeek: z.number().min(0), baseline: z.number().min(1) });
export const FG11: Gauge<z.infer<typeof FG11Schema>> = {
  id: "FG-11", label: "RSI Rate",
  schema: FG11Schema,
  evaluate: (i) => makeResult("FG-11", "RSI Rate", clamp(i.improvementsThisWeek / i.baseline)),
};

// ---------------------------------------------------------------------------
// FG-12: Societal impact index — composite normalised score
// ---------------------------------------------------------------------------
export const FG12Schema = z.object({ societalScore: z.number().min(0).max(1) });
export const FG12: Gauge<z.infer<typeof FG12Schema>> = {
  id: "FG-12", label: "Societal Impact",
  schema: FG12Schema,
  evaluate: (i) => makeResult("FG-12", "Societal Impact", i.societalScore),
};

// ---------------------------------------------------------------------------
// All base gauges registry
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BASE_GAUGES: Gauge<any>[] = [
  FG01, FG02, FG03, FG04, FG05, FG06, FG07, FG08, FG09, FG10, FG11, FG12,
];
