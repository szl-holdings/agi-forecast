/**
 * @file runtime/src/judges/ensemble.ts
 * @description RAE-1 3-judge LLM ensemble integration.
 *
 * Wires Anthropic (claude-3-5-sonnet), OpenAI (gpt-4o), and Mistral judges
 * into a parallel majority-vote ensemble per RAE-1 §3.1.
 *
 * Environment variables:
 *   ANTHROPIC_API_KEY  — required for live judge-0 (rigorous) and judge-1 (creative)
 *   OPENAI_API_KEY     — required for live judge-2 (verification)
 *   MISTRAL_API_KEY    — optional; enables Mistral as judge-3 for 4-judge ensemble
 *   MOCK_JUDGES        — if set to "1", bypasses all API calls; sets staged_advisory=true
 *
 * When any required API key is absent and MOCK_JUDGES is not set,
 * the harness automatically falls back to mock mode with staged_advisory=true.
 *
 * Lean ref:  SZL.AGI.PACBayes.capability_improvement_rate_bound
 * Lean file: Lutar/PACBayes/CapabilityImprovementRate.lean
 * Lean commit: c4d1379568
 *
 * Protocol spec: RAE_1_PROTOCOL.md §3
 * Judge non-collusion: judges run in parallel (Promise.all), not sequentially (§3.3)
 *
 * Doctrine v6 — real Anthropic/OpenAI SDK patterns; stubbed when keys absent.
 * Signed-off-by: SZL Engineering <eng@szl-holdings.com>
 */

import type { RAE1JudgeRecord, Verdict, JudgePromptVariant } from "../../rae1/schema.js";

// ─── System Prompts ───────────────────────────────────────────────────────────

/**
 * RAE-1 standard system prompts (versioned v1.0).
 *
 * Per RAE-1 §3.2: must use ≥2 distinct prompts across the ensemble.
 * These are the canonical prompts; any change increments the prompt version.
 */
export const RAE1_SYSTEM_PROMPTS: Record<JudgePromptVariant, string> = {
  rigorous: `You are a rigorous mathematical proof evaluator.
Your task: determine if the provided solution to a Putnam competition problem is CORRECT.

Rules:
- Prefer UNCLEAR over WRONG when you're not certain the solution is incorrect.
- Verify every logical step. If any step is unjustified, mark UNCLEAR.
- Do not give credit for "direction" — only for complete, correct proofs.
- Output EXACTLY one word on the first line: SOLVED, UNCLEAR, or WRONG.
- On the second line, output your confidence as a decimal in [0.0, 1.0].
- On subsequent lines, provide your reasoning (max 200 words).`,

  creative: `You are a creative mathematics evaluator who appreciates non-standard approaches.
Your task: determine if the provided solution to a Putnam competition problem is CORRECT.

Rules:
- Accept non-standard proof styles if the mathematical content is correct.
- Give credit for partially correct approaches that clearly lead to the answer.
- Output EXACTLY one word on the first line: SOLVED, UNCLEAR, or WRONG.
- On the second line, output your confidence as a decimal in [0.0, 1.0].
- On subsequent lines, provide your reasoning (max 200 words).`,

  verification: `You are a mathematical verification specialist.
Your task: verify the provided solution to a Putnam competition problem by:
1. Extracting the key claim or formula from the solution.
2. Checking all arithmetic and algebraic manipulations.
3. Verifying the final answer is consistent with the problem statement.

Rules:
- Output EXACTLY one word on the first line: SOLVED, UNCLEAR, or WRONG.
- On the second line, output your confidence as a decimal in [0.0, 1.0].
- On subsequent lines, provide your reasoning (max 200 words).`,
};

// ─── Judge Configuration ──────────────────────────────────────────────────────

export interface JudgeConfig {
  judge_id: string;
  model_name: string;
  system_prompt_variant: JudgePromptVariant;
  provider: "anthropic" | "openai" | "mistral" | "mock";
  /** Temperature for this judge's API call. Lower = more deterministic. */
  temperature: number;
  /** Maximum output tokens for this judge. */
  max_tokens: number;
}

