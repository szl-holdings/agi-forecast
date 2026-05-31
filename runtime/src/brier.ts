// SPDX-License-Identifier: Apache-2.0
// Author: Lutar, Stephen P. | ORCID 0009-0001-0110-4173 | SZL Holdings
// Module: agi-forecast — Brier ledger (in-memory ring buffer)
// Doctrine V7 preflight: ✓

// ---------------------------------------------------------------------------
// Brier score: B = (p - o)²  where p = predicted probability, o ∈ {0,1} outcome
// ---------------------------------------------------------------------------

export interface BrierEntry {
  gaugeId:   string;
  predicted: number; // probability
  outcome:   0 | 1;  // realised binary outcome
  score:     number; // Brier score = (predicted - outcome)²
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Ring buffer — fixed capacity, overwrites oldest when full
// ---------------------------------------------------------------------------

export class BrierLedger {
  private readonly buffer: BrierEntry[];
  private head    = 0;
  private count   = 0;
  readonly capacity: number;

  constructor(capacity = 1000) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  /** Record a prediction + realised outcome. */
  record(gaugeId: string, predicted: number, outcome: 0 | 1): BrierEntry {
    if (predicted < 0 || predicted > 1) {
      throw new RangeError(`predicted probability must be in [0,1], got ${predicted}`);
    }
    const score = Math.pow(predicted - outcome, 2);
    const entry: BrierEntry = {
      gaugeId,
      predicted,
      outcome,
      score,
      timestamp: new Date().toISOString(),
    };
    this.buffer[this.head] = entry;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
    return entry;
  }

  /** All entries (oldest → newest). */
  entries(): BrierEntry[] {
    if (this.count < this.capacity) return this.buffer.slice(0, this.count) as BrierEntry[];
    // Ring unwrap
    return [
      ...this.buffer.slice(this.head),
      ...this.buffer.slice(0, this.head),
    ] as BrierEntry[];
  }

  /** Mean Brier score across all entries. */
  mean(): number {
    const all = this.entries();
    if (all.length === 0) return 0;
    return all.reduce((s, e) => s + e.score, 0) / all.length;
  }

  /** Mean Brier score filtered to a specific gauge. */
  meanForGauge(gaugeId: string): number | undefined {
    const filtered = this.entries().filter((e) => e.gaugeId === gaugeId);
    if (filtered.length === 0) return undefined;
    return filtered.reduce((s, e) => s + e.score, 0) / filtered.length;
  }

  /** Summary per gauge. */
  summary(): Record<string, { count: number; meanScore: number }> {
    const out: Record<string, { count: number; meanScore: number }> = {};
    for (const e of this.entries()) {
      if (!out[e.gaugeId]) out[e.gaugeId] = { count: 0, meanScore: 0 };
      out[e.gaugeId]!.count++;
      out[e.gaugeId]!.meanScore += e.score;
    }
    for (const [k, v] of Object.entries(out)) {
      out[k]!.meanScore = v.meanScore / v.count;
    }
    return out;
  }

  get size(): number { return this.count; }
}

/** Shared default ledger instance. */
export const defaultLedger = new BrierLedger(1000);
