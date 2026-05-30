# agi-forecast — AI Governance Trajectory Forecasting

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-0B1F3A.svg?style=flat-square&logo=apache&logoColor=00D4FF)](https://www.apache.org/licenses/LICENSE-2.0)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20434276.svg)](https://doi.org/10.5281/zenodo.20434276)
[![CI](https://github.com/szl-holdings/agi-forecast/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/szl-holdings/agi-forecast/actions/workflows/ci.yml)
[![CodeQL](https://github.com/szl-holdings/agi-forecast/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/szl-holdings/agi-forecast/actions/workflows/codeql.yml)
[![GHAS Code Security](https://img.shields.io/badge/GHAS-Code_Security-2DA44E.svg?style=flat-square&logo=github)](https://github.com/szl-holdings/agi-forecast/security/code-scanning)
[![Secret Protection](https://img.shields.io/badge/GHAS-Secret_Protection-2DA44E.svg?style=flat-square&logo=github)](https://github.com/szl-holdings/agi-forecast/security/secret-scanning)
[![SBOM](https://github.com/szl-holdings/agi-forecast/actions/workflows/sbom.yml/badge.svg?branch=main)](https://github.com/szl-holdings/agi-forecast/actions/workflows/sbom.yml)
[![SLSA L1 (SBOM + DCO)](https://img.shields.io/badge/SLSA-L1_(SBOM_%2B_DCO)-0B1F3A.svg?style=flat-square)](https://slsa.dev/spec/v1.0/levels)
[![DCO](https://github.com/szl-holdings/agi-forecast/actions/workflows/dco.yml/badge.svg?branch=main)](https://github.com/szl-holdings/agi-forecast/actions/workflows/dco.yml)
[![ORCID](https://img.shields.io/badge/ORCID-0009--0001--0110--4173-A6CE39.svg?style=flat-square&logo=orcid&logoColor=white)](https://orcid.org/0009-0001-0110-4173)


> **NOTE:** SLSA Level 1 (source + build provenance documented). L2/L3 require Sigstore + isolated builders (roadmap).

> Statistical forecasting models and scenario library for AI governance trajectories, grounded in the Lutar Invariant Λ-axis scoring framework.  
> Doctrine v6 · DOI [10.5281/zenodo.20434276](https://doi.org/10.5281/zenodo.20434276)

**agi-forecast** provides PAC-Bayes-bounded Λ-trajectory forecasting over a probability space where each scenario is a time-indexed sequence of Λ-scores. Each scenario is receipt-attested, ensuring fine-tuning perturbations stay within the DPO stability region (TH12).

> [!NOTE]
> **Staged claims:** PAC-Bayes bounds and DPO stability margin (TH12) are mathematically grounded in the Ouroboros Thesis. `lake build` is kernel-green on lutar-lean main (PR #106 merged 2026-05-30, 4973/4973 modules). TH12 remains axiom-structured per the 12-axiom honest-gap registry. Putnam: 2/12 Lean-discharged, 10/12 structure, all-12 formalization in progress.

---

## On Hugging Face

[SZLHOLDINGS on Hugging Face](https://huggingface.co/SZLHOLDINGS) — 27 Spaces · 31 datasets · 2 models

| Surface | Artifact |
|---------|----------|
| Source mirror | [agi-forecast-source](https://huggingface.co/datasets/SZLHOLDINGS/agi-forecast-source) |

---

## Statistical foundation

Forecasting operates over `(Ω, ℱ, P)` where ω ∈ Ω is a time-indexed sequence `{Λ_t(ω)}_{t≥0}`. Three bounding frameworks:

- **PAC-Bayes confidence bounds** — govern the uncertainty envelope of Λ predictions [(McAllester, 2003)](https://link.springer.com/article/10.1023/A:1021840411064)
- **Shannon entropy bound** — caps information content at `H(X) ≤ log₂(N)` bits for N discrete scenarios [(Shannon, 1948)](https://doi.org/10.1002/j.1538-7305.1948.tb01338.x)
- **DPO stability margin** — each scenario is receipt-attested within the DPO stability region [(Rafailov et al., 2023)](https://doi.org/10.48550/arXiv.2305.18290)

---

## What is real today

| Metric | Count | Verify |
|--------|-------|--------|
| Forecast scenario models | `ls src/scenarios/ \| wc -l` | run locally |
| PAC-Bayes CI tests (main) | baseline | `pnpm test` |
| Putnam (2026) | 2/12 Lean-discharged · 10/12 structure | `putnam_scores/2026.json` |
| Lean declarations (org) | 217 | [lutar-lean](https://github.com/szl-holdings/lutar-lean) |
| Lean axioms (org) | 12 | [lutar-lean](https://github.com/szl-holdings/lutar-lean) |
| HF Spaces (org) | 24 | [SZLHOLDINGS HF org](https://huggingface.co/SZLHOLDINGS) |

---

## Quick start

```bash
pnpm install && pnpm build
pnpm test
pnpm forecast --scenario governance_trajectory_2026
```

---

## License

[Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) — SZL Holdings

---

## Citation

```
S. P. Lutar Jr., "agi-forecast — AI Governance Trajectory Forecasting Library,"
Zenodo, DOI 10.5281/zenodo.20434276, 2026.
```
ORCID: [0009-0001-0110-4173](https://orcid.org/0009-0001-0110-4173)

---

## Security

See [SECURITY.md](./SECURITY.md) for responsible-disclosure policy.