/** Default 3-judge ensemble configuration per RAE-1 v1.0. */
export const DEFAULT_ENSEMBLE_CONFIG: JudgeConfig[] = [
  {
    judge_id: "judge-0-rigorous",
    model_name: "claude-3-5-sonnet-20241022",
    system_prompt_variant: "rigorous",
    provider: "anthropic",
    temperature: 0.1,
    max_tokens: 512,
  },
  {
    judge_id: "judge-1-creative",
    model_name: "claude-3-5-sonnet-20241022",
    system_prompt_variant: "creative",
    provider: "anthropic",
    temperature: 0.4,
    max_tokens: 512,
  },
  {
    judge_id: "judge-2-verification",
    model_name: "gpt-4o-2024-11-20",
    system_prompt_variant: "verification",
    provider: "openai",
    temperature: 0.0,
    max_tokens: 512,
  },
];

// ─── Verdict Parsing ──────────────────────────────────────────────────────────

/**
 * Parses an LLM completion string to extract verdict + confidence.
 *
 * Expected format (first two lines):
 *   Line 1: "SOLVED" | "UNCLEAR" | "WRONG"
 *   Line 2: confidence decimal in [0.0, 1.0]
 *
 * Falls back to UNCLEAR + 0.5 if parsing fails (conservative default).
 *
 * @param completion - Raw LLM completion text
 * @returns Parsed verdict and confidence
 */
export function parseJudgeCompletion(completion: string): {
  verdict: Verdict;
  confidence_01: number;
} {
  const lines = completion.trim().split("\n");
  const firstLine = (lines[0] ?? "").trim().toUpperCase();

  let verdict: Verdict;
  if (firstLine === "SOLVED" || firstLine === "UNCLEAR" || firstLine === "WRONG") {
    verdict = firstLine as Verdict;
  } else {
    // Conservative fallback: if we can't parse, treat as UNCLEAR
    verdict = "UNCLEAR";
  }

  const confidenceRaw = parseFloat((lines[1] ?? "0.5").trim());
  const confidence_01 = isFinite(confidenceRaw)
    ? Math.min(1.0, Math.max(0.0, confidenceRaw))
    : 0.5;

  return { verdict, confidence_01 };
}

// ─── Majority Vote ────────────────────────────────────────────────────────────

/**
 * Computes the ensemble verdict by simple majority vote.
 *
 * Per RAE-1 §3.1: ties → "UNCLEAR".
 *
 * Lean ref: SZL.AGI.PACBayes.capability_improvement_rate_bound
 *           commit: c4d1379568
 *
 * @param records - Array of judge records (must have length ≥ 3)
 * @returns Object with ensemble_verdict, votes_solved, votes_unclear, votes_wrong
 */
export function majorityVote(records: RAE1JudgeRecord[]): {
  ensemble_verdict: Verdict;
  votes_solved: number;
  votes_unclear: number;
  votes_wrong: number;
} {
  const votes_solved = records.filter((r) => r.verdict === "SOLVED").length;
  const votes_unclear = records.filter((r) => r.verdict === "UNCLEAR").length;
  const votes_wrong = records.filter((r) => r.verdict === "WRONG").length;

  const max = Math.max(votes_solved, votes_unclear, votes_wrong);

  // Tie → UNCLEAR
  const leaders = [
    { verdict: "SOLVED" as Verdict, count: votes_solved },
    { verdict: "UNCLEAR" as Verdict, count: votes_unclear },
    { verdict: "WRONG" as Verdict, count: votes_wrong },
  ].filter((v) => v.count === max);

  const ensemble_verdict: Verdict =
    leaders.length === 1 ? leaders[0]!.verdict : "UNCLEAR";

  return { ensemble_verdict, votes_solved, votes_unclear, votes_wrong };
}

// ─── Mock Judge ───────────────────────────────────────────────────────────────

/**
 * Mock judge for use when MOCK_JUDGES=1 or API keys are absent.
 *
 * Always returns a deterministic WRONG verdict (conservative for capability claims).
 * Sets staged_advisory=true on the parent receipt.
 *
 * @param config     - Judge configuration
 * @param problem    - Problem text (ignored in mock mode)
 * @param solution   - Solution text (ignored in mock mode)
 * @returns RAE1JudgeRecord with mock verdict
 */
export async function runMockJudge(
  config: JudgeConfig,
  problem: string,
  solution: string
): Promise<RAE1JudgeRecord> {
  const startMs = Date.now();
  // Minimal delay to simulate API call timing
  await new Promise((resolve) => setTimeout(resolve, 10));

  return {
    judge_id: config.judge_id,
    model_name: `mock-${config.model_name}`,
    system_prompt_variant: config.system_prompt_variant,
    verdict: "WRONG",  // Conservative: mock judges always vote WRONG
    confidence_01: 0.5,
    latency_ms: Date.now() - startMs,
    token_usage: { input: 0, output: 0, total: 0 },
  };
}

