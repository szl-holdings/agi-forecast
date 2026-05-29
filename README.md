# agi-forecast — FG-01..FG-12 AI Safety Forecasting Gauges

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-0B1F3A.svg?style=flat-square&logo=apache&logoColor=00D4FF)](https://www.apache.org/licenses/LICENSE-2.0)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20424996.svg)](https://doi.org/10.5281/zenodo.20424996)
[![CI](https://github.com/szl-holdings/agi-forecast/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/szl-holdings/agi-forecast/actions/workflows/ci.yml)
[![Tests](https://github.com/szl-holdings/agi-forecast/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/szl-holdings/agi-forecast/actions/workflows/tests.yml)
[![CodeQL](https://github.com/szl-holdings/agi-forecast/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/szl-holdings/agi-forecast/actions/workflows/codeql.yml)
[![SBOM](https://github.com/szl-holdings/agi-forecast/actions/workflows/sbom.yml/badge.svg?branch=main)](https://github.com/szl-holdings/agi-forecast/actions/workflows/sbom.yml)
[![SLSA 3](https://github.com/szl-holdings/agi-forecast/actions/workflows/slsa.yml/badge.svg?branch=main)](https://github.com/szl-holdings/agi-forecast/actions/workflows/slsa.yml)
[![DCO](https://github.com/szl-holdings/agi-forecast/actions/workflows/dco.yml/badge.svg?branch=main)](https://github.com/szl-holdings/agi-forecast/actions/workflows/dco.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/szl-holdings/agi-forecast/badge)](https://securityscorecards.dev/viewer/?uri=github.com/szl-holdings/agi-forecast)
[![ORCID](https://img.shields.io/badge/ORCID-0009--0001--0110--4173-A6CE39.svg?style=flat-square&logo=orcid&logoColor=white)](https://orcid.org/0009-0001-0110-4173)

**agi-forecast** implements 12 typed forecasting gauges (FG-01 to FG-12) for AI safety scenario
modeling. Each gauge is Zod-validated, returns a Brier-compatible score, and feeds into FG-S1..S4
scenario gates with a receipted Putnam 2026-05-27 benchmark run.

---

## What is real today

All counts are grep-verifiable from this repository.

| Metric | Value | How to verify |
|--------|-------|---------------|
| FG gauges | 12 | `grep -c "^export const FG[0-9][0-9]*:" runtime/src/gauges.ts` |
| Scenario gates | 4 | FG-S1, FG-S2, FG-S3, FG-S4 in `runtime/src/derived.ts` |
| Putnam 2026-05-27 problems attempted | 12 | `runtime/putnam-2025/2026-05-27/gauge.json` → `problemsAttempted` |
| Putnam 2026-05-27 problems correct | 1 | `runtime/putnam-2025/2026-05-27/gauge.json` → `problemsCorrect` |
| Attempt refs | 12 | `runtime/putnam-2025/2026-05-27/gauge.json` → `attemptRefs` array |
| Zenodo DOI | 10.5281/zenodo.20424996 | https://doi.org/10.5281/zenodo.20424996 |

---

## FG Gauge Reference

| Gauge | Label | Input schema |
|-------|-------|--------------|
| FG-01 | Capability Overhang | `{ deployed: [0,1], bestKnown: [0,1] }` |
| FG-02 | Explainability | `{ explainedParams, totalParams }` |
| FG-03 | Alignment Score | `{ alignmentScore: [0,1] }` |
| FG-04 | Novel Tasks | `{ novelTasksSolved, novelTasksTotal }` |
| FG-05 | Doubling Rate | `{ daysSinceDoubling }` |
| FG-06 | Auditability | `{ auditedDecisions, totalDecisions }` |
| FG-07 | Goal Similarity | `{ goalSimilarity: [0,1] }` |
| FG-08 | Lock-in Probability | `{ lockInProbability: [0,1] }` |
| FG-09 | Deception Rate | `{ deceptiveOutputs, totalOutputs }` |
| FG-10 | Cooperation | `{ cooperativeOutcomes, totalOutcomes }` |
| FG-11 | Self-improvement Rate | `{ improvementsThisWeek, baseline }` |
| FG-12 | Societal Score | `{ societalScore: [0,1] }` |

---

## Architecture

```
Typed inputs (Zod-validated per gauge)
        │
        ▼
gauges.ts — FG-01..FG-12.evaluate(input)
  └─ clamp(value, 0, 1) → GaugeResult { gaugeId, value, brier_input, label, timestamp }
        │
        ▼
brier.ts — brierScore(results, observations)
  └─ mean-squared-error calibration score
        │
        ▼
derived.ts — aggregateGauges(results)
  └─ FG-S1 (current risk) · FG-S2 (near-term) · FG-S3 (resilience) · FG-S4 (governance)
        │
        ▼
server.ts — HTTP API on :3000
  POST /gauge/:id  →  GaugeResult

Putnam 2026-05-27 benchmark:
  runtime/putnam-2025/2026-05-27/gauge.json   ← receipted result (1/12 correct)
  runtime/putnam-2025/2026-05-27/leaderboard.json
```

---

## How to use

```typescript
import { FG01, FG12, brierScore } from './runtime/src/gauges'
import { aggregateToScenarioGates } from './runtime/src/derived'

// Evaluate a single gauge
const result = FG01.evaluate({ deployed: 0.7, bestKnown: 1.0 })
// { gaugeId: 'FG-01', value: 0.7, brier_input: 0.7, label: 'Capability Overhang', timestamp: '...' }

// Run all 12 gauges and compute Brier score
const results = [FG01.evaluate(...), FG12.evaluate(...), ...]
const observations = [0, 0, 1, ...]  // actual outcomes
const brier = brierScore(results.map(r => r.brier_input), observations)

// Aggregate into scenario gates
const gates = aggregateToScenarioGates(results)
// { FG_S1: { pass: false, score: 0.68 }, ... }

// Start the HTTP server
cd runtime && pnpm start  # API on :3000
```

---

## What this is NOT

- Not a peer-reviewed AI safety prediction system — gauges encode structured modeling assumptions, not empirically validated prediction intervals (Putnam 2026: 1/12 correct)
- Not a replacement for formal quantitative risk assessment — no substitute for red-teaming or formal safety evaluation frameworks
- Not calibrated against a historical AGI dataset — Putnam 2026-05-27 is the first benchmark run

---

## Sibling repositories

| Repo | Role |
|------|------|
| [a11oy-platform](https://huggingface.co/spaces/SZLHOLDINGS/a11oy-platform) | Queries agi-forecast FG-S1..S4 gates for escalation decisions |
| [amaru](https://github.com/szl-holdings/amaru) | Benchmark run receipts anchored via amaru receipt chain |
| [sentra](https://github.com/szl-holdings/sentra) | Threat signals feed FG-04 (Novel Tasks) and FG-09 (Deception) inputs |
| [szl-cookbook](https://github.com/szl-holdings/szl-cookbook) | pre-flight-thinking SKILL.md defines gauge reasoning protocol |

---

## How to cite

```bibtex
@software{lutar_agi_forecast_2025,
  author    = {Lutar, Stephen Paul JR},
  title     = {agi-forecast — FG-01..FG-12 AI Safety Forecasting Gauges},
  year      = {2025},
  doi       = {10.5281/zenodo.20424996},
  url       = {https://doi.org/10.5281/zenodo.20424996},
  license   = {Apache-2.0}
}
```

---

## References

- Brier, G. W. (1950). Verification of forecasts expressed in terms of probability. Monthly Weather Review 78(1), 1–3. https://doi.org/10.1175/1520-0493(1950)078%3C0001:VOFEIT%3E2.0.CO;2
- SZL Holdings Doctrine v6: https://doi.org/10.5281/zenodo.19944926

---

## License + DCO

Licensed under [Apache License 2.0](./LICENSE).

All commits require Developer Certificate of Origin sign-off (`git commit -s`).
SLSA provenance, SBOM generation, and CodeQL static analysis enforced on CI.

ORCID: [0009-0001-0110-4173](https://orcid.org/0009-0001-0110-4173) · Doctrine v6 compliant

Signed-off-by: Stephen Paul Lutar JR <stephen@szlholdings.com>
