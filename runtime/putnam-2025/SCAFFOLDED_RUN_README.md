# Putnam v2 — Scaffolded Real-Judge Run

## STAGED Disclosure

Results from this pipeline vary by model, temperature, and API availability.
**All run outputs must be published to the SZL honesty ledger** before being
cited in any external document. Do not quote a score without the full
`gauge_v2.json` receipt attached.

---

## Baseline

| Judge config | Solved / 12 | Score |
|---|---|---|
| MOCK_JUDGE (deterministic) | 1 (A1 only) | **8.3%** |
| 3-judge ensemble, no scaffold | 2–4 (est.) | ~16–33% |
| 3-judge ensemble + formula scaffold | 3–6 (est.) | ~25–50% |

The 8.3% baseline is the reproducible floor — it requires no API key.
Every number above that line is a *projection* until a live run is logged.

---

## Prerequisites

1. Node 20+, `pnpm` or `npm`.
2. API key — exactly one of:
   - `ANTHROPIC_API_KEY` (preferred; enables `claude-sonnet-4-5` or `claude-opus-4-1`)
   - `OPENAI_API_KEY` (fallback; enables `gpt-5` or `gpt-5-mini`)
3. Dependencies installed: `npm install` inside `agi-forecast/runtime/`.
4. (Optional) `a11oy` workspace linked for domain classifier + formula scaffold.

---

## Running

### With Anthropic key

```bash
cd agi-forecast/runtime
export ANTHROPIC_API_KEY=sk-ant-...
npm run putnam:v2 -- \
  --year=2024 \
  --judge-model=claude-sonnet-4-5 \
  --out=runtime/putnam-2025/gauge_v2.json
```

### With OpenAI key (fallback)

```bash
export OPENAI_API_KEY=sk-...
npm run putnam:v2 -- --year=2024 --judge-model=gpt-5-mini --out=runtime/putnam-2025/gauge_v2.json
```

### Without any key (STAGED mock — safe for CI)

```bash
npm run putnam:v2 -- --year=2024 --out=runtime/putnam-2025/gauge_v2_mock.json
```

Output will be tagged `"staged": true` and score will match the 8.3% baseline.

---

## Output: `gauge_v2.json`

```jsonc
{
  "run_timestamp": "2025-05-29T...",
  "judge_model": "claude-sonnet-4-5",
  "staged": false,
  "total_problems": 12,
  "solved": 4,
  "score_pct": 33.3,
  "baseline_pct": 8.3,
  "receipts": [ ... ]  // one per problem; includes per-judge reasoning
}
```

Each receipt contains:
- `domain` + `domain_tags` from `domain_classifier.ts`
- `scaffold_used` from `formula_scaffold.ts`
- Full `ensemble` with all 3 judge responses (reasoning, confidence, token usage)
- `final_verdict`: `SOLVED | UNCLEAR | WRONG`

---

## Honesty Ledger Protocol

Per Doctrine v6:

1. Run the harness.
2. Copy `gauge_v2.json` verbatim to `honesty_ledger/putnam/<date>_<model>.json`.
3. Never edit the JSON after the fact.
4. If you rerun (different model or temperature), save a *new* ledger entry —
   do not overwrite previous results.
5. Any published score **must** link to the ledger entry.

---

## What the Founder Must Provide

- `ANTHROPIC_API_KEY` with access to `claude-sonnet-4-5` or `claude-opus-4-1`.
  (Or `OPENAI_API_KEY` for GPT-5 / GPT-5-mini as fallback.)
- Without this, every run is STAGED/MOCK and the score is permanently 8.3%.

---

## Architecture Summary

```
loadPutnamCorpus()          ← putnam_corpus_loader.ts (A1-A6, B1-B6)
    ↓
classifyDomain()            ← a11oy/domain_classifier.ts
    ↓
buildFormulaScaffold()      ← a11oy/formula_scaffold.ts (35 anchor formulas)
    ↓
runJudgeEnsemble()          ← judges/judge_runner.ts
   ├── callRealLLMJudge(rigorous)     ┐
   ├── callRealLLMJudge(creative)     ├─ parallel, majority vote
   └── callRealLLMJudge(verification) ┘
    ↓
gauge_v2.json               ← honest score, full receipts
```
