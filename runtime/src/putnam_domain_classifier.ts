// SPDX-License-Identifier: Apache-2.0
// Author: Lutar, Stephen P. | ORCID 0009-0001-0110-4173 | SZL Holdings
// Module: agi-forecast — Domain Classifier (inlined from a11oy/packages/putnam-router)
// Doctrine V6 preflight: ✓
//
// INLINING NOTE (phd/putnam-v2-self-contained):
// PR #43 imported these utilities from '../../../../../../a11oy/packages/putnam-router/...'
// which requires a sibling a11oy checkout — not self-contained. This file inlines the
// classifier logic so agi-forecast has zero external workspace dependencies.
// When a11oy/putnam-router is published as an npm package, replace this with:
//   import { classifyDomain } from '@a11oy/putnam-router';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type Domain =
  | 'algebra'
  | 'analysis'
  | 'combinatorics'
  | 'geometry'
  | 'number_theory'
  | 'probability'
  | 'linear_algebra'
  | 'calculus';

export const ALL_DOMAINS: Domain[] = [
  'algebra',
  'analysis',
  'combinatorics',
  'geometry',
  'number_theory',
  'probability',
  'linear_algebra',
  'calculus',
];

// ---------------------------------------------------------------------------
// Domain → formula mapping
// formula_ids used here match keys in formula_scaffold.ts FORMULA_LIBRARY
// ---------------------------------------------------------------------------

export const DOMAIN_FORMULA_MAP: Record<Domain, string[]> = {
  algebra: ['A1', 'A2', 'A3', 'A4', 'A7'],
  analysis: ['A5', 'A6', 'TH1', 'TH2'],
  combinatorics: ['A3', 'A4', 'TH3'],
  geometry: ['A2', 'TH5', 'TH_L1'],
  number_theory: ['A5', 'A6', 'A9', 'TH6'],
  probability: ['TH6', 'A7', 'TH3'],
  linear_algebra: ['TH4', 'TH_L2', 'TH_L3', 'TH_L4'],
  calculus: ['TH1', 'TH2', 'TH6', 'A6'],
};

// ---------------------------------------------------------------------------
// Keyword scoring — ordered by descending specificity
// ---------------------------------------------------------------------------

const DOMAIN_KEYWORDS: Record<Domain, string[]> = {
  linear_algebra: [
    'determinant', 'matrix', 'eigenvalue', 'eigenvector', 'linear map',
    'rank', 'trace', 'orthogonal', 'symmetric matrix', 'vector space',
    'span', 'basis', 'linear transformation',
  ],
  probability: [
    'uniformly at random', 'probability', 'expected value', 'expectation',
    'random variable', 'distribution', 'independent', 'sample space',
    'coin flip', 'dice', 'stochastic',
  ],
  geometry: [
    'triangle', 'circle', 'quadrilateral', 'convex', 'perpendicular',
    'angle', 'polygon', 'tangent', 'chord', 'circumscribed', 'inscribed',
    'equilateral', 'area', 'perimeter', 'coordinate geometry',
  ],
  number_theory: [
    'prime', 'divisible', 'divisor', 'congruent', 'modulo', 'gcd', 'lcm',
    'diophantine', 'integer', 'coprime', 'residue', 'fermat', 'euler',
    'multiplicative', 'arithmetic function',
  ],
  combinatorics: [
    'permutation', 'combination', 'bijection', 'counting', 'graph',
    'coloring', 'path', 'tournament', 'sequence of integers', 'arrangement',
    'choose', 'binomial coefficient', 'partition', 'subset',
  ],
  analysis: [
    'continuous', 'differentiable', 'supremum', 'infimum', 'converges',
    'series', 'sequence', 'limit', 'uniform convergence', 'real-valued function',
    'open set', 'closed set', 'metric space', 'compact',
  ],
  calculus: [
    'integral', 'derivative', 'antiderivative', 'differential equation',
    'gradient', 'partial derivative', 'double integral', 'triple integral',
    'definite integral', 'indefinite integral',
  ],
  algebra: [
    'polynomial', 'root', 'factor', 'ring', 'group', 'field', 'ideal',
    'homomorphism', 'isomorphism', 'subgroup', 'coset', 'symmetric group',
    'monic', 'degree', 'coefficient',
  ],
};

// ---------------------------------------------------------------------------
// Classifier result type
// ---------------------------------------------------------------------------

export interface ClassificationResult {
  domain: Domain;
  confidence: number; // [0, 1]
  formula_ids: string[];
  scores: Record<Domain, number>;
}

// ---------------------------------------------------------------------------
// classifyDomain — keyword-frequency scorer
// ---------------------------------------------------------------------------

/**
 * Classify the domain of a Putnam problem from its text.
 * Returns the highest-scoring domain plus suggested formula IDs.
 *
 * Implementation: keyword frequency scoring with case-insensitive matching.
 * The confidence is normalised score of the top domain over sum of all scores.
 * This is intentionally simple — a11oy/putnam-router will replace this with
 * an embedding-based classifier once the package is published.
 */
export function classifyDomain(text: string): ClassificationResult {
  const lower = text.toLowerCase();
  const scores = {} as Record<Domain, number>;

  for (const domain of ALL_DOMAINS) {
    let score = 0;
    for (const kw of DOMAIN_KEYWORDS[domain]) {
      // Count all occurrences, not just first
      let idx = lower.indexOf(kw);
      while (idx !== -1) {
        score++;
        idx = lower.indexOf(kw, idx + 1);
      }
    }
    scores[domain] = score;
  }

  // Pick top domain
  let topDomainResult: Domain = 'algebra';
  let topScore = -1;
  for (const [domain, score] of Object.entries(scores) as [Domain, number][]) {
    if (score > topScore) {
      topScore = score;
      topDomainResult = domain;
    }
  }

  // Compute normalised confidence
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? topScore / totalScore : 0.5;

  return {
    domain: topDomainResult,
    confidence: Math.min(1, Math.max(0, confidence)),
    formula_ids: DOMAIN_FORMULA_MAP[topDomainResult],
    scores,
  };
}

/**
 * Return just the top domain label for simple routing.
 */
export function topDomain(text: string): Domain {
  return classifyDomain(text).domain;
}
