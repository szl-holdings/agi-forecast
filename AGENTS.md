# AGENTS.md

## Cursor Cloud specific instructions

### Development setup

- All dev work happens in the `runtime/` subdirectory
- Tests: `pnpm test` (20 tests, Vitest)
- Build: `pnpm build` — has known TS errors in `server.ts` (missing `types: ["node"]` in tsconfig); CI treats this as advisory
- Run server: `npx tsx src/server.ts` (port 3005 by default, set `FORECAST_PORT` env var to override)

### API endpoints

- `GET /gauges` — list all 12 forecast gauges
- `POST /forecasts` — evaluate gauges + derived metrics + safety gates
- `GET /brier` — Brier score ledger summary
- `POST /brier` — record a Brier observation

### Key caveats

- No external services required; all tests are self-contained
- The repo has a `.pre-commit-config.yaml` (prettier + standard hooks) but pre-commit is not required for CI to pass
