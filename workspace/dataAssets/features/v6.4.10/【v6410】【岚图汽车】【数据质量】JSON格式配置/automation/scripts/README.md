# 2026-04-tong-yong-j-s — Test Suite

## Structure

| Directory | Purpose |
|-----------|---------|
| cases/    | Test case scripts (`t{nn}-{slug}.ts`) |
| runners/  | Playwright runner specs (smoke/full/retry-failed) |
| ../../_shared/pages/2026-04-tong-yong-j-s/ | Shared page objects and PRD-specific helpers |
| data/     | Test data / fixtures / seed SQL |
| unit/     | Helper unit tests (`*.test.ts`) |
| .debug/   | One-off repro scripts (gitignored) |

## Run

```bash
# Smoke
bun test workspace/dataAssets/features/2026-04-tong-yong-j-s/tests/runners/smoke.spec.ts

# Full
bun test workspace/dataAssets/features/2026-04-tong-yong-j-s/tests/runners/full.spec.ts
```
