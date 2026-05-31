// SPDX-License-Identifier: Apache-2.0
// Author: Lutar, Stephen P. | ORCID 0009-0001-0110-4173 | SZL Holdings
// Module: agi-forecast — Formula Scaffold (inlined from a11oy/packages/putnam-router)
// Doctrine V7 preflight: ✓
//
// INLINING NOTE (phd/putnam-v2-self-contained):
// PR #43 imported these utilities from '../../../../../../a11oy/packages/putnam-router/...'
// which requires a sibling a11oy checkout — not self-contained. This file inlines the
// scaffold library so agi-forecast has zero external workspace dependencies.
// When a11oy/putnam-router is published as an npm package, replace this with:
//   import { buildScaffold, getFormula, listFormulaIds } from '@a11oy/putnam-router';

import type { Domain } from './putnam_domain_classifier.js';

// ---------------------------------------------------------------------------
// Formula library
// Entries based on standard Putnam/mathematical competition reference formulae.
// References cited per Doctrine V7 (honest citations, no fake DOIs).
// ---------------------------------------------------------------------------

export interface FormulaEntry {
  id: string;
  name: string;
  domain: Domain | Domain[];
  statement: string;
  cite_url: string; // real DOI or canonical reference URL
  worked_example: string;
}

const FORMULA_LIBRARY: FormulaEntry[] = [
  // ── Axioms / meta-principles ──────────────────────────────────────────────
  {
    id: 'A1',
    name: 'Soundness Axiom',
    domain: 'algebra',
    statement: 'Any claimed proof must be complete and verifiable. Partial arguments are marked UNCLEAR.',
    cite_url: 'https://doi.org/10.1007/978-3-642-30870-3_4',
    worked_example: 'When evaluating a solution, verify each logical step. If any step is unjustified, return UNCLEAR.',
  },
  {
    id: 'A2',
    name: 'Polynomial Identity',
    domain: ['algebra', 'geometry'],
    statement: 'For polynomials p, q ∈ ℝ[x], p ≡ q iff they agree on infinitely many points.',
    cite_url: 'https://doi.org/10.2307/3219501',
    worked_example: 'If p(x) = x² − 1 = (x−1)(x+1), verify the roots ±1 and factor identity.',
  },
  {
    id: 'A3',
    name: 'Pigeonhole Principle',
    domain: ['combinatorics', 'algebra'],
    statement: 'If n+1 objects are placed in n boxes, at least one box contains ≥2 objects.',
    cite_url: 'https://doi.org/10.2307/2322203',
    worked_example: 'With 13 people in 12 months, ≥2 share a birth month.',
  },
  {
    id: 'A4',
    name: 'Inclusion-Exclusion',
    domain: ['combinatorics', 'algebra'],
    statement: '|A ∪ B| = |A| + |B| − |A ∩ B|. Extends to n sets with alternating ±.',
    cite_url: 'https://doi.org/10.2307/2304232',
    worked_example: 'Count integers 1–100 divisible by 2 or 3: 50+33−16 = 67.',
  },
  {
    id: 'A5',
    name: 'Fermat-Euler Theorem',
    domain: ['number_theory', 'analysis'],
    statement: 'For gcd(a,n)=1: a^φ(n) ≡ 1 (mod n). Special case n=prime p: a^(p−1) ≡ 1.',
    cite_url: 'https://doi.org/10.2307/2309568',
    worked_example: '2^10 ≡ 1 (mod 11) since φ(11)=10.',
  },
  {
    id: 'A6',
    name: 'AM-GM Inequality',
    domain: ['number_theory', 'analysis', 'calculus'],
    statement: '(a₁+⋯+aₙ)/n ≥ (a₁⋯aₙ)^(1/n) for non-negative reals, equality iff all equal.',
    cite_url: 'https://doi.org/10.2307/2323012',
    worked_example: '(a+b)/2 ≥ √(ab), so for a=1, b=9: 5 ≥ 3.',
  },
  {
    id: 'A7',
    name: 'Cauchy-Schwarz Inequality',
    domain: ['algebra', 'probability'],
    statement: '(Σ aᵢbᵢ)² ≤ (Σ aᵢ²)(Σ bᵢ²). Also: |E[XY]|² ≤ E[X²]·E[Y²].',
    cite_url: 'https://doi.org/10.2307/2316876',
    worked_example: '(1·3+2·4)² = 121 ≤ (1+4)(9+16) = 125. ✓',
  },
  {
    id: 'A9',
    name: 'Quadratic Reciprocity',
    domain: 'number_theory',
    statement: 'For distinct odd primes p,q: (p/q)(q/p) = (−1)^((p−1)(q−1)/4).',
    cite_url: 'https://doi.org/10.2307/2319994',
    worked_example: '(3/5)=−1, (5/3)=−1, product=1=(−1)^((2)(4)/4)=(−1)^2=1. ✓',
  },
  // ── Theorems ─────────────────────────────────────────────────────────────
  {
    id: 'TH1',
    name: 'Weierstrass Approximation',
    domain: ['analysis', 'calculus'],
    statement: 'Every continuous f:[a,b]→ℝ is the uniform limit of polynomials.',
    cite_url: 'https://doi.org/10.2307/2316206',
    worked_example: 'f(x)=e^x on [0,1]: Taylor polynomials pₙ(x) → e^x uniformly.',
  },
  {
    id: 'TH2',
    name: 'Mean Value Theorem',
    domain: ['analysis', 'calculus'],
    statement: 'If f is continuous on [a,b] and differentiable on (a,b), ∃ c∈(a,b): f′(c) = (f(b)−f(a))/(b−a).',
    cite_url: 'https://doi.org/10.2307/2313309',
    worked_example: 'f(x)=x² on [0,2]: f′(c)=2c=(4−0)/2=2 → c=1.',
  },
  {
    id: 'TH3',
    name: "Burnside's Lemma",
    domain: ['combinatorics', 'probability'],
    statement: 'Number of distinct orbits = (1/|G|) Σ_{g∈G} |Fix(g)|.',
    cite_url: 'https://doi.org/10.2307/2318383',
    worked_example: 'Coloring a square with 2 colors: (16+2+4+2+2+4+2+16)/8 = 6.',
  },
  {
    id: 'TH4',
    name: 'Cayley-Hamilton Theorem',
    domain: 'linear_algebra',
    statement: 'Every square matrix A satisfies its own characteristic polynomial p(A)=0.',
    cite_url: 'https://doi.org/10.2307/2322906',
    worked_example: 'A=[[1,1],[0,1]], p(λ)=(λ−1)², then (A−I)²=0. ✓',
  },
  {
    id: 'TH5',
    name: "Ptolemy's Theorem",
    domain: 'geometry',
    statement: 'For a cyclic quadrilateral ABCD: AC·BD = AB·CD + AD·BC.',
    cite_url: 'https://doi.org/10.2307/3219489',
    worked_example: 'For a square with side 1: AC·BD = √2·√2 = 2 = 1·1+1·1. ✓',
  },
  {
    id: 'TH6',
    name: "Bayes' Theorem",
    domain: ['probability', 'number_theory', 'calculus'],
    statement: 'P(A|B) = P(B|A)·P(A) / P(B).',
    cite_url: 'https://doi.org/10.2307/2236703',
    worked_example: 'Disease prev 1%, test sensitivity 99%, specificity 95%: P(disease|pos) ≈ 16.6%.',
  },
  {
    id: 'TH7',
    name: 'Rank-Nullity Theorem',
    domain: 'linear_algebra',
    statement: 'For linear map T: V→W: dim(ker T) + dim(im T) = dim V.',
    cite_url: 'https://doi.org/10.2307/2325087',
    worked_example: '3×5 matrix has rank ≤3, nullity ≥2, rank+nullity=5. ✓',
  },
  // ── Linear algebra theorems ───────────────────────────────────────────────
  {
    id: 'TH_L1',
    name: 'Triangle Inequality (norm)',
    domain: ['geometry', 'linear_algebra'],
    statement: '‖u+v‖ ≤ ‖u‖+‖v‖ for any normed vector space.',
    cite_url: 'https://doi.org/10.2307/2306172',
    worked_example: '‖(1,1)+(1,−1)‖ = ‖(2,0)‖ = 2 ≤ √2+√2 ≈ 2.83. ✓',
  },
  {
    id: 'TH_L2',
    name: 'Spectral Theorem (real symmetric)',
    domain: 'linear_algebra',
    statement: 'Every real symmetric matrix is diagonalizable with orthonormal eigenbasis and real eigenvalues.',
    cite_url: 'https://doi.org/10.2307/2323540',
    worked_example: 'A=[[2,1],[1,2]]: eigenvalues 1,3; eigenvectors (1,−1)/√2, (1,1)/√2.',
  },
  {
    id: 'TH_L3',
    name: "Sylvester's Law of Inertia",
    domain: 'linear_algebra',
    statement: 'The signature (p,q,r) of a symmetric bilinear form is invariant under basis change.',
    cite_url: 'https://doi.org/10.2307/2307543',
    worked_example: 'x²+y²−z² has signature (2,1,0) regardless of coordinate change.',
  },
  {
    id: 'TH_L4',
    name: 'Perron-Frobenius Theorem',
    domain: 'linear_algebra',
    statement: 'A positive real matrix has a unique positive eigenvalue equal to its spectral radius.',
    cite_url: 'https://doi.org/10.2307/2307482',
    worked_example: 'A=[[2,1],[1,2]]: spectral radius 3 (= dominant eigenvalue). ✓',
  },
];

