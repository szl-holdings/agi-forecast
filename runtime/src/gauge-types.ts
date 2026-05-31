// SPDX-License-Identifier: Apache-2.0
// Author: Lutar, Stephen P. | ORCID 0009-0001-0110-4173 | SZL Holdings
// Module: agi-forecast  Thesis: FG (Forecast Gauges)
// Doctrine V7 preflight: ✓

import { z } from "zod";

// ---------------------------------------------------------------------------
// Base gauge interface
// ---------------------------------------------------------------------------

export interface GaugeResult {
  gaugeId:     string;
  value:       number; // normalised to [0, 1]
  brier_input: number; // probability for Brier scoring (= value for binary gauges)
  label:       string;
  timestamp:   string;
}

export interface Gauge<TInput> {
  id:          string;
  label:       string;
  schema:      z.ZodType<TInput>;
  evaluate:    (input: TInput) => GaugeResult;
}

// ---------------------------------------------------------------------------
// Safety gate result
// ---------------------------------------------------------------------------

export interface SafetyGateResult {
  gateId:  string;
  pass:    boolean;
  score:   number;
  reason:  string;
}
