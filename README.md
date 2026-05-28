# agi-forecast

> Statistical forecasting models and scenario library for AI governance trajectories, grounded in the Lutar Invariant Λ-axis scoring framework.

[![CI](https://github.com/szl-holdings/agi-forecast/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/szl-holdings/agi-forecast/actions/workflows/ci.yml)
[![CodeQL](https://github.com/szl-holdings/agi-forecast/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/szl-holdings/agi-forecast/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/szl-holdings/agi-forecast/badge)](https://scorecard.dev/viewer/?uri=github.com/szl-holdings/agi-forecast)
[![DOI v18.0](https://img.shields.io/badge/DOI-10.5281%2Fzenodo.20434276-blue?style=flat-square&logo=doi&logoColor=white)](https://doi.org/10.5281/zenodo.20434276)
[![Concept DOI](https://img.shields.io/badge/concept%20DOI-10.5281%2Fzenodo.19944926-805AD5?style=flat-square&logo=doi&logoColor=white)](https://doi.org/10.5281/zenodo.19944926)
[![License](https://img.shields.io/badge/license-Apache%202.0-2DA44E?style=flat-square)](./LICENSE)
[![Doctrine v6](https://img.shields.io/badge/doctrine-v6-01696F?style=flat-square)](https://github.com/szl-holdings/ouroboros-thesis)


> **Frontier Capability** — first PAC-Bayes-bounded Λ-trajectory forecasting library with receipt-attested scenarios.  
> Each scenario is a PAC-Bayes-certified probability path over the Λ-axis space, grounded in DPO stability (TH12) and Bekenstein information-density bounds.

> **Thesis cross-reference:** The mathematical foundations for this repository are developed
> in the [Ouroboros Thesis v18.0](https://github.com/szl-holdings/ouroboros-thesis) (DOI [10.5281/zenodo.20434276](https://doi.org/10.5281/zenodo.20434276)).
> Source for the published thesis is in [`szl-holdings/ouroboros-thesis`](https://github.com/szl-holdings/ouroboros-thesis).
> Concept DOI (always-latest): [10.5281/zenodo.19944926](https://doi.org/10.5281/zenodo.19944926).

## Statistical Foundation

Governance trajectory forecasting operates over a probability space
`(Ω, ℱ, P)` where each scenario ω ∈ Ω is a time-indexed sequence of Λ-scores
`{Λ_t(ω)}_{t≥0}`. The Lutar Invariant Λ ∈ \[0, 1\] is the unique measure satisfying the
four-axiom characterisation established in
[szl-holdings/lutar-lean](https://github.com/szl-holdings/lutar-lean)
(DOI [10.5281/zenodo.20434308](https://doi.org/10.5281/zenodo.20434308)).

Forecasting models:
- **PAC-Bayes confidence bounds**: govern the uncertainty envelope of Λ predictions.
  [(McAllester, 2003)](https://link.springer.com/article/10.1023/A:1021840411064)
- **Bekenstein information density**: caps the entropy of each forecast scenario
  at `S ≤ 2πkRE/(ℏc)`.
  [(Bekenstein, 1981, doi:10.1103/PhysRevD.23.287)](https://doi.org/10.1103/PhysRevD.23.287)
- **DPO stability margin**: each scenario is Lutar-receipt-attested, ensuring that
  fine-tuning perturbations stay within the DPO stability region (TH12).
  [(Rafailov et al., 2023, doi:10.48550/arXiv.2305.18290)](https://doi.org/10.48550/arXiv.2305.18290)

## Table of Contents

- [Statistical Foundation](#statistical-foundation)
- [Scenario Library](#scenario-library)
- [Quick Start](#quick-start)
- [How to Cite](#how-to-cite)
- [Companion Repositories](#companion-repositories)
- [License](#license)

## Scenario Library

Each scenario is a named, receipt-attested governance trajectory. Scenarios are stored as
versioned JSON under `scenarios/` and are validated against the Doctrine v6 schema on CI.

| Scenario | Description | Status |
|----------|-------------|--------|
| `baseline-v6` | Baseline Λ trajectory under Doctrine v6 constraints | stable |
| `rapid-expansion` | High-velocity deployment with tightened Bekenstein cap | experimental |
| `conservative-gate` | λ-gate threshold raised to 0.85 | stable |

## Quick Start

```sh
git clone https://github.com/szl-holdings/agi-forecast.git
cd agi-forecast
pnpm install
pnpm test
# Run a specific scenario
pnpm tsx src/run.ts --scenario baseline-v6
```

## How to Cite

```bibtex
@techreport{ouroboros_thesis_v18,
  author      = {Lutar, Stephen P.},
  title       = {{SZL Holdings v18.0 Master Thesis --- Multi-track Substrate Expansion}},
  year        = {2026},
  institution = {SZL Holdings},
  doi         = {10.5281/zenodo.20434276},
  url         = {https://doi.org/10.5281/zenodo.20434276}
}
```

The `CITATION.cff` in this repository root is the authoritative citation source.

## Companion Repositories

| Repository | Role |
|-----------|------|
| [szl-holdings/ouroboros-thesis](https://github.com/szl-holdings/ouroboros-thesis) | Formal thesis (v18.0, DOI [10.5281/zenodo.20434276](https://doi.org/10.5281/zenodo.20434276)) |
| [szl-holdings/lutar-lean](https://github.com/szl-holdings/lutar-lean) | Lean 4 proofs of Λ uniqueness and bounds |
| [szl-holdings/ouroboros](https://github.com/szl-holdings/ouroboros) | Runtime — source of Λ scores for forecasting |

## License

Apache License 2.0 — see [`LICENSE`](./LICENSE).

Copyright 2026 SZL Holdings. ORCID: [0009-0001-0110-4173](https://orcid.org/0009-0001-0110-4173).

---

## Related repositories in the SZL substrate

The 13 substrate repos cross-link reciprocally. This footer is maintained by GH Admin #1 (org-wide).

- [`a11oy`](https://github.com/szl-holdings/a11oy) — vertical alignment substrate (policy · measurement · knowledge · QEC-integrity)
- [`amaru`](https://github.com/szl-holdings/amaru) — Shor-encoded receipt minting (Cardano-anchored)
- [`rosie`](https://github.com/szl-holdings/rosie) — CSS-ingress receipt orchestration
- [`sentra`](https://github.com/szl-holdings/sentra) — Kitaev-surface drift detection on audit fibers
- [`uds-mesh`](https://github.com/szl-holdings/uds-mesh) — UDS span schemas + governance receipts
- [`lutar-lean`](https://github.com/szl-holdings/lutar-lean) — Lean 4 + Mathlib v4.13.0 kernel proofs (30 GREEN modules)
- [`ouroboros`](https://github.com/szl-holdings/ouroboros) — bounded-recursion runtime
- [`ouroboros-thesis`](https://github.com/szl-holdings/ouroboros-thesis) — DOI-pinned thesis substrate (v3 → v18)
- [`platform`](https://github.com/szl-holdings/platform) — composing monorepo (76 packages, 1,220 tests)
- [`szl-brand`](https://github.com/szl-holdings/szl-brand) — anatomy + visual doctrine (PDFs hosted in-repo)
- [`szl-cookbook`](https://github.com/szl-holdings/szl-cookbook) — governed-AI recipes
- [`agi-forecast`](https://github.com/szl-holdings/agi-forecast) — PAC-Bayes + Bekenstein governance-trajectory forecasts
- [`vsp-otel`](https://github.com/szl-holdings/vsp-otel) — OpenTelemetry exporter for Λ-axis spans

Org page: [github.com/szl-holdings](https://github.com/szl-holdings) · Doctrine v6 · 11 axioms · 30 GREEN modules · v18.0 DOI [`10.5281/zenodo.20434276`](https://doi.org/10.5281/zenodo.20434276)