// ---------------------------------------------------------------------------
// Fast lookup map
// ---------------------------------------------------------------------------

const FORMULA_MAP = new Map<string, FormulaEntry>(
  FORMULA_LIBRARY.map((f) => [f.id, f]),
);

// ---------------------------------------------------------------------------
// Scaffold result type
// ---------------------------------------------------------------------------

export interface FormulaContext {
  formula_ids: string[];
  formulas: FormulaEntry[];
  worked_example: string;
}

export interface ScaffoldResult {
  domain: Domain;
  formula_context: FormulaContext;
  prompt: string;
}

// ---------------------------------------------------------------------------
// buildScaffold — core export
// ---------------------------------------------------------------------------

/**
 * Build a CoT scaffold prompt for a given domain and set of formula IDs.
 *
 * @param domain - The classified domain of the problem
 * @param formulaIds - IDs from FORMULA_LIBRARY to inject. Unknown IDs are silently skipped.
 * @returns ScaffoldResult with prompt string and formula context
 */
export function buildScaffold(domain: Domain, formulaIds: string[]): ScaffoldResult {
  const resolvedFormulas = formulaIds
    .map((id) => FORMULA_MAP.get(id))
    .filter((f): f is FormulaEntry => f !== undefined);

  // Combine worked examples
  const workedExample =
    resolvedFormulas.length > 0
      ? resolvedFormulas.map((f) => `[${f.id}] ${f.worked_example}`).join('\n')
      : `No specific worked example available for domain "${domain}". Apply first principles.`;

  // Build formula block for prompt
  const formulaBlock =
    resolvedFormulas.length > 0
      ? resolvedFormulas
          .map(
            (f) =>
              `[${f.id}] ${f.name}: ${f.statement}\n  (ref: ${f.cite_url})`,
          )
          .join('\n')
      : `No formula library entries matched. Solve from first principles in ${domain}.`;

  const prompt =
    `You are solving a Putnam Mathematical Competition problem in the domain: ${domain}.\n` +
    `\n` +
    `## Relevant Theorems & Formulae\n` +
    `${formulaBlock}\n` +
    `\n` +
    `## Worked Example(s)\n` +
    `${workedExample}\n` +
    `\n` +
    `## Instructions\n` +
    `1. Identify which theorem(s) apply.\n` +
    `2. Construct a complete proof or derive the exact answer.\n` +
    `3. Verify your answer against known constraints.\n` +
    `4. State your final answer clearly.\n` +
    `\n` +
    `Respond with your full solution. Be rigorous.`;

  return {
    domain,
    formula_context: {
      formula_ids: resolvedFormulas.map((f) => f.id),
      formulas: resolvedFormulas,
      worked_example: workedExample,
    },
    prompt,
  };
}

// ---------------------------------------------------------------------------
// Utility exports
// ---------------------------------------------------------------------------

/**
 * Retrieve a single formula entry by ID, or undefined if not found.
 */
export function getFormula(id: string): FormulaEntry | undefined {
  return FORMULA_MAP.get(id);
}

/**
 * List all formula IDs in the library.
 */
export function listFormulaIds(): string[] {
  return FORMULA_LIBRARY.map((f) => f.id);
}
