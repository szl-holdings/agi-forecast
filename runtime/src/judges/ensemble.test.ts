/**
 * @file runtime/src/judges/ensemble.test.ts
 * @description Vitest tests for the RAE-1 3-judge ensemble integration.
 *
 * Lean ref:  SZL.AGI.PACBayes.capability_improvement_rate_bound
 * Lean file: Lutar/PACBayes/CapabilityImprovementRate.lean
 * Lean commit: c4d1379568
 *
 * All tests run in mock mode (no API keys required).
 * Tests cover: verdict parsing, majority vote, mock mode, staged_advisory propagation.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  parseJudgeCompletion,
  majorityVote,
  runMockJudge,
  runEnsemble,
  DEFAULT_ENSEMBLE_CONFIG,
  type JudgeConfig,
} from "./ensemble.js";
import type { RAE1JudgeRecord } from "../../rae1/schema.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeJudgeRecord(verdict: "SOLVED" | "UNCLEAR" | "WRONG"): RAE1JudgeRecord {
  return {
    judge_id: `judge-test-${verdict}`,
    model_name: "test-model",
    system_prompt_variant: "rigorous",
    verdict,
    confidence_01: 0.8,
    latency_ms: 100,
    token_usage: { input: 50, output: 50, total: 100 },
  };
}

// ─── parseJudgeCompletion ─────────────────────────────────────────────────────

describe("parseJudgeCompletion", () => {
  it("parses SOLVED verdict with confidence", () => {
    const result = parseJudgeCompletion("SOLVED\n0.91\nThe solution is correct.");
    expect(result.verdict).toBe("SOLVED");
    expect(result.confidence_01).toBeCloseTo(0.91);
  });

  it("parses UNCLEAR verdict", () => {
    const result = parseJudgeCompletion("UNCLEAR\n0.55");
    expect(result.verdict).toBe("UNCLEAR");
    expect(result.confidence_01).toBeCloseTo(0.55);
  });

  it("parses WRONG verdict", () => {
    const result = parseJudgeCompletion("WRONG\n0.9\nThe final step is incorrect.");
    expect(result.verdict).toBe("WRONG");
    expect(result.confidence_01).toBeCloseTo(0.9);
  });

  it("falls back to UNCLEAR for unrecognized first line", () => {
    const result = parseJudgeCompletion("MAYBE\n0.5");
    expect(result.verdict).toBe("UNCLEAR");
  });

  it("clamps confidence above 1.0 to 1.0", () => {
    const result = parseJudgeCompletion("SOLVED\n1.5");
    expect(result.confidence_01).toBe(1.0);
  });

  it("clamps confidence below 0.0 to 0.0", () => {
    const result = parseJudgeCompletion("WRONG\n-0.3");
    expect(result.confidence_01).toBe(0.0);
  });

  it("defaults to 0.5 confidence when second line is not a number", () => {
    const result = parseJudgeCompletion("SOLVED\nnot-a-number");
    expect(result.confidence_01).toBe(0.5);
  });

  it("handles whitespace-padded verdict", () => {
    const result = parseJudgeCompletion("  SOLVED  \n0.8");
    expect(result.verdict).toBe("SOLVED");
  });

  it("is case-insensitive for verdict", () => {
    const result = parseJudgeCompletion("solved\n0.7");
    expect(result.verdict).toBe("SOLVED");
  });
});

// ─── majorityVote ─────────────────────────────────────────────────────────────

describe("majorityVote", () => {
  it("returns SOLVED when 2/3 vote SOLVED", () => {
    const records = [
      makeJudgeRecord("SOLVED"),
      makeJudgeRecord("SOLVED"),
      makeJudgeRecord("UNCLEAR"),
    ];
    const result = majorityVote(records);
    expect(result.ensemble_verdict).toBe("SOLVED");
    expect(result.votes_solved).toBe(2);
    expect(result.votes_unclear).toBe(1);
    expect(result.votes_wrong).toBe(0);
  });

  it("returns WRONG when 2/3 vote WRONG", () => {
    const records = [
      makeJudgeRecord("WRONG"),
      makeJudgeRecord("WRONG"),
      makeJudgeRecord("UNCLEAR"),
    ];
    const result = majorityVote(records);
    expect(result.ensemble_verdict).toBe("WRONG");
  });

  it("returns UNCLEAR on 3-way tie (1-1-1)", () => {
    const records = [
      makeJudgeRecord("SOLVED"),
      makeJudgeRecord("UNCLEAR"),
      makeJudgeRecord("WRONG"),
    ];
    const result = majorityVote(records);
    expect(result.ensemble_verdict).toBe("UNCLEAR");
  });

  it("returns UNCLEAR when all 3 vote UNCLEAR", () => {
    const records = [
      makeJudgeRecord("UNCLEAR"),
      makeJudgeRecord("UNCLEAR"),
      makeJudgeRecord("UNCLEAR"),
    ];
    const result = majorityVote(records);
    expect(result.ensemble_verdict).toBe("UNCLEAR");
  });

  it("returns SOLVED when unanimous (3/3)", () => {
    const records = [
      makeJudgeRecord("SOLVED"),
      makeJudgeRecord("SOLVED"),
      makeJudgeRecord("SOLVED"),
    ];
    const result = majorityVote(records);
    expect(result.ensemble_verdict).toBe("SOLVED");
    expect(result.votes_solved).toBe(3);
  });

  it("handles tie between SOLVED and UNCLEAR (→ UNCLEAR)", () => {
    // 4-judge ensemble: 2 SOLVED, 2 UNCLEAR
    const records = [
      makeJudgeRecord("SOLVED"),
      makeJudgeRecord("SOLVED"),
      makeJudgeRecord("UNCLEAR"),
      makeJudgeRecord("UNCLEAR"),
    ];
    const result = majorityVote(records);
    expect(result.ensemble_verdict).toBe("UNCLEAR");
  });
});

// ─── runMockJudge ─────────────────────────────────────────────────────────────

describe("runMockJudge", () => {
  it("returns a valid RAE1JudgeRecord", async () => {
    const config: JudgeConfig = DEFAULT_ENSEMBLE_CONFIG[0]!;
    const record = await runMockJudge(config, "test problem", "test solution");
    expect(record.judge_id).toBe(config.judge_id);
    expect(record.system_prompt_variant).toBe(config.system_prompt_variant);
    expect(["SOLVED", "UNCLEAR", "WRONG"]).toContain(record.verdict);
    expect(record.confidence_01).toBeGreaterThanOrEqual(0);
    expect(record.confidence_01).toBeLessThanOrEqual(1);
    expect(record.latency_ms).toBeGreaterThanOrEqual(0);
    expect(record.token_usage.total).toBe(0); // Mock uses 0 tokens
  });

  it("model_name is prefixed with 'mock-'", async () => {
    const config: JudgeConfig = DEFAULT_ENSEMBLE_CONFIG[0]!;
    const record = await runMockJudge(config, "p", "s");
    expect(record.model_name).toMatch(/^mock-/);
  });

  it("verdict is WRONG for conservative mock behavior", async () => {
    const config: JudgeConfig = DEFAULT_ENSEMBLE_CONFIG[0]!;
    const record = await runMockJudge(config, "p", "s");
    expect(record.verdict).toBe("WRONG");
  });
});

// ─── runEnsemble — mock mode ──────────────────────────────────────────────────

describe("runEnsemble — mock mode (MOCK_JUDGES=1 or no keys)", () => {
  beforeEach(() => {
    // Ensure no real API keys leak into tests
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.MOCK_JUDGES;
  });

  afterEach(() => {
    delete process.env.MOCK_JUDGES;
  });

  it("auto-enables mock mode when API keys are absent", async () => {
    const result = await runEnsemble({
      problem: "Find all x such that x^2 = 4.",
      solution: "x = 2 or x = -2.",
    });
    expect(result.staged_advisory).toBe(true);
    expect(result.staged_notes).toBeDefined();
    expect(result.staged_notes).toContain("Mock judges active");
  });

  it("returns exactly 3 judge records (default config)", async () => {
    const result = await runEnsemble({
      problem: "test problem",
      solution: "test solution",
      forceMock: true,
    });
    expect(result.judges).toHaveLength(3);
  });

  it("judge records have correct judge_ids from default config", async () => {
    const result = await runEnsemble({
      problem: "test",
      solution: "test",
      forceMock: true,
    });
    const ids = result.judges.map((j) => j.judge_id);
    expect(ids).toContain("judge-0-rigorous");
    expect(ids).toContain("judge-1-creative");
    expect(ids).toContain("judge-2-verification");
  });

  it("is_solved matches ensemble_verdict === SOLVED", async () => {
    const result = await runEnsemble({ problem: "p", solution: "s", forceMock: true });
    expect(result.is_solved).toBe(result.ensemble_verdict === "SOLVED");
  });

  it("returns staged_advisory=true when MOCK_JUDGES=1", async () => {
    process.env.MOCK_JUDGES = "1";
    const result = await runEnsemble({ problem: "p", solution: "s" });
    expect(result.staged_advisory).toBe(true);
  });

  it("staged_notes mentions MOCK_JUDGES=1 when env var set", async () => {
    process.env.MOCK_JUDGES = "1";
    const result = await runEnsemble({ problem: "p", solution: "s" });
    expect(result.staged_notes).toContain("MOCK_JUDGES=1");
  });

  it("all judge records have valid token_usage structure", async () => {
    const result = await runEnsemble({ problem: "p", solution: "s", forceMock: true });
    for (const judge of result.judges) {
      expect(judge.token_usage).toHaveProperty("input");
      expect(judge.token_usage).toHaveProperty("output");
      expect(judge.token_usage).toHaveProperty("total");
    }
  });

  it("ensemble result includes all 4 vote counts", async () => {
    const result = await runEnsemble({ problem: "p", solution: "s", forceMock: true });
    expect(typeof result.votes_solved).toBe("number");
    expect(typeof result.votes_unclear).toBe("number");
    expect(typeof result.votes_wrong).toBe("number");
    expect(result.votes_solved + result.votes_unclear + result.votes_wrong).toBe(
      result.judges.length
    );
  });
});

// ─── runEnsemble — custom config ──────────────────────────────────────────────

describe("runEnsemble — custom judge config", () => {
  it("respects custom configs (e.g., 4-judge ensemble)", async () => {
    const customConfig: JudgeConfig[] = [
      ...DEFAULT_ENSEMBLE_CONFIG,
      {
        judge_id: "judge-3-extra",
        model_name: "mistral-large-2407",
        system_prompt_variant: "verification",
        provider: "mistral",
        temperature: 0.1,
        max_tokens: 256,
      },
    ];
    const result = await runEnsemble({
      problem: "p",
      solution: "s",
      configs: customConfig,
      forceMock: true,
    });
    expect(result.judges).toHaveLength(4);
  });
});
