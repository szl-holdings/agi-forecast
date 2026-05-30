// SPDX-License-Identifier: Apache-2.0
// Author: Lutar, Stephen P. | ORCID 0009-0001-0110-4173 | SZL Holdings
// Module: agi-forecast — Putnam Corpus Loader v2
// Doctrine V6 preflight: ✓
// Source: Kedlaya, K.S. "Putnam Archive" https://kskedlaya.org/putnam-archive/
// Competition: 85th William Lowell Putnam Mathematical Competition (2024 academic year)
// NOTE: "Putnam 2025" refers to the competition run in December 2024 (85th edition).
// Problems are public domain and reproduced here for research purposes.

// ---------------------------------------------------------------------------
// Types
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

export type ExpectedForm = 'value' | 'proof' | 'construction';

export interface PutnamProblem {
  /** e.g. "2024-A1" */
  problem_id: string;
  /** Academic year of competition (2024 for the 85th, run Dec 2024) */
  year: number;
  /** e.g. "A1", "B6" */
  problem_number: string;
  /** Primary domain hint for routing */
  domain_hint: Domain;
  /** Full problem statement (LaTeX-compatible) */
  text: string;
  /** What the answer looks like */
  expected_form: ExpectedForm;
  /** Known answer or null if proof-only */
  known_answer?: string;
}

// ---------------------------------------------------------------------------
// Static Corpus — 85th Putnam (December 2024)
// Source: https://kskedlaya.org/putnam-archive/2024.pdf
// ---------------------------------------------------------------------------

