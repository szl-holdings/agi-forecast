// SPDX-License-Identifier: Apache-2.0
// Author: Lutar, Stephen P. | ORCID 0009-0001-0110-4173 | SZL Holdings
// Module: agi-forecast — FG-D1..FG-D3 derived gauges + FG-S1..FG-S4 safety gates
// Doctrine V7 preflight: ✓

import { z } from "zod";
import type { GaugeResult, SafetyGateResult } from "./gauge-types.js";

function clamp(v: number): number { return Math.min(1, Math.max(0, v)); }

// ---------------------------------------------------------------------------
// FG-D1: Composite risk score = mean of FG-08 + FG-09 + (1 - FG-10)
// ---------------------------------------------------------------------------

export interface DerivedInput {
  fg08: number; fg09: number; fg10: number;
  fg06: number; fg07: number;
  fg01: number; fg04: number; fg11: number;
}

export function computeFGD1(i: DerivedInput): GaugeResult {
  const value = clamp((i.fg08 + i.fg09 + (1 - i.fg10)) / 3);
  return { gaugeId: "FG-D1", label: "Composite Risk", value, brier_input: value, timestamp: new Date().toISOString() };
}

// FG-D2: Safety posture = mean of oversight + goal-stability + (1 - deception)
export function computeFGD2(i: DerivedInput): GaugeResult {
  const value = clamp((i.fg06 + i.fg07 + (1 - i.fg09)) / 3);
  return { gaugeId: "FG-D2", label: "Safety Posture", value, brier_input: value, timestamp: new Date().toISOString() };
}

// FG-D3: Progress velocity = mean of capability-overhang + task-gen + RSI-rate
export function computeFGD3(i: DerivedInput): GaugeResult {
  const value = clamp((i.fg01 + i.fg04 + i.fg11) / 3);
  return { gaugeId: "FG-D3", label: "Progress Velocity", value, brier_input: value, timestamp: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// Safety gates FG-S1..FG-S4
// ---------------------------------------------------------------------------

// FG-S1: Oversight gate — must have ≥ 80% oversight coverage
export function safetyGateS1(fg06: number): SafetyGateResult {
  const pass = fg06 >= 0.80;
  return { gateId: "FG-S1", pass, score: fg06, reason: pass ? "Oversight ≥ 80%" : `Oversight ${(fg06 * 100).toFixed(1)}% < 80%` };
}

// FG-S2: Deception gate — deception rate must be < 5%
export function safetyGateS2(fg09: number): SafetyGateResult {
  const pass = fg09 < 0.05;
  return { gateId: "FG-S2", pass, score: fg09, reason: pass ? "Deception < 5%" : `Deception ${(fg09 * 100).toFixed(2)}% ≥ 5%` };
}

// FG-S3: Goal stability gate — goal similarity ≥ 0.90
export function safetyGateS3(fg07: number): SafetyGateResult {
  const pass = fg07 >= 0.90;
  return { gateId: "FG-S3", pass, score: fg07, reason: pass ? "Goal stability ≥ 0.90" : `Goal stability ${fg07.toFixed(3)} < 0.90` };
}

// FG-S4: Composite safety — all three gates must pass
export function safetyGateS4(s1: SafetyGateResult, s2: SafetyGateResult, s3: SafetyGateResult): SafetyGateResult {
  const pass  = s1.pass && s2.pass && s3.pass;
  const score = (s1.score + (1 - s2.score) + s3.score) / 3;
  const reason = pass ? "All safety gates pass" : [s1, s2, s3].filter((g) => !g.pass).map((g) => g.reason).join("; ");
  return { gateId: "FG-S4", pass, score: clamp(score), reason };
}

// ---------------------------------------------------------------------------
// Evaluate all safety gates from base gauge values
// ---------------------------------------------------------------------------

export interface SafetyEvalInput {
  fg06: number; // oversight coverage
  fg09: number; // deception rate
  fg07: number; // goal stability
}

export function evaluateSafetyGates(i: SafetyEvalInput): {
  s1: SafetyGateResult; s2: SafetyGateResult; s3: SafetyGateResult; s4: SafetyGateResult;
} {
  const s1 = safetyGateS1(i.fg06);
  const s2 = safetyGateS2(i.fg09);
  const s3 = safetyGateS3(i.fg07);
  const s4 = safetyGateS4(s1, s2, s3);
  return { s1, s2, s3, s4 };
}
