// SPDX-License-Identifier: Apache-2.0
// Author: Lutar, Stephen P. | ORCID 0009-0001-0110-4173 | SZL Holdings
// Module: agi-forecast — Putnam Harness v2 tests
// Doctrine V6 preflight: ✓
// Runner: vitest (compatible with Cursor's existing test harness from PR #42)
//
// Target: 15-25 passing tests
// Pattern: follows Cursor's 38-test pattern from PR #42 (dsse/pipeline/receipt)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadPutnamCorpus,
  getProblemById,
  availableYears,
  filterByDomain,
  type PutnamProblem,
} from './putnam_corpus_loader.js';
import {
  classifyDomain,
  topDomain,
  DOMAIN_FORMULA_MAP,
  ALL_DOMAINS,
} from './putnam_domain_classifier.js';
import {
  buildScaffold,
  getFormula,
  listFormulaIds,
} from './putnam_formula_scaffold.js';
import {
  runPutnamHarnessV2,
  verifyReceiptChain,
  verifyReceiptHashes,
  extractFG04Input,
  MOCK_JUDGE,
  type GaugeV2,
  type JudgeFn,
  type JudgeResult,
} from './putnam_harness_v2.js';

// ---------------------------------------------------------------------------
// ── SECTION 1: Corpus Loader (P1) ─────────────────────────────────────────
// ---------------------------------------------------------------------------

describe('putnam_corpus_loader', () => {
  it('loadPutnamCorpus(2024) returns exactly 12 problems', () => {
    const corpus = loadPutnamCorpus(2024);
    expect(corpus).toHaveLength(12);
  });

  it('corpus contains 6 A-session and 6 B-session problems', () => {
    const corpus = loadPutnamCorpus(2024);
    const aProblems = corpus.filter((p) => p.problem_number.startsWith('A'));
    const bProblems = corpus.filter((p) => p.problem_number.startsWith('B'));
    expect(aProblems).toHaveLength(6);
    expect(bProblems).toHaveLength(6);
  });

  it('all problems have non-empty text', () => {
    const corpus = loadPutnamCorpus(2024);
    for (const p of corpus) {
      expect(p.text.trim().length).toBeGreaterThan(20);
    }
  });

  it('all problems have valid domain_hint', () => {
    const corpus = loadPutnamCorpus(2024);
    const validDomains = new Set([
      'algebra', 'analysis', 'combinatorics', 'geometry',
      'number_theory', 'probability', 'linear_algebra', 'calculus',
    ]);
    for (const p of corpus) {
      expect(validDomains.has(p.domain_hint)).toBe(true);
    }
  });

  it('all problems have valid expected_form', () => {
    const corpus = loadPutnamCorpus(2024);
    const validForms = new Set(['value', 'proof', 'construction']);
    for (const p of corpus) {
      expect(validForms.has(p.expected_form)).toBe(true);
    }
  });

  it('getProblemById returns correct problem', () => {
    const p = getProblemById('2024-A1');
    expect(p).toBeDefined();
    expect(p!.problem_number).toBe('A1');
    expect(p!.year).toBe(2024);
  });

  it('getProblemById returns undefined for unknown ID', () => {
    expect(getProblemById('9999-Z99')).toBeUndefined();
  });

  it('availableYears includes 2024', () => {
    expect(availableYears()).toContain(2024);
  });

  it('loadPutnamCorpus throws RangeError for unknown year', () => {
    expect(() => loadPutnamCorpus(1800)).toThrow(RangeError);
  });

  it('filterByDomain returns only problems with that domain_hint', () => {
    const corpus = loadPutnamCorpus(2024);
    const probDomains = [...new Set(corpus.map((p) => p.domain_hint))];
    for (const domain of probDomains) {
      const filtered = filterByDomain(2024, domain as never);
      for (const p of filtered) {
        expect(p.domain_hint).toBe(domain);
      }
    }
  });

  it('loadPutnamCorpus returns a defensive copy (mutations do not propagate)', () => {
    const c1 = loadPutnamCorpus(2024);
    const c2 = loadPutnamCorpus(2024);
    c1[0]!.text = 'MUTATED';
    expect(c2[0]!.text).not.toBe('MUTATED');
  });
});

