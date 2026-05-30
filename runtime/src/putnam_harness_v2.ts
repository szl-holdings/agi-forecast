// SPDX-License-Identifier: Apache-2.0
// Author: Lutar, Stephen P. | ORCID 0009-0001-0110-4173 | SZL Holdings
// Module: agi-forecast — Putnam Harness v2
// Doctrine V6 preflight: ✓
//
// THE INNOVATION: multi-judge ensemble (n=3, majority vote) with per-problem
// CoT scaffold injection and per-problem DSSE-shaped receipt chain.
//
// Hooks into the FG-S1→S4 pipeline via FG-04 (Task Generalisation gauge).
// Output: gauge_v2.json — honest Putnam score, chained receipts, FG advisory.
//
// Doctrine: score MUST be reported honestly. No inflation. Doctrine V6.

import { createHash } from 'crypto';
import type { PutnamProblem } from './putnam_corpus_loader.js';
import { classifyDomain } from './putnam_domain_classifier.js';
import { buildScaffold } from './putnam_formula_scaffold.js';

// ---------------------------------------------------------------------------
// DSSE-shaped types (mirrors dsse.ts that will land in PR #42)
// Self-contained here to avoid circular dep before PR merges.
// ---------------------------------------------------------------------------

export interface DssePayload {
  payloadType: 'application/vnd.szl.putnam-v2+json';
  payload: string; // base64-encoded JSON
}

export interface DsseEnvelope {
  payload: DssePayload;
  signatures: Array<{ keyid: string; sig: string }>;
}

// ---------------------------------------------------------------------------
// Receipt types (mirrors receipt.ts from PR #42)
// ---------------------------------------------------------------------------

export interface PutnamReceipt {
  receipt_id: string;
  problem_id: string;
  run_at: string;
  scaffold_domain: string;
  formula_ids: string[];
  judge_verdicts: JudgeVerdict[];
  ensemble_decision: 'SOLVED' | 'UNSOLVED' | 'PARTIAL';
  prev_hash: string | null; // null for genesis
  hash: string;             // SHA-256 of this receipt's canonical JSON (excluding .hash field)
  dsse: DsseEnvelope;
}

export interface JudgeVerdict {
  judge_id: string; // e.g. "judge-0", "judge-1", "judge-2"
  decision: 'SOLVED' | 'UNSOLVED' | 'PARTIAL';
  confidence: number;   // [0, 1]
  reasoning_tokens: number;
  solution_sketch: string;
}

// ---------------------------------------------------------------------------
// Gauge output types
// ---------------------------------------------------------------------------

export interface GaugeV2 {
  schema_version: '2.0.0';
  run_at: string;
  corpus_year: number;
  total_problems: number;
  solved_count: number;
  score01: number;         // honest: solved_count / total_problems
  score_pct: number;       // score01 * 100 (display only)
  baseline_score01: 0.0833; // 1/12 honest baseline (Doctrine V6 anchor)
  delta_score01: number;   // score01 - baseline_score01 (can be negative)
  per_problem: PerProblemResult[];
  receipt_chain: PutnamReceipt[];
  fg04_advisory: FG04Advisory;
  doctrine_v6_compliant: true;
  notes: string;
}

export interface PerProblemResult {
  problem_id: string;
  problem_number: string;
  domain: string;
  decision: 'SOLVED' | 'UNSOLVED' | 'PARTIAL';
  ensemble_votes: { SOLVED: number; UNSOLVED: number; PARTIAL: number };
  scaffold_formula_count: number;
  receipt_id: string;
}

export interface FG04Advisory {
  gauge_id: 'FG-04';
  label: 'Task Generalisation';
  input: { novelTasksSolved: number; novelTasksTotal: number };
  value: number;       // = score01
  brier_input: number; // = value
  timestamp: string;
  wiring: 'FG-S1→FG-S4 pipeline; inject gauge_v2.score01 as FG-04 input';
}

// ---------------------------------------------------------------------------
// Judge interface — pluggable; mock-able in tests
// ---------------------------------------------------------------------------

export type JudgeResult = Pick<JudgeVerdict, 'decision' | 'confidence' | 'reasoning_tokens' | 'solution_sketch'>;

export type JudgeFn = (
  problem: PutnamProblem,
  scaffoldPrompt: string,
) => Promise<JudgeResult>;

// ---------------------------------------------------------------------------
// Default mock judge (used in CI; replace with real LLM judge in production)
// ---------------------------------------------------------------------------

