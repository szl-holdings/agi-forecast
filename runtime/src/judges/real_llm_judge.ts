/**
 * real_llm_judge.ts
 *
 * LLM-backed judge for Putnam problem evaluation.
 * Supports Anthropic Claude (preferred) and OpenAI (fallback).
 * Integrates with DSSE receipt chain via stdout JSON logging.
 *
 * Signed-off-by: szl-putnam-engineer
 */

import type { PutnamProblem } from "../putnam_corpus_loader.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Verdict = "SOLVED" | "UNCLEAR" | "WRONG";

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export interface JudgeResponse {
  verdict: Verdict;
  reasoning: string;
  answer: string;
  confidence_01: number;
  latency_ms: number;
  token_usage: TokenUsage;
  model_used: string;
  attempt_count: number;
  receipt_type: "judge_response";
  timestamp_iso: string;
}

export interface JudgeOptions {
  systemPromptVariant?: "rigorous" | "creative" | "verification";
  model?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

// ---------------------------------------------------------------------------
// System prompts — three variants for ensemble diversity
// ---------------------------------------------------------------------------

const SYSTEM_PROMPTS: Record<string, string> = {
  rigorous: `You are a rigorous mathematical judge evaluating solutions to Putnam Mathematical Competition problems.
Your task: assess whether the provided scaffold/solution CORRECTLY and COMPLETELY solves the given Putnam problem.

Scoring criteria:
- SOLVED: The scaffold contains a mathematically valid, complete proof or correct closed-form answer with justification.
- WRONG: The scaffold contains a clear mathematical error, or the final answer is demonstrably incorrect.
- UNCLEAR: The scaffold is incomplete, uses unverified lemmas, or cannot be definitively verified without more computation.

Be conservative — prefer UNCLEAR over WRONG unless the error is unambiguous.
Respond in valid JSON only: {"verdict":"SOLVED"|"UNCLEAR"|"WRONG","answer":"<final answer or formula>","reasoning":"<1-3 sentences>","confidence_01":<0.0-1.0>}`,

  creative: `You are a creative mathematical analyst judging Putnam Competition problem solutions.
You look for non-standard but valid approaches, elegant shortcuts, and correct answers that might be expressed differently.

For the scaffold provided, determine:
- SOLVED: Contains a correct answer or proof strategy that, even if unconventional, is mathematically sound.
- WRONG: Contains an answer or reasoning that is provably incorrect.
- UNCLEAR: Approach is plausible but incomplete or unverifiable from the scaffold alone.

Respond in valid JSON only: {"verdict":"SOLVED"|"UNCLEAR"|"WRONG","answer":"<final answer>","reasoning":"<1-3 sentences>","confidence_01":<0.0-1.0>}`,

  verification: `You are a verification-mode Putnam judge. Your sole job: verify the final answer in the scaffold against known Putnam solution databases and mathematical identities.

Steps:
1. Extract the claimed final answer from the scaffold.
2. Check whether that answer is dimensionally/type consistent with the problem.
3. Verify any numerical claims with basic arithmetic or known formulas.
4. Emit SOLVED only if you can independently confirm correctness. WRONG if directly refutable. UNCLEAR otherwise.

Respond in valid JSON only: {"verdict":"SOLVED"|"UNCLEAR"|"WRONG","answer":"<extracted answer>","reasoning":"<1-3 sentences>","confidence_01":<0.0-1.0>}`,
};

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildUserPrompt(problem: PutnamProblem, scaffold: string): string {
  return `## Putnam Problem: ${problem.id ?? "Unknown"} (${problem.year ?? "?"})

### Problem Statement
${problem.statement}

### Candidate Solution / Scaffold
${scaffold}

### Instructions
Evaluate the scaffold above. Return JSON only — no surrounding text.`;
}

// ---------------------------------------------------------------------------
// Retry helper
// ---------------------------------------------------------------------------

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelayMs: number = 500
): Promise<{ result: T; attempts: number }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return { result, attempts: attempt };
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// JSON parse with fallback
// ---------------------------------------------------------------------------

interface LLMVerdict {
  verdict: Verdict;
  answer: string;
  reasoning: string;
  confidence_01: number;
}