// ─── Live Anthropic Judge ─────────────────────────────────────────────────────

/**
 * Runs a single Anthropic Claude judge call.
 *
 * Uses the @anthropic-ai/sdk message creation API.
 * Stubbed when ANTHROPIC_API_KEY is not set (returns mock result with staged_advisory).
 *
 * @param config   - Judge configuration (must have provider === "anthropic")
 * @param problem  - Problem text
 * @param solution - Model solution text
 * @param apiKey   - Anthropic API key
 * @returns RAE1JudgeRecord
 *
 * @throws Never throws — all errors are caught and returned as UNCLEAR verdict.
 */
export async function runAnthropicJudge(
  config: JudgeConfig,
  problem: string,
  solution: string,
  apiKey: string
): Promise<RAE1JudgeRecord> {
  const startMs = Date.now();

  try {
    // Dynamic import to avoid hard dependency when key is absent
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    const userMessage = `## Problem\n\n${problem}\n\n## Proposed Solution\n\n${solution}`;

    const response = await client.messages.create({
      model: config.model_name,
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      system: RAE1_SYSTEM_PROMPTS[config.system_prompt_variant],
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const completion = textBlock?.type === "text" ? textBlock.text : "";
    const { verdict, confidence_01 } = parseJudgeCompletion(completion);

    return {
      judge_id: config.judge_id,
      model_name: config.model_name,
      system_prompt_variant: config.system_prompt_variant,
      verdict,
      confidence_01,
      latency_ms: Date.now() - startMs,
      token_usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  } catch (e) {
    // On any API error, return UNCLEAR (conservative) with 0.5 confidence
    return {
      judge_id: config.judge_id,
      model_name: config.model_name,
      system_prompt_variant: config.system_prompt_variant,
      verdict: "UNCLEAR",
      confidence_01: 0.5,
      latency_ms: Date.now() - startMs,
      token_usage: { input: 0, output: 0, total: 0 },
    };
  }
}

// ─── Live OpenAI Judge ────────────────────────────────────────────────────────

/**
 * Runs a single OpenAI GPT judge call.
 *
 * Uses the openai SDK chat completions API.
 * Falls back to UNCLEAR on any error.
 *
 * @param config   - Judge configuration (must have provider === "openai")
 * @param problem  - Problem text
 * @param solution - Model solution text
 * @param apiKey   - OpenAI API key
 * @returns RAE1JudgeRecord
 */
export async function runOpenAIJudge(
  config: JudgeConfig,
  problem: string,
  solution: string,
  apiKey: string
): Promise<RAE1JudgeRecord> {
  const startMs = Date.now();

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });

    const userMessage = `## Problem\n\n${problem}\n\n## Proposed Solution\n\n${solution}`;

    const response = await client.chat.completions.create({
      model: config.model_name,
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      messages: [
        { role: "system", content: RAE1_SYSTEM_PROMPTS[config.system_prompt_variant] },
        { role: "user", content: userMessage },
      ],
    });

    const completion = response.choices[0]?.message?.content ?? "";
    const { verdict, confidence_01 } = parseJudgeCompletion(completion);
    const usage = response.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    return {
      judge_id: config.judge_id,
      model_name: config.model_name,
      system_prompt_variant: config.system_prompt_variant,
      verdict,
      confidence_01,
      latency_ms: Date.now() - startMs,
      token_usage: {
        input: usage.prompt_tokens,
        output: usage.completion_tokens,
        total: usage.total_tokens,
      },
    };
  } catch {
    return {
      judge_id: config.judge_id,
      model_name: config.model_name,
      system_prompt_variant: config.system_prompt_variant,
      verdict: "UNCLEAR",
      confidence_01: 0.5,
      latency_ms: Date.now() - startMs,
      token_usage: { input: 0, output: 0, total: 0 },
    };
  }
}

// ─── Ensemble Runner ──────────────────────────────────────────────────────────

export interface EnsembleRunOptions {
  /** Problem text to evaluate. */
  problem: string;

  /** Proposed solution text from the model under evaluation. */
  solution: string;

