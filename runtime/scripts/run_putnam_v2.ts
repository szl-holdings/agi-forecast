#!/usr/bin/env tsx
/**
 * run_putnam_v2.ts
 *
 * CLI runner for the Putnam v2 real-judge harness.
 *
 * Usage:
 *   npm run putnam:v2 -- --year=2024 --judge-model=claude-sonnet-4-5 --out=runtime/putnam-2025/gauge_v2.json
 *
 * Environment:
 *   ANTHROPIC_API_KEY   — preferred; enables Claude judge
 *   OPENAI_API_KEY      — fallback; enables GPT judge
 *   (neither set)       — runs with MOCK_JUDGE, output tagged STAGED
 *
 * Exit code: always 0 per Doctrine v6 (no failure on low score).
 *
 * Signed-off-by: szl-putnam-engineer
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { loadPutnamCorpus } from "../src/putnam_corpus_loader.js";
import { runPutnamV2 } from "../src/putnam_v2_integration.js";

// ---------------------------------------------------------------------------
// Arg parser (no dep on commander — keep it simple)
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of argv) {
    const m = arg.match(/^--([a-zA-Z0-9_-]+)=(.+)$/);
    if (m) args[m[1]!] = m[2]!;
  }
  return args;
}

// ---------------------------------------------------------------------------
// Mock judge shim — used when no API key is present
// ---------------------------------------------------------------------------

async function runWithMock(problems: any[]): Promise<any> {
  // Matches MOCK_JUDGE behaviour: only A1 → SOLVED (8.3% baseline)
  const receipts = problems.map((p: any) => ({
    problem_id: p.id ?? `${p.year}-${p.set}${p.number}`,
    year: p.year,
    set: p.set,
    number: p.number,
    domain: "mock",
    domain_tags: [],
    scaffold_used: p.statement ?? "",
    ensemble: {
      final_verdict:
        p.set === "A" && p.number === 1 ? "SOLVED" : "UNCLEAR",
      final_answer: p.set === "A" && p.number === 1 ? "mock_answer" : "",
      final_reasoning: "MOCK_JUDGE deterministic",
      aggregate_confidence: p.set === "A" && p.number === 1 ? 0.9 : 0.1,
      judges: [],
      voting_record: { SOLVED: 0, UNCLEAR: 3, WRONG: 0 },
      total_token_usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
      total_latency_ms: 0,
      receipt_type: "ensemble_result",
      timestamp_iso: new Date().toISOString(),
    },
    final_verdict: p.set === "A" && p.number === 1 ? "SOLVED" : "UNCLEAR",
    staged: true,
  }));

  const solved = receipts.filter((r: any) => r.final_verdict === "SOLVED").length;
  return {
    run_timestamp: new Date().toISOString(),
    judge_model: "MOCK_JUDGE",
    staged: true,
    total_problems: receipts.length,
    solved,
    score_pct: receipts.length > 0 ? Math.round((solved / receipts.length) * 1000) / 10 : 0,
    baseline_pct: 8.3,
    receipts,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const year = args["year"] ? parseInt(args["year"], 10) : undefined;
  const judgeModel = args["judge-model"] ?? args["judgeModel"] ?? undefined;
  const outPath = args["out"] ?? "runtime/putnam-2025/gauge_v2.json";

  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);
  const hasKey = hasAnthropicKey || hasOpenAIKey;

  process.stderr.write(
    `[putnam:v2] year=${year ?? "all"} model=${judgeModel ?? "default"} out=${outPath}\n`
  );
  process.stderr.write(
    `[putnam:v2] API key: ${hasAnthropicKey ? "ANTHROPIC" : hasOpenAIKey ? "OPENAI" : "NONE (STAGED/MOCK)"}\n`
  );

  // Load corpus
  const problems = await loadPutnamCorpus({ year });
  process.stderr.write(`[putnam:v2] Loaded ${problems.length} problems\n`);

  // Run
  let gauge: any;
  if (!hasKey) {
    process.stderr.write("[putnam:v2] No API key — running MOCK_JUDGE. Output tagged STAGED.\n");
    gauge = await runWithMock(problems);
  } else {
    gauge = await runPutnamV2(problems, {
      model: judgeModel,
    });
  }

  // Write output
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(gauge, null, 2), "utf-8");

  // Human-readable summary
  const stagedLabel = gauge.staged ? " [STAGED]" : "";
  process.stdout.write(`\n=== Putnam v2 Results${stagedLabel} ===\n`);
  process.stdout.write(`Model:    ${gauge.judge_model}\n`);
  process.stdout.write(`Problems: ${gauge.total_problems}\n`);
  process.stdout.write(`Solved:   ${gauge.solved}\n`);
  process.stdout.write(`Score:    ${gauge.score_pct}%\n`);
  process.stdout.write(`Baseline: ${gauge.baseline_pct}%\n`);
  process.stdout.write(`Output:   ${outPath}\n`);
  if (gauge.staged) {
    process.stdout.write(
      `\nSTAGED DISCLOSURE: No API key provided. Results reflect deterministic mock only.\n` +
      `Re-run with ANTHROPIC_API_KEY or OPENAI_API_KEY for live results.\n`
    );
  }

  // Doctrine v6: exit 0 always
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`[putnam:v2] Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(0); // still 0 per Doctrine v6
});
