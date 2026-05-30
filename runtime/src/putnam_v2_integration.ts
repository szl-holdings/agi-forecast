/**
 * putnam_v2_integration.ts
 *
 * Replaces MOCK_JUDGE in putnam_harness_v2.ts with the real 3-judge ensemble.
 * Pipeline: classify domain → build scaffold → run ensemble → emit receipt.
 *
 * Signed-off-by: szl-putnam-engineer
 */

import type { PutnamProblem } from "./putnam_corpus_loader.js";
import { runJudgeEnsemble } from "./judges/judge_runner.js";
import type { EnsembleResult } from "./judges/judge_runner.js";
import type { JudgeOptions } from "./judges/real_llm_judge.js";

// ---------------------------------------------------------------------------
// Soft imports from a11oy — these may or may not exist at runtime.
// Graceful degradation if the packages aren't installed.
// ---------------------------------------------------------------------------

type DomainClassifier = (problem: PutnamProblem) => { domain: string; tags: string[] };
type FormulaScaffold = (problem: PutnamProblem, domain: string) => string;

async function tryImportClassifier(): Promise<DomainClassifier | null> {
  try {
    const mod = await import("@a11oy/knowledge/domain_classifier.js" as string);
    return mod.classifyDomain ?? mod.default ?? null;
  } catch {
    return null;
  }
}

async function tryImportScaffold(): Promise<FormulaScaffold | null> {
  try {
    const mod = await import("@a11oy/knowledge/formula_scaffold.js" as string);
    return mod.buildFormulaScaffold ?? mod.default ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProblemReceipt {
  problem_id: string;
  year: number;
  set: string;
  number: number;
  domain: string;
  domain_tags: string[];
  scaffold_used: string;
  ensemble: EnsembleResult;
  final_verdict: EnsembleResult["final_verdict"];
  staged: boolean;
}

export interface GaugeV2 {
  run_timestamp: string;
  judge_model: string;
  staged: boolean;
  total_problems: number;
  solved: number;
  score_pct: number;
  baseline_pct: number;
  receipts: ProblemReceipt[];
}

// ---------------------------------------------------------------------------
// Per-problem pipeline
// ---------------------------------------------------------------------------

async function processProblem(
  problem: PutnamProblem,
  classifier: DomainClassifier | null,
  scaffolder: FormulaScaffold | null,
  judgeOptions: JudgeOptions
): Promise<ProblemReceipt> {
  // 1. Domain classification
  let domain = "unknown";
  let domainTags: string[] = [];
  if (classifier) {
    try {
      const cls = classifier(problem);
      domain = cls.domain;
      domainTags = cls.tags;
    } catch {
      domain = "classification_failed";
    }
  }

  // 2. Formula scaffold
  let scaffold = problem.statement; // fallback: raw problem text
  if (scaffolder) {
    try {
      scaffold = scaffolder(problem, domain);
    } catch {
      scaffold = problem.statement;
    }
  }

  // 3. Ensemble judge
  const ensemble = await runJudgeEnsemble(problem, scaffold, judgeOptions);

  return {
    problem_id: problem.id ?? `${problem.year}-${problem.set}${problem.number}`,
    year: problem.year ?? 0,
    set: problem.set ?? "?",
    number: problem.number ?? 0,
    domain,
    domain_tags: domainTags,
    scaffold_used: scaffold,
    ensemble,
    final_verdict: ensemble.final_verdict,
    staged: !process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY,
  };
}

// ---------------------------------------------------------------------------
// Main integration entry point
// ---------------------------------------------------------------------------

export async function runPutnamV2(
  problems: PutnamProblem[],
  judgeOptions: JudgeOptions = {}
): Promise<GaugeV2> {
  const classifier = await tryImportClassifier();
  const scaffolder = await tryImportScaffold();

  const receipts: ProblemReceipt[] = [];

  // Sequential to avoid rate-limit bursts on 12 problems
  for (const problem of problems) {
    const receipt = await processProblem(problem, classifier, scaffolder, judgeOptions);
    receipts.push(receipt);
  }

  const solved = receipts.filter((r) => r.final_verdict === "SOLVED").length;
  const total = receipts.length;
  const staged = receipts.some((r) => r.staged);

  const gauge: GaugeV2 = {
    run_timestamp: new Date().toISOString(),
    judge_model: judgeOptions.model ?? (process.env.ANTHROPIC_API_KEY ? "claude-sonnet-4-5" : "mock"),
    staged,
    total_problems: total,
    solved,
    score_pct: total > 0 ? Math.round((solved / total) * 1000) / 10 : 0,
    baseline_pct: 8.3,
    receipts,
  };

  return gauge;
}