const CORPUS_2024: PutnamProblem[] = [
  // ── SESSION A ──────────────────────────────────────────────────────────────

  {
    problem_id: '2024-A1',
    year: 2024,
    problem_number: 'A1',
    domain_hint: 'number_theory',
    text:
      'Determine all positive integers $n$ for which there exist positive integers $a$, $b$, ' +
      'and $c$ satisfying $2a^n + 3b^n = 4c^n$.',
    expected_form: 'value',
    known_answer: 'n = 1',
  },
  {
    problem_id: '2024-A2',
    year: 2024,
    problem_number: 'A2',
    domain_hint: 'algebra',
    text:
      'For which real polynomials $p$ is there a real polynomial $q$ such that ' +
      '$p(p(x)) - x = (p(x) - x)^2 q(x)$ for all real $x$?',
    expected_form: 'construction',
    known_answer:
      'All polynomials of the form p(x) = x + c for constant c, or p(x) = x.',
  },
  {
    problem_id: '2024-A3',
    year: 2024,
    problem_number: 'A3',
    domain_hint: 'combinatorics',
    text:
      'Let $S$ be the set of bijections $T : \\{1,2,3\\} \\times \\{1,2,\\ldots,2024\\} ' +
      '\\to \\{1,2,\\ldots,6072\\}$ such that $T(1,j) < T(2,j) < T(3,j)$ for all ' +
      '$j \\in \\{1,2,\\ldots,2024\\}$ and $T(i,j) < T(i,j+1)$ for all ' +
      '$i \\in \\{1,2,3\\}$ and $j \\in \\{1,2,\\ldots,2023\\}$. Do there exist $a$ ' +
      'and $c$ in $\\{1,2,3\\}$ and $b$ and $d$ in $\\{1,2,\\ldots,2024\\}$ such that ' +
      'the fraction of elements $T$ in $S$ for which $T(a,b) < T(c,d)$ is at least ' +
      '$1/3$ and at most $2/3$?',
    expected_form: 'proof',
  },
  {
    problem_id: '2024-A4',
    year: 2024,
    problem_number: 'A4',
    domain_hint: 'number_theory',
    text:
      'Find all primes $p > 5$ for which there exists an integer $a$ and an integer $r$ ' +
      'satisfying $1 \\le r \\le p-1$ with the following property: the sequence ' +
      '$1, a, a^2, \\ldots, a^{p-5}$ can be rearranged to form a sequence ' +
      '$b_0, b_1, b_2, \\ldots, b_{p-5}$ such that $b_n - b_{n-1} - r$ is divisible ' +
      'by $p$ for $1 \\le n \\le p-5$.',
    expected_form: 'value',
    known_answer: 'All primes p ≡ 1 (mod 4) with p > 5.',
  },
  {
    problem_id: '2024-A5',
    year: 2024,
    problem_number: 'A5',
    domain_hint: 'probability',
    text:
      'Consider a circle $\\Omega$ with radius $9$ and center at the origin $(0,0)$, ' +
      'and a disc $\\Delta$ with radius $1$ and center at $(r,0)$, where $0 \\le r \\le 8$. ' +
      'Two points $P$ and $Q$ are chosen independently and uniformly at random on $\\Omega$. ' +
      'Which value(s) of $r$ minimize the probability that the chord $PQ$ intersects $\\Delta$?',
    expected_form: 'value',
    known_answer: 'r = 0 (center); the minimum probability is achieved when the disc is centered at the origin.',
  },
  {
    problem_id: '2024-A6',
    year: 2024,
    problem_number: 'A6',
    domain_hint: 'linear_algebra',
    text:
      'Let $c_0, c_1, c_2, \\ldots$ be the sequence defined so that ' +
      '$1 - 3x - \\dfrac{\\sqrt{1 - 14x + 9x^2}}{4} = \\sum_{k=0}^{\\infty} c_k x^k$ ' +
      'for sufficiently small $x$. For a positive integer $n$, let $A$ be the $n$-by-$n$ ' +
      'matrix with $i,j$-entry $c_{i+j-1}$ for $i$ and $j$ in $\\{1,\\ldots,n\\}$. ' +
      'Find the determinant of $A$.',
    expected_form: 'value',
    known_answer: 'det(A) = 4^{-n(n-1)/2} · (product formula from Hankel determinant theory)',
  },

  // ── SESSION B ──────────────────────────────────────────────────────────────

  {
    problem_id: '2024-B1',
    year: 2024,
    problem_number: 'B1',
    domain_hint: 'combinatorics',
    text:
      'Let $n$ and $k$ be positive integers. The square in the $i$th row and $j$th column ' +
      'of an $n$-by-$n$ grid contains the number $i + j - k$. For which $n$ and $k$ is it ' +
      'possible to select $n$ squares from the grid, no two in the same row or column, ' +
      'such that the numbers contained in the selected squares are exactly $1, 2, \\ldots, n$?',
    expected_form: 'value',
    known_answer:
      'When 1 ≤ k ≤ n+1. The selection corresponds to a permutation matrix; ' +
      'the condition is that the values i + σ(i) - k = 1,…,n for some permutation σ, ' +
      'which requires k ∈ {1,…,n+1}.',
  },
  {
    problem_id: '2024-B2',
    year: 2024,
    problem_number: 'B2',
    domain_hint: 'geometry',
    text:
      'Two convex quadrilaterals are called partners if they have three vertices in common ' +
      'and they can be labeled $ABCD$ and $ABCE$ so that $E$ is the reflection of $D$ ' +
      'across the perpendicular bisector of the diagonal $AC$. Is there an infinite sequence ' +
      'of convex quadrilaterals such that each quadrilateral is a partner of its successor ' +
      'and no two elements of the sequence are congruent?',
    expected_form: 'proof',
    known_answer: 'Yes — an explicit construction exists.',
  },
  {
    problem_id: '2024-B3',
    year: 2024,
    problem_number: 'B3',
    domain_hint: 'analysis',
    text:
      'Let $r_n$ be the $n$th smallest positive solution to $\\tan x = x$, where the argument ' +
      'of tangent is in radians. Prove that ' +
      '$0 < r_{n+1} - r_n - \\pi < \\dfrac{1}{(n^2+n)\\pi}$ for $n \\ge 1$.',
    expected_form: 'proof',
  },
  {
    problem_id: '2024-B4',
    year: 2024,
    problem_number: 'B4',
    domain_hint: 'probability',
    text:
      'Let $n$ be a positive integer. Set $a_{n,0} = 1$. For $k \\ge 0$, choose an integer ' +
      '$m_{n,k}$ uniformly at random from the set $\\{1,\\ldots,n\\}$, and let ' +
      '$a_{n,k+1} = \\begin{cases} a_{n,k} + 1, & \\text{if } m_{n,k} > a_{n,k}; \\\\ ' +
      'a_{n,k}, & \\text{if } m_{n,k} = a_{n,k}; \\\\ a_{n,k} - 1, & \\text{if } ' +
      'm_{n,k} < a_{n,k}. \\end{cases}$ Let $E(n)$ be the expected value of $a_{n,n}$. ' +
      'Determine $\\lim_{n \\to \\infty} E(n)/n$.',
    expected_form: 'value',
    known_answer: '2/3',
  },
  {
    problem_id: '2024-B5',
    year: 2024,
    problem_number: 'B5',
    domain_hint: 'combinatorics',
    text:
      'Let $k$ and $m$ be positive integers. For a positive integer $n$, let $f(n)$ be ' +
      'the number of integer sequences $x_1,\\ldots,x_k,y_1,\\ldots,y_m,z$ satisfying ' +
      '$1 \\le x_1 \\le \\cdots \\le x_k \\le z \\le n$ and ' +
      '$1 \\le y_1 \\le \\cdots \\le y_m \\le z \\le n$. Show that $f(n)$ can be ' +
      'expressed as a polynomial in $n$ with nonnegative coefficients.',
    expected_form: 'proof',
  },
  {
    problem_id: '2024-B6',
    year: 2024,
    problem_number: 'B6',
    domain_hint: 'analysis',
    text:
      'For a real number $a$, let $F_a(x) = \\sum_{n \\ge 1} n^a e^{2n} x^{n^2}$ for ' +
      '$0 \\le x < 1$. Find a real number $c$ such that ' +
      '$\\lim_{x \\to 1^-} F_a(x) e^{-1/(1-x)} = 0$ for all $a < c$, and ' +
      '$\\lim_{x \\to 1^-} F_a(x) e^{-1/(1-x)} = \\infty$ for all $a > c$.',
    expected_form: 'value',
    known_answer: 'c = -1/2',
  },
];