function parseVerdict(raw: string): LLMVerdict {
  // Strip markdown code fences if present
  const cleaned = raw.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    const verdict = (["SOLVED", "UNCLEAR", "WRONG"].includes(parsed.verdict)
      ? parsed.verdict
      : "UNCLEAR") as Verdict;
    return {
      verdict,
      answer: String(parsed.answer ?? ""),
      reasoning: String(parsed.reasoning ?? "model_parse_ok"),
      confidence_01: Math.min(1, Math.max(0, Number(parsed.confidence_01 ?? 0.5))),
    };
  } catch {
    return {
      verdict: "UNCLEAR",
      answer: "",
      reasoning: "verdict_parse_failed",
      confidence_01: 0.1,
    };
  }
}

// ---------------------------------------------------------------------------
// Anthropic call
// ---------------------------------------------------------------------------

async function callAnthropic(
  userPrompt: string,
  systemPrompt: string,
  model: string,
  timeoutMs: number
): Promise<{ content: string; input_tokens: number; output_tokens: number }> {
  // Dynamic import so the file compiles even when SDK not installed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: timeoutMs,
  });

  const msg = await client.messages.create({
    model,
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content =
    msg.content[0]?.type === "text" ? msg.content[0].text : "";
  return {
    content,
    input_tokens: msg.usage.input_tokens,
    output_tokens: msg.usage.output_tokens,
  };
}

// ---------------------------------------------------------------------------
// OpenAI call
// ---------------------------------------------------------------------------

async function callOpenAI(
  userPrompt: string,
  systemPrompt: string,
  model: string,
  timeoutMs: number
): Promise<{ content: string; input_tokens: number; output_tokens: number }> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: timeoutMs,
  });

  const completion = await client.chat.completions.create({
    model,
    max_tokens: 512,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "";
  const usage = completion.usage;
  return {
    content,
    input_tokens: usage?.prompt_tokens ?? 0,
    output_tokens: usage?.completion_tokens ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function callRealLLMJudge(
  problem: PutnamProblem,
  scaffold: string,
  options: JudgeOptions = {}
): Promise<JudgeResponse> {
  const {
    systemPromptVariant = "rigorous",
    timeoutMs = 30_000,
    maxRetries = 3,
  } = options;

  const useAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);
  const useOpenAI = Boolean(process.env.OPENAI_API_KEY);

  // Model resolution
  let model = options.model;
  if (!model) {
    model = useAnthropic ? "claude-sonnet-4-5" : "gpt-5-mini";
  }

  const systemPrompt = SYSTEM_PROMPTS[systemPromptVariant] ?? SYSTEM_PROMPTS.rigorous;
  const userPrompt = buildUserPrompt(problem, scaffold);

  const t0 = Date.now();

  // Unavailable path
  if (!useAnthropic && !useOpenAI) {
    const resp: JudgeResponse = {
      verdict: "UNCLEAR",
      reasoning: "judge_unavailable: no API key set",
      answer: "",
      confidence_01: 0,
      latency_ms: 0,
      token_usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
      model_used: "none",
      attempt_count: 0,
      receipt_type: "judge_response",
      timestamp_iso: new Date().toISOString(),
    };
    process.stdout.write(JSON.stringify(resp) + "\n");
    return resp;
  }

  try {
    const { result: raw, attempts } = await withRetry(
      async () => {
        if (useAnthropic) {
          return callAnthropic(userPrompt, systemPrompt, model!, timeoutMs);
        }
        return callOpenAI(userPrompt, systemPrompt, model!, timeoutMs);
      },
      maxRetries,
      500
    );

    const parsed = parseVerdict(raw.content);
    const latency_ms = Date.now() - t0;
    const token_usage: TokenUsage = {
      input_tokens: raw.input_tokens,
      output_tokens: raw.output_tokens,
      total_tokens: raw.input_tokens + raw.output_tokens,
    };

    const resp: JudgeResponse = {
      ...parsed,
      latency_ms,
      token_usage,
      model_used: model,
      attempt_count: attempts,
      receipt_type: "judge_response",
      timestamp_iso: new Date().toISOString(),
    };

    // DSSE receipt chain — emit to stdout
    process.stdout.write(JSON.stringify(resp) + "\n");
    return resp;
  } catch (err: unknown) {
    const latency_ms = Date.now() - t0;
    const reason =
      err instanceof Error ? err.message.slice(0, 120) : "unknown_error";
    const resp: JudgeResponse = {
      verdict: "UNCLEAR",
      reasoning: `judge_unavailable: ${reason}`,
      answer: "",
      confidence_01: 0,
      latency_ms,
      token_usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
      model_used: model,
      attempt_count: maxRetries,
      receipt_type: "judge_response",
      timestamp_iso: new Date().toISOString(),
    };
    process.stdout.write(JSON.stringify(resp) + "\n");
    return resp;
  }
}
