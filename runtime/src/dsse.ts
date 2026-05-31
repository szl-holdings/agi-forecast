// SPDX-License-Identifier: Apache-2.0
// DSSE envelope helpers for FG receipts.
// Implements DSSE v1 pre-authentication encoding (PAE).

import { createHash, createHmac } from "node:crypto";

const PAE_PREFIX = "DSSEv1";

export interface DSSESignature {
  keyid: string;
  sig: string;
}

export interface DSSEEnvelope {
  payloadType: string;
  payload: string;
  signatures: DSSESignature[];
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

function canonicalValue(value: unknown): unknown {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("canonicalJson: non-finite number");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const child = (value as Record<string, unknown>)[key];
      if (typeof child !== "undefined") out[key] = canonicalValue(child);
    }
    return out;
  }
  throw new Error(`canonicalJson: unsupported value ${typeof value}`);
}

export function base64url(bytes: string): string {
  return Buffer.from(bytes, "utf8").toString("base64url");
}

export function sha256Hex(value: unknown): string {
  const bytes = typeof value === "string" ? value : canonicalJson(value);
  return createHash("sha256").update(bytes, "utf8").digest("hex");
}

export function dssePAE(payloadType: string, payload: string): string {
  const encode = (s: string) => `${Buffer.byteLength(s, "utf8")} ${s}`;
  return `${PAE_PREFIX} ${encode(payloadType)} ${encode(payload)}`;
}

// ---------------------------------------------------------------------------
// KEY DISCLOSURE (Doctrine V7 — Honest Infrastructure)
// ---------------------------------------------------------------------------
//
// The default keyid ("szl:dev") and secret ("szl-dev-key") below are
// DEVELOPMENT-ONLY constants. They are NOT secret; they are hardcoded here
// intentionally for local/CI reproducibility where receipts don't need
// production-grade signing.
//
// PRODUCTION KEY PATH (to be implemented, ETA: with Zarf v0.77 landing):
//   Sigstore Fulcio keyless signing via GitHub OIDC.
//   Pattern: https://docs.sigstore.dev/cosign/signing/overview/
//
//   Workflow:
//   1. CI requests an OIDC token from GitHub Actions
//   2. Sigstore Fulcio mints a short-lived signing cert from the OIDC token
//   3. cosign signs the DSSE payload using the ephemeral cert
//   4. The cert + signature are attached to the receipt envelope
//   5. Verifiers use `cosign verify` with the Sigstore root CA
//
//   When production signing is active:
//     keyid = "sigstore:fulcio:<github-oidc-subject>"  (e.g. "sigstore:fulcio:repo:szl-holdings/agi-forecast:ref:refs/heads/main")
//     sig   = cosign-generated base64url ECDSA-P256 signature
//
//   Reference implementation: Zarf v0.77 artifact signing
//     https://github.com/zarf-dev/zarf/blob/v0.36.1/src/pkg/zarf/zarf.go#L77
//
// Until production signing is wired:
//   - All receipts are for internal reproducibility only
//   - The "szl-dev-key" HMAC-SHA256 provides tamper-detection in dev/CI
//   - Do NOT rely on "szl-dev-key" receipts for external trust assertions
// ---------------------------------------------------------------------------

export function dsseSign(
  payloadType: string,
  payload: string,
  keyid = "szl:dev",
  // DEV-ONLY: "szl-dev-key" is a non-secret hardcoded constant for local/CI use.
  // See key disclosure comment above for production keypath.
  secret = "szl-dev-key",
): DSSESignature {
  const sig = createHmac("sha256", secret).update(dssePAE(payloadType, payload), "utf8").digest("hex");
  return { keyid, sig };
}

export function dsseEnvelope(
  payloadType: string,
  payloadObject: unknown,
  keyid = "szl:dev",
  // DEV-ONLY: "szl-dev-key" is a non-secret hardcoded constant for local/CI use.
  // See key disclosure comment above for production keypath.
  secret = "szl-dev-key",
): DSSEEnvelope {
  const payload = base64url(canonicalJson(payloadObject));
  return {
    payloadType,
    payload,
    signatures: [dsseSign(payloadType, payload, keyid, secret)],
  };
}
