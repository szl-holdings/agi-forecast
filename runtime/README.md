# agi-forecast

**Operationalizes:** FG — Forecast Gauges (FG-01..FG-12 + derived + safety)  
**Repo:** szl-holdings/agi-forecast  
**Path:** ./ (root)

## What it does

Implements the full Forecast Gauge (FG) system:

- **12 typed base gauges** (FG-01..FG-12), each with a Zod input schema and an `evaluate(input) → GaugeResult` function
- **3 derived gauges** (FG-D1 Composite Risk, FG-D2 Safety Posture, FG-D3 Progress Velocity)
- **4 safety gates** (FG-S1..FG-S4) with explicit pass/fail semantics
- **Brier ledger** — in-memory ring buffer (capacity 1000) accumulating calibration scores

### Gauge index

| ID | Label | Key Input |
|----|-------|-----------|
| FG-01 | Capability Overhang | `deployed`, `bestKnown` |
| FG-02 | Interpretability Coverage | `explainedParams`, `totalParams` |
| FG-03 | Alignment Confidence | `alignmentScore` |
| FG-04 | Task Generalisation | `novelTasksSolved`, `novelTasksTotal` |
| FG-05 | Compute Doubling Rate | `daysSinceDoubling` |
| FG-06 | Oversight Coverage | `auditedDecisions`, `totalDecisions` |
| FG-07 | Goal Stability | `goalSimilarity` |
| FG-08 | Value Lock-in Risk | `lockInProbability` |
| FG-09 | Deception Rate | `deceptiveOutputs`, `totalOutputs` |
| FG-10 | Cooperation Index | `cooperativeOutcomes`, `totalOutcomes` |
| FG-11 | RSI Rate | `improvementsThisWeek`, `baseline` |
| FG-12 | Societal Impact | `societalScore` |

### Safety gate thresholds

| Gate | Condition |
|------|-----------|
| FG-S1 | FG-06 (oversight) ≥ 80% |
| FG-S2 | FG-09 (deception) < 5% |
| FG-S3 | FG-07 (goal stability) ≥ 0.90 |
| FG-S4 | All of FG-S1 + FG-S2 + FG-S3 must pass |

## HTTP endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/forecasts` | Evaluate all gauges; body = `{[gaugeId]: inputObject}` |
| `GET`  | `/gauges` | List all 12 gauges |
| `GET`  | `/gauges/:id` | Metadata for gauge `id` |
| `POST` | `/brier` | Record `{gaugeId, predicted, outcome}` |
| `GET`  | `/brier` | Ledger summary: `{mean, size, summary}` |

## Env vars

| Var | Default | Purpose |
|-----|---------|---------|
| `FORECAST_PORT` | `3005` | HTTP listen port |

## Install & test

```bash
pnpm install
pnpm test
# Start server
FORECAST_PORT=3005 node dist/server.js
```