// ---------------------------------------------------------------------------
// ── SECTION 2: Domain Classifier (P2) ─────────────────────────────────────
// ---------------------------------------------------------------------------

describe('domain_classifier', () => {
  // Known-good fixture: 5 problems with expected domain classification
  const FIXTURES: Array<{ problem_id: string; expected_domain: string }> = [
    { problem_id: '2024-A1', expected_domain: 'number_theory' },   // "prime", "divisible", "integers"
    { problem_id: '2024-A2', expected_domain: 'algebra' },         // "polynomial"
    { problem_id: '2024-A5', expected_domain: 'probability' },     // "uniformly at random", "probability"
    { problem_id: '2024-B2', expected_domain: 'geometry' },        // "quadrilateral", "convex", "perpendicular"
    { problem_id: '2024-A6', expected_domain: 'linear_algebra' },  // "determinant", "matrix"
  ];

  for (const { problem_id, expected_domain } of FIXTURES) {
    it(`classifies ${problem_id} as ${expected_domain}`, () => {
      const problem = getProblemById(problem_id)!;
      expect(problem).toBeDefined();
      const result = classifyDomain(problem.text);
      expect(result.domain).toBe(expected_domain);
    });
  }

  it('classifyDomain returns confidence in [0, 1]', () => {
    const corpus = loadPutnamCorpus(2024);
    for (const p of corpus) {
      const r = classifyDomain(p.text);
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('classifyDomain returns formula_ids array (non-empty)', () => {
    const corpus = loadPutnamCorpus(2024);
    for (const p of corpus) {
      const r = classifyDomain(p.text);
      expect(Array.isArray(r.formula_ids)).toBe(true);
      expect(r.formula_ids.length).toBeGreaterThan(0);
    }
  });

  it('all domains in DOMAIN_FORMULA_MAP have ≥ 1 formula_id', () => {
    for (const domain of ALL_DOMAINS) {
      expect(DOMAIN_FORMULA_MAP[domain].length).toBeGreaterThanOrEqual(1);
    }
  });

  it('topDomain returns a valid domain string', () => {
    const text = 'Find all primes p > 5 for which there exists a prime congruence.';
    const domain = topDomain(text);
    expect(ALL_DOMAINS).toContain(domain);
  });

  it('probability problem text scores high on probability domain', () => {
    const text = 'Two points P and Q are chosen independently and uniformly at random on a circle.';
    const r = classifyDomain(text);
    expect(r.domain).toBe('probability');
  });

  it('matrix/determinant text scores high on linear_algebra', () => {
    const text = 'Let A be an n-by-n matrix. Find the determinant of A.';
    const r = classifyDomain(text);
    expect(r.domain).toBe('linear_algebra');
  });
});

// ---------------------------------------------------------------------------
// ── SECTION 3: Formula Scaffold (P3) ──────────────────────────────────────
// ---------------------------------------------------------------------------

describe('formula_scaffold', () => {
  it('buildScaffold includes ≥1 formula_id in output prompt', () => {
    const result = buildScaffold('algebra', ['A1', 'TH7']);
    expect(result.formula_context.formula_ids.length).toBeGreaterThanOrEqual(1);
    expect(result.prompt).toContain('[A1]');
  });

  it('buildScaffold prompt contains domain name', () => {
    const result = buildScaffold('probability', ['TH6', 'A7']);
    expect(result.prompt.toLowerCase()).toContain('probability');
  });

  it('buildScaffold prompt contains citation URL', () => {
    const result = buildScaffold('linear_algebra', ['TH4', 'TH_L2']);
    expect(result.prompt).toContain('https://doi.org');
  });

  it('buildScaffold handles unknown formula_id gracefully (skips, no throw)', () => {
    expect(() =>
      buildScaffold('calculus', ['UNKNOWN-ID-9999', 'TH6']),
    ).not.toThrow();
    const result = buildScaffold('calculus', ['UNKNOWN-ID-9999', 'TH6']);
    // Only TH6 should be in context
    expect(result.formula_context.formulas).toHaveLength(1);
  });

  it('getFormula returns entry for known ID', () => {
    const f = getFormula('A1');
    expect(f).toBeDefined();
    expect(f!.name).toBe('Soundness Axiom');
  });

  it('getFormula returns undefined for unknown ID', () => {
    expect(getFormula('NONEXISTENT')).toBeUndefined();
  });

  it('listFormulaIds returns ≥14 entries', () => {
    // We have A1,A2,A3,A4,A5,A6,A7,A9,TH1,TH2,TH3,TH4,TH5,TH6,TH7,TH_L1,TH_L2,TH_L3,TH_L4
    expect(listFormulaIds().length).toBeGreaterThanOrEqual(14);
  });

  it('buildScaffold formula_context.worked_example is non-empty string', () => {
    const result = buildScaffold('number_theory', ['A5', 'A6']);
    expect(typeof result.formula_context.worked_example).toBe('string');
    expect(result.formula_context.worked_example.length).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// ── SECTION 4: Harness v2 end-to-end (P4) ─────────────────────────────────
// ---------------------------------------------------------------------------

describe('putnam_harness_v2', () => {
  const FIXED_RUN_AT = '2026-06-19T00:00:00.000Z';

  it('runs end-to-end on mocked judges and returns GaugeV2', async () => {
    const corpus = loadPutnamCorpus(2024);
    const gauge = await runPutnamHarnessV2(corpus, { runAt: FIXED_RUN_AT });
    expect(gauge.schema_version).toBe('2.0.0');
    expect(gauge.total_problems).toBe(12);
    expect(gauge.doctrine_v6_compliant).toBe(true);
  });

  it('gauge_v2.score01 = solved_count / total_problems (honest)', async () => {
    const corpus = loadPutnamCorpus(2024);
    const gauge = await runPutnamHarnessV2(corpus, { runAt: FIXED_RUN_AT });
    const expected = gauge.solved_count / gauge.total_problems;
    expect(gauge.score01).toBeCloseTo(expected, 10);
  });

  it('honest score reporting: if 3/12 solved then score01 = 0.25', async () => {
    // Judge that marks exactly 3 problems as SOLVED
    const solvable = new Set(['2024-A1', '2024-B1', '2024-B4']);
    const threeJudge: JudgeFn = async (p) => ({
      decision: solvable.has(p.problem_id) ? 'SOLVED' : 'UNSOLVED',
      confidence: 0.9,
      reasoning_tokens: 256,
      solution_sketch: 'mock',
    });

    const corpus = loadPutnamCorpus(2024);
    const gauge = await runPutnamHarnessV2(corpus, {
      judges: [threeJudge, threeJudge, threeJudge],
      runAt: FIXED_RUN_AT,
    });
    expect(gauge.solved_count).toBe(3);
    expect(gauge.score01).toBeCloseTo(3 / 12, 10);
    expect(gauge.score01).toBeCloseTo(0.25, 10);
  });

  it('score is NEVER inflated above actual solved count', async () => {
    const corpus = loadPutnamCorpus(2024);
    const gauge = await runPutnamHarnessV2(corpus, { runAt: FIXED_RUN_AT });
    const actualSolved = gauge.per_problem.filter(
      (p) => p.decision === 'SOLVED',
    ).length;
    expect(gauge.solved_count).toBe(actualSolved);
    expect(gauge.score01).toBeCloseTo(actualSolved / 12, 10);
  });

  it('receipt chain has exactly 12 receipts for 12 problems', async () => {
    const corpus = loadPutnamCorpus(2024);
    const gauge = await runPutnamHarnessV2(corpus, { runAt: FIXED_RUN_AT });
    expect(gauge.receipt_chain).toHaveLength(12);
  });

  it('receipt chain hash linkage: each receipt.prev_hash = previous receipt.hash', async () => {
    const corpus = loadPutnamCorpus(2024);
    const gauge = await runPutnamHarnessV2(corpus, { runAt: FIXED_RUN_AT });
    const chain = gauge.receipt_chain;

    // Genesis receipt has null prev_hash
    expect(chain[0]!.prev_hash).toBeNull();

    // Each subsequent receipt links to prior hash
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i]!.prev_hash).toBe(chain[i - 1]!.hash);
    }
  });

  it('verifyReceiptChain returns true for a valid chain', async () => {
    const corpus = loadPutnamCorpus(2024);
    const gauge = await runPutnamHarnessV2(corpus, { runAt: FIXED_RUN_AT });
    expect(verifyReceiptChain(gauge.receipt_chain)).toBe(true);
  });

  it('verifyReceiptChain returns false for a tampered chain', async () => {
    const corpus = loadPutnamCorpus(2024);
    const gauge = await runPutnamHarnessV2(corpus, { runAt: FIXED_RUN_AT });
    const tampered = gauge.receipt_chain.map((r, i) =>
      i === 5 ? { ...r, prev_hash: 'tampered-hash-0000' } : r,
    );
    expect(verifyReceiptChain(tampered)).toBe(false);
  });

  it('verifyReceiptHashes validates all receipt hashes', async () => {
    const corpus = loadPutnamCorpus(2024);
    const gauge = await runPutnamHarnessV2(corpus, { runAt: FIXED_RUN_AT });
    expect(verifyReceiptHashes(gauge.receipt_chain)).toBe(true);
  });

  it('fg04_advisory has correct gauge_id and value', async () => {
    const corpus = loadPutnamCorpus(2024);
    const gauge = await runPutnamHarnessV2(corpus, { runAt: FIXED_RUN_AT });
    expect(gauge.fg04_advisory.gauge_id).toBe('FG-04');
    expect(gauge.fg04_advisory.value).toBe(gauge.score01);
    expect(gauge.fg04_advisory.input.novelTasksTotal).toBe(12);
  });

  it('extractFG04Input returns correct shape', async () => {
    const corpus = loadPutnamCorpus(2024);
    const gauge = await runPutnamHarnessV2(corpus, { runAt: FIXED_RUN_AT });
    const input = extractFG04Input(gauge);
    expect(input.novelTasksSolved).toBe(gauge.solved_count);
    expect(input.novelTasksTotal).toBe(gauge.total_problems);
  });

  it('baseline_score01 is anchored at 0.0833 (Doctrine V6)', async () => {
    const corpus = loadPutnamCorpus(2024);
    const gauge = await runPutnamHarnessV2(corpus, { runAt: FIXED_RUN_AT });
    expect(gauge.baseline_score01).toBeCloseTo(0.0833, 3);
  });

  it('throws if zero judges provided', async () => {
    const corpus = loadPutnamCorpus(2024);
    await expect(
      runPutnamHarnessV2(corpus, { judges: [] }),
    ).rejects.toThrow();
  });

  it('per_problem entries match corpus order', async () => {
    const corpus = loadPutnamCorpus(2024);
    const gauge = await runPutnamHarnessV2(corpus, { runAt: FIXED_RUN_AT });
    for (let i = 0; i < corpus.length; i++) {
      expect(gauge.per_problem[i]!.problem_id).toBe(corpus[i]!.problem_id);
    }
  });

  it('each receipt has a DSSE envelope with szl payload type', async () => {
    const corpus = loadPutnamCorpus(2024).slice(0, 3); // fast: 3 problems
    const gauge = await runPutnamHarnessV2(corpus, { runAt: FIXED_RUN_AT });
    for (const receipt of gauge.receipt_chain) {
      expect(receipt.dsse.payload.payloadType).toBe(
        'application/vnd.szl.putnam-v2+json',
      );
      expect(receipt.dsse.signatures.length).toBeGreaterThan(0);
    }
  });

  it('MOCK_JUDGE returns a valid JudgeResult', async () => {
    const p = getProblemById('2024-A1')!;
    const result = await MOCK_JUDGE(p, 'mock prompt');
    expect(['SOLVED', 'UNSOLVED', 'PARTIAL']).toContain(result.decision);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