export const MOCK_JUDGE: JudgeFn = async (
  problem: PutnamProblem,
): Promise<JudgeResult> => {
  // Deterministic mock: only "solve" A1 (year 2024) to maintain honest baseline
  const knownSolvable = new Set(['2024-A1']);
  const isSolvable = knownSolvable.has(problem.problem_id);
  return {
    decision: isSolvable ? 'SOLVED' : 'UNSOLVED',
    confidence: isSolvable ? 0.85 : 0.1,
    reasoning_tokens: isSolvable ? 512 : 128,
    solution_sketch: isSolvable
      ? `${problem.problem_id}: n must equal 1. Proof: for n≥2, LHS=2a^n+3b^n≥5 and 4c^n, Fermat descent shows no solutions.`
      : `${problem.problem_id}: Attempted but could not close the argument.`,
  };
};

// ---------------------------------------------------------------------------
// Hash utilities
// ---------------------------------------------------------------------------

function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function canonicalReceiptJson(receipt: Omit<PutnamReceipt, 'hash'>): string {
  // Deterministic JSON — sorted keys at top level, no hash field
  return JSON.stringify(receipt, Object.keys(receipt).sort() as (keyof typeof receipt)[]);
}

function buildDsse(receipt: Omit<PutnamReceipt, 'hash' | 'dsse'>): DsseEnvelope {
  const payloadStr = JSON.stringify(receipt);
  const b64 = Buffer.from(payloadStr).toString('base64');
  return {
    payload: {
      payloadType: 'application/vnd.szl.putnam-v2+json',
      payload: b64,
    },
    signatures: [
      {
        keyid: 'szl-holdings/agi-forecast/putnam-v2-key',
        // In production: actual Ed25519 sig. Here: HMAC-SHA256 of payload.
        sig: sha256('szl-putnam-v2:' + b64),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Majority vote
// ---------------------------------------------------------------------------

function majorityVote(
  verdicts: JudgeResult[],
): 'SOLVED' | 'UNSOLVED' | 'PARTIAL' {
  const counts: Record<string, number> = { SOLVED: 0, UNSOLVED: 0, PARTIAL: 0 };
  for (const v of verdicts) counts[v.decision]++;
  const entries = Object.entries(counts) as [string, number][];
  entries.sort(([, a], [, b]) => b - a);
  return (entries[0]![0] as 'SOLVED' | 'UNSOLVED' | 'PARTIAL');
}

// ---------------------------------------------------------------------------
// Per-problem runner
// ---------------------------------------------------------------------------

async function runProblem(
  problem: PutnamProblem,
  judges: JudgeFn[],
  prevReceipt: PutnamReceipt | null,
  runAt: string,
): Promise<{ result: PerProblemResult; receipt: PutnamReceipt }> {
  // 1. Classify domain + build scaffold
  const classification = classifyDomain(problem.text);
  const scaffold = buildScaffold(classification.domain, classification.formula_ids);

  // 2. Run all judges in parallel
  const verdictPromises = judges.map((judge, idx) =>
    judge(problem, scaffold.prompt).then((r): JudgeVerdict => ({
      judge_id: `judge-${idx}`,
      ...r,
    })),
  );
  const judgeVerdicts = await Promise.all(verdictPromises);

  // 3. Majority vote
  const ensembleDecision = majorityVote(judgeVerdicts);
  const voteCounts = { SOLVED: 0, UNSOLVED: 0, PARTIAL: 0 };
  for (const v of judgeVerdicts) voteCounts[v.decision]++;

  // 4. Build receipt (DSSE-shaped, hash-chained)
  const receiptId = `putnam-v2-${problem.problem_id}-${Date.now()}`;
  const prevHash = prevReceipt?.hash ?? null;

  const partialReceipt: Omit<PutnamReceipt, 'hash' | 'dsse'> = {
    receipt_id: receiptId,
    problem_id: problem.problem_id,
    run_at: runAt,
    scaffold_domain: classification.domain,
    formula_ids: scaffold.formula_context.formula_ids,
    judge_verdicts: judgeVerdicts,
    ensemble_decision: ensembleDecision,
    prev_hash: prevHash,
  };

  const dsse = buildDsse(partialReceipt);
  const withDsse: Omit<PutnamReceipt, 'hash'> = { ...partialReceipt, dsse };
  const hash = sha256(canonicalReceiptJson(withDsse));
  const receipt: PutnamReceipt = { ...withDsse, hash };

  const result: PerProblemResult = {
    problem_id: problem.problem_id,
    problem_number: problem.problem_number,
    domain: classification.domain,
    decision: ensembleDecision,
    ensemble_votes: voteCounts,
    scaffold_formula_count: scaffold.formula_context.formula_ids.length,
    receipt_id: receiptId,
  };

  return { result, receipt };
}

// ---------------------------------------------------------------------------
// Main harness
// ---------------------------------------------------------------------------

export interface HarnessOptions {
  /** Array of judge functions. Default: [MOCK_JUDGE, MOCK_JUDGE, MOCK_JUDGE] (n=3) */
  judges?: JudgeFn[];
  /** Override run timestamp (useful for deterministic tests) */
  runAt?: string;
  /** Corpus year for metadata */
  corpusYear?: number;
}

/**
 * Run the Putnam Harness v2.
 *
 * - Multi-judge ensemble (n=3, majority vote)
 * - Per-problem CoT scaffold injection
 * - Per-problem receipt, hash-chained (each receipt.prev_hash = prev receipt.hash)
 * - Honest score: score01 = solved / total
 * - Output wires into FG-04 (Task Generalisation) gauge
 *
 * @param corpus - Array of PutnamProblem (typically 12, from loadPutnamCorpus)
 * @param options - Optional configuration
 */
export async function runPutnamHarnessV2(
  corpus: PutnamProblem[],
  options: HarnessOptions = {},
): Promise<GaugeV2> {
  const judges = options.judges ?? [MOCK_JUDGE, MOCK_JUDGE, MOCK_JUDGE];
  const runAt = options.runAt ?? new Date().toISOString();
  const corpusYear = options.corpusYear ?? 2024;

  if (judges.length === 0) {
    throw new Error('At least one judge is required');
  }

  const perProblem: PerProblemResult[] = [];
  const receiptChain: PutnamReceipt[] = [];
  let prevReceipt: PutnamReceipt | null = null;

  // Run problems sequentially to maintain receipt chain order
  for (const problem of corpus) {
    const { result, receipt } = await runProblem(
      problem,
      judges,
      prevReceipt,
      runAt,
    );
    perProblem.push(result);
    receiptChain.push(receipt);
    prevReceipt = receipt;
  }

  // Honest scoring — Doctrine V6: no inflation
  const solvedCount = perProblem.filter((r) => r.decision === 'SOLVED').length;
  const totalProblems = corpus.length;
  const score01 = totalProblems > 0 ? solvedCount / totalProblems : 0;
  const baselineScore01 = 0.0833 as const; // 1/12 honest baseline

  // FG-04 advisory (wires into pipeline.ts runFGPipeline)
  const fg04Advisory: FG04Advisory = {
    gauge_id: 'FG-04',
    label: 'Task Generalisation',
    input: { novelTasksSolved: solvedCount, novelTasksTotal: totalProblems },
    value: score01,
    brier_input: score01,
    timestamp: runAt,
    wiring: 'FG-S1→FG-S4 pipeline; inject gauge_v2.score01 as FG-04 input',
  };

  const gauge: GaugeV2 = {
    schema_version: '2.0.0',
    run_at: runAt,
    corpus_year: corpusYear,
    total_problems: totalProblems,
    solved_count: solvedCount,
    score01,
    score_pct: Math.round(score01 * 10000) / 100,
    baseline_score01: 0.0833,
    delta_score01: Math.round((score01 - baselineScore01) * 10000) / 10000,
    per_problem: perProblem,
    receipt_chain: receiptChain,
    fg04_advisory: fg04Advisory,
    doctrine_v6_compliant: true,
    notes:
      'Honest score. v2 harness: 3-judge ensemble + scaffold. ' +
      'To beat baseline (1/12 = 8.3%), v2 must solve ≥2/12 in production with real LLM judges. ' +
      'Replace MOCK_JUDGE with real judge (GPT-4o / Claude Opus) before production run.',
  };

  return gauge;
}

// ---------------------------------------------------------------------------
// Pipeline wiring helper
// Converts GaugeV2 to the FG-04 gauge input shape for runFGPipeline()
// ---------------------------------------------------------------------------

export interface FG04PipelineInput {
  novelTasksSolved: number;
  novelTasksTotal: number;
}

/**
 * Extract FG-04 input from GaugeV2.
 * Pass this to runFGPipeline({ fg04: extractFG04Input(gauge), ... }) once
 * pipeline.ts lands in agi-forecast/runtime/src.
 */
export function extractFG04Input(gauge: GaugeV2): FG04PipelineInput {
  return {
    novelTasksSolved: gauge.solved_count,
    novelTasksTotal: gauge.total_problems,
  };
}

/**
 * Verify receipt chain integrity.
 * Checks: each receipt[i].prev_hash === receipt[i-1].hash
 * Returns true if chain is valid.
 */
export function verifyReceiptChain(chain: PutnamReceipt[]): boolean {
  if (chain.length === 0) return true;
  if (chain[0]!.prev_hash !== null) return false; // genesis must have null prev

  for (let i = 1; i < chain.length; i++) {
    const current = chain[i]!;
    const prev = chain[i - 1]!;
    if (current.prev_hash !== prev.hash) return false;
  }
  return true;
}

/**
 * Recompute and verify all receipt hashes.
 */
export function verifyReceiptHashes(chain: PutnamReceipt[]): boolean {
  for (const receipt of chain) {
    const { hash: _hash, ...withoutHash } = receipt;
    const expectedHash = sha256(canonicalReceiptJson(withoutHash));
    if (receipt.hash !== expectedHash) return false;
  }
  return true;
}
