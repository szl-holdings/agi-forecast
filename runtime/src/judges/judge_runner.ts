/**
 * judge_runner.ts
 *
 * 3-judge ensemble orchestrator for Putnam problem evaluation.
 * Runs three LLM judge calls in parallel with different system-prompt
 * variants, then majority-votes on verdict and aggregates usage.
 *
 * Signed-off-by: szl-putnam-engineer
 */

import type { PutnamProblem } from "../putnam_corpus_loader.js";
import {
  callRealLLMJudge,
  type JudgeResponse,
  type JudgeOptions,
  type Verdict,
  type TokenUsage,
} from "./real_llm_judge.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VotingRecord = {
  SOLVED: number;
  UNCLEAR: number;
  WRONG: number;
};

export interface EnsembleResult {
  final_verdict: Verdict;
  final_answer: string;
  final_reasoning: string;
  aggregate_confidence: number;
  judges: JudgeResponse[];
  voting_record: VotingRecord;
  total_token_usage: TokenUsage;
  total_latency_ms: number;
  error?: string;
  receipt_type: "ensemble_result";
  timestamp_iso: string;
}

// ---------------------------------------------------------------------------
// Majority vote
// ---------------------------------------------------------------------------

function majorityVote(responses: JudgeResponse[]): Verdict {
  const counts: VotingRecord = { SOLVED: 0, UNCLEAR: 0, WRONG: 0 };
  for (const r of responses) {
    counts[r.verdict] = (counts[r.verdict] ?? 0) + 1;
  }

  // Conservative: SOLVED only if strict majority (≥2 of 3)
  if (counts.SOLVED >= 2) return "SOLVED";
  if (counts.WRONG >= 2) return "WRONG";
  return "UNCLEAR";
}

function buildVotingRecord(responses: JudgeResponse[]): VotingRecord {
  const counts: VotingRecord = { SOLVED: 0, UNCLEAR: 0, WRONG: 0 };
  for (const r of responses) {
    counts[r.verdict] = (counts[r.verdict] ?? 0) + 1;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Pick best answer — highest confidence among SOLVED responses,
// else highest confidence overall
// ---------------------------------------------------------------------------

function pickBestResponse(
  responses: JudgeResponse[],
  finalVerdict: Verdict
): JudgeResponse {
  const matching = responses.filter((r) => r.verdict === finalVerdict);
  const pool = matching.length > 0 ? matching : responses;
  return pool.reduce((best, r) =>
    r.confidence_01 > best.confidence_01 ? r : best
  );
}

// ---------------------------------------------------------------------------
// Aggregate token usage
// ---------------------------------------------------------------------------

function aggregateTokens(responses: JudgeResponse[]): TokenUsage {
  return responses.reduce(
    (acc, r) => ({
      input_tokens: acc.input_tokens + r.token_usage.input_tokens,
      output_tokens: acc.output_tokens + r.token_usage.output_tokens,
      total_tokens: acc.total_tokens + r.token_usage.total_tokens,
    }),
    { input_tokens: 0, output_tokens: 0, total_tokens: 0 }
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Run three judges in parallel (rigorous / creative / verification),
 * majority-vote on verdict, return aggregated EnsembleResult.
 */
export async function runJudgeEnsemble(
  problem: PutnamProblem,
  scaffold: string,
  baseOptions: JudgeOptions = {}
): Promise<EnsembleResult> {
  const t0 = Date.now();

  const variants: Array<JudgeOptions["systemPromptVariant"]> = [
    "rigorous",
    "creative",
    "verification",
  ];

  const judgePromises = variants.map((variant) =>
    callRealLLMJudge(problem, scaffold, { ...baseOptions, systemPromptVariant: variant })
  );

  // Settle all — never let one failure crash the ensemble
  const settled = await Promise.allSettled(judgePromises);

  const responses: JudgeResponse[] = settled.map((s, i) => {
    if (s.status === "fulfilled") return s.value;
    // Rejected promise — synthesize a safe UNCLEAR
    return {
      verdict: "UNCLEAR" as Verdict,
      reasoning: `judge_${variants[i]}_threw: ${
        s.reason instanceof Error ? s.reason.message.slice(0, 80) : "unknown"
      }`,
      answer: "",
      confidence_01: 0,
      latency_ms: Date.now() - t0,
      token_usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
      model_used: baseOptions.model ?? "unknown",
      attempt_count: 0,
      receipt_type: "judge_response" as const,
      timestamp_iso: new Date().toISOString(),
    };
  });

  const allFailed = responses.every(
    (r) => r.reasoning.startsWith("judge_") && r.confidence_01 === 0
  );

  const votingRecord = buildVotingRecord(responses);
  const finalVerdict = majorityVote(responses);
  const best = pickBestResponse(responses, finalVerdict);
  const totalTokens = aggregateTokens(responses);
  const totalLatency = Date.now() - t0;
  const aggConfidence =
    responses.reduce((s, r) => s + r.confidence_01, 0) / responses.length;

  const result: EnsembleResult = {
    final_verdict: finalVerdict,
    final_answer: best.answer,
    final_reasoning: best.reasoning,
    aggregate_confidence: Math.round(aggConfidence * 1000) / 1000,
    judges: responses,
    voting_record: votingRecord,
    total_token_usage: totalTokens,
    total_latency_ms: totalLatency,
    receipt_type: "ensemble_result",
    timestamp_iso: new Date().toISOString(),
    ...(allFailed ? { error: "all_judges_failed" } : {}),
  };

  // DSSE receipt — emit to stdout
  process.stdout.write(JSON.stringify(result) + "\n");
  return result;
}