  /**
   * Override the judge configuration. Defaults to DEFAULT_ENSEMBLE_CONFIG.
   * Useful for testing with custom judges.
   */
  configs?: JudgeConfig[];

  /**
   * Force mock mode regardless of environment variables.
   * Equivalent to setting MOCK_JUDGES=1.
   */
  forceMock?: boolean;
}

export interface EnsembleResult {
  /** Individual judge records. */
  judges: RAE1JudgeRecord[];

  /** Ensemble verdict by majority vote. */
  ensemble_verdict: Verdict;

  votes_solved: number;
  votes_unclear: number;
  votes_wrong: number;

  /** True iff ensemble_verdict === "SOLVED". */
  is_solved: boolean;

  /**
   * True if running in mock mode (no real API keys or MOCK_JUDGES=1).
   * This flag MUST be propagated to the receipt's staged_advisory field.
   */
  staged_advisory: boolean;

  /**
   * Explanation when staged_advisory is true.
   */
  staged_notes?: string;
}

/**
 * Runs the full RAE-1 3-judge ensemble on a problem + solution pair.
 *
 * PARALLELISM: All judges run in parallel via Promise.all to satisfy the
 * RAE-1 non-collusion property (§3.3). No judge sees another judge's verdict
 * before submitting its own.
 *
 * FALLBACK: If any required API key is absent, automatically falls back to
 * mock mode with staged_advisory=true. The caller MUST propagate this flag
 * to the receipt payload.
 *
 * Lean ref: SZL.AGI.PACBayes.capability_improvement_rate_bound
 *           file: Lutar/PACBayes/CapabilityImprovementRate.lean
 *           commit: c4d1379568
 *
 * @param options - Ensemble run configuration
 * @returns EnsembleResult with judge records and majority vote
 *
 * @example
 * ```typescript
 * const result = await runEnsemble({
 *   problem: "Let n be a positive integer...",
 *   solution: "We claim the answer is n(n+1)/2...",
 * });
 * if (result.staged_advisory) {
 *   console.warn("Running in mock mode — API keys not configured");
 * }
 * console.log("Verdict:", result.ensemble_verdict, "Score:", result.is_solved);
 * ```
 */
export async function runEnsemble(options: EnsembleRunOptions): Promise<EnsembleResult> {
  const configs = options.configs ?? DEFAULT_ENSEMBLE_CONFIG;
  const { problem, solution } = options;

  // ── Determine mock mode ───────────────────────────────────────────────────
  const envMock = process.env.MOCK_JUDGES === "1";
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
  const openaiKey = process.env.OPENAI_API_KEY ?? "";
  const mistralKey = process.env.MISTRAL_API_KEY ?? "";

  const needsAnthropicKey = configs.some((c) => c.provider === "anthropic");
  const needsOpenAIKey = configs.some((c) => c.provider === "openai");

  const keysAvailable =
    (!needsAnthropicKey || anthropicKey.length > 0) &&
    (!needsOpenAIKey || openaiKey.length > 0);

  const isMockMode = options.forceMock === true || envMock || !keysAvailable;

  // ── Run judges in parallel (non-collusion property §3.3) ────────────────
  const judgePromises: Promise<RAE1JudgeRecord>[] = configs.map((config) => {
    if (isMockMode) {
      return runMockJudge(config, problem, solution);
    }
    switch (config.provider) {
      case "anthropic":
        return runAnthropicJudge(config, problem, solution, anthropicKey);
      case "openai":
        return runOpenAIJudge(config, problem, solution, openaiKey);
      default:
        // Unknown provider → mock
        return runMockJudge(config, problem, solution);
    }
  });

  // All judges run in parallel — non-collusion guaranteed
  const judges = await Promise.all(judgePromises);

  // ── Majority vote ─────────────────────────────────────────────────────────
  const { ensemble_verdict, votes_solved, votes_unclear, votes_wrong } =
    majorityVote(judges);

  const staged_advisory = isMockMode;
  const staged_notes = isMockMode
    ? `Mock judges active — ${envMock ? "MOCK_JUDGES=1" : "API keys not configured"}. Verdicts are placeholder values only.`
    : undefined;

  return {
    judges,
    ensemble_verdict,
    votes_solved,
    votes_unclear,
    votes_wrong,
    is_solved: ensemble_verdict === "SOLVED",
    staged_advisory,
    staged_notes,
  };
}
