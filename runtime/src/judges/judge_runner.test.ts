/**
 * judge_runner.test.ts
 *
 * Vitest tests for the 3-judge ensemble orchestrator.
 * All LLM SDK calls are mocked — no real API calls during tests.
 *
 * Signed-off-by: szl-putnam-engineer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { JudgeResponse } from "./real_llm_judge.js";
import type { EnsembleResult } from "./judge_runner.js";

// ---------------------------------------------------------------------------
// Mock real_llm_judge module — must be hoisted before imports
// ---------------------------------------------------------------------------

vi.mock("./real_llm_judge.js", () => ({
  callRealLLMJudge: vi.fn(),
}));

import { callRealLLMJudge } from "./real_llm_judge.js";
import { runJudgeEnsemble } from "./judge_runner.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockProblem = {
  id: "2024-A1",
  year: 2024,
  set: "A",
  number: 1,
  statement: "Determine all integers n such that n^2 − 3n + 1 = 0.",
};

function makeJudgeResponse(
  verdict: JudgeResponse["verdict"],
  overrides: Partial<JudgeResponse> = {}
): JudgeResponse {
  return {
    verdict,
    reasoning: `test_reasoning_${verdict}`,
    answer: verdict === "SOLVED" ? "42" : "",
    confidence_01: verdict === "SOLVED" ? 0.9 : verdict === "WRONG" ? 0.8 : 0.3,
    latency_ms: 123,
    token_usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
    model_used: "claude-sonnet-4-5",
    attempt_count: 1,
    receipt_type: "judge_response",
    timestamp_iso: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const mockFn = callRealLLMJudge as ReturnType<typeof vi.fn>;

// Capture stdout writes (DSSE receipts) without polluting test output
let stdoutCapture: string[] = [];
let originalWrite: typeof process.stdout.write;

beforeEach(() => {
  stdoutCapture = [];
  originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array) => {
    if (typeof chunk === "string") stdoutCapture.push(chunk);
    return true;
  }) as typeof process.stdout.write;
});

afterEach(() => {
  process.stdout.write = originalWrite;
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runJudgeEnsemble — majority vote", () => {
  it("3 SOLVED → final_verdict SOLVED", async () => {
    mockFn.mockResolvedValue(makeJudgeResponse("SOLVED"));

    const result = await runJudgeEnsemble(mockProblem as any, "scaffold text");

    expect(result.final_verdict).toBe("SOLVED");
    expect(result.voting_record.SOLVED).toBe(3);
    expect(result.voting_record.UNCLEAR).toBe(0);
    expect(result.voting_record.WRONG).toBe(0);
  });

  it("2 UNCLEAR + 1 SOLVED → final_verdict UNCLEAR (conservative)", async () => {
    mockFn
      .mockResolvedValueOnce(makeJudgeResponse("UNCLEAR"))
      .mockResolvedValueOnce(makeJudgeResponse("UNCLEAR"))
      .mockResolvedValueOnce(makeJudgeResponse("SOLVED"));

    const result = await runJudgeEnsemble(mockProblem as any, "scaffold text");

    expect(result.final_verdict).toBe("UNCLEAR");
    expect(result.voting_record.UNCLEAR).toBe(2);
    expect(result.voting_record.SOLVED).toBe(1);
  });

  it("1 SOLVED + 1 WRONG + 1 UNCLEAR → final_verdict UNCLEAR (no majority)", async () => {
    mockFn
      .mockResolvedValueOnce(makeJudgeResponse("SOLVED"))
      .mockResolvedValueOnce(makeJudgeResponse("WRONG"))
      .mockResolvedValueOnce(makeJudgeResponse("UNCLEAR"));

    const result = await runJudgeEnsemble(mockProblem as any, "scaffold text");

    expect(result.final_verdict).toBe("UNCLEAR");
  });

  it("2 WRONG + 1 UNCLEAR → final_verdict WRONG", async () => {
    mockFn
      .mockResolvedValueOnce(makeJudgeResponse("WRONG"))
      .mockResolvedValueOnce(makeJudgeResponse("WRONG"))
      .mockResolvedValueOnce(makeJudgeResponse("UNCLEAR"));

    const result = await runJudgeEnsemble(mockProblem as any, "scaffold text");

    expect(result.final_verdict).toBe("WRONG");
  });
});

describe("runJudgeEnsemble — all judges fail", () => {
  it("all 3 throw → ensemble returns UNCLEAR with error: all_judges_failed", async () => {
    mockFn.mockRejectedValue(new Error("connection_timeout"));

    const result = await runJudgeEnsemble(mockProblem as any, "scaffold text");

    expect(result.final_verdict).toBe("UNCLEAR");
    expect(result.error).toBe("all_judges_failed");
    expect(result.judges).toHaveLength(3);
    expect(result.judges.every((j) => j.verdict === "UNCLEAR")).toBe(true);
  });

  it("all 3 throw → judges array contains error reasoning", async () => {
    mockFn.mockRejectedValue(new Error("auth_failure"));

    const result = await runJudgeEnsemble(mockProblem as any, "scaffold text");

    const hasErrorReason = result.judges.some((j) =>
      j.reasoning.includes("auth_failure")
    );
    expect(hasErrorReason).toBe(true);
  });
});

describe("runJudgeEnsemble — token usage aggregation", () => {
  it("aggregates token usage across all 3 judges", async () => {
    mockFn.mockResolvedValue(
      makeJudgeResponse("SOLVED", {
        token_usage: { input_tokens: 200, output_tokens: 100, total_tokens: 300 },
      })
    );

    const result = await runJudgeEnsemble(mockProblem as any, "scaffold text");

    expect(result.total_token_usage.input_tokens).toBe(600);
    expect(result.total_token_usage.output_tokens).toBe(300);
    expect(result.total_token_usage.total_tokens).toBe(900);
  });

  it("zero token usage when all judges fail", async () => {
    mockFn.mockRejectedValue(new Error("timeout"));

    const result = await runJudgeEnsemble(mockProblem as any, "scaffold text");

    expect(result.total_token_usage.total_tokens).toBe(0);
  });
});

describe("runJudgeEnsemble — latency tracking", () => {
  it("records total_latency_ms as a positive number", async () => {
    mockFn.mockResolvedValue(makeJudgeResponse("SOLVED"));

    const result = await runJudgeEnsemble(mockProblem as any, "scaffold text");

    expect(result.total_latency_ms).toBeGreaterThan(0);
    expect(typeof result.total_latency_ms).toBe("number");
  });

  it("preserves per-judge latency_ms on each JudgeResponse", async () => {
    mockFn.mockResolvedValue(makeJudgeResponse("SOLVED", { latency_ms: 250 }));

    const result = await runJudgeEnsemble(mockProblem as any, "scaffold text");

    expect(result.judges.every((j) => j.latency_ms === 250)).toBe(true);
  });
});

describe("runJudgeEnsemble — DSSE receipt shape", () => {
  it("emits valid JSON receipt to stdout with receipt_type = ensemble_result", async () => {
    mockFn.mockResolvedValue(makeJudgeResponse("SOLVED"));

    await runJudgeEnsemble(mockProblem as any, "scaffold text");

    const ensembleReceipts = stdoutCapture.filter((s) => {
      try {
        const parsed = JSON.parse(s);
        return parsed.receipt_type === "ensemble_result";
      } catch {
        return false;
      }
    });

    expect(ensembleReceipts).toHaveLength(1);
    const receipt: EnsembleResult = JSON.parse(ensembleReceipts[0]!);
    expect(receipt).toHaveProperty("final_verdict");
    expect(receipt).toHaveProperty("voting_record");
    expect(receipt).toHaveProperty("judges");
    expect(receipt).toHaveProperty("total_token_usage");
    expect(receipt).toHaveProperty("timestamp_iso");
  });

  it("receipt timestamp_iso is a valid ISO string", async () => {
    mockFn.mockResolvedValue(makeJudgeResponse("SOLVED"));

    const result = await runJudgeEnsemble(mockProblem as any, "scaffold text");

    expect(() => new Date(result.timestamp_iso)).not.toThrow();
    expect(new Date(result.timestamp_iso).toISOString()).toBe(result.timestamp_iso);
  });

  it("aggregate_confidence is between 0 and 1", async () => {
    mockFn.mockResolvedValue(makeJudgeResponse("SOLVED", { confidence_01: 0.85 }));

    const result = await runJudgeEnsemble(mockProblem as any, "scaffold text");

    expect(result.aggregate_confidence).toBeGreaterThanOrEqual(0);
    expect(result.aggregate_confidence).toBeLessThanOrEqual(1);
  });

  it("final_answer is picked from highest-confidence matching judge", async () => {
    mockFn
      .mockResolvedValueOnce(makeJudgeResponse("SOLVED", { answer: "low_conf", confidence_01: 0.5 }))
      .mockResolvedValueOnce(makeJudgeResponse("SOLVED", { answer: "high_conf", confidence_01: 0.95 }))
      .mockResolvedValueOnce(makeJudgeResponse("UNCLEAR"));

    const result = await runJudgeEnsemble(mockProblem as any, "scaffold text");

    expect(result.final_verdict).toBe("SOLVED");
    expect(result.final_answer).toBe("high_conf");
  });
});

describe("runJudgeEnsemble — partial failure resilience", () => {
  it("1 fail + 2 SOLVED → ensemble still returns SOLVED", async () => {
    mockFn
      .mockRejectedValueOnce(new Error("network_error"))
      .mockResolvedValueOnce(makeJudgeResponse("SOLVED"))
      .mockResolvedValueOnce(makeJudgeResponse("SOLVED"));

    const result = await runJudgeEnsemble(mockProblem as any, "scaffold text");

    expect(result.final_verdict).toBe("SOLVED");
    expect(result.error).toBeUndefined();
  });
});
