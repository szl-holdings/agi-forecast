# agi-forecast — Lutar-Forecast Gauge

**Receipt-attested AGI capability gauges tracking METR, Epoch, ARC, Apollo, AISI, RSP, and FSF benchmarks.**

**Author:** Lutar, Stephen P. · ORCID [0009-0001-0110-4173](https://orcid.org/0009-0001-0110-4173) · SZL Holdings
**License:** Apache-2.0
**Status:** Pre-implementation (proposal stage)

---

## Executive Summary

AGI forecasting at SZL Holdings converts awareness into **RECEIPTS, GAUGES, DASHBOARDS, and PREDICTIONS-VS-ACTUALS**. The `Lutar-Forecast Gauge` is a module shipping in both `ouroboros` (TypeScript) and `a11oy` that ingests 12 typed variables from the field's authoritative upstream sources, stores each with cryptographic provenance, and emits a daily `forecast.summary@YYYY-MM-DD` receipt verifiable against the ouroboros replay root. A static Vercel dashboard makes every number public. Three derived metrics — `horizon-velocity`, `alignment-debt`, and `lutar-readiness` — translate raw data into actionable signals for the a11oy runtime. A Brier-score ledger closes the prediction-vs-actuals loop.

---

## The 12 Gauge Variables

| # | canonical-key | Upstream Source | Current Value (May 2026) |
|---|---------------|-----------------|--------------------------|
| 1 | `METR-th50-hours` | [metr.org/time-horizons](https://metr.org/time-horizons/) | ≥16 h (ceiling) |
| 2 | `METR-doubling-months` | [METR TH1.1 Jan 2026](https://metr.org/blog/2026-1-29-time-horizon-1-1/) | 4.3 months |
| 3 | `Epoch-frontier-flops` | [epoch.ai/trends](https://epoch.ai/trends) | 26.7 (log₁₀ FLOP) |
| 4 | `ARC-AGI-2-SOTA-pct` | [arcprize.org/arc-agi/2](https://arcprize.org/arc-agi/2) | 95% |
| 5 | `Apollo-scheming-rate` | [apolloresearch.ai scheming evals](https://www.apolloresearch.ai/science/frontier-models-are-capable-of-incontext-scheming/) | 0.3% |
| 6 | `AISI-self-replication-success` | [AISI Frontier AI Trends Dec 2025](https://www.aisi.gov.uk/research/aisi-frontier-ai-trends-report-2025) | 60% |
| 7 | `Anthropic-RSP-current-ASL` | [anthropic.com/responsible-scaling-policy](https://www.anthropic.com/responsible-scaling-policy) | 3 |
| 8 | `OAI-Preparedness-level` | [openai.com/preparedness](https://openai.com/index/updating-our-preparedness-framework/) | High |
| 9 | `DeepMind-FSF-CCL` | [deepmind.google FSF 3.1 Apr 2026](https://deepmind.google/blog/strengthening-our-frontier-safety-framework/) | Autonomy-L1 |
| 10 | `AI-Index-org-adoption-pct` | [hai.stanford.edu/ai-index/2026-ai-index-report](https://hai.stanford.edu/ai-index/2026-ai-index-report) | 88% |
| 11 | `AI-Index-consumer-spend-usd` | [hai.stanford.edu/ai-index/2026-ai-index-report](https://hai.stanford.edu/ai-index/2026-ai-index-report) | $172B |
| 12 | `working-consensus-TAI-year` | [Metaculus/Manifold aggregate](https://timelines.issarice.com/wiki/Timeline_of_AI_timelines) | 2029 |

---

## Design Specification

Full operational spec: [`evolution_pod/meditation_v5/phd_agi_forecast/operational_spec.md`](https://github.com/szl-holdings/ouroboros/blob/main/docs/meditation_v5_agi_forecast_spec.md)

**Source:** Meditation V5 PhD-AGI-Forecast subagent · 2026-05-16

---

## Citation

See `CITATION.cff`. To cite this work:

```bibtex
@software{lutar2026agiforecast,
  author    = {Lutar, Stephen P.},
  title     = {Lutar-Forecast Gauge — receipt-attested AGI capability gauges},
  year      = {2026},
  publisher = {SZL Holdings},
  url       = {https://github.com/szl-holdings/agi-forecast},
  orcid     = {0009-0001-0110-4173}
}
```

---

*Byline: Lutar, Stephen P. · ORCID 0009-0001-0110-4173 · SZL Holdings · Apache-2.0*
