// SPDX-License-Identifier: Apache-2.0
// Author: Lutar, Stephen P. | ORCID 0009-0001-0110-4173 | SZL Holdings
// Tests: agi-forecast gauges + derived + safety gates + Brier

import { describe, it, expect, beforeEach } from "vitest";
import { FG01, FG02, FG03, FG04, FG05, FG06, FG07, FG08, FG09, FG10, FG11, FG12, BASE_GAUGES } from "./gauges.js";
import { computeFGD1, computeFGD2, computeFGD3, evaluateSafetyGates } from "./derived.js";
import { BrierLedger } from "./brier.js";

// ---------------------------------------------------------------------------
// Base gauge tests
// ---------------------------------------------------------------------------

describe("FG-01 Capability Overhang", () => {
  it("returns 1 when deployed == bestKnown", () =>
    expect(FG01.evaluate({ deployed: 0.9, bestKnown: 0.9 }).value).toBeCloseTo(1));
  it("returns 0.5 when deployed = half of bestKnown", () =>
    expect(FG01.evaluate({ deployed: 0.5, bestKnown: 1.0 }).value).toBeCloseTo(0.5));
});

describe("FG-02 Interpretability Coverage", () => {
  it("returns fraction explainedParams/totalParams", () =>
    expect(FG02.evaluate({ explainedParams: 25, totalParams: 100 }).value).toBeCloseTo(0.25));
});

describe("FG-05 Compute Doubling Rate", () => {
  it("returns 1 when daysSinceDoubling=0", () =>
    expect(FG05.evaluate({ daysSinceDoubling: 0 }).value).toBeCloseTo(1));
  it("returns ~0 when daysSinceDoubling=365", () =>
    expect(FG05.evaluate({ daysSinceDoubling: 365 }).value).toBeCloseTo(0));
  it("clamps to 0 when daysSinceDoubling > 365", () =>
    expect(FG05.evaluate({ daysSinceDoubling: 500 }).value).toBe(0));
});

describe("FG-09 Deception Rate", () => {
  it("returns 0 when no deceptive outputs", () =>
    expect(FG09.evaluate({ deceptiveOutputs: 0, totalOutputs: 100 }).value).toBe(0));
  it("returns correct fraction", () =>
    expect(FG09.evaluate({ deceptiveOutputs: 5, totalOutputs: 100 }).value).toBeCloseTo(0.05));
});

describe("BASE_GAUGES registry", () => {
  it("has exactly 12 gauges", () => expect(BASE_GAUGES).toHaveLength(12));
  it("all gauges have unique IDs", () => {
    const ids = BASE_GAUGES.map((g) => g.id);
    expect(new Set(ids).size).toBe(12);
  });
  it("all gauge results have value in [0,1]", () => {
    const testInputs: Record<string, unknown> = {
      "FG-01": { deployed: 0.8, bestKnown: 1.0 },
      "FG-02": { explainedParams: 50, totalParams: 100 },
      "FG-03": { alignmentScore: 0.85 },
      "FG-04": { novelTasksSolved: 7, novelTasksTotal: 10 },
      "FG-05": { daysSinceDoubling: 180 },
      "FG-06": { auditedDecisions: 80, totalDecisions: 100 },
      "FG-07": { goalSimilarity: 0.95 },
      "FG-08": { lockInProbability: 0.3 },
      "FG-09": { deceptiveOutputs: 2, totalOutputs: 100 },
      "FG-10": { cooperativeOutcomes: 90, totalOutcomes: 100 },
      "FG-11": { improvementsThisWeek: 5, baseline: 10 },
      "FG-12": { societalScore: 0.7 },
    };
    for (const gauge of BASE_GAUGES) {
      const input = testInputs[gauge.id];
      const result = gauge.evaluate(gauge.schema.parse(input));
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThanOrEqual(1);
      expect(result.gaugeId).toBe(gauge.id);
    }
  });
});

// ---------------------------------------------------------------------------
// Derived gauges
// ---------------------------------------------------------------------------

const DI = { fg01: 0.8, fg04: 0.7, fg06: 0.9, fg07: 0.95, fg08: 0.3, fg09: 0.02, fg10: 0.9, fg11: 0.5 };

describe("FG-D1 Composite Risk", () => {
  it("value is in [0,1]", () => {
    const r = computeFGD1(DI);
    expect(r.value).toBeGreaterThanOrEqual(0);
    expect(r.value).toBeLessThanOrEqual(1);
  });
});

describe("FG-D2 Safety Posture", () => {
  it("increases with oversight and goal stability", () => {
    const high = computeFGD2({ ...DI, fg06: 1.0, fg07: 1.0, fg09: 0.0 });
    expect(high.value).toBeCloseTo(1.0);
  });
});

// ---------------------------------------------------------------------------
// Safety gates
// ---------------------------------------------------------------------------

describe("Safety gates", () => {
  it("FG-S4 passes when all sub-gates pass", () => {
    const r = evaluateSafetyGates({ fg06: 0.95, fg07: 0.92, fg09: 0.01 });
    expect(r.s1.pass).toBe(true);
    expect(r.s2.pass).toBe(true);
    expect(r.s3.pass).toBe(true);
    expect(r.s4.pass).toBe(true);
  });

  it("FG-S4 fails when FG-S2 fails (deception too high)", () => {
    const r = evaluateSafetyGates({ fg06: 0.95, fg07: 0.92, fg09: 0.10 });
    expect(r.s2.pass).toBe(false);
    expect(r.s4.pass).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Brier ledger
// ---------------------------------------------------------------------------

describe("BrierLedger", () => {
  let ledger: BrierLedger;
  beforeEach(() => { ledger = new BrierLedger(10); });

  it("computes Brier score correctly", () => {
    const e = ledger.record("FG-01", 0.8, 1);
    expect(e.score).toBeCloseTo(Math.pow(0.8 - 1, 2));
  });

  it("perfect prediction scores 0", () => {
    expect(ledger.record("FG-01", 1.0, 1).score).toBe(0);
    expect(ledger.record("FG-01", 0.0, 0).score).toBe(0);
  });

  it("ring buffer wraps correctly at capacity", () => {
    for (let i = 0; i < 15; i++) ledger.record("FG-01", 0.5, i % 2 as 0 | 1);
    expect(ledger.size).toBe(10); // capped at capacity
    expect(ledger.entries()).toHaveLength(10);
  });

  it("mean() is arithmetic mean of all scores", () => {
    ledger.record("FG-01", 1.0, 1); // score = 0
    ledger.record("FG-01", 0.0, 1); // score = 1
    expect(ledger.mean()).toBeCloseTo(0.5);
  });

  it("throws for out-of-range prediction", () => {
    expect(() => ledger.record("FG-01", 1.5, 1)).toThrow(RangeError);
  });
});
