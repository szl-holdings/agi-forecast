# agi-forecast — Lutar-Forecast Gauge

[![Concept DOI](https://img.shields.io/badge/concept%20DOI-10.5281%2Fzenodo.19944926-01696F?style=flat-square&logo=doi&logoColor=white)](https://doi.org/10.5281/zenodo.19944926)
[![License](https://img.shields.io/badge/license-Apache%202.0-2DA44E?style=flat-square)](./LICENSE)
[![ORCID](https://img.shields.io/badge/ORCID-0009--0001--0110--4173-A6CE39?style=flat-square&logo=orcid&logoColor=white)](https://orcid.org/0009-0001-0110-4173)
[![Doctrine v6](https://img.shields.io/badge/Doctrine-v6%20clean-01696F?style=flat-square)](https://github.com/szl-holdings/platform/blob/main/tools/doctrine-v6-scan.js)

**Receipt-attested AGI capability gauges tracking METR, Epoch, ARC, Apollo, AISI, RSP, and FSF benchmarks.**

**Author:** Lutar, Stephen P. · ORCID [0009-0001-0110-4173](https://orcid.org/0009-0001-0110-4173) · SZL Holdings
**License:** Apache-2.0
**Status:** Pre-implementation (proposal stage)

---

## What this is

The `Lutar-Forecast Gauge` is a module shipping in both `ouroboros` (TypeScript) and `a11oy` that ingests 12 typed variables from the field's authoritative upstream sources, stores each with cryptographic provenance, and emits a daily `forecast.summary@YYYY-MM-DD` receipt verifiable against the ouroboros replay root.

A static Vercel dashboard makes every number public. Three derived metrics — `horizon-velocity`, `alignment-debt`, and `lutar-readiness` — translate raw data into signals for the a11oy runtime. A Brier-score ledger closes the prediction-vs-actuals loop.

This repository positions the Lutar-Forecast Gauge as the canonical AGI readiness instrument within the SZL Holdings governed-decision substrate. Every gauge variable is citation-backed. Every receipt is verifiable. Doctrine V6 applies: no marketing-superlative language; every claim is tied to a citable source.

---

## The 12 Gauge Variables

> **Doctrine V6 note:** the values in the right column are a one-time **snapshot taken 2026-05-16** by reading each upstream source. They are **not auto-refreshed** because the gauge implementation in this repo is pre-implementation (see "Status" above). Treat them as anchor values for the spec. The first acceptance criterion for the Lutar-Forecast Gauge is that this snapshot column gets **deleted and replaced by a "Last Verified" date column** populated automatically by the daily receipt job.

| # | canonical-key | Upstream Source | Snapshot Value · As of 2026-05-16 |
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

## Thesis publications (DOI-pinned)

| Version | DOI | PDF |
|---|---|---|
| **v16** | [`10.5281/zenodo.20424996`](https://doi.org/10.5281/zenodo.20424996) | [PDF](https://zenodo.org/records/20424996/files/ouroboros-thesis-v16.pdf) |
| **v15** | [`10.5281/zenodo.20424995`](https://doi.org/10.5281/zenodo.20424995) | [PDF](https://zenodo.org/records/20424995/files/ouroboros-thesis-v15.pdf) |
| **v14** | [`10.5281/zenodo.20424992`](https://doi.org/10.5281/zenodo.20424992) | [PDF](https://zenodo.org/records/20424992/files/ouroboros-thesis-v14.pdf) |

**Concept DOI:** [`10.5281/zenodo.19944926`](https://doi.org/10.5281/zenodo.19944926)

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