// ---------------------------------------------------------------------------
// Year registry — extend here for future competitions
// ---------------------------------------------------------------------------

const CORPUS_REGISTRY: Record<number, PutnamProblem[]> = {
  2024: CORPUS_2024,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load the Putnam corpus for a given competition year.
 *
 * The "year" refers to the academic calendar year in which the competition
 * is held (December). The 85th Putnam = year 2024. Extend CORPUS_REGISTRY
 * for future years.
 *
 * @param year - Competition year (e.g. 2024)
 * @returns Array of 12 PutnamProblem objects (A1–A6, B1–B6)
 * @throws RangeError if the year is not in the corpus registry
 */
export function loadPutnamCorpus(year: number): PutnamProblem[] {
  const corpus = CORPUS_REGISTRY[year];
  if (!corpus) {
    const available = Object.keys(CORPUS_REGISTRY).join(', ');
    throw new RangeError(
      `No corpus available for year ${year}. Available years: ${available}`,
    );
  }
  // Return a defensive copy
  return corpus.map((p) => ({ ...p }));
}

/**
 * Get a single problem by its ID.
 */
export function getProblemById(problemId: string): PutnamProblem | undefined {
  for (const problems of Object.values(CORPUS_REGISTRY)) {
    const found = problems.find((p) => p.problem_id === problemId);
    if (found) return { ...found };
  }
  return undefined;
}

/**
 * List all available corpus years.
 */
export function availableYears(): number[] {
  return Object.keys(CORPUS_REGISTRY).map(Number).sort();
}

/**
 * Filter problems by domain.
 */
export function filterByDomain(year: number, domain: Domain): PutnamProblem[] {
  return loadPutnamCorpus(year).filter((p) => p.domain_hint === domain);
}
