// SPDX-License-Identifier: Apache-2.0
// Honest Putnam benchmark wiring into FG-04.

export interface PutnamSnapshot {
  score01: number;
  receiptChainHead: string;
  problemsAttempted?: number;
  problemsCorrect?: number;
}

export interface PutnamFG04Proxy {
  score01: number;
  fg04Proxy: number;
  receiptChainHead: string;
  advisoryOnly: true;
  rationale: string;
}

export function putnamToFG04(snapshot: PutnamSnapshot): PutnamFG04Proxy {
  if (!Number.isFinite(snapshot.score01) || snapshot.score01 < 0 || snapshot.score01 > 1) {
    throw new Error(`putnamToFG04: score01 must be in [0,1]; got ${snapshot.score01}`);
  }
  if (!snapshot.receiptChainHead) {
    throw new Error("putnamToFG04: receiptChainHead is required");
  }

  return {
    score01: snapshot.score01,
    fg04Proxy: snapshot.score01,
    receiptChainHead: snapshot.receiptChainHead,
    advisoryOnly: true,
    rationale:
      "Putnam score is wired to FG-04 as advisory evidence only; it does not inflate gate inputs or override safety thresholds.",
  };
}