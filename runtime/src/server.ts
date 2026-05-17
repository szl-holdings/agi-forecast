// SPDX-License-Identifier: Apache-2.0
// Author: Lutar, Stephen P. | ORCID 0009-0001-0110-4173 | SZL Holdings
// Module: agi-forecast — HTTP server
// Doctrine V6 preflight: ✓

import http from "node:http";
import { BASE_GAUGES } from "./gauges.js";
import { computeFGD1, computeFGD2, computeFGD3, evaluateSafetyGates } from "./derived.js";
import { defaultLedger } from "./brier.js";

function readBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let buf = "";
    req.on("data", (c: Buffer) => { buf += c.toString(); });
    req.on("end", () => { try { resolve(JSON.parse(buf)); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

function send(res: http.ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body, null, 2);
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(json) });
  res.end(json);
}

export function createForecastServer(): http.Server {
  return http.createServer(async (req, res) => {
    const url    = req.url ?? "/";
    const method = req.method?.toUpperCase() ?? "GET";

    try {
      // POST /forecasts — evaluate all 12 gauges + derived + safety
      if (method === "POST" && url === "/forecasts") {
        const body = await readBody(req) as Record<string, Record<string, number>>;
        const results: Record<string, unknown> = {};

        for (const gauge of BASE_GAUGES) {
          const input = body[gauge.id];
          if (input) {
            const parsed = gauge.schema.parse(input);
            results[gauge.id] = gauge.evaluate(parsed);
          }
        }

        // Derived gauges (if base values present)
        const gv = (id: string): number => (results[id] as { value?: number })?.value ?? 0;
        const di = {
          fg01: gv("FG-01"), fg04: gv("FG-04"), fg06: gv("FG-06"),
          fg07: gv("FG-07"), fg08: gv("FG-08"), fg09: gv("FG-09"),
          fg10: gv("FG-10"), fg11: gv("FG-11"),
        };

        results["FG-D1"] = computeFGD1(di);
        results["FG-D2"] = computeFGD2(di);
        results["FG-D3"] = computeFGD3(di);
        results["safety"] = evaluateSafetyGates({ fg06: di.fg06, fg07: di.fg07, fg09: di.fg09 });

        send(res, 200, results);
        return;
      }

      // GET /gauges/:id — metadata for a specific gauge
      const gaugeMatch = url.match(/^\/gauges\/([A-Z0-9-]+)$/);
      if (method === "GET" && gaugeMatch) {
        const gauge = BASE_GAUGES.find((g) => g.id === gaugeMatch[1]);
        if (!gauge) { send(res, 404, { error: "gauge not found" }); return; }
        send(res, 200, { id: gauge.id, label: gauge.label, schema: "see README" });
        return;
      }

      // GET /gauges — list all gauges
      if (method === "GET" && url === "/gauges") {
        send(res, 200, BASE_GAUGES.map((g) => ({ id: g.id, label: g.label })));
        return;
      }

      // POST /brier — record a Brier observation
      if (method === "POST" && url === "/brier") {
        const body = await readBody(req) as { gaugeId: string; predicted: number; outcome: 0 | 1 };
        const entry = defaultLedger.record(body.gaugeId, body.predicted, body.outcome);
        send(res, 201, entry);
        return;
      }

      // GET /brier — ledger summary
      if (method === "GET" && url === "/brier") {
        send(res, 200, { mean: defaultLedger.mean(), size: defaultLedger.size, summary: defaultLedger.summary() });
        return;
      }

      send(res, 404, { error: "not found" });
    } catch (err) {
      send(res, 400, { error: err instanceof Error ? err.message : String(err) });
    }
  });
}

if (process.argv[1]?.endsWith("server.js") || process.argv[1]?.endsWith("server.ts")) {
  const port = Number(process.env["FORECAST_PORT"] ?? 3005);
  createForecastServer().listen(port, () => console.log(`agi-forecast listening :${port}`));
}
