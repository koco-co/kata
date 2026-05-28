# 2026-04-wan-zheng-xing-json-key — Test Suite

## Structure

| Directory | Purpose |
|-----------|---------|
| cases/    | Test case scripts (`t{nn}-{slug}.ts`) |
| runners/  | Playwright runner specs (smoke/full/retry-failed) |
| ../../_shared/pages/2026-04-wan-zheng-xing-json-key/ | Shared page objects and PRD-specific helpers |
| data/     | Test data / fixtures / seed SQL |
| unit/     | Helper unit tests (`*.test.ts`) |
| .debug/   | One-off repro scripts (gitignored) |

## Run

```bash
# Smoke
bun test workspace/dataAssets/features/2026-04-wan-zheng-xing-json-key/tests/runners/smoke.spec.ts

# Full
bun test workspace/dataAssets/features/2026-04-wan-zheng-xing-json-key/tests/runners/full.spec.ts
```
