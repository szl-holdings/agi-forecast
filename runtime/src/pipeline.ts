// SPDX-License-Identifier: Apache-2.0
// FG-S1→S4 production pipeline for agi-forecast.

import { evaluateSafetyGates } from "./derived.js";
import { base64url, canonicalJson, dsseSign, sha256Hex, type DSSESignature } from "./dsse.js";
import { putnamToFG04, type PutnamSnapshot } from "./putnam_to_fg_wiring.js";

export const FG_RECEIPT_PAYLOAD_TYPE: "application/vnd.szl.fg-receipt.v1+json" =
  "application/vnd.szl.fg-receipt.v1+json";

export interface FGPipelineInput {
  tenantId: string;
  questionId?: string;
  fg06: { audited: number; total: number };
  fg09: { deceptive: number; total: number };
  fg07: { goalSimilarity: number };
  putnam?: PutnamSnapshot;
  chainPrev?: string;
  now?: string;
  nonce?: string;
}

export interface S1Receipt {
  receiptClass: "fg.intake.v1";
  stageId: "S1";
  intakeTimestamp: string;
  tenantId: string;
  questionId?: string;
  validatedInputs: {
    fg06: { audited: number; total: number };
    fg09: { deceptive: number; total: number };
    fg07: { goalSimilarity: number };
    putnam?: { score01: number; receiptChainHead: string; fg04Proxy: number };
  };
  validationErrors: string[];
  nonce: string;
  sha256: string;
}

export interface S2Receipt {
  receiptClass: "fg.evaluate.v1";
  stageId: "S2";
  s1ReceiptSha256: string;
  scores: { fg06: number; fg09: number; fg07: number; fg04Proxy?: number };
  gates: {
    s1: ReturnType<typeof evaluateSafetyGates>["s1"];
    s2: ReturnType<typeof evaluateSafetyGates>["s2"];
    s3: ReturnType<typeof evaluateSafetyGates>["s3"];
  };
  nonce: string;
  sha256: string;
}

export interface S3Receipt {
  receiptClass: "fg.judge.v1";
  stageId: "S3";
  s2ReceiptSha256: string;
  compositeVerdict: "PASS" | "FAIL";
  gate: ReturnType<typeof evaluateSafetyGates>["s4"];
  nonce: string;
  sha256: string;
}

export interface S4Receipt {
  receiptClass: "fg.receipt.v1";
  stageId: "S4";
  s3ReceiptSha256: string;
  issuedAt: string;
  payloadType: "application/vnd.szl.fg-receipt.v1+json";
  payload: string;
  signatures: DSSESignature[];
  chainPrev: string;
  chainHead: string;
  compositeVerdict: "PASS" | "FAIL";
  score01?: number;
  putnamReceiptLink?: string;
  nonce: string;
  sha256: string;
}

export interface FGPipelineResult {
  s1: S1Receipt;
  s2: S2Receipt;
  s3: S3Receipt;
  s4: S4Receipt;
}

function ratio(numerator: number, denominator: number, label: string, errors: string[]): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0 || numerator < 0 || numerator > denominator) {
    errors.push(`${label}: expected 0 <= numerator <= denominator and denominator > 0`);
    return 0;
  }
  return numerator / denominator;
}

function stamp(base: string, stage: string): string {
  return sha256Hex(`${base}:${stage}`).slice(0, 16);
}

function attachHash<T extends object>(value: Omit<T, "sha256">): T {
  return { ...value, sha256: sha256Hex(value) } as T;
}

export function runFGPipeline(input: FGPipelineInput): FGPipelineResult {
  if (!input.tenantId) throw new Error("runFGPipeline: tenantId is required");

  const now = input.now ?? new Date().toISOString();
  const nonce = input.nonce ?? stamp(`${input.tenantId}:${input.questionId ?? ""}:${now}`, "nonce");
  const errors: string[] = [];
  const fg06Score = ratio(input.fg06.audited, input.fg06.total, "fg06", errors);
  const fg09Score = ratio(input.fg09.deceptive, input.fg09.total, "fg09", errors);

  if (!Number.isFinite(input.fg07.goalSimilarity) || input.fg07.goalSimilarity < 0 || input.fg07.goalSimilarity > 1) {
    errors.push("fg07: goalSimilarity must be in [0,1]");
  }

  const putnam = input.putnam ? putnamToFG04(input.putnam) : undefined;
  const s1 = attachHash<S1Receipt>({
    receiptClass: "fg.intake.v1",
    stageId: "S1",
    intakeTimestamp: now,
    tenantId: input.tenantId,
    questionId: input.questionId,
    validatedInputs: {
      fg06: input.fg06,
      fg09: input.fg09,
      fg07: input.fg07,
      putnam: putnam ? {
        score01: putnam.score01,
        receiptChainHead: putnam.receiptChainHead,
        fg04Proxy: putnam.fg04Proxy,
      } : undefined,
    },
    validationErrors: errors,
    nonce,
  });

  const gates = evaluateSafetyGates({
    fg06: fg06Score,
    fg09: fg09Score,
    fg07: input.fg07.goalSimilarity,
  });

  const s2 = attachHash<S2Receipt>({
    receiptClass: "fg.evaluate.v1",
    stageId: "S2",
    s1ReceiptSha256: s1.sha256,
    scores: {
      fg06: fg06Score,
      fg09: fg09Score,
      fg07: input.fg07.goalSimilarity,
      fg04Proxy: putnam?.fg04Proxy,
    },
    gates: { s1: gates.s1, s2: gates.s2, s3: gates.s3 },
    nonce: stamp(nonce, "S2"),
  });

  const compositeVerdict: "PASS" | "FAIL" = errors.length === 0 && gates.s4.pass ? "PASS" : "FAIL";
  const s3 = attachHash<S3Receipt>({
    receiptClass: "fg.judge.v1",
    stageId: "S3",
    s2ReceiptSha256: s2.sha256,
    compositeVerdict,
    gate: gates.s4,
    nonce: stamp(nonce, "S3"),
  });

  const payloadObject = { s1, s2, s3 };
  const payload = base64url(canonicalJson(payloadObject));
  const signature = dsseSign(FG_RECEIPT_PAYLOAD_TYPE, payload);
  const chainPrev = input.chainPrev ?? "GENESIS";
  const unsignedS4 = {
    receiptClass: "fg.receipt.v1" as const,
    stageId: "S4" as const,
    s3ReceiptSha256: s3.sha256,
    issuedAt: now,
    payloadType: FG_RECEIPT_PAYLOAD_TYPE,
    payload,
    signatures: [signature],
    chainPrev,
    chainHead: sha256Hex({ chainPrev, payload, signature, s3: s3.sha256 }),
    compositeVerdict,
    score01: putnam?.score01,
    putnamReceiptLink: putnam?.receiptChainHead,
    nonce: stamp(nonce, "S4"),
  };
  const s4 = attachHash<S4Receipt>(unsignedS4);

  return { s1, s2, s3, s4 };
}