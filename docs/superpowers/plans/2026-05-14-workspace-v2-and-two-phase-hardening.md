# Workspace v2 Layout & Two-Phase Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate kata's workspace from "convention + .gitignore patches" to "contract-driven flat layout with single .kata/ root", unify `kata-cli` into `kata` (gh/docker style), harden the case-draft → playwright-automation handoff with strong schemas, and one-shot migrate ~100 existing features.

**Architecture:** New JSON schemas (FeatureMetadata.v1, FeatureManifest.v2, PlaywrightAutomationHandoff.v2, SourceRefRegistry.v1) live in `.ai/core/schemas/`. CLI consolidates in `engine/src/cli/` with space-separated `<noun> <verb>` Commander subcommands. Six new quality gates layer onto existing 9. A single `kata migrate v2` script performs atomic 10-stage migration with dry-run.

**Tech Stack:** TypeScript, Bun runtime, Commander.js, Ajv for schema validation, bun:test, Biome linter, Handlebars for templates.

**Spec:** `docs/superpowers/specs/2026-05-14-workspace-v2-and-two-phase-hardening-design.md`

**Note on naming:** Existing `engine/src/migration/v3-workspace.ts` is a stale half-done refactor (operates on `prds/<ym>/<slug>/` paths that don't match current workspace). It is deleted in Phase 0. The user's spec calls the new migration "v2"; we keep that terminology and do not reuse "v3".

---

## Execution Order & Checkpoints

Phases are sequential. Each phase ends with a checkpoint commit. Resume between phases by re-reading completed checkpoints.

| Phase | Scope | Checkpoint commit prefix |
|---|---|---|
| 0 | Worktree + cleanup obsolete v3 | `chore: prepare v2 migration worktree` |
| 1 | Schemas + Ajv validators | `feat(schemas): ...` |
| 2 | Binary rename + CLI structure | `feat(cli): unify kata binary` |
| 3 | New CLI commands | `feat(cli): kata features/results/handoff` |
| 4 | Six new quality gates | `feat(quality-gate): ...` |
| 5 | Skill + workflow rewrites | `feat(workflows): ...` |
| 6 | Migration script (10 stages) | `feat(migrate): ...` |
| 7 | Docs + CI + .gitignore | `chore(docs): ...` |
| 8 | Execute migration + acceptance | `chore(workspace): v2 migration` |

---

## Phase 0: Preparation & Cleanup

### Task 0.1: Create worktree for v2 migration work

**Files:**
- No files modified; creates worktree at `.worktrees/v2-migration/`

- [ ] **Step 1: Create worktree**

Run:
```bash
git worktree add -b migrate/v2-layout .worktrees/v2-migration main
cd .worktrees/v2-migration
git status
```

Expected: new branch `migrate/v2-layout` created, working tree clean.

- [ ] **Step 2: Verify worktree isolation**

Run: `git rev-parse --show-toplevel`
Expected: prints `.worktrees/v2-migration` absolute path.

- [ ] **Step 3: No commit (worktree is the work area)**

### Task 0.2: Delete obsolete v3-workspace migration code

**Files:**
- Delete: `engine/src/migration/v3-workspace.ts`
- Delete: `engine/src/migration/import-fix.ts`
- Delete: `engine/src/migration/reorg-tests.ts`
- Delete: `engine/src/migration/types.ts`
- Delete: `engine/src/cli/migrate-workspace.ts`
- Delete: `engine/src/cli/features-import-fix.ts`
- Delete: `engine/src/cli/features-init-tests.ts`
- Delete: `engine/src/cli/features-lint-tests.ts`
- Delete: `engine/src/cli/features-reorg-tests.ts`
- Delete: `engine/tests/migration/v3-workspace.test.ts`
- Delete: `engine/tests/cli/migrate-workspace.smoke.test.ts`
- Delete: `engine/tests/cli/features-init-tests.test.ts`
- Modify: `engine/src/cli/index.ts` (remove imports + registrations of deleted commands)

- [ ] **Step 1: Delete obsolete files**

Run:
```bash
git rm engine/src/migration/v3-workspace.ts \
       engine/src/migration/import-fix.ts \
       engine/src/migration/reorg-tests.ts \
       engine/src/migration/types.ts \
       engine/src/cli/migrate-workspace.ts \
       engine/src/cli/features-import-fix.ts \
       engine/src/cli/features-init-tests.ts \
       engine/src/cli/features-lint-tests.ts \
       engine/src/cli/features-reorg-tests.ts \
       engine/tests/migration/v3-workspace.test.ts \
       engine/tests/cli/migrate-workspace.smoke.test.ts \
       engine/tests/cli/features-init-tests.test.ts
rmdir engine/src/migration engine/tests/migration 2>/dev/null || true
```

Expected: 12 files staged for deletion.

- [ ] **Step 2: Remove imports from cli index**

Edit `engine/src/cli/index.ts`: remove these imports and corresponding `kata.addCommand(...)` lines:
```
program as migrateWorkspace from "./migrate-workspace.ts"
```
(and any imports from the deleted features-* files)

- [ ] **Step 3: Run typecheck to find dangling refs**

Run: `bun run type-check`
Expected: PASS or only errors that reference deleted symbols. Fix any remaining references.

- [ ] **Step 4: Run existing tests**

Run: `bun test`
Expected: PASS (after deletions, existing test suite green).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove obsolete v3 workspace migration code"
```

### Task 0.3: Also delete cleanup-duplicates.sh history-baggage script

**Files:**
- Delete: `cleanup-duplicates.sh`

- [ ] **Step 1: Delete and commit**

```bash
git rm cleanup-duplicates.sh
git commit -m "chore: remove obsolete cleanup-duplicates.sh"
```

Expected: clean removal, no test failure.

---

## Phase 1: Schemas + Validators (TDD)

### Task 1.1: FeatureMetadata.v1 schema

**Files:**
- Create: `.ai/core/schemas/FeatureMetadata.v1.schema.json`
- Test: `engine/tests/schemas/feature-metadata.test.ts`

- [ ] **Step 1: Write failing test**

Create `engine/tests/schemas/feature-metadata.test.ts`:
```typescript
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";
import { repoRoot } from "../../lib/paths.ts";

const schemaPath = join(repoRoot(), ".ai/core/schemas/FeatureMetadata.v1.schema.json");
const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
const ajv = new Ajv({ strict: false });
const validate = ajv.compile(schema);

describe("FeatureMetadata@1", () => {
  it("accepts a minimal valid metadata", () => {
    const ok = {
      schema: "FeatureMetadata@1",
      id: "2026-04-dq-json-config",
      display_name: "JSON 格式配置",
      status: "active",
      created_at: "2026-04-15",
      updated_at: "2026-05-10",
      modules: ["dq"],
      customers: ["standard"],
      versions: ["v6.4"],
      owners: ["koco"],
      inputs: [{ kind: "prd", ref: "prd.file:s-1#sha256:abc" }],
      relates_to: [],
      emits: { cases_xmind: true, archive: true, playwright_tests: true },
    };
    expect(validate(ok)).toBe(true);
  });

  it("rejects id mismatch with display_name format", () => {
    const bad = { schema: "FeatureMetadata@1", id: "INVALID UPPERCASE" };
    expect(validate(bad)).toBe(false);
  });

  it("rejects status outside enum", () => {
    const bad = {
      schema: "FeatureMetadata@1",
      id: "2026-04-x",
      display_name: "x",
      status: "wip",
      created_at: "2026-04-01",
      updated_at: "2026-04-01",
      modules: [],
      customers: [],
      versions: [],
      owners: [],
      inputs: [],
      relates_to: [],
      emits: {},
    };
    expect(validate(bad)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test engine/tests/schemas/feature-metadata.test.ts`
Expected: FAIL — schema file does not exist.

- [ ] **Step 3: Create the schema**

Create `.ai/core/schemas/FeatureMetadata.v1.schema.json`:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "FeatureMetadata@1",
  "type": "object",
  "required": ["schema", "id", "display_name", "status", "created_at", "updated_at", "modules", "customers", "versions", "owners", "inputs", "relates_to", "emits"],
  "additionalProperties": false,
  "properties": {
    "schema": { "type": "string", "const": "FeatureMetadata@1" },
    "id": { "type": "string", "pattern": "^\\d{4}-\\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$" },
    "display_name": { "type": "string", "minLength": 1, "maxLength": 200 },
    "status": { "type": "string", "enum": ["active", "archived", "draft", "blocked"] },
    "created_at": { "type": "string", "format": "date" },
    "updated_at": { "type": "string", "format": "date" },
    "modules": { "type": "array", "items": { "type": "string", "pattern": "^[a-z][a-z0-9-]*$" } },
    "customers": { "type": "array", "items": { "type": "string", "pattern": "^[a-z][a-z0-9-]*$" } },
    "versions": { "type": "array", "items": { "type": "string" } },
    "owners": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "inputs": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["kind", "ref"],
        "additionalProperties": false,
        "properties": {
          "kind": { "type": "string", "enum": ["prd", "lanhu", "axure", "manual", "bug-hotfix"] },
          "ref": { "type": "string", "minLength": 1 }
        }
      }
    },
    "relates_to": { "type": "array", "items": { "type": "string" } },
    "archived_at": { "type": ["string", "null"], "format": "date" },
    "emits": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "cases_xmind": { "type": "boolean" },
        "archive": { "type": "boolean" },
        "playwright_tests": { "type": "boolean" }
      }
    }
  }
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `bun test engine/tests/schemas/feature-metadata.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add .ai/core/schemas/FeatureMetadata.v1.schema.json engine/tests/schemas/feature-metadata.test.ts
git commit -m "feat(schemas): add FeatureMetadata@1"
```

### Task 1.2: FeatureManifest.v2 schema

**Files:**
- Create: `.ai/core/schemas/FeatureManifest.v2.schema.json`
- Test: `engine/tests/schemas/feature-manifest.test.ts`

- [ ] **Step 1: Write failing test**

Create `engine/tests/schemas/feature-manifest.test.ts`:
```typescript
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";
import { repoRoot } from "../../lib/paths.ts";

const schema = JSON.parse(
  readFileSync(join(repoRoot(), ".ai/core/schemas/FeatureManifest.v2.schema.json"), "utf-8")
);
const validate = new Ajv({ strict: false }).compile(schema);

const baseManifest = {
  schema: "FeatureManifest@2",
  feature_id: "2026-04-dq-json-config",
  case_drafting: {
    status: "completed",
    archive_path: "archive.md",
    xmind_path: "cases.xmind",
    requirement_atoms: [{ id: "RA-001", source_ref: "prd.file:s-1#sha256:abc" }],
    coverage_matrix_path: "archive.md#coverage-matrix",
  },
  automation: {
    status: "ready",
    intents: [
      {
        intent_id: "SR-INTENT-X",
        case_files: ["tests/cases/t01.ts"],
        automation_status: "ready",
      },
    ],
    last_handoff_path: null,
    last_run_status: "not-run",
  },
  files: {
    archive: "archive.md",
    xmind: "cases.xmind",
    tests_root: "tests/",
    latest_results: null,
  },
};

describe("FeatureManifest@2", () => {
  it("accepts a complete manifest", () => {
    expect(validate(baseManifest)).toBe(true);
  });

  it("rejects unknown automation.status", () => {
    const bad = { ...baseManifest, automation: { ...baseManifest.automation, status: "maybe" } };
    expect(validate(bad)).toBe(false);
  });

  it("rejects when case_drafting.status is enum miss", () => {
    const bad = { ...baseManifest, case_drafting: { ...baseManifest.case_drafting, status: "wip" } };
    expect(validate(bad)).toBe(false);
  });

  it("requires feature_id to match slug regex", () => {
    const bad = { ...baseManifest, feature_id: "BAD-ID" };
    expect(validate(bad)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test engine/tests/schemas/feature-manifest.test.ts`
Expected: FAIL — schema file missing.

- [ ] **Step 3: Create the schema**

Create `.ai/core/schemas/FeatureManifest.v2.schema.json`:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "FeatureManifest@2",
  "type": "object",
  "required": ["schema", "feature_id", "case_drafting", "automation", "files"],
  "additionalProperties": false,
  "properties": {
    "schema": { "type": "string", "const": "FeatureManifest@2" },
    "feature_id": { "type": "string", "pattern": "^\\d{4}-\\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$" },
    "case_drafting": {
      "type": "object",
      "required": ["status"],
      "additionalProperties": false,
      "properties": {
        "status": { "type": "string", "enum": ["not-started", "in-progress", "completed", "blocked"] },
        "archive_path": { "type": ["string", "null"] },
        "xmind_path": { "type": ["string", "null"] },
        "requirement_atoms": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["id", "source_ref"],
            "properties": {
              "id": { "type": "string" },
              "source_ref": { "type": "string" }
            }
          }
        },
        "coverage_matrix_path": { "type": ["string", "null"] }
      }
    },
    "automation": {
      "type": "object",
      "required": ["status", "intents"],
      "additionalProperties": false,
      "properties": {
        "status": { "type": "string", "enum": ["not-applicable", "not-started", "ready", "deferred", "blocked"] },
        "intents": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["intent_id", "case_files", "automation_status"],
            "properties": {
              "intent_id": { "type": "string", "pattern": "^SR-INTENT-[A-Z0-9-]+$" },
              "case_files": { "type": "array", "items": { "type": "string" } },
              "automation_status": { "type": "string", "enum": ["ready", "deferred", "blocked"] }
            }
          }
        },
        "last_handoff_path": { "type": ["string", "null"] },
        "last_run_status": { "type": "string", "enum": ["not-run", "passing", "failing", "partial"] }
      }
    },
    "files": {
      "type": "object",
      "properties": {
        "archive": { "type": ["string", "null"] },
        "xmind": { "type": ["string", "null"] },
        "tests_root": { "type": ["string", "null"] },
        "latest_results": { "type": ["string", "null"] }
      }
    }
  }
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `bun test engine/tests/schemas/feature-manifest.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add .ai/core/schemas/FeatureManifest.v2.schema.json engine/tests/schemas/feature-manifest.test.ts
git commit -m "feat(schemas): add FeatureManifest@2"
```

### Task 1.3: PlaywrightAutomationHandoff.v2 schema

**Files:**
- Create: `.ai/core/schemas/PlaywrightAutomationHandoff.v2.schema.json`
- Test: `engine/tests/schemas/handoff-v2.test.ts`

- [ ] **Step 1: Write failing test**

Create `engine/tests/schemas/handoff-v2.test.ts`:
```typescript
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";
import { repoRoot } from "../../lib/paths.ts";

const schema = JSON.parse(
  readFileSync(join(repoRoot(), ".ai/core/schemas/PlaywrightAutomationHandoff.v2.schema.json"), "utf-8")
);
const validate = new Ajv({ strict: false }).compile(schema);

const base = {
  schema: "PlaywrightAutomationHandoff@2",
  feature_id: "2026-04-dq-json-config",
  run_id: "20260510-1430-a3f8c9e1",
  status: "passed",
  intent_id: "SR-INTENT-X",
  source_refs: {
    intent: "SR-INTENT-X",
    env: "SR-ENV-PREFLIGHT-X",
    probe: "SR-UI-PROBE-X",
    self_run: "SR-SELF-RUN-X",
  },
  run_command: "npx playwright test ...",
  run_exit_code: 0,
  results: {
    total: 46,
    passed: 45,
    failed: 1,
    skipped: 0,
    report_paths: {
      playwright_json: "results/<r>/playwright/results.json",
      allure: "results/<r>/allure-results/",
      stdout: "results/<r>/stdout.log",
    },
  },
  quality_gates: [{ name: "no_weak_assertions", status: "passed" }],
  unresolved_blockers: [],
  next_actions: [],
};

describe("PlaywrightAutomationHandoff@2", () => {
  it("accepts a valid passed handoff", () => {
    expect(validate(base)).toBe(true);
  });

  it("rejects unknown status enum", () => {
    expect(validate({ ...base, status: "kinda-passed" })).toBe(false);
  });

  it("rejects negative exit code", () => {
    expect(validate({ ...base, run_exit_code: -1 })).toBe(false);
  });

  it("requires source_refs.intent", () => {
    expect(validate({ ...base, source_refs: { env: "x", probe: "y", self_run: "z" } })).toBe(false);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/schemas/handoff-v2.test.ts`
Expected: FAIL.

- [ ] **Step 3: Create schema**

Create `.ai/core/schemas/PlaywrightAutomationHandoff.v2.schema.json`:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "PlaywrightAutomationHandoff@2",
  "type": "object",
  "required": ["schema", "feature_id", "run_id", "status", "intent_id", "source_refs", "run_command", "run_exit_code", "results", "quality_gates", "unresolved_blockers", "next_actions"],
  "additionalProperties": false,
  "properties": {
    "schema": { "type": "string", "const": "PlaywrightAutomationHandoff@2" },
    "feature_id": { "type": "string", "pattern": "^\\d{4}-\\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$" },
    "run_id": { "type": "string", "pattern": "^\\d{8}-\\d{4}-[a-z0-9]{8}$" },
    "status": { "type": "string", "enum": ["passed", "partial", "blocked_by_product", "blocked_by_env", "failed"] },
    "intent_id": { "type": "string", "pattern": "^SR-INTENT-[A-Z0-9-]+$" },
    "source_refs": {
      "type": "object",
      "required": ["intent", "env", "probe", "self_run"],
      "properties": {
        "intent": { "type": "string" },
        "env": { "type": "string" },
        "probe": { "type": "string" },
        "self_run": { "type": "string" }
      }
    },
    "run_command": { "type": "string" },
    "run_exit_code": { "type": "integer", "minimum": 0 },
    "results": {
      "type": "object",
      "required": ["total", "passed", "failed", "skipped", "report_paths"],
      "properties": {
        "total": { "type": "integer", "minimum": 0 },
        "passed": { "type": "integer", "minimum": 0 },
        "failed": { "type": "integer", "minimum": 0 },
        "skipped": { "type": "integer", "minimum": 0 },
        "report_paths": {
          "type": "object",
          "properties": {
            "playwright_json": { "type": "string" },
            "allure": { "type": "string" },
            "stdout": { "type": "string" }
          }
        }
      }
    },
    "quality_gates": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "status"],
        "properties": {
          "name": { "type": "string" },
          "status": { "type": "string", "enum": ["passed", "failed", "skipped"] },
          "detail": { "type": "string" }
        }
      }
    },
    "unresolved_blockers": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["kind"],
        "properties": {
          "kind": { "type": "string", "enum": ["product", "script", "data", "permission", "environment", "unknown"] },
          "case": { "type": "string" },
          "evidence_path": { "type": "string" }
        }
      }
    },
    "next_actions": { "type": "array", "items": { "type": "string" } }
  }
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `bun test engine/tests/schemas/handoff-v2.test.ts`
Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add .ai/core/schemas/PlaywrightAutomationHandoff.v2.schema.json engine/tests/schemas/handoff-v2.test.ts
git commit -m "feat(schemas): add PlaywrightAutomationHandoff@2"
```

### Task 1.4: SourceRefRegistry.v1 schema + content

**Files:**
- Create: `.ai/core/schemas/SourceRefRegistry.v1.schema.json`
- Create: `.ai/core/schemas/source-ref-registry.yaml`
- Test: `engine/tests/schemas/source-ref-registry.test.ts`

- [ ] **Step 1: Write failing test**

Create `engine/tests/schemas/source-ref-registry.test.ts`:
```typescript
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";
import { parse } from "yaml";
import { repoRoot } from "../../lib/paths.ts";

const schema = JSON.parse(
  readFileSync(join(repoRoot(), ".ai/core/schemas/SourceRefRegistry.v1.schema.json"), "utf-8")
);
const registry = parse(
  readFileSync(join(repoRoot(), ".ai/core/schemas/source-ref-registry.yaml"), "utf-8")
);
const validate = new Ajv({ strict: false }).compile(schema);

describe("SourceRefRegistry@1", () => {
  it("accepts the registry YAML", () => {
    expect(validate(registry)).toBe(true);
  });

  it("includes all 4 SourceRef prefixes", () => {
    const names = registry.prefixes.map((p: { prefix: string }) => p.prefix);
    expect(names).toContain("SR-INTENT");
    expect(names).toContain("SR-ENV-PREFLIGHT");
    expect(names).toContain("SR-UI-PROBE");
    expect(names).toContain("SR-SELF-RUN");
  });

  it("rejects duplicate prefix entries", () => {
    const dup = {
      schema: "SourceRefRegistry@1",
      prefixes: [
        { prefix: "SR-X", description: "a", generated_by: "skill:case-draft", generated_at_step: "x", pattern: "^SR-X-[A-Z]+$" },
        { prefix: "SR-X", description: "b", generated_by: "skill:case-draft", generated_at_step: "y", pattern: "^SR-X-[A-Z]+$" },
      ],
    };
    expect(validate(dup)).toBe(false);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/schemas/source-ref-registry.test.ts`
Expected: FAIL — files missing.

- [ ] **Step 3: Create schema + registry**

Create `.ai/core/schemas/SourceRefRegistry.v1.schema.json`:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "SourceRefRegistry@1",
  "type": "object",
  "required": ["schema", "prefixes"],
  "additionalProperties": false,
  "properties": {
    "schema": { "type": "string", "const": "SourceRefRegistry@1" },
    "prefixes": {
      "type": "array",
      "uniqueItems": true,
      "items": {
        "type": "object",
        "required": ["prefix", "description", "generated_by", "generated_at_step", "pattern"],
        "additionalProperties": false,
        "properties": {
          "prefix": { "type": "string", "pattern": "^SR-[A-Z][A-Z-]*$" },
          "description": { "type": "string", "minLength": 1 },
          "generated_by": { "type": "string", "pattern": "^skill:[a-z-]+$" },
          "generated_at_step": { "type": "string", "minLength": 1 },
          "pattern": { "type": "string", "minLength": 1 },
          "consumed_by": { "type": "array", "items": { "type": "string" } }
        }
      }
    }
  }
}
```

Create `.ai/core/schemas/source-ref-registry.yaml`:
```yaml
schema: SourceRefRegistry@1
prefixes:
  - prefix: SR-INTENT
    description: Automation intent identified during case-drafting
    generated_by: skill:case-draft
    generated_at_step: automation-handoff
    pattern: '^SR-INTENT-[A-Z0-9-]+$'
    consumed_by: [skill:playwright-automation]
  - prefix: SR-ENV-PREFLIGHT
    description: Environment preflight evidence
    generated_by: skill:playwright-automation
    generated_at_step: env-preflight
    pattern: '^SR-ENV-PREFLIGHT-[A-Z0-9-]+$'
  - prefix: SR-UI-PROBE
    description: Live UI probe evidence
    generated_by: skill:playwright-automation
    generated_at_step: ui-probe
    pattern: '^SR-UI-PROBE-[A-Z0-9-]+$'
  - prefix: SR-SELF-RUN
    description: Self-run evidence with exit code
    generated_by: skill:playwright-automation
    generated_at_step: self-run
    pattern: '^SR-SELF-RUN-[A-Z0-9-]+$'
```

- [ ] **Step 4: Run test to verify pass**

Run: `bun test engine/tests/schemas/source-ref-registry.test.ts`
Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add .ai/core/schemas/SourceRefRegistry.v1.schema.json .ai/core/schemas/source-ref-registry.yaml engine/tests/schemas/source-ref-registry.test.ts
git commit -m "feat(schemas): add SourceRefRegistry@1 + central registry yaml"
```

### Task 1.5: Update schemas/registry.yaml

**Files:**
- Modify: `.ai/core/schemas/registry.yaml`

- [ ] **Step 1: Append 4 new schema entries**

Edit `.ai/core/schemas/registry.yaml`, append after existing entries:
```yaml
  - id: FeatureMetadata@1
    version: 1
    path: .ai/core/schemas/FeatureMetadata.v1.schema.json
  - id: FeatureManifest@2
    version: 2
    path: .ai/core/schemas/FeatureManifest.v2.schema.json
  - id: PlaywrightAutomationHandoff@2
    version: 2
    path: .ai/core/schemas/PlaywrightAutomationHandoff.v2.schema.json
  - id: SourceRefRegistry@1
    version: 1
    path: .ai/core/schemas/SourceRefRegistry.v1.schema.json
```

- [ ] **Step 2: Run schema lint**

Run: `bun run lint:ai-core`
Expected: PASS (registry is consistent).

- [ ] **Step 3: Commit**

```bash
git add .ai/core/schemas/registry.yaml
git commit -m "feat(schemas): register v2 contracts in registry"
```

### Task 1.6: Shared schema loader utility

**Files:**
- Create: `engine/src/schemas/loaders.ts`
- Test: `engine/tests/schemas/loaders.test.ts`

- [ ] **Step 1: Write failing test**

Create `engine/tests/schemas/loaders.test.ts`:
```typescript
import { describe, expect, it } from "bun:test";
import { loadFeatureMetadataValidator, loadFeatureManifestValidator, loadHandoffV2Validator, loadSourceRefRegistryValidator } from "../../src/schemas/loaders.ts";

describe("schema loaders", () => {
  it("loads FeatureMetadata validator", () => {
    const v = loadFeatureMetadataValidator();
    expect(typeof v).toBe("function");
  });

  it("loads FeatureManifest validator", () => {
    expect(typeof loadFeatureManifestValidator()).toBe("function");
  });

  it("loads Handoff v2 validator", () => {
    expect(typeof loadHandoffV2Validator()).toBe("function");
  });

  it("loads SourceRefRegistry validator", () => {
    expect(typeof loadSourceRefRegistryValidator()).toBe("function");
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/schemas/loaders.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement loaders**

Create `engine/src/schemas/loaders.ts`:
```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { repoRoot } from "../../lib/paths.ts";

const ajv = addFormats(new Ajv({ strict: false, allErrors: true }));

function loadSchema(filename: string): ValidateFunction {
  const path = join(repoRoot(), ".ai/core/schemas", filename);
  const schema = JSON.parse(readFileSync(path, "utf-8"));
  return ajv.compile(schema);
}

export const loadFeatureMetadataValidator = () =>
  loadSchema("FeatureMetadata.v1.schema.json");
export const loadFeatureManifestValidator = () =>
  loadSchema("FeatureManifest.v2.schema.json");
export const loadHandoffV2Validator = () =>
  loadSchema("PlaywrightAutomationHandoff.v2.schema.json");
export const loadSourceRefRegistryValidator = () =>
  loadSchema("SourceRefRegistry.v1.schema.json");
```

- [ ] **Step 4: Add ajv-formats dependency (if missing)**

Run: `grep ajv-formats engine/package.json || (cd engine && bun add ajv-formats)`
Expected: `ajv-formats` listed in engine/package.json dependencies.

- [ ] **Step 5: Run test to verify pass**

Run: `bun test engine/tests/schemas/loaders.test.ts`
Expected: 4 PASS.

- [ ] **Step 6: Commit**

```bash
git add engine/src/schemas/loaders.ts engine/tests/schemas/loaders.test.ts engine/package.json
git commit -m "feat(schemas): add Ajv schema loaders for v2 contracts"
```

---

## Phase 1 Checkpoint

Verify before proceeding:
```bash
bun test engine/tests/schemas/
bun run type-check
```
Expected: all schema tests PASS, no type errors.

---

## Phase 2: CLI Binary Rename + Structure Refactor

### Task 2.1: Rename binary from `kata-cli` to `kata`

**Files:**
- Modify: `engine/package.json` (rename bin key)
- Move: `engine/bin/kata-cli` → `engine/bin/kata`
- Modify: `engine/src/cli/index.ts` (program name)
- Modify: `package.json` root (any script using `kata-cli`)
- Modify: `scripts/run-ai-core-lint.ts` (binary path)

- [ ] **Step 1: Move binary file**

Run:
```bash
git mv engine/bin/kata-cli engine/bin/kata
```

- [ ] **Step 2: Update engine/package.json bin entry**

Edit `engine/package.json`, change:
```json
"bin": { "kata-cli": "bin/kata-cli" }
```
to:
```json
"bin": { "kata": "bin/kata" }
```

- [ ] **Step 3: Update engine/src/cli/index.ts program name**

Edit `engine/src/cli/index.ts`, change `new Command().name("kata-cli")` to `new Command().name("kata")`.

- [ ] **Step 4: Update root package.json scripts**

Edit `/Users/poco/Projects/kata/package.json`, replace all `kata-cli ` with `kata ` in `scripts`:
- `"lint:agents": "kata agents:audit ..."`
- `"lint:agents:claude": "kata agents:audit ..."`
- `"lint:agents:codex": "kata agents:audit ..."`
- `"lint:skills:codex": "kata skill:audit ..."`
- `"lint:agents:drift": "kata agents:drift ..."`
- `"lint:paths": "kata paths:audit ..."`
- `"lint:cases": "kata cases:lint ..."`

(Note: colon subcommands are temporarily preserved; Task 2.2 converts them.)

- [ ] **Step 5: Update scripts/run-ai-core-lint.ts binary path**

Edit `scripts/run-ai-core-lint.ts`:
```typescript
const kataCli = join(repoRoot, "engine/bin/kata");
```
And rename the variable to `kataBin` for clarity:
```typescript
const kataBin = join(repoRoot, "engine/bin/kata");
// ... and replace all references to kataCli below
```

- [ ] **Step 6: Re-link bun symlink**

Run: `cd engine && bun link --force && cd ..`
Expected: `~/.bun/bin/kata` exists, `~/.bun/bin/kata-cli` removed.

- [ ] **Step 7: Smoke test**

Run: `kata --help`
Expected: prints "kata 统一 CLI" usage with all subcommands.

- [ ] **Step 8: Run all tests**

Run: `bun test`
Expected: PASS (no test references `kata-cli` binary path; if any do, fix them).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(cli): rename kata-cli binary to kata"
```

### Task 2.2: Convert colon subcommands to space-separated noun-verb style

**Files:**
- Modify: `engine/src/cli/cases-lint.ts` (`.command("cases:lint")` → noun "cases" + verb "lint")
- Modify: `engine/src/cli/agents-audit.ts` (similar)
- Modify: `engine/src/cli/agents-drift.ts` (similar)
- Modify: `engine/src/cli/agents-sync.ts` (similar)
- Modify: `engine/src/cli/paths-audit.ts` (similar)
- Modify: `engine/src/cli/skill-audit.ts` (similar)
- Modify: `engine/src/cli/safety-audit-command.ts` (similar)
- Modify: `engine/src/cli/codemod-apply.ts` (similar)
- Modify: `engine/src/cli/ai-core.ts` (multi-verb namespace)
- Modify: `engine/src/cli/index.ts` (regroup top-level commands into noun namespaces)
- Modify: `package.json` (update scripts to space-separated)
- Modify: `scripts/run-ai-core-lint.ts` (update command tuples)
- Test: `engine/tests/cli/space-separated-style.test.ts`

- [ ] **Step 1: Write failing acceptance test**

Create `engine/tests/cli/space-separated-style.test.ts`:
```typescript
import { describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { repoRoot } from "../../lib/paths.ts";

const kata = (args: string) =>
  execSync(`bun ${join(repoRoot(), "engine/bin/kata")} ${args}`, {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });

describe("kata CLI uses <noun> <verb> style", () => {
  it("exposes `kata cases lint` (not `cases:lint`)", () => {
    const out = kata("--help");
    expect(out).toContain("cases");
    expect(out).not.toMatch(/cases:lint/);
  });

  it("exposes `kata agents audit`", () => {
    const out = kata("agents --help");
    expect(out).toContain("audit");
  });

  it("exposes `kata paths audit`", () => {
    const out = kata("paths --help");
    expect(out).toContain("audit");
  });

  it("rejects old colon syntax", () => {
    let threw = false;
    try {
      kata("cases:lint --help");
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/cli/space-separated-style.test.ts`
Expected: FAIL — still colon style.

- [ ] **Step 3: Refactor each command to noun namespace**

For each command file (cases-lint, agents-audit, agents-drift, agents-sync, paths-audit, skill-audit, safety-audit-command, codemod-apply), apply this pattern. Example for `cases-lint.ts`:

Change:
```typescript
export function registerCasesLint(program: Command): void {
  program
    .command("cases:lint")
    .description("聚合用例级 lint 检查结果")
    ...
}
```
to:
```typescript
import { Command } from "commander";

export function buildCasesCommand(): Command {
  const cases = new Command("cases").description("用例级操作");
  cases
    .command("lint")
    .description("聚合用例级 lint 检查结果")
    .option("--exit-code", "exit non-zero on any violation", false)
    .option("--severity <level>", "filter exit-code by severity (all|fail-only)", "all")
    .option("--scope <p>", "scan path", join(repoRoot(), "workspace"))
    .action((opts: { exitCode: boolean; severity: string; scope: string }) => {
      // existing action body unchanged
    });
  return cases;
}
```

Apply identical pattern to:
- `agents-audit.ts` → `buildAgentsCommand()` registers `audit` verb
- `agents-drift.ts` → extends `buildAgentsCommand()` with `drift` verb (or merge)
- `agents-sync.ts` → extends with `sync` verb
- `paths-audit.ts` → `buildPathsCommand()` with `audit` verb
- `skill-audit.ts` → `buildSkillsCommand()` with `audit` verb
- `safety-audit-command.ts` → `buildSafetyCommand()` with `audit` verb
- `codemod-apply.ts` → `buildCodemodCommand()` with `apply` verb

Consolidate agents-* into a single `buildAgentsCommand()` (verbs: `audit`, `drift`, `sync`).

- [ ] **Step 4: Regroup top-level in index.ts**

Edit `engine/src/cli/index.ts`. Replace the `addCommand` block for refactored noun commands:
```typescript
import { buildAgentsCommand } from "./agents-audit.ts"; // re-exported
import { buildCasesCommand } from "./cases-lint.ts";
import { buildPathsCommand } from "./paths-audit.ts";
import { buildSkillsCommand } from "./skill-audit.ts";
import { buildSafetyCommand } from "./safety-audit-command.ts";
import { buildCodemodCommand } from "./codemod-apply.ts";

kata.addCommand(buildAgentsCommand());
kata.addCommand(buildCasesCommand());
kata.addCommand(buildPathsCommand());
kata.addCommand(buildSkillsCommand());
kata.addCommand(buildSafetyCommand());
kata.addCommand(buildCodemodCommand());
```

Keep other `addCommand(programObj)` calls untouched (those are unrelated to spec scope).

- [ ] **Step 5: Update root package.json scripts**

Edit `/Users/poco/Projects/kata/package.json`:
- `"lint:agents": "kata agents audit --exit-code --severity fail-only"`
- `"lint:agents:claude": "kata agents audit --runtime claude --exit-code --severity fail-only"`
- `"lint:agents:codex": "kata agents audit --runtime codex --exit-code --severity fail-only"`
- `"lint:skills:codex": "kata skills audit --runtime codex --exit-code"`
- `"lint:agents:drift": "kata agents drift --json"`
- `"lint:paths": "kata paths audit --exit-code"`
- `"lint:cases": "kata cases lint --exit-code --severity fail-only --scope workspace"`

- [ ] **Step 6: Update scripts/run-ai-core-lint.ts command tuples**

Edit `scripts/run-ai-core-lint.ts`. Change `commands` to:
```typescript
const commands = [
  ["ai-core", "lint", "--strict"],
  ["ai-core", "projection", "check", "--runtime", "all"],
  ["ai-core", "projection", "inventory"],
  ["ai-core", "schemas-compat-check"],
  ["ai-core", "preflight", "--runtime", "all"],
  ["ai-core", "context", "audit"],
  ["ai-core", "docs", "check"],
  ["ai-core", "parser", "audit"],
  ["ai-core", "gate", "--scope", "ga-completion"],
];
```
(This requires `ai-core.ts` to have been refactored similarly — if the existing `ai-core.ts` uses colons internally, refactor it the same way, but keep the existing semantics.)

- [ ] **Step 7: Run failing test until pass**

Run: `bun test engine/tests/cli/space-separated-style.test.ts`
Iterate fixes until 4 PASS.

- [ ] **Step 8: Run full test suite**

Run: `bun run ci`
Expected: PASS (or only known unrelated failures; fix any related to renamed commands).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(cli): convert colon subcommands to space-separated noun-verb style"
```

---

## Phase 2 Checkpoint

```bash
kata --help
kata cases lint --help
kata agents audit --help
bun run ci
```
Expected: help screens show two-segment style; ci passes.

---

## Phase 3: New CLI Commands

> All commands in this phase follow the same TDD pattern:
> 1. Write failing test in `engine/tests/cli/<name>.test.ts`
> 2. Run to verify failure
> 3. Create command module in `engine/src/cli/<name>.ts`
> 4. Register in `engine/src/cli/index.ts`
> 5. Run to verify pass
> 6. Commit

Each task lists the test stubs and implementation skeleton.

### Task 3.0: Shared CLI helpers (paths, slug generator, run-id)

**Files:**
- Create: `engine/src/features/paths.ts`
- Create: `engine/src/features/slug.ts`
- Create: `engine/src/features/run-id.ts`
- Test: `engine/tests/features/paths.test.ts`
- Test: `engine/tests/features/slug.test.ts`
- Test: `engine/tests/features/run-id.test.ts`

- [ ] **Step 1: Write tests**

`engine/tests/features/paths.test.ts`:
```typescript
import { describe, expect, it } from "bun:test";
import { featureDir, featuresRoot, sharedRoot, kataRoot, resultsDir } from "../../src/features/paths.ts";

describe("feature paths", () => {
  it("computes featuresRoot under project", () => {
    expect(featuresRoot("dataAssets")).toMatch(/workspace\/dataAssets\/features$/);
  });
  it("computes featureDir for slug", () => {
    expect(featureDir("dataAssets", "2026-04-x")).toMatch(/features\/2026-04-x$/);
  });
  it("computes sharedRoot", () => {
    expect(sharedRoot("dataAssets")).toMatch(/workspace\/dataAssets\/_shared$/);
  });
  it("computes kata root", () => {
    expect(kataRoot()).toMatch(/\.kata$/);
  });
  it("computes resultsDir for run", () => {
    expect(resultsDir("dataAssets", "2026-04-x", "20260510-1430-a3f8c9e1")).toMatch(
      /features\/2026-04-x\/results\/20260510-1430-a3f8c9e1$/
    );
  });
});
```

`engine/tests/features/slug.test.ts`:
```typescript
import { describe, expect, it } from "bun:test";
import { isValidSlug, buildFeatureId, sanitizeSlug } from "../../src/features/slug.ts";

describe("slug utilities", () => {
  it("validates ascii kebab-case slug", () => {
    expect(isValidSlug("dq-json-config")).toBe(true);
    expect(isValidSlug("Dq-Json")).toBe(false);
    expect(isValidSlug("dq_json")).toBe(false);
    expect(isValidSlug("dq--json")).toBe(false);
    expect(isValidSlug("中文")).toBe(false);
  });

  it("builds full feature id with YYYY-MM prefix", () => {
    expect(buildFeatureId("2026-04", "dq-json-config")).toBe("2026-04-dq-json-config");
  });

  it("sanitizes free text into a candidate slug", () => {
    expect(sanitizeSlug("【通用配置】json 格式配置")).toBe("json-ge-shi-pei-zhi");
  });
});
```

`engine/tests/features/run-id.test.ts`:
```typescript
import { describe, expect, it } from "bun:test";
import { generateRunId } from "../../src/features/run-id.ts";

describe("run-id generator", () => {
  it("produces YYYYMMDD-HHmm-xxxxxxxx", () => {
    const id = generateRunId(new Date("2026-05-10T14:30:00Z"));
    expect(id).toMatch(/^\d{8}-\d{4}-[a-z0-9]{8}$/);
  });

  it("produces distinct ids across calls", () => {
    const a = generateRunId();
    const b = generateRunId();
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run failing tests**

Run: `bun test engine/tests/features/`
Expected: 3 modules FAIL — missing.

- [ ] **Step 3: Implement helpers**

`engine/src/features/paths.ts`:
```typescript
import { join } from "node:path";
import { repoRoot } from "../../lib/paths.ts";

export const workspaceRoot = (project: string) =>
  join(repoRoot(), "workspace", project);

export const featuresRoot = (project: string) =>
  join(workspaceRoot(project), "features");

export const featureDir = (project: string, featureId: string) =>
  join(featuresRoot(project), featureId);

export const sharedRoot = (project: string) =>
  join(workspaceRoot(project), "_shared");

export const kataRoot = () => join(repoRoot(), ".kata");

export const resultsDir = (project: string, featureId: string, runId: string) =>
  join(featureDir(project, featureId), "results", runId);
```

`engine/src/features/slug.ts`:
```typescript
import { pinyin } from "pinyin-pro";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FEATURE_ID_RE = /^\d{4}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(s: string): boolean {
  return SLUG_RE.test(s);
}

export function isValidFeatureId(s: string): boolean {
  return FEATURE_ID_RE.test(s);
}

export function buildFeatureId(yyyyMm: string, slug: string): string {
  return `${yyyyMm}-${slug}`;
}

export function sanitizeSlug(input: string): string {
  const stripped = input.replace(/[【】\[\]()（）]/g, "").trim();
  const py = pinyin(stripped, { toneType: "none", type: "array" })
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return py;
}
```

`engine/src/features/run-id.ts`:
```typescript
import { randomBytes } from "node:crypto";

export function generateRunId(now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const min = String(now.getUTCMinutes()).padStart(2, "0");
  const rand = randomBytes(4).toString("hex"); // 8 hex chars
  return `${yyyy}${mm}${dd}-${hh}${min}-${rand}`;
}
```

- [ ] **Step 4: Add pinyin-pro dependency**

Run: `cd engine && bun add pinyin-pro && cd ..`
Expected: pinyin-pro added.

- [ ] **Step 5: Run tests**

Run: `bun test engine/tests/features/`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add engine/src/features/ engine/tests/features/ engine/package.json
git commit -m "feat(cli): add feature paths/slug/run-id helpers"
```

### Task 3.1: `kata features new <slug>`

**Files:**
- Create: `engine/src/cli/features-new.ts`
- Modify: `engine/src/cli/features.ts` (new namespace command builder)
- Modify: `engine/src/cli/index.ts` (register `features` namespace)
- Test: `engine/tests/cli/features-new.test.ts`

- [ ] **Step 1: Write failing test**

`engine/tests/cli/features-new.test.ts`:
```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parse } from "yaml";
import { runFeaturesNew } from "../../src/cli/features-new.ts";

describe("kata features new", () => {
  let scratch: string;

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "kata-feat-new-"));
  });
  afterEach(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  it("creates feature dir with metadata.yaml and manifest.json", async () => {
    await runFeaturesNew({
      project: "dataAssets",
      slug: "dq-test",
      displayName: "测试",
      modules: ["dq"],
      customers: ["standard"],
      versions: [],
      owners: ["koco"],
      inputs: ["prd"],
      workspaceRoot: join(scratch, "workspace"),
      now: new Date("2026-05-14T10:00:00Z"),
    });
    const featureDir = join(scratch, "workspace/dataAssets/features/2026-05-dq-test");
    expect(existsSync(featureDir)).toBe(true);
    const meta = parse(readFileSync(join(featureDir, "metadata.yaml"), "utf-8"));
    expect(meta.id).toBe("2026-05-dq-test");
    expect(meta.modules).toEqual(["dq"]);
    const manifest = JSON.parse(readFileSync(join(featureDir, "manifest.json"), "utf-8"));
    expect(manifest.schema).toBe("FeatureManifest@2");
    expect(manifest.feature_id).toBe("2026-05-dq-test");
    expect(existsSync(join(featureDir, "inputs/prd-attachments/.gitkeep"))).toBe(true);
  });

  it("refuses to overwrite existing feature", async () => {
    const ctx = {
      project: "dataAssets", slug: "dq-test", displayName: "x",
      modules: ["dq"], customers: ["standard"], versions: [], owners: ["koco"],
      inputs: ["prd"], workspaceRoot: join(scratch, "workspace"),
      now: new Date("2026-05-14T10:00:00Z"),
    };
    await runFeaturesNew(ctx);
    await expect(runFeaturesNew(ctx)).rejects.toThrow(/already exists/i);
  });

  it("rejects invalid slug", async () => {
    await expect(runFeaturesNew({
      project: "dataAssets", slug: "BAD UPPER", displayName: "x",
      modules: ["dq"], customers: ["standard"], versions: [], owners: ["koco"],
      inputs: ["prd"], workspaceRoot: join(scratch, "workspace"),
      now: new Date("2026-05-14T10:00:00Z"),
    })).rejects.toThrow(/invalid slug/i);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/cli/features-new.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `engine/src/cli/features-new.ts`:
```typescript
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { stringify } from "yaml";
import { isValidSlug, buildFeatureId } from "../features/slug.ts";

export interface FeaturesNewContext {
  project: string;
  slug: string;
  displayName: string;
  modules: string[];
  customers: string[];
  versions: string[];
  owners: string[];
  inputs: ("prd" | "lanhu" | "axure" | "manual" | "bug-hotfix")[];
  workspaceRoot: string;
  now?: Date;
}

export async function runFeaturesNew(ctx: FeaturesNewContext): Promise<{ featureId: string; featureDir: string }> {
  if (!isValidSlug(ctx.slug)) {
    throw new Error(`Invalid slug: ${ctx.slug}. Must match ^[a-z0-9]+(?:-[a-z0-9]+)*$`);
  }
  const now = ctx.now ?? new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const yyyyMm = `${yyyy}-${mm}`;
  const featureId = buildFeatureId(yyyyMm, ctx.slug);
  const featureDir = join(ctx.workspaceRoot, ctx.project, "features", featureId);

  if (existsSync(featureDir)) {
    throw new Error(`Feature already exists: ${featureDir}`);
  }
  mkdirSync(featureDir, { recursive: true });

  const today = now.toISOString().slice(0, 10);
  const metadata = {
    schema: "FeatureMetadata@1",
    id: featureId,
    display_name: ctx.displayName,
    status: "active",
    created_at: today,
    updated_at: today,
    modules: ctx.modules,
    customers: ctx.customers,
    versions: ctx.versions,
    owners: ctx.owners,
    inputs: ctx.inputs.map((kind) => ({ kind, ref: "" })),
    relates_to: [],
    emits: { cases_xmind: true, archive: true, playwright_tests: true },
  };
  writeFileSync(join(featureDir, "metadata.yaml"), stringify(metadata), "utf-8");

  const manifest = {
    schema: "FeatureManifest@2",
    feature_id: featureId,
    case_drafting: {
      status: "not-started",
      archive_path: null,
      xmind_path: null,
      requirement_atoms: [],
      coverage_matrix_path: null,
    },
    automation: {
      status: "not-started",
      intents: [],
      last_handoff_path: null,
      last_run_status: "not-run",
    },
    files: {
      archive: null,
      xmind: null,
      tests_root: null,
      latest_results: null,
    },
  };
  writeFileSync(join(featureDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");

  for (const kind of ctx.inputs) {
    const subdir = kind === "prd" ? "prd-attachments" : kind === "lanhu" ? "lanhu-snapshots" : "reference-docs";
    const path = join(featureDir, "inputs", subdir);
    mkdirSync(path, { recursive: true });
    writeFileSync(join(path, ".gitkeep"), "", "utf-8");
  }

  return { featureId, featureDir };
}
```

- [ ] **Step 4: Add features namespace command**

Create `engine/src/cli/features.ts`:
```typescript
import { Command } from "commander";
import { join } from "node:path";
import { repoRoot } from "../../lib/paths.ts";
import { runFeaturesNew } from "./features-new.ts";

export function buildFeaturesCommand(): Command {
  const features = new Command("features").description("Feature 目录管理");

  features
    .command("new <slug>")
    .description("创建 feature 骨架 + metadata.yaml + manifest.json")
    .requiredOption("--display-name <name>", "中文人读名")
    .option("--project <name>", "项目名", "dataAssets")
    .option("--modules <list>", "模块逗号分隔", "")
    .option("--customers <list>", "客户逗号分隔", "")
    .option("--versions <list>", "版本逗号分隔", "")
    .option("--owners <list>", "负责人逗号分隔", "")
    .option("--inputs <list>", "输入类型 (prd,lanhu,axure,manual,bug-hotfix) 逗号分隔", "prd")
    .action(async (slug: string, opts: Record<string, string>) => {
      const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
      const result = await runFeaturesNew({
        project: opts.project,
        slug,
        displayName: opts.displayName,
        modules: split(opts.modules),
        customers: split(opts.customers),
        versions: split(opts.versions),
        owners: split(opts.owners),
        inputs: split(opts.inputs) as ("prd" | "lanhu" | "axure" | "manual" | "bug-hotfix")[],
        workspaceRoot: join(repoRoot(), "workspace"),
      });
      console.log(`Created ${result.featureId} at ${result.featureDir}`);
    });

  return features;
}
```

- [ ] **Step 5: Register in cli/index.ts**

Add to imports:
```typescript
import { buildFeaturesCommand } from "./features.ts";
```

Add to registrations:
```typescript
kata.addCommand(buildFeaturesCommand());
```

- [ ] **Step 6: Add yaml dependency if missing**

Run: `grep '"yaml"' engine/package.json || (cd engine && bun add yaml && cd ..)`

- [ ] **Step 7: Run test**

Run: `bun test engine/tests/cli/features-new.test.ts`
Expected: 3 PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(cli): add kata features new"
```

### Task 3.2: `kata features ls [--filter]`

**Files:**
- Create: `engine/src/cli/features-ls.ts`
- Modify: `engine/src/cli/features.ts` (register `ls` verb)
- Test: `engine/tests/cli/features-ls.test.ts`

- [ ] **Step 1: Write failing test**

`engine/tests/cli/features-ls.test.ts`:
```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { stringify } from "yaml";
import { runFeaturesLs } from "../../src/cli/features-ls.ts";

function seedFeature(root: string, id: string, opts: { modules?: string[]; customers?: string[]; status?: string }) {
  const dir = join(root, "dataAssets/features", id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "metadata.yaml"),
    stringify({
      schema: "FeatureMetadata@1",
      id, display_name: id, status: opts.status ?? "active",
      created_at: "2026-04-01", updated_at: "2026-04-01",
      modules: opts.modules ?? [], customers: opts.customers ?? [],
      versions: [], owners: [], inputs: [], relates_to: [],
      emits: { cases_xmind: true, archive: true, playwright_tests: true },
    }),
  );
  writeFileSync(
    join(dir, "manifest.json"),
    JSON.stringify({
      schema: "FeatureManifest@2", feature_id: id,
      case_drafting: { status: "completed" },
      automation: { status: "ready", intents: [], last_run_status: "passing" },
      files: {},
    }),
  );
}

describe("kata features ls", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "kata-feat-ls-"));
    seedFeature(scratch, "2026-04-dq-a", { modules: ["dq"], status: "active" });
    seedFeature(scratch, "2026-04-sec-b", { modules: ["security"], status: "active" });
    seedFeature(scratch, "2026-03-old", { modules: ["dq"], status: "archived" });
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("lists all features with no filter", async () => {
    const rows = await runFeaturesLs({ project: "dataAssets", workspaceRoot: scratch });
    expect(rows).toHaveLength(3);
  });

  it("filters by module", async () => {
    const rows = await runFeaturesLs({ project: "dataAssets", workspaceRoot: scratch, module: "dq" });
    expect(rows.map((r) => r.id)).toEqual(["2026-03-old", "2026-04-dq-a"]);
  });

  it("filters by status", async () => {
    const rows = await runFeaturesLs({ project: "dataAssets", workspaceRoot: scratch, status: "active" });
    expect(rows).toHaveLength(2);
  });

  it("combines filters as AND", async () => {
    const rows = await runFeaturesLs({
      project: "dataAssets",
      workspaceRoot: scratch,
      module: "dq",
      status: "active",
    });
    expect(rows.map((r) => r.id)).toEqual(["2026-04-dq-a"]);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/cli/features-ls.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `engine/src/cli/features-ls.ts`:
```typescript
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export interface FeaturesLsContext {
  project: string;
  workspaceRoot: string;
  module?: string;
  customer?: string;
  version?: string;
  owner?: string;
  status?: string;
  automationStatus?: string;
  lastRun?: string;
}

export interface FeatureRow {
  id: string;
  displayName: string;
  status: string;
  modules: string[];
  customers: string[];
  automationStatus: string;
  lastRunStatus: string;
}

export async function runFeaturesLs(ctx: FeaturesLsContext): Promise<FeatureRow[]> {
  const featuresDir = join(ctx.workspaceRoot, ctx.project, "features");
  if (!existsSync(featuresDir)) return [];
  const rows: FeatureRow[] = [];
  for (const name of readdirSync(featuresDir)) {
    const dir = join(featuresDir, name);
    if (!statSync(dir).isDirectory()) continue;
    if (name === "INDEX.md") continue;
    const metaPath = join(dir, "metadata.yaml");
    const manifestPath = join(dir, "manifest.json");
    if (!existsSync(metaPath) || !existsSync(manifestPath)) continue;
    const meta = parse(readFileSync(metaPath, "utf-8"));
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    rows.push({
      id: meta.id,
      displayName: meta.display_name,
      status: meta.status,
      modules: meta.modules ?? [],
      customers: meta.customers ?? [],
      automationStatus: manifest.automation?.status ?? "not-started",
      lastRunStatus: manifest.automation?.last_run_status ?? "not-run",
    });
  }

  const filtered = rows.filter((r) => {
    if (ctx.module && !r.modules.includes(ctx.module)) return false;
    if (ctx.customer && !r.customers.includes(ctx.customer)) return false;
    if (ctx.status && r.status !== ctx.status) return false;
    if (ctx.automationStatus && r.automationStatus !== ctx.automationStatus) return false;
    if (ctx.lastRun && r.lastRunStatus !== ctx.lastRun) return false;
    return true;
  });
  filtered.sort((a, b) => a.id.localeCompare(b.id));
  return filtered;
}
```

- [ ] **Step 4: Register `ls` verb in features.ts**

Edit `engine/src/cli/features.ts`, add inside `buildFeaturesCommand()`:
```typescript
features
  .command("ls")
  .description("列出 features 支持多维过滤")
  .option("--project <name>", "项目名", "dataAssets")
  .option("--module <name>", "按 module 过滤")
  .option("--customer <name>", "按 customer 过滤")
  .option("--version <name>", "按 version 过滤")
  .option("--owner <name>", "按 owner 过滤")
  .option("--status <name>", "按 status 过滤")
  .option("--automation-status <name>", "按 automation status 过滤")
  .option("--last-run <name>", "按 last_run_status 过滤")
  .option("--format <fmt>", "输出格式 (table|json|md)", "table")
  .action(async (opts: Record<string, string>) => {
    const rows = await runFeaturesLs({
      project: opts.project,
      workspaceRoot: join(repoRoot(), "workspace"),
      module: opts.module,
      customer: opts.customer,
      version: opts.version,
      owner: opts.owner,
      status: opts.status,
      automationStatus: opts.automationStatus,
      lastRun: opts.lastRun,
    });
    if (opts.format === "json") {
      console.log(JSON.stringify(rows, null, 2));
    } else if (opts.format === "md") {
      console.log("| ID | Display | Status | Modules | Automation | Last Run |");
      console.log("|---|---|---|---|---|---|");
      for (const r of rows) console.log(`| ${r.id} | ${r.displayName} | ${r.status} | ${r.modules.join(",")} | ${r.automationStatus} | ${r.lastRunStatus} |`);
    } else {
      for (const r of rows) console.log(`${r.id}\t${r.status}\t${r.modules.join(",")}\t${r.automationStatus}\t${r.lastRunStatus}`);
    }
  });
```

Add `import { runFeaturesLs } from "./features-ls.ts";` to top.

- [ ] **Step 5: Run test**

Run: `bun test engine/tests/cli/features-ls.test.ts`
Expected: 4 PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(cli): add kata features ls with multi-dim filter"
```

### Task 3.3: `kata features show <slug>`

**Files:**
- Create: `engine/src/cli/features-show.ts`
- Modify: `engine/src/cli/features.ts` (register `show` verb)
- Test: `engine/tests/cli/features-show.test.ts`

- [ ] **Step 1: Write failing test**

`engine/tests/cli/features-show.test.ts`:
```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { stringify } from "yaml";
import { runFeaturesShow } from "../../src/cli/features-show.ts";

describe("kata features show", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "kata-feat-show-"));
    const dir = join(scratch, "dataAssets/features/2026-04-x");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "metadata.yaml"), stringify({
      schema: "FeatureMetadata@1", id: "2026-04-x", display_name: "X",
      status: "active", created_at: "2026-04-01", updated_at: "2026-04-01",
      modules: ["dq"], customers: ["standard"], versions: [], owners: ["koco"],
      inputs: [], relates_to: [],
      emits: { cases_xmind: true, archive: true, playwright_tests: true },
    }));
    writeFileSync(join(dir, "manifest.json"), JSON.stringify({
      schema: "FeatureManifest@2", feature_id: "2026-04-x",
      case_drafting: { status: "completed", archive_path: "archive.md", requirement_atoms: [{ id: "RA-1", source_ref: "x" }] },
      automation: { status: "ready", intents: [{ intent_id: "SR-INTENT-X", case_files: ["tests/cases/t01.ts"], automation_status: "ready" }], last_run_status: "passing" },
      files: {},
    }));
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("returns feature detail object", async () => {
    const detail = await runFeaturesShow({
      project: "dataAssets",
      featureId: "2026-04-x",
      workspaceRoot: scratch,
    });
    expect(detail.metadata.id).toBe("2026-04-x");
    expect(detail.manifest.automation.intents).toHaveLength(1);
    expect(detail.recentRuns).toEqual([]);
  });

  it("throws on missing feature", async () => {
    await expect(runFeaturesShow({
      project: "dataAssets",
      featureId: "nonexistent",
      workspaceRoot: scratch,
    })).rejects.toThrow(/not found/i);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/cli/features-show.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `engine/src/cli/features-show.ts`:
```typescript
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export interface FeaturesShowContext {
  project: string;
  featureId: string;
  workspaceRoot: string;
}

export async function runFeaturesShow(ctx: FeaturesShowContext) {
  const dir = join(ctx.workspaceRoot, ctx.project, "features", ctx.featureId);
  if (!existsSync(dir)) throw new Error(`Feature not found: ${ctx.featureId}`);
  const metadata = parse(readFileSync(join(dir, "metadata.yaml"), "utf-8"));
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf-8"));
  const resultsDir = join(dir, "results");
  let recentRuns: string[] = [];
  if (existsSync(resultsDir)) {
    recentRuns = readdirSync(resultsDir)
      .filter((n) => statSync(join(resultsDir, n)).isDirectory())
      .sort()
      .reverse()
      .slice(0, 5);
  }
  return { metadata, manifest, recentRuns };
}
```

- [ ] **Step 4: Register verb**

Edit `engine/src/cli/features.ts`, add inside `buildFeaturesCommand()`:
```typescript
features
  .command("show <featureId>")
  .description("显示单 feature 详情")
  .option("--project <name>", "项目名", "dataAssets")
  .action(async (featureId: string, opts: Record<string, string>) => {
    const d = await runFeaturesShow({
      project: opts.project,
      featureId,
      workspaceRoot: join(repoRoot(), "workspace"),
    });
    console.log(JSON.stringify(d, null, 2));
  });
```

Add `import { runFeaturesShow } from "./features-show.ts";`.

- [ ] **Step 5: Run test, commit**

Run: `bun test engine/tests/cli/features-show.test.ts`
Expected: 2 PASS.

```bash
git add -A
git commit -m "feat(cli): add kata features show"
```

### Task 3.4: `kata features lint`

**Files:**
- Create: `engine/src/cli/features-lint.ts`
- Modify: `engine/src/cli/features.ts` (register `lint` verb)
- Test: `engine/tests/cli/features-lint.test.ts`

- [ ] **Step 1: Write failing test**

`engine/tests/cli/features-lint.test.ts`:
```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { stringify } from "yaml";
import { runFeaturesLint } from "../../src/cli/features-lint.ts";

describe("kata features lint", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "kata-feat-lint-"));
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  function seedOk() {
    const dir = join(scratch, "dataAssets/features/2026-04-x");
    mkdirSync(join(scratch, "dataAssets/_shared/_meta"), { recursive: true });
    writeFileSync(join(scratch, "dataAssets/_shared/_meta/modules.yaml"),
      stringify({ enum: ["dq"] }));
    writeFileSync(join(scratch, "dataAssets/_shared/_meta/customers.yaml"),
      stringify({ enum: ["standard"] }));
    writeFileSync(join(scratch, "dataAssets/_shared/_meta/versions.yaml"),
      stringify({ enum: ["v6.4"] }));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "metadata.yaml"), stringify({
      schema: "FeatureMetadata@1", id: "2026-04-x", display_name: "X",
      status: "active", created_at: "2026-04-01", updated_at: "2026-04-01",
      modules: ["dq"], customers: ["standard"], versions: ["v6.4"], owners: ["koco"],
      inputs: [], relates_to: [],
      emits: { cases_xmind: true, archive: true, playwright_tests: true },
    }));
    writeFileSync(join(dir, "manifest.json"), JSON.stringify({
      schema: "FeatureManifest@2", feature_id: "2026-04-x",
      case_drafting: { status: "not-started" },
      automation: { status: "not-started", intents: [], last_run_status: "not-run" },
      files: {},
    }));
  }

  it("passes for valid feature", async () => {
    seedOk();
    const r = await runFeaturesLint({ project: "dataAssets", workspaceRoot: scratch });
    expect(r.violations).toHaveLength(0);
  });

  it("reports missing metadata.yaml", async () => {
    mkdirSync(join(scratch, "dataAssets/features/2026-04-missing"), { recursive: true });
    const r = await runFeaturesLint({ project: "dataAssets", workspaceRoot: scratch });
    expect(r.violations.some((v) => v.rule === "metadata_missing")).toBe(true);
  });

  it("reports module not in enum", async () => {
    seedOk();
    const meta = join(scratch, "dataAssets/features/2026-04-x/metadata.yaml");
    writeFileSync(meta, stringify({
      schema: "FeatureMetadata@1", id: "2026-04-x", display_name: "X",
      status: "active", created_at: "2026-04-01", updated_at: "2026-04-01",
      modules: ["nope"], customers: ["standard"], versions: ["v6.4"], owners: ["koco"],
      inputs: [], relates_to: [],
      emits: { cases_xmind: true, archive: true, playwright_tests: true },
    }));
    const r = await runFeaturesLint({ project: "dataAssets", workspaceRoot: scratch });
    expect(r.violations.some((v) => v.rule === "module_not_in_enum")).toBe(true);
  });

  it("reports id mismatch with dir name", async () => {
    seedOk();
    const meta = join(scratch, "dataAssets/features/2026-04-x/metadata.yaml");
    writeFileSync(meta, stringify({
      schema: "FeatureMetadata@1", id: "2026-04-WRONG", display_name: "X",
      status: "active", created_at: "2026-04-01", updated_at: "2026-04-01",
      modules: ["dq"], customers: ["standard"], versions: ["v6.4"], owners: ["koco"],
      inputs: [], relates_to: [],
      emits: { cases_xmind: true, archive: true, playwright_tests: true },
    }));
    const r = await runFeaturesLint({ project: "dataAssets", workspaceRoot: scratch });
    expect(r.violations.some((v) => v.rule === "id_dir_mismatch")).toBe(true);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/cli/features-lint.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `engine/src/cli/features-lint.ts`:
```typescript
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { loadFeatureMetadataValidator, loadFeatureManifestValidator } from "../schemas/loaders.ts";

export interface FeaturesLintContext {
  project: string;
  workspaceRoot: string;
  featureId?: string;
}

export interface Violation {
  feature: string;
  rule: string;
  message: string;
}

const SLUG_RE = /^\d{4}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

function loadEnum(sharedRoot: string, file: string): string[] {
  const path = join(sharedRoot, "_meta", file);
  if (!existsSync(path)) return [];
  const parsed = parse(readFileSync(path, "utf-8"));
  return parsed?.enum ?? [];
}

export async function runFeaturesLint(ctx: FeaturesLintContext): Promise<{ violations: Violation[] }> {
  const featuresDir = join(ctx.workspaceRoot, ctx.project, "features");
  const sharedDir = join(ctx.workspaceRoot, ctx.project, "_shared");
  const violations: Violation[] = [];
  if (!existsSync(featuresDir)) return { violations };

  const modulesEnum = loadEnum(sharedDir, "modules.yaml");
  const customersEnum = loadEnum(sharedDir, "customers.yaml");
  const versionsEnum = loadEnum(sharedDir, "versions.yaml");

  const metaValidator = loadFeatureMetadataValidator();
  const manifestValidator = loadFeatureManifestValidator();

  const names = ctx.featureId ? [ctx.featureId] : readdirSync(featuresDir);
  for (const name of names) {
    const dir = join(featuresDir, name);
    if (name === "INDEX.md" || !existsSync(dir) || !statSync(dir).isDirectory()) continue;

    if (!SLUG_RE.test(name)) {
      violations.push({ feature: name, rule: "dir_name_invalid", message: `Directory name does not match ^\\d{4}-\\d{2}-[a-z0-9-]+$` });
      continue;
    }

    const metaPath = join(dir, "metadata.yaml");
    const manifestPath = join(dir, "manifest.json");

    if (!existsSync(metaPath)) {
      violations.push({ feature: name, rule: "metadata_missing", message: "metadata.yaml not present" });
      continue;
    }
    if (!existsSync(manifestPath)) {
      violations.push({ feature: name, rule: "manifest_missing", message: "manifest.json not present" });
    }

    const meta = parse(readFileSync(metaPath, "utf-8"));
    if (!metaValidator(meta)) {
      violations.push({ feature: name, rule: "metadata_schema_invalid", message: JSON.stringify(metaValidator.errors) });
      continue;
    }

    if (meta.id !== name) {
      violations.push({ feature: name, rule: "id_dir_mismatch", message: `metadata.id="${meta.id}" but dir="${name}"` });
    }

    for (const m of meta.modules ?? []) {
      if (modulesEnum.length && !modulesEnum.includes(m)) {
        violations.push({ feature: name, rule: "module_not_in_enum", message: `Module "${m}" not in _shared/_meta/modules.yaml` });
      }
    }
    for (const c of meta.customers ?? []) {
      if (customersEnum.length && !customersEnum.includes(c)) {
        violations.push({ feature: name, rule: "customer_not_in_enum", message: `Customer "${c}" not in _shared/_meta/customers.yaml` });
      }
    }
    for (const v of meta.versions ?? []) {
      if (versionsEnum.length && !versionsEnum.includes(v)) {
        violations.push({ feature: name, rule: "version_not_in_enum", message: `Version "${v}" not in _shared/_meta/versions.yaml` });
      }
    }

    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      if (!manifestValidator(manifest)) {
        violations.push({ feature: name, rule: "manifest_schema_invalid", message: JSON.stringify(manifestValidator.errors) });
      } else if (manifest.feature_id !== name) {
        violations.push({ feature: name, rule: "manifest_id_mismatch", message: `manifest.feature_id="${manifest.feature_id}" but dir="${name}"` });
      }
    }
  }

  return { violations };
}
```

- [ ] **Step 4: Register verb**

Edit `engine/src/cli/features.ts`:
```typescript
features
  .command("lint [featureId]")
  .description("lint feature metadata + manifest")
  .option("--project <name>", "项目名", "dataAssets")
  .option("--exit-code", "exit non-zero on violations", false)
  .action(async (featureId: string | undefined, opts: { project: string; exitCode: boolean }) => {
    const r = await runFeaturesLint({
      project: opts.project,
      workspaceRoot: join(repoRoot(), "workspace"),
      featureId,
    });
    for (const v of r.violations) {
      console.log(`${v.feature} [${v.rule}] ${v.message}`);
    }
    console.log(`\n[features lint] violations=${r.violations.length}`);
    if (opts.exitCode && r.violations.length > 0) process.exit(1);
  });
```

Add `import { runFeaturesLint } from "./features-lint.ts";`.

- [ ] **Step 5: Run test, commit**

Run: `bun test engine/tests/cli/features-lint.test.ts`
Expected: 4 PASS.

```bash
git add -A
git commit -m "feat(cli): add kata features lint with schema + enum checks"
```

### Task 3.5: `kata features index`

**Files:**
- Create: `engine/src/cli/features-index.ts`
- Modify: `engine/src/cli/features.ts` (register `index` verb)
- Test: `engine/tests/cli/features-index.test.ts`

- [ ] **Step 1: Write failing test**

`engine/tests/cli/features-index.test.ts`:
```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { stringify } from "yaml";
import { runFeaturesIndex } from "../../src/cli/features-index.ts";

function seed(scratch: string, id: string, opts: { modules?: string[]; status?: string; displayName?: string }) {
  const dir = join(scratch, "dataAssets/features", id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "metadata.yaml"), stringify({
    schema: "FeatureMetadata@1", id, display_name: opts.displayName ?? id,
    status: opts.status ?? "active", created_at: "2026-04-01", updated_at: "2026-04-01",
    modules: opts.modules ?? [], customers: [], versions: [], owners: [],
    inputs: [], relates_to: [],
    emits: { cases_xmind: true, archive: true, playwright_tests: true },
  }));
  writeFileSync(join(dir, "manifest.json"), JSON.stringify({
    schema: "FeatureManifest@2", feature_id: id,
    case_drafting: { status: "completed" },
    automation: { status: "ready", intents: [], last_run_status: "passing" },
    files: {},
  }));
}

describe("kata features index", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "kata-feat-idx-"));
    seed(scratch, "2026-04-dq-a", { modules: ["dq"], status: "active", displayName: "数据质量A" });
    seed(scratch, "2026-04-sec-b", { modules: ["security"], status: "active" });
    seed(scratch, "2026-03-old", { modules: ["dq"], status: "archived" });
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("writes INDEX.md with feature_count = 3", async () => {
    await runFeaturesIndex({ project: "dataAssets", workspaceRoot: scratch, now: new Date("2026-05-14T10:00:00Z") });
    const content = readFileSync(join(scratch, "dataAssets/features/INDEX.md"), "utf-8");
    expect(content).toContain("<!-- feature_count: 3 -->");
    expect(content).toContain("数据质量A");
    expect(content).toContain("## By Module");
    expect(content).toContain("dq");
    expect(content).toContain("security");
  });

  it("includes a 'do not edit' header", async () => {
    await runFeaturesIndex({ project: "dataAssets", workspaceRoot: scratch });
    const content = readFileSync(join(scratch, "dataAssets/features/INDEX.md"), "utf-8");
    expect(content).toContain("<!-- generated by kata features index; do not edit -->");
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/cli/features-index.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `engine/src/cli/features-index.ts`:
```typescript
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runFeaturesLs, type FeatureRow } from "./features-ls.ts";

export interface FeaturesIndexContext {
  project: string;
  workspaceRoot: string;
  now?: Date;
}

function groupBy<T, K extends string | number>(rows: T[], keyFn: (r: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const r of rows) {
    const k = keyFn(r);
    const arr = m.get(k) ?? [];
    arr.push(r);
    m.set(k, arr);
  }
  return m;
}

export async function runFeaturesIndex(ctx: FeaturesIndexContext): Promise<void> {
  const rows = await runFeaturesLs({ project: ctx.project, workspaceRoot: ctx.workspaceRoot });
  const now = (ctx.now ?? new Date()).toISOString();

  const lines: string[] = [];
  lines.push("<!-- generated by kata features index; do not edit -->");
  lines.push(`<!-- last_generated: ${now} -->`);
  lines.push(`<!-- feature_count: ${rows.length} -->`);
  lines.push("");
  lines.push("# Features Index");
  lines.push("");

  const byStatus = groupBy(rows, (r) => r.status);
  lines.push("## By Status");
  for (const [status, items] of byStatus) {
    lines.push(`- ${status} (${items.length})`);
  }
  lines.push("");

  const byModule = new Map<string, FeatureRow[]>();
  for (const r of rows) {
    for (const m of r.modules) {
      const arr = byModule.get(m) ?? [];
      arr.push(r);
      byModule.set(m, arr);
    }
  }
  lines.push("## By Module");
  for (const [mod, items] of byModule) {
    lines.push(`- ${mod} (${items.length})`);
  }
  lines.push("");

  lines.push("## All Features");
  lines.push("| ID | Display Name | Modules | Status | Automation | Last Run |");
  lines.push("|---|---|---|---|---|---|");
  for (const r of rows) {
    lines.push(`| [${r.id}](${r.id}/) | ${r.displayName} | ${r.modules.join(",")} | ${r.status} | ${r.automationStatus} | ${r.lastRunStatus} |`);
  }

  writeFileSync(
    join(ctx.workspaceRoot, ctx.project, "features", "INDEX.md"),
    lines.join("\n") + "\n",
    "utf-8",
  );
}
```

- [ ] **Step 4: Register verb**

Edit `engine/src/cli/features.ts`:
```typescript
features
  .command("index")
  .description("生成 features/INDEX.md")
  .option("--project <name>", "项目名", "dataAssets")
  .action(async (opts: { project: string }) => {
    await runFeaturesIndex({
      project: opts.project,
      workspaceRoot: join(repoRoot(), "workspace"),
    });
    console.log("INDEX.md regenerated");
  });
```

Add `import { runFeaturesIndex } from "./features-index.ts";`.

- [ ] **Step 5: Run test, commit**

Run: `bun test engine/tests/cli/features-index.test.ts`
Expected: 2 PASS.

```bash
git add -A
git commit -m "feat(cli): add kata features index"
```

### Task 3.6: `kata cases validate` (port from discuss validate)

**Files:**
- Create: `engine/src/cli/cases-validate.ts` (wraps existing `discuss.ts` validate action)
- Modify: `engine/src/cli/cases-lint.ts` (extend `buildCasesCommand` with `validate` verb)
- Test: `engine/tests/cli/cases-validate.test.ts`

- [ ] **Step 1: Write failing test**

`engine/tests/cli/cases-validate.test.ts`:
```typescript
import { describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { repoRoot } from "../../lib/paths.ts";

describe("kata cases validate", () => {
  it("exposes validate subcommand", () => {
    const out = execSync(`bun ${join(repoRoot(), "engine/bin/kata")} cases --help`, { encoding: "utf-8" });
    expect(out).toContain("validate");
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/cli/cases-validate.test.ts`
Expected: FAIL — verb missing.

- [ ] **Step 3: Implement wrapper**

`discuss.ts` lives at `engine/src/discuss.ts` (NOT `engine/src/cli/discuss.ts`). It currently exports `program` as a Commander Command object. Create `engine/src/cli/cases-validate.ts` that wraps the existing `discuss` command logic:

**Step 3a: First, extract a callable action from `engine/src/discuss.ts`.**

Add to `engine/src/discuss.ts`:
```typescript
export interface DiscussValidateContext {
  project: string;
  featureId: string;
  workspace: string;
  checkSourceRefs: string[];
}

export async function runDiscussValidate(ctx: DiscussValidateContext): Promise<void> {
  // Extract existing action body from `discuss` program's `.command("validate")` handler.
  // Move the action logic here, then call this from the Commander .action() wrapper.
}
```

**Step 3b: Create `engine/src/cli/cases-validate.ts`:**
```typescript
import { Command } from "commander";
import { join } from "node:path";
import { repoRoot } from "../../lib/paths.ts";
import { runDiscussValidate } from "../discuss.ts";

export function registerCasesValidate(parent: Command): void {
  parent
    .command("validate <featureId>")
    .description("Validate case-drafting evidence (replaces `discuss validate`)")
    .option("--project <name>", "项目名", "dataAssets")
    .option("--check-source-refs <list>", "Source ref kinds to require", "prd.file,lanhu.fixture")
    .action(async (featureId: string, opts: { project: string; checkSourceRefs: string }) => {
      const workspace = join(repoRoot(), "workspace");
      await runDiscussValidate({
        project: opts.project,
        featureId,
        workspace,
        checkSourceRefs: opts.checkSourceRefs.split(","),
      });
    });
}
```

Note: `discuss.ts` is at `engine/src/discuss.ts` (one level up from `cli/`), so the import is `"../discuss.ts"`. The refactor to extract `runDiscussValidate` from the existing Commander action body is a prerequisite — budget ~30 min for this extraction and adding a unit test.

- [ ] **Step 4: Register `validate` verb in cases command**

Edit `engine/src/cli/cases-lint.ts`:
```typescript
import { registerCasesValidate } from "./cases-validate.ts";

export function buildCasesCommand(): Command {
  const cases = new Command("cases").description("用例级操作");
  // ... existing `lint` registration ...
  registerCasesValidate(cases);
  return cases;
}
```

- [ ] **Step 5: Run test, commit**

Run: `bun test engine/tests/cli/cases-validate.test.ts`
Expected: PASS.

```bash
git add -A
git commit -m "feat(cli): add kata cases validate (ports discuss validate)"
```

### Task 3.7: `kata results path` (new-run path generator)

**Files:**
- Create: `engine/src/cli/results-path.ts`
- Create: `engine/src/cli/results.ts` (namespace command builder)
- Modify: `engine/src/cli/index.ts` (register `results`)
- Test: `engine/tests/cli/results-path.test.ts`

- [ ] **Step 1: Write failing test**

`engine/tests/cli/results-path.test.ts`:
```typescript
import { describe, expect, it } from "bun:test";
import { runResultsPath } from "../../src/cli/results-path.ts";

describe("kata results path", () => {
  it("returns a feature/results/<run-id> path", async () => {
    const out = await runResultsPath({
      project: "dataAssets",
      featureId: "2026-04-x",
      workspaceRoot: "/tmp/ws",
      newRun: true,
      now: new Date("2026-05-10T14:30:00Z"),
    });
    expect(out.path).toMatch(/^\/tmp\/ws\/dataAssets\/features\/2026-04-x\/results\/\d{8}-\d{4}-[a-z0-9]{8}$/);
  });

  it("returns latest existing run when --new-run is false", async () => {
    // setup tmp dir with existing runs; skipped here for brevity, covered by integration tests in Phase 6
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/cli/results-path.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `engine/src/cli/results-path.ts`:
```typescript
import { join } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { generateRunId } from "../features/run-id.ts";

export interface ResultsPathContext {
  project: string;
  featureId: string;
  workspaceRoot: string;
  newRun: boolean;
  now?: Date;
}

export async function runResultsPath(ctx: ResultsPathContext): Promise<{ runId: string; path: string }> {
  const featureRoot = join(ctx.workspaceRoot, ctx.project, "features", ctx.featureId);
  const resultsRoot = join(featureRoot, "results");
  if (ctx.newRun) {
    const runId = generateRunId(ctx.now);
    return { runId, path: join(resultsRoot, runId) };
  }
  if (!existsSync(resultsRoot)) throw new Error(`No results found for ${ctx.featureId}`);
  const runs = readdirSync(resultsRoot).sort().reverse();
  if (runs.length === 0) throw new Error(`No runs found for ${ctx.featureId}`);
  return { runId: runs[0], path: join(resultsRoot, runs[0]) };
}
```

Create `engine/src/cli/results.ts`:
```typescript
import { Command } from "commander";
import { join } from "node:path";
import { repoRoot } from "../../lib/paths.ts";
import { runResultsPath } from "./results-path.ts";

export function buildResultsCommand(): Command {
  const results = new Command("results").description("运行产物管理");
  results
    .command("path <featureId>")
    .description("分配新 run 目录或返回最近 run 路径")
    .option("--project <name>", "项目名", "dataAssets")
    .option("--new-run", "分配新 run id", false)
    .action(async (featureId: string, opts: { project: string; newRun: boolean }) => {
      const out = await runResultsPath({
        project: opts.project,
        featureId,
        workspaceRoot: join(repoRoot(), "workspace"),
        newRun: opts.newRun,
      });
      console.log(out.path);
    });
  return results;
}
```

Register in `engine/src/cli/index.ts`:
```typescript
import { buildResultsCommand } from "./results.ts";
kata.addCommand(buildResultsCommand());
```

- [ ] **Step 4: Run test, commit**

Replace the second test case body with a concrete fixture-based check so it runs as a real test, not a placeholder:

```typescript
  it("returns latest existing run when --new-run is false", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "results-path-"));
    try {
      const root = join(scratch, "dataAssets/features/2026-04-x/results");
      mkdirSync(join(root, "20260501-0900-aaaaaaaa"), { recursive: true });
      mkdirSync(join(root, "20260502-0900-bbbbbbbb"), { recursive: true });
      const out = await runResultsPath({
        project: "dataAssets",
        featureId: "2026-04-x",
        workspaceRoot: scratch,
        newRun: false,
      });
      expect(out.runId).toBe("20260502-0900-bbbbbbbb");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
```

Add to the top of the test file:
```typescript
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
```

Run: `bun test engine/tests/cli/results-path.test.ts`
Expected: 2 PASS.

```bash
git add -A
git commit -m "feat(cli): add kata results path"
```

### Task 3.8: `kata results publish` / `kata results prune`

**Files:**
- Create: `engine/src/cli/results-publish.ts`
- Create: `engine/src/cli/results-prune.ts`
- Modify: `engine/src/cli/results.ts` (register verbs)
- Test: `engine/tests/cli/results-publish.test.ts`
- Test: `engine/tests/cli/results-prune.test.ts`

- [ ] **Step 1: Write failing tests**

`engine/tests/cli/results-publish.test.ts`:
```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runResultsPublish } from "../../src/cli/results-publish.ts";

describe("kata results publish", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "kata-results-pub-"));
    const runDir = join(scratch, "dataAssets/features/2026-04-x/results/20260510-1430-aaaaaaaa");
    mkdirSync(join(runDir, "allure-results"), { recursive: true });
    writeFileSync(join(runDir, "allure-results/dummy.json"), "{}");
    writeFileSync(join(runDir, "handoff.json"), JSON.stringify({ schema: "PlaywrightAutomationHandoff@2", status: "passed" }));
    writeFileSync(join(runDir, "handoff.md"), "# handoff");
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("copies allure-results and handoff into published-reports and writes .published marker", async () => {
    await runResultsPublish({
      project: "dataAssets",
      featureId: "2026-04-x",
      runId: "20260510-1430-aaaaaaaa",
      workspaceRoot: scratch,
    });
    const pubRoot = join(scratch, "dataAssets/_shared/published-reports/2026-05/2026-04-x-aaaaaaaa");
    expect(existsSync(join(pubRoot, "handoff.md"))).toBe(true);
    expect(existsSync(join(pubRoot, "handoff.json"))).toBe(true);
    expect(existsSync(join(pubRoot, "allure-results/dummy.json"))).toBe(true);
    const marker = join(scratch, "dataAssets/features/2026-04-x/results/20260510-1430-aaaaaaaa/.published");
    expect(existsSync(marker)).toBe(true);
    const markerData = JSON.parse(readFileSync(marker, "utf-8"));
    expect(markerData.published_to).toContain("2026-04-x-aaaaaaaa");
  });
});
```

`engine/tests/cli/results-prune.test.ts`:
```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runResultsPrune } from "../../src/cli/results-prune.ts";

describe("kata results prune", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "kata-results-prune-"));
    const root = join(scratch, "dataAssets/features/2026-04-x/results");
    for (const id of ["20260501-0900-aaaaaaaa", "20260502-0900-bbbbbbbb", "20260503-0900-cccccccc", "20260504-0900-dddddddd"]) {
      mkdirSync(join(root, id), { recursive: true });
    }
    writeFileSync(join(root, "20260501-0900-aaaaaaaa/.published"), "{}");
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("keeps last N runs plus all .published runs", async () => {
    await runResultsPrune({
      project: "dataAssets",
      featureId: "2026-04-x",
      keep: 2,
      workspaceRoot: scratch,
    });
    const remaining = readdirSync(join(scratch, "dataAssets/features/2026-04-x/results"));
    expect(remaining).toContain("20260501-0900-aaaaaaaa"); // protected
    expect(remaining).toContain("20260503-0900-cccccccc"); // top-N
    expect(remaining).toContain("20260504-0900-dddddddd"); // top-N
    expect(remaining).not.toContain("20260502-0900-bbbbbbbb");
  });
});
```

- [ ] **Step 2: Run failing tests**

Run: `bun test engine/tests/cli/results-publish.test.ts engine/tests/cli/results-prune.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement publish**

Create `engine/src/cli/results-publish.ts`:
```typescript
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface ResultsPublishContext {
  project: string;
  featureId: string;
  runId: string;
  workspaceRoot: string;
}

export async function runResultsPublish(ctx: ResultsPublishContext): Promise<{ publishedPath: string }> {
  const runDir = join(ctx.workspaceRoot, ctx.project, "features", ctx.featureId, "results", ctx.runId);
  if (!existsSync(runDir)) throw new Error(`Run not found: ${runDir}`);

  const shortRun = ctx.runId.split("-").pop() ?? ctx.runId;
  const yyyymm = ctx.runId.slice(0, 6);
  const ymFolder = `${yyyymm.slice(0, 4)}-${yyyymm.slice(4)}`;
  const publishedPath = join(
    ctx.workspaceRoot,
    ctx.project,
    "_shared/published-reports",
    ymFolder,
    `${ctx.featureId}-${shortRun}`,
  );
  mkdirSync(publishedPath, { recursive: true });

  for (const entry of ["handoff.md", "handoff.json", "allure-results", "playwright"]) {
    const src = join(runDir, entry);
    if (existsSync(src)) cpSync(src, join(publishedPath, entry), { recursive: true });
  }

  writeFileSync(
    join(runDir, ".published"),
    JSON.stringify({ published_at: new Date().toISOString(), published_to: publishedPath }, null, 2),
    "utf-8",
  );

  return { publishedPath };
}
```

- [ ] **Step 4: Implement prune**

Create `engine/src/cli/results-prune.ts`:
```typescript
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

export interface ResultsPruneContext {
  project: string;
  featureId?: string;
  workspaceRoot: string;
  keep: number;
}

function pruneForFeature(featureRoot: string, keep: number): { removed: string[]; kept: string[] } {
  const resultsDir = join(featureRoot, "results");
  if (!existsSync(resultsDir)) return { removed: [], kept: [] };
  const all = readdirSync(resultsDir)
    .filter((n) => statSync(join(resultsDir, n)).isDirectory())
    .sort();
  const published = new Set(all.filter((n) => existsSync(join(resultsDir, n, ".published"))));
  const topN = new Set(all.slice(-keep));
  const keepSet = new Set([...published, ...topN]);
  const removed: string[] = [];
  const kept: string[] = [];
  for (const n of all) {
    if (keepSet.has(n)) {
      kept.push(n);
    } else {
      rmSync(join(resultsDir, n), { recursive: true, force: true });
      removed.push(n);
    }
  }
  return { removed, kept };
}

export async function runResultsPrune(ctx: ResultsPruneContext): Promise<{ removed: string[]; kept: string[] }> {
  const featuresDir = join(ctx.workspaceRoot, ctx.project, "features");
  const targets = ctx.featureId
    ? [ctx.featureId]
    : readdirSync(featuresDir).filter((n) => statSync(join(featuresDir, n)).isDirectory() && n !== "INDEX.md");

  let removed: string[] = [];
  let kept: string[] = [];
  for (const id of targets) {
    const r = pruneForFeature(join(featuresDir, id), ctx.keep);
    removed = removed.concat(r.removed.map((n) => `${id}/${n}`));
    kept = kept.concat(r.kept.map((n) => `${id}/${n}`));
  }
  return { removed, kept };
}
```

- [ ] **Step 5: Register verbs in results.ts**

Edit `engine/src/cli/results.ts` (extend `buildResultsCommand`):
```typescript
import { runResultsPublish } from "./results-publish.ts";
import { runResultsPrune } from "./results-prune.ts";

// inside buildResultsCommand():
results
  .command("publish <featureId>")
  .description("把 run 渲染到 _shared/published-reports/")
  .requiredOption("--run <id>", "run-id to publish")
  .option("--project <name>", "项目名", "dataAssets")
  .action(async (featureId: string, opts: { project: string; run: string }) => {
    const r = await runResultsPublish({
      project: opts.project,
      featureId,
      runId: opts.run,
      workspaceRoot: join(repoRoot(), "workspace"),
    });
    console.log(`Published to ${r.publishedPath}`);
  });

results
  .command("prune [featureId]")
  .description("清理老 run，保留最近 N 次 + 所有 .published runs")
  .option("--keep <n>", "保留数量", "10")
  .option("--project <name>", "项目名", "dataAssets")
  .option("--all", "对所有 features 操作", false)
  .action(async (featureId: string | undefined, opts: { project: string; keep: string; all: boolean }) => {
    const r = await runResultsPrune({
      project: opts.project,
      featureId: opts.all ? undefined : featureId,
      workspaceRoot: join(repoRoot(), "workspace"),
      keep: parseInt(opts.keep, 10),
    });
    console.log(`Removed ${r.removed.length}, kept ${r.kept.length}`);
  });
```

- [ ] **Step 6: Run tests, commit**

Run: `bun test engine/tests/cli/results-publish.test.ts engine/tests/cli/results-prune.test.ts`
Expected: PASS.

```bash
git add -A
git commit -m "feat(cli): add kata results publish + prune"
```

### Task 3.9: `kata handoff render`

**Files:**
- Create: `engine/src/cli/handoff-render.ts`
- Create: `engine/src/cli/handoff.ts` (namespace builder)
- Create: `engine/templates/handoff.md.hbs` (Handlebars template)
- Modify: `engine/src/cli/index.ts`
- Test: `engine/tests/cli/handoff-render.test.ts`

- [ ] **Step 1: Write failing test**

`engine/tests/cli/handoff-render.test.ts`:
```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runHandoffRender } from "../../src/cli/handoff-render.ts";

describe("kata handoff render", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "kata-handoff-"));
    const runDir = join(scratch, "dataAssets/features/2026-04-x/results/20260510-1430-aaaaaaaa");
    mkdirSync(runDir, { recursive: true });
    writeFileSync(join(runDir, "handoff.json"), JSON.stringify({
      schema: "PlaywrightAutomationHandoff@2",
      feature_id: "2026-04-x",
      run_id: "20260510-1430-aaaaaaaa",
      status: "passed",
      intent_id: "SR-INTENT-X",
      source_refs: { intent: "SR-INTENT-X", env: "SR-ENV-PREFLIGHT-X", probe: "SR-UI-PROBE-X", self_run: "SR-SELF-RUN-X" },
      run_command: "npx playwright test ...",
      run_exit_code: 0,
      results: { total: 5, passed: 5, failed: 0, skipped: 0, report_paths: { playwright_json: "x", allure: "y", stdout: "z" } },
      quality_gates: [{ name: "no_weak_assertions", status: "passed" }],
      unresolved_blockers: [],
      next_actions: [],
    }));
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("renders handoff.md with generated header and key fields", async () => {
    await runHandoffRender({
      project: "dataAssets",
      featureId: "2026-04-x",
      runId: "20260510-1430-aaaaaaaa",
      workspaceRoot: scratch,
    });
    const md = readFileSync(
      join(scratch, "dataAssets/features/2026-04-x/results/20260510-1430-aaaaaaaa/handoff.md"),
      "utf-8",
    );
    expect(md).toContain("<!-- generated by kata handoff render; do not edit -->");
    expect(md).toContain("<!-- schema: PlaywrightAutomationHandoff@2 -->");
    expect(md).toContain("status: passed");
    expect(md).toContain("SR-INTENT-X");
    expect(md).toContain("5/5 passed");
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/cli/handoff-render.test.ts`
Expected: FAIL.

- [ ] **Step 3: Create template**

Create `engine/templates/handoff.md.hbs`:
```handlebars
<!-- generated by kata handoff render; do not edit -->
<!-- source: handoff.json -->
<!-- schema: PlaywrightAutomationHandoff@2 -->

# Handoff — {{feature_id}} / run {{run_id}}

- status: {{status}}
- intent: {{intent_id}}
- exit_code: {{run_exit_code}}
- results: {{results.passed}}/{{results.total}} passed (failed={{results.failed}}, skipped={{results.skipped}})

## Source Refs
- intent: {{source_refs.intent}}
- env: {{source_refs.env}}
- probe: {{source_refs.probe}}
- self_run: {{source_refs.self_run}}

## Quality Gates
{{#each quality_gates}}
- {{name}}: {{status}}{{#if detail}} — {{detail}}{{/if}}
{{/each}}

## Unresolved Blockers
{{#if unresolved_blockers.length}}
{{#each unresolved_blockers}}
- [{{kind}}] {{#if case}}case={{case}}{{/if}} {{#if evidence_path}}evidence={{evidence_path}}{{/if}}
{{/each}}
{{else}}
None.
{{/if}}

## Next Actions
{{#if next_actions.length}}
{{#each next_actions}}
- {{this}}
{{/each}}
{{else}}
None.
{{/if}}

## Run Command
```
{{run_command}}
```

## Report Paths
- playwright_json: {{results.report_paths.playwright_json}}
- allure: {{results.report_paths.allure}}
- stdout: {{results.report_paths.stdout}}
```

- [ ] **Step 4: Implement render**

Create `engine/src/cli/handoff-render.ts`:
```typescript
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Handlebars from "handlebars";
import { repoRoot } from "../../lib/paths.ts";
import { loadHandoffV2Validator } from "../schemas/loaders.ts";

export interface HandoffRenderContext {
  project: string;
  featureId: string;
  runId: string;
  workspaceRoot: string;
}

const tmplPath = join(repoRoot(), "engine/templates/handoff.md.hbs");
const tmpl = Handlebars.compile(readFileSync(tmplPath, "utf-8"));
const validate = loadHandoffV2Validator();

export async function runHandoffRender(ctx: HandoffRenderContext): Promise<{ path: string }> {
  const runDir = join(ctx.workspaceRoot, ctx.project, "features", ctx.featureId, "results", ctx.runId);
  const jsonPath = join(runDir, "handoff.json");
  const data = JSON.parse(readFileSync(jsonPath, "utf-8"));
  if (!validate(data)) {
    throw new Error(`handoff.json schema invalid: ${JSON.stringify(validate.errors)}`);
  }
  const mdPath = join(runDir, "handoff.md");
  writeFileSync(mdPath, tmpl(data), "utf-8");
  return { path: mdPath };
}
```

- [ ] **Step 5: Create handoff namespace**

Create `engine/src/cli/handoff.ts`:
```typescript
import { Command } from "commander";
import { join } from "node:path";
import { repoRoot } from "../../lib/paths.ts";
import { runHandoffRender } from "./handoff-render.ts";

export function buildHandoffCommand(): Command {
  const handoff = new Command("handoff").description("Handoff 渲染与校验");
  handoff
    .command("render <featureId>")
    .description("从 handoff.json 渲染 handoff.md")
    .requiredOption("--run <id>", "run-id")
    .option("--project <name>", "项目名", "dataAssets")
    .action(async (featureId: string, opts: { project: string; run: string }) => {
      const r = await runHandoffRender({
        project: opts.project,
        featureId,
        runId: opts.run,
        workspaceRoot: join(repoRoot(), "workspace"),
      });
      console.log(`Rendered ${r.path}`);
    });
  return handoff;
}
```

Register in `engine/src/cli/index.ts`:
```typescript
import { buildHandoffCommand } from "./handoff.ts";
kata.addCommand(buildHandoffCommand());
```

- [ ] **Step 6: Run test, commit**

Run: `bun test engine/tests/cli/handoff-render.test.ts`
Expected: PASS.

```bash
git add -A
git commit -m "feat(cli): add kata handoff render"
```

### Task 3.10: `kata env check`

**Files:**
- Create: `engine/src/cli/env-check.ts`
- Create: `engine/src/cli/env.ts`
- Modify: `engine/src/cli/index.ts`
- Test: `engine/tests/cli/env-check.test.ts`

- [ ] **Step 1: Write failing test**

`engine/tests/cli/env-check.test.ts`:
```typescript
import { describe, expect, it } from "bun:test";
import { runEnvCheck } from "../../src/cli/env-check.ts";

describe("kata env check", () => {
  it("returns ok object with required keys", async () => {
    const r = await runEnvCheck({ project: "dataAssets", env: "ci63" });
    expect(r).toHaveProperty("baseUrl");
    expect(r).toHaveProperty("tenant");
    expect(r).toHaveProperty("dtstackReachable");
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/cli/env-check.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement (subprocess to dtstack-cli)**

Create `engine/src/cli/env-check.ts`:
```typescript
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { repoRoot } from "../../lib/paths.ts";

export interface EnvCheckContext {
  project: string;
  env: string;
}

export async function runEnvCheck(ctx: EnvCheckContext): Promise<{ baseUrl: string; tenant: string; dtstackReachable: boolean }> {
  const envPath = join(repoRoot(), "workspace", ctx.project, "_shared/env", `${ctx.env}.yaml`);
  if (!existsSync(envPath)) {
    return { baseUrl: "", tenant: "", dtstackReachable: false };
  }
  const cfg = parse(readFileSync(envPath, "utf-8"));
  let reachable = false;
  try {
    execFileSync("dtstack-cli", ["ping", "--base-url", cfg.base_url], { stdio: "pipe", timeout: 5000 });
    reachable = true;
  } catch {
    reachable = false;
  }
  return {
    baseUrl: cfg.base_url ?? "",
    tenant: cfg.tenant_name ?? "",
    dtstackReachable: reachable,
  };
}
```

Create `engine/src/cli/env.ts`:
```typescript
import { Command } from "commander";
import { runEnvCheck } from "./env-check.ts";

export function buildEnvCommand(): Command {
  const env = new Command("env").description("环境配置与平台 API 检查");
  env
    .command("check")
    .description("校验环境配置 + 平台可达")
    .option("--project <name>", "项目名", "dataAssets")
    .requiredOption("--env <name>", "env profile name")
    .action(async (opts: { project: string; env: string }) => {
      const r = await runEnvCheck(opts);
      console.log(JSON.stringify(r, null, 2));
      if (!r.dtstackReachable) process.exit(2);
    });
  return env;
}
```

Register in `engine/src/cli/index.ts`:
```typescript
import { buildEnvCommand } from "./env.ts";
kata.addCommand(buildEnvCommand());
```

- [ ] **Step 4: Run test, commit**

Run: `bun test engine/tests/cli/env-check.test.ts`
Expected: PASS.

```bash
git add -A
git commit -m "feat(cli): add kata env check (subprocess to dtstack-cli)"
```

---

## Phase 3 Checkpoint

```bash
kata features --help
kata features new --help
kata features ls --help
kata features lint --help
kata features index --help
kata features show --help
kata cases --help
kata results --help
kata handoff --help
kata env --help
bun test engine/tests/cli/ engine/tests/features/
bun run ci
```
Expected: all help screens render; tests pass.

---

## Phase 4: Six New Quality Gates

> All gates implemented as pure functions in `engine/src/lint/` returning `{ violations: Violation[] }`. Wired into `kata cases lint` aggregator (existing pattern from `cases-lint.ts`).

### Task 4.0: Shared lint types

**Files:**
- Create: `engine/src/lint/types.ts`

- [ ] **Step 1: Create shared `Violation` interface**

All quality-gate linters use the same shape. Define once in `engine/src/lint/types.ts`:

```typescript
export interface Violation {
  file: string;
  rule: string;
  message: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add engine/src/lint/types.ts
git commit -m "feat(quality-gate): add shared Violation type"
```

All subsequent lint modules import `type { Violation } from "./types.ts"`.

### Task 4.1: Quality gate `metadata_present_and_valid`

**Files:**
- This gate is **already implemented** by `runFeaturesLint` in Task 3.4.
- Modify: `engine/src/cli/cases-lint.ts` (call `runFeaturesLint` and merge violations)
- Test: `engine/tests/lint/metadata-gate.test.ts`

- [ ] **Step 1: Write failing test**

`engine/tests/lint/metadata-gate.test.ts`:
```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runFeaturesLint } from "../../src/cli/features-lint.ts";

describe("gate: metadata_present_and_valid", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "gate-meta-"));
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("reports metadata_missing when metadata.yaml is absent", async () => {
    mkdirSync(join(scratch, "dataAssets/features/2026-04-x"), { recursive: true });
    const r = await runFeaturesLint({ project: "dataAssets", workspaceRoot: scratch });
    expect(r.violations.some((v) => v.rule === "metadata_missing")).toBe(true);
  });
});
```

- [ ] **Step 2: Run, confirm pass (test reuses already-implemented function)**

Run: `bun test engine/tests/lint/metadata-gate.test.ts`
Expected: PASS.

- [ ] **Step 3: Wire into `kata cases lint` aggregator**

Edit `engine/src/cli/cases-lint.ts`. Inside the `.action` of `lint` verb, after existing `reports`:
```typescript
const featuresLint = await runFeaturesLint({
  project: "dataAssets",
  workspaceRoot: join(repoRoot(), "workspace"),
});
for (const v of featuresLint.violations) {
  console.log(`${v.feature} [${v.rule}] ${v.message}`);
}
```
Add `import { runFeaturesLint } from "./features-lint.ts";`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(quality-gate): wire metadata_present_and_valid into cases lint"
```

### Task 4.2: Quality gate `manifest_present_and_valid`

**Files:**
- Same as 4.1 — `runFeaturesLint` already covers it.
- Test: `engine/tests/lint/manifest-gate.test.ts`

- [ ] **Step 1: Write tests**

```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { stringify } from "yaml";
import { runFeaturesLint } from "../../src/cli/features-lint.ts";

describe("gate: manifest_present_and_valid", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "gate-manifest-"));
    const dir = join(scratch, "dataAssets/features/2026-04-x");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "metadata.yaml"), stringify({
      schema: "FeatureMetadata@1", id: "2026-04-x", display_name: "X",
      status: "active", created_at: "2026-04-01", updated_at: "2026-04-01",
      modules: [], customers: [], versions: [], owners: [], inputs: [], relates_to: [],
      emits: { cases_xmind: true, archive: true, playwright_tests: true },
    }));
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("reports manifest_missing", async () => {
    const r = await runFeaturesLint({ project: "dataAssets", workspaceRoot: scratch });
    expect(r.violations.some((v) => v.rule === "manifest_missing")).toBe(true);
  });

  it("reports manifest_schema_invalid", async () => {
    const dir = join(scratch, "dataAssets/features/2026-04-x");
    writeFileSync(join(dir, "manifest.json"), JSON.stringify({ schema: "FeatureManifest@2", feature_id: "2026-04-x" }));
    const r = await runFeaturesLint({ project: "dataAssets", workspaceRoot: scratch });
    expect(r.violations.some((v) => v.rule === "manifest_schema_invalid")).toBe(true);
  });
});
```

- [ ] **Step 2: Run, commit (covered by existing implementation)**

Run: `bun test engine/tests/lint/manifest-gate.test.ts`
Expected: PASS.

```bash
git add -A
git commit -m "test(quality-gate): manifest_present_and_valid coverage"
```

### Task 4.3: Quality gate `case_traceability_header`

**Files:**
- Create: `engine/src/lint/case-traceability-header.ts`
- Modify: `engine/src/cli/cases-lint.ts` (aggregate)
- Test: `engine/tests/lint/case-traceability-header.test.ts`

- [ ] **Step 1: Write failing test**

`engine/tests/lint/case-traceability-header.test.ts`:
```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { lintCaseTraceabilityHeader } from "../../src/lint/case-traceability-header.ts";

describe("gate: case_traceability_header", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "gate-trace-"));
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  function seed(content: string) {
    const dir = join(scratch, "dataAssets/features/2026-04-x/tests/cases");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "t01.ts"), content);
  }

  it("passes when all 4 trace lines present", () => {
    seed(`// spec: features/2026-04-x/archive.md#case=1
// intent: SR-INTENT-X
// probe: SR-UI-PROBE-X
// page: _shared/pages/dq-page.ts
import { test } from "@playwright/test";
test("x", async () => {});
`);
    const r = lintCaseTraceabilityHeader(scratch);
    expect(r.violations).toHaveLength(0);
  });

  it("reports missing spec line", () => {
    seed(`// intent: SR-INTENT-X
// probe: SR-UI-PROBE-X
// page: _shared/pages/dq-page.ts
test("x", async () => {});
`);
    const r = lintCaseTraceabilityHeader(scratch);
    expect(r.violations.some((v) => v.rule === "trace_header_missing_spec")).toBe(true);
  });

  it("reports missing intent", () => {
    seed(`// spec: features/2026-04-x/archive.md#case=1
// probe: SR-UI-PROBE-X
// page: _shared/pages/dq-page.ts
test("x", async () => {});
`);
    const r = lintCaseTraceabilityHeader(scratch);
    expect(r.violations.some((v) => v.rule === "trace_header_missing_intent")).toBe(true);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/lint/case-traceability-header.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `engine/src/lint/case-traceability-header.ts`:
```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import type { Violation } from "./types.ts";

const REQUIRED = [
  { tag: "spec", re: /^\/\/\s*spec:\s*\S+/m, rule: "trace_header_missing_spec" },
  { tag: "intent", re: /^\/\/\s*intent:\s*SR-INTENT-[A-Z0-9-]+/m, rule: "trace_header_missing_intent" },
  { tag: "probe", re: /^\/\/\s*probe:\s*SR-UI-PROBE-[A-Z0-9-]+/m, rule: "trace_header_missing_probe" },
  { tag: "page", re: /^\/\/\s*page:\s*_shared\/pages\/\S+/m, rule: "trace_header_missing_page" },
];

export function lintCaseTraceabilityHeader(workspaceRoot: string): { violations: Violation[] } {
  const violations: Violation[] = [];
  const pattern = join(workspaceRoot, "dataAssets/features/*/tests/cases/*.ts");
  const glob = new Glob(pattern);
  for (const file of glob.scanSync()) {
    const content = readFileSync(file, "utf-8");
    // only check first 10 lines (header zone)
    const head = content.split("\n").slice(0, 10).join("\n");
    for (const r of REQUIRED) {
      if (!r.re.test(head)) {
        violations.push({ file, rule: r.rule, message: `Missing required trace header line "${r.tag}: ..."` });
      }
    }
  }
  return { violations };
}
```

Uses Bun's built-in `Glob` (available since Bun 1.1.x; the project's Bun ≥ 1.3.8). No custom `glob.ts` helper needed.

- [ ] **Step 4: Wire into cases lint**

Edit `engine/src/cli/cases-lint.ts`:
```typescript
import { lintCaseTraceabilityHeader } from "../lint/case-traceability-header.ts";
// inside action:
reports.push(lintCaseTraceabilityHeader(opts.scope));
```

- [ ] **Step 5: Run test, commit**

Run: `bun test engine/tests/lint/case-traceability-header.test.ts`
Expected: PASS.

```bash
git add -A
git commit -m "feat(quality-gate): add case_traceability_header"
```

### Task 4.4: Quality gate `no_feature_local_helpers`

**Files:**
- Create: `engine/src/lint/no-feature-local-helpers.ts`
- Modify: `engine/src/cli/cases-lint.ts`
- Test: `engine/tests/lint/no-feature-local-helpers.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { lintNoFeatureLocalHelpers } from "../../src/lint/no-feature-local-helpers.ts";

describe("gate: no_feature_local_helpers", () => {
  let scratch: string;
  beforeEach(() => { scratch = mkdtempSync(join(tmpdir(), "gate-helpers-")); });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("reports any file under features/*/tests/helpers/", () => {
    const dir = join(scratch, "dataAssets/features/2026-04-x/tests/helpers");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "foo.ts"), "export {}");
    const r = lintNoFeatureLocalHelpers(scratch);
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].rule).toBe("feature_local_helper");
  });

  it("passes when helpers dir is empty or missing", () => {
    mkdirSync(join(scratch, "dataAssets/features/2026-04-x/tests"), { recursive: true });
    const r = lintNoFeatureLocalHelpers(scratch);
    expect(r.violations).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/lint/no-feature-local-helpers.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `engine/src/lint/no-feature-local-helpers.ts`:
```typescript
import { join } from "node:path";
import { Glob } from "bun";
import type { Violation } from "./types.ts";

export function lintNoFeatureLocalHelpers(workspaceRoot: string): { violations: Violation[] } {
  const violations: Violation[] = [];
  const pattern = join(workspaceRoot, "dataAssets/features/*/tests/helpers/*.ts");
  const glob = new Glob(pattern);
  for (const file of glob.scanSync()) {
    violations.push({
      file,
      rule: "feature_local_helper",
      message: "Helpers must live in _shared/pages/ or _shared/helpers/, not under feature tests/helpers/",
    });
  }
  return { violations };
}
```

- [ ] **Step 4: Wire + commit**

Edit `engine/src/cli/cases-lint.ts`:
```typescript
import { lintNoFeatureLocalHelpers } from "../lint/no-feature-local-helpers.ts";
reports.push(lintNoFeatureLocalHelpers(opts.scope));
```

Run: `bun test engine/tests/lint/no-feature-local-helpers.test.ts`
Expected: PASS.

```bash
git add -A
git commit -m "feat(quality-gate): add no_feature_local_helpers"
```

### Task 4.5: Quality gate `no_debug_in_cases`

**Files:**
- Create: `engine/src/lint/no-debug-in-cases.ts`
- Modify: `engine/src/cli/cases-lint.ts`
- Test: `engine/tests/lint/no-debug-in-cases.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { lintNoDebugInCases } from "../../src/lint/no-debug-in-cases.ts";

describe("gate: no_debug_in_cases", () => {
  let scratch: string;
  beforeEach(() => { scratch = mkdtempSync(join(tmpdir(), "gate-debug-")); });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  function seed(name: string) {
    const dir = join(scratch, "dataAssets/features/2026-04-x/tests/cases");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, name), "test('x', async () => {});");
  }

  it("reports *-debug*", () => {
    seed("t01-debug.spec.ts");
    const r = lintNoDebugInCases(scratch);
    expect(r.violations).toHaveLength(1);
  });

  it("reports *-repro*", () => {
    seed("foo-repro.spec.ts");
    const r = lintNoDebugInCases(scratch);
    expect(r.violations).toHaveLength(1);
  });

  it("reports diag_*", () => {
    seed("diag_foo.ts");
    const r = lintNoDebugInCases(scratch);
    expect(r.violations).toHaveLength(1);
  });

  it("passes for normal t01.ts", () => {
    seed("t01.ts");
    const r = lintNoDebugInCases(scratch);
    expect(r.violations).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/lint/no-debug-in-cases.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```typescript
import { basename, join } from "node:path";
import { Glob } from "bun";
import type { Violation } from "./types.ts";

const FORBIDDEN = [
  { re: /-debug(\.|-)/, name: "debug" },
  { re: /-repro(\.|-)/, name: "repro" },
  { re: /^diag_/, name: "diag" },
];

export function lintNoDebugInCases(workspaceRoot: string): { violations: Violation[] } {
  const violations: Violation[] = [];
  const pattern = join(workspaceRoot, "dataAssets/features/*/tests/cases/*");
  const glob = new Glob(pattern);
  for (const file of glob.scanSync()) {
    const name = basename(file);
    for (const { re, name: kind } of FORBIDDEN) {
      if (re.test(name)) {
        violations.push({ file, rule: "debug_in_cases", message: `Forbidden ${kind} naming under tests/cases/` });
        break;
      }
    }
  }
  return { violations };
}
```

- [ ] **Step 4: Wire + commit**

Edit `engine/src/cli/cases-lint.ts`:
```typescript
import { lintNoDebugInCases } from "../lint/no-debug-in-cases.ts";
reports.push(lintNoDebugInCases(opts.scope));
```

Run: `bun test engine/tests/lint/no-debug-in-cases.test.ts`
Expected: PASS.

```bash
git add -A
git commit -m "feat(quality-gate): add no_debug_in_cases"
```

### Task 4.6: Quality gate `handoff_double_track`

**Files:**
- Create: `engine/src/lint/handoff-double-track.ts`
- Modify: `engine/src/cli/cases-lint.ts`
- Test: `engine/tests/lint/handoff-double-track.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { lintHandoffDoubleTrack } from "../../src/lint/handoff-double-track.ts";

describe("gate: handoff_double_track", () => {
  let scratch: string;
  beforeEach(() => { scratch = mkdtempSync(join(tmpdir(), "gate-hd-")); });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  function seedRun(opts: { json?: string; md?: string }) {
    const dir = join(scratch, "dataAssets/features/2026-04-x/results/20260510-1430-aaaaaaaa");
    mkdirSync(dir, { recursive: true });
    if (opts.json !== undefined) writeFileSync(join(dir, "handoff.json"), opts.json);
    if (opts.md !== undefined) writeFileSync(join(dir, "handoff.md"), opts.md);
  }

  it("passes when both files exist and md has generated header", () => {
    seedRun({
      json: JSON.stringify({ schema: "PlaywrightAutomationHandoff@2" }),
      md: "<!-- generated by kata handoff render; do not edit -->\nfoo",
    });
    const r = lintHandoffDoubleTrack(scratch);
    expect(r.violations).toHaveLength(0);
  });

  it("reports md missing", () => {
    seedRun({ json: "{}" });
    const r = lintHandoffDoubleTrack(scratch);
    expect(r.violations.some((v) => v.rule === "handoff_md_missing")).toBe(true);
  });

  it("reports json missing", () => {
    seedRun({ md: "<!-- generated by kata handoff render; do not edit -->" });
    const r = lintHandoffDoubleTrack(scratch);
    expect(r.violations.some((v) => v.rule === "handoff_json_missing")).toBe(true);
  });

  it("reports md without generated header", () => {
    seedRun({ json: "{}", md: "edited by hand" });
    const r = lintHandoffDoubleTrack(scratch);
    expect(r.violations.some((v) => v.rule === "handoff_md_header_missing")).toBe(true);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/lint/handoff-double-track.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```typescript
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import type { Violation } from "./types.ts";

const REQUIRED_HEADER = "<!-- generated by kata handoff render; do not edit -->";

export function lintHandoffDoubleTrack(workspaceRoot: string): { violations: Violation[] } {
  const violations: Violation[] = [];
  const pattern = join(workspaceRoot, "dataAssets/features/*/results/*");
  const glob = new Glob(pattern);
  for (const runDir of glob.scanSync()) {
    const json = join(runDir, "handoff.json");
    const md = join(runDir, "handoff.md");
    const hasJson = existsSync(json);
    const hasMd = existsSync(md);
    if (hasJson && !hasMd) {
      violations.push({ file: runDir, rule: "handoff_md_missing", message: "handoff.json without handoff.md" });
    }
    if (!hasJson && hasMd) {
      violations.push({ file: runDir, rule: "handoff_json_missing", message: "handoff.md without handoff.json" });
    }
    if (hasMd) {
      const content = readFileSync(md, "utf-8");
      if (!content.startsWith(REQUIRED_HEADER)) {
        violations.push({ file: md, rule: "handoff_md_header_missing", message: "handoff.md must start with the generated header" });
      }
    }
  }
  return { violations };
}
```

- [ ] **Step 4: Wire + commit**

Edit `engine/src/cli/cases-lint.ts`:
```typescript
import { lintHandoffDoubleTrack } from "../lint/handoff-double-track.ts";
reports.push(lintHandoffDoubleTrack(opts.scope));
```

Run: `bun test engine/tests/lint/handoff-double-track.test.ts`
Expected: PASS.

```bash
git add -A
git commit -m "feat(quality-gate): add handoff_double_track"
```

### Task 4.7: Upgrade `cases_lint` to read SourceRefRegistry

**Files:**
- Modify: `engine/src/lint/weak-assertion.ts` or wherever SR-INTENT/SR-UI-PROBE/SR-SELF-RUN are currently grep'd
- Create: `engine/src/lint/source-ref-registry.ts` (loader + prefix validator)
- Test: `engine/tests/lint/source-ref-registry.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it } from "bun:test";
import { getRegisteredPrefixes, isRegisteredPrefix } from "../../src/lint/source-ref-registry.ts";

describe("SourceRefRegistry loader", () => {
  it("returns 4 prefixes", () => {
    const names = getRegisteredPrefixes().map((p) => p.prefix);
    expect(names.sort()).toEqual(["SR-ENV-PREFLIGHT", "SR-INTENT", "SR-SELF-RUN", "SR-UI-PROBE"]);
  });

  it("matches known prefix", () => {
    expect(isRegisteredPrefix("SR-INTENT-FOO123")).toBe(true);
  });

  it("rejects unregistered prefix", () => {
    expect(isRegisteredPrefix("SR-FOOBAR-XYZ")).toBe(false);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/lint/source-ref-registry.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `engine/src/lint/source-ref-registry.ts`:
```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { repoRoot } from "../../lib/paths.ts";

interface PrefixEntry { prefix: string; pattern: string; description: string; generated_by: string; generated_at_step: string; }

let cache: PrefixEntry[] | null = null;

export function getRegisteredPrefixes(): PrefixEntry[] {
  if (cache) return cache;
  const path = join(repoRoot(), ".ai/core/schemas/source-ref-registry.yaml");
  const data = parse(readFileSync(path, "utf-8"));
  cache = data.prefixes as PrefixEntry[];
  return cache;
}

export function isRegisteredPrefix(ref: string): boolean {
  for (const p of getRegisteredPrefixes()) {
    if (new RegExp(p.pattern).test(ref)) return true;
  }
  return false;
}
```

- [ ] **Step 4: Refactor existing SR grep to use registry**

Find existing grep references to SR-INTENT/SR-ENV/SR-UI-PROBE/SR-SELF-RUN in `engine/src/lint/` (e.g. `weak-assertion.ts` or similar). Replace hardcoded regexes with `isRegisteredPrefix(found)`.

- [ ] **Step 5: Run test, commit**

Run: `bun test engine/tests/lint/source-ref-registry.test.ts`
Expected: PASS.

```bash
git add -A
git commit -m "feat(quality-gate): upgrade cases_lint to read SourceRefRegistry"
```

---

## Phase 4 Checkpoint

```bash
bun test engine/tests/lint/
kata cases lint --scope workspace
```
Expected: all gate tests PASS; `kata cases lint` aggregates 14+ rule outputs.

---

## Phase 5: Skill + Workflow Rewrites

> Edits to `.ai/core/skills/<skill>/skill.yaml`, `.ai/core/workflows/*.workflow.yaml`, and `.ai/core/skills/<skill>/references/*.md`. After each edit, re-render runtime projection via `bun run scripts/render-runtime-projection.ts` (or equivalent existing script).

### Task 5.1: Read existing skill + workflow files (no edits yet)

- [ ] **Step 1: Inventory affected files**

Run:
```bash
ls .ai/core/skills/case-draft/references/
ls .ai/core/skills/playwright-automation/references/
cat .ai/core/workflows/case-draft-from-prd.workflow.yaml | head -50
cat .ai/core/workflows/playwright-automation.workflow.yaml | head -50
```

Record output for reference during edits.

- [ ] **Step 2: Locate runtime projection script**

Run: `grep -r "render-runtime-projection\|projection:render" package.json scripts/ engine/`
Expected: returns path of the projection renderer script. Note it for use at Phase 5 end.

### Task 5.2: case-draft — atomization writes manifest.json

**Files:**
- Modify: `.ai/core/skills/case-draft/references/atomization-guide.md`
- Modify: `.ai/core/workflows/case-draft-from-prd.workflow.yaml`

- [ ] **Step 1: Update atomization-guide.md**

Add to end of `atomization-guide.md` a new section:
```markdown
## Output: write requirement_atoms to manifest.json

After atomization completes, write each atom to `features/<featureId>/manifest.json#case_drafting.requirement_atoms[]`:

```json
{
  "id": "RA-001",
  "source_ref": "prd.file:section-1#sha256:..."
}
```

The CLI helper `kata features lint` validates that manifest schema matches `FeatureManifest@2` (Phase 1 schema). Do not write atoms into archive.md alone; archive.md is rendered from manifest.
```

- [ ] **Step 2: Update workflow.yaml**

Edit `.ai/core/workflows/case-draft-from-prd.workflow.yaml`. Locate the `requirement-atomize` step and add `outputs` line:
```yaml
- id: requirement-atomize
  ref: atomization-guide.md
  outputs:
    - manifest.json#case_drafting.requirement_atoms
    - archive.md#section=requirement-atoms (rendered, not authoritative)
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(workflows): case-draft atomize writes manifest.json"
```

### Task 5.3: case-draft — inputs/ unified intake

**Files:**
- Modify: `.ai/core/skills/case-draft/references/source-intake-protocol.md`

- [ ] **Step 1: Add inputs/ section**

Append to `source-intake-protocol.md`:
```markdown
## Inputs directory contract

All ingested raw materials must land under `features/<featureId>/inputs/`:

- `inputs/prd-attachments/<original-filename>` — PRD docs, preserve original names
- `inputs/lanhu-snapshots/<page-name>.png` — Lanhu screenshots, named by **page**, not by numeric index
- `inputs/reference-docs/` — historical design docs, screenshots, etc

**Forbidden**: `images/`, `tmp/`, root-level `*.png` in the feature directory.

When taking lanhu snapshots, name by page semantic (`rule-task-list.png`), not `1-u1.png`.
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(workflows): case-draft inputs/ unified intake contract"
```

### Task 5.4: case-draft — automation-handoff writes manifest, drops separate md

**Files:**
- Modify: `.ai/core/skills/case-draft/references/automation-handoff-spec.md`
- Modify: `.ai/core/workflows/case-draft-from-prd.workflow.yaml`

- [ ] **Step 1: Rewrite automation-handoff-spec.md**

Replace contents with:
```markdown
# Automation Handoff Spec

Case-draft completes with manifest writes — NO separate `playwright-automation-handoff.md` is produced at this stage. (Per-run handoff comes from playwright-automation Phase.)

## Output channels

1. **Strong contract (agent-readable):** `features/<featureId>/manifest.json#automation`
   ```json
   {
     "status": "ready",
     "intents": [
       {
         "intent_id": "SR-INTENT-<id>",
         "case_files": ["tests/cases/t01-...ts"],
         "automation_status": "ready"
       }
     ]
   }
```
2. **Human-readable rendering:** `archive.md` has a section "## Automation Handoff" generated from manifest. Header `<!-- generated -->`; do not hand-edit.

## Ready criteria

Only intents with `automation_status: "ready"` are eligible for downstream playwright-automation. `deferred`/`blocked` intents remain in manifest but skipped by `kata case-normalize`.

## Confirmation guard

`manifest.automation.status: ready` requires no `confirmation-package.md` with `status: pending` exists.
```

- [ ] **Step 2: Update workflow.yaml**

Locate `automation-handoff` step and replace outputs:
```yaml
- id: automation-handoff
  ref: automation-handoff-spec.md
  outputs:
    - manifest.json#automation.intents
    - archive.md#section=automation-handoff (rendered)
  # Removed: playwright-automation-handoff.md (deprecated)
```

- [ ] **Step 3: Delete old handoff md location reference (if any)**

Search for `playwright-automation-handoff.md` in `.ai/core/`:
```bash
grep -rln "playwright-automation-handoff.md" .ai/core/
```
For each match, remove or replace with `manifest.json` reference.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(workflows): case-draft handoff writes manifest, deprecates standalone md"
```

### Task 5.5: playwright-automation — case-normalize reads manifest

**Files:**
- Modify: `.ai/core/skills/playwright-automation/references/case-normalize.md`

- [ ] **Step 1: Update case-normalize.md**

Insert at top (after frontmatter):
```markdown
## Input precedence

1. **Primary:** `features/<featureId>/manifest.json#automation.intents[]` where `automation_status: ready`. Iterate these directly.
2. **Fallback:** if manifest missing OR user passes a raw archive.md / PRD / Lanhu link, perform free-form inference as before (existing case-normalize logic).

The fallback path emits a warning `manifest_missing_fallback_inference` so we can track usage and migrate stragglers.
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(workflows): case-normalize reads manifest first, falls back to inference"
```

### Task 5.6: playwright-automation — generated spec reverse-traceability header

**Files:**
- Modify: `.ai/core/skills/playwright-automation/references/playwright-generate.md`

- [ ] **Step 1: Add header rule**

Insert a new section in `playwright-generate.md`:
```markdown
## Reverse-traceability header (mandatory)

Every generated `t*.ts` file MUST begin with 5 single-line comments before any imports:

```ts
// spec: features/<featureId>/archive.md#case=<case-id>
// intent: SR-INTENT-<id>
// probe: SR-UI-PROBE-<id>
// page: _shared/pages/<page-domain>-page.ts
// generated_at: <ISO8601 UTC timestamp>
```

`page:` lines reference `_shared/pages/`. If multiple pages are used, list one per line:
```ts
// page: _shared/pages/dq-rule-page.ts
// page: _shared/pages/dq-task-page.ts
```

Quality gate `case_traceability_header` rejects specs missing any of these lines.
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(workflows): playwright-generate mandates reverse-trace header"
```

### Task 5.7: playwright-automation — helpers hoisted to _shared/pages

**Files:**
- Modify: `.ai/core/skills/playwright-automation/references/playwright-generate.md`

- [ ] **Step 1: Add hoist rule**

Append to `playwright-generate.md`:
```markdown
## Page object location (mandatory)

- ALL page objects live in `workspace/<project>/_shared/pages/<page-domain>-page.ts`.
- It is **forbidden** to create or modify files under `features/<featureId>/tests/helpers/`.
- When a page object for the target domain already exists, REUSE it; do not regenerate or fork.
- New page objects must update `_shared/pages/INDEX.md` (CLI: `kata pages index`, see Phase 6 follow-up).

Quality gate `no_feature_local_helpers` enforces this.
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(workflows): page objects hoist to _shared/pages"
```

### Task 5.8: playwright-automation — .debug strict isolation

**Files:**
- Modify: `.ai/core/skills/playwright-automation/references/repair-loop.md`

- [ ] **Step 1: Add .debug rule**

Append to `repair-loop.md`:
```markdown
## Debug artifact isolation (mandatory)

- Debug specs created during repair-loop must live under `features/<featureId>/.debug/probe-<timestamp>.spec.ts`.
- Never put `t01-debug.spec.ts`, `*-repro.spec.ts`, or `diag_*.ts` into `tests/cases/`.
- For runtime debug captures (HAR / screenshots / trace), use `testInfo.outputPath()` inside `.debug/`.
- On successful repair, the `.debug/` directory is automatically pruned. On failed repair, `.debug/` content is preserved for blocker triage in the next handoff.

Quality gate `no_debug_in_cases` enforces naming. `.gitignore` covers `.debug/` contents.
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(workflows): repair-loop debug artifacts strictly isolated"
```

### Task 5.9: playwright-automation — self-run outputs to results/<run-id>/

**Files:**
- Modify: `.ai/core/skills/playwright-automation/references/self-run.md`

- [ ] **Step 1: Replace command + output rule**

Edit `self-run.md`, replace any existing command template with:
```markdown
## Self-run command template

1. Allocate run id via:
   ```bash
   RUN_PATH=$(kata results path <featureId> --new-run --project <project>)
   RUN_ID=$(basename "$RUN_PATH")
```
2. Execute:
   ```bash
   KATA_DATAASSETS_ENV=<env> KATA_ACTIVE_PROJECT=<project> \
     npx playwright test 'features/<featureId>/tests/runners/full.spec.ts' \
     --output="$RUN_PATH/playwright" \
     --reporter=line,json,allure
   ```
3. After test exit, write `$RUN_PATH/handoff.json` per `PlaywrightAutomationHandoff@2` schema.
4. Render md: `kata handoff render <featureId> --run "$RUN_ID" --project <project>`.

Source-ref `SR-SELF-RUN-<id>` is the run-id with `SR-SELF-RUN-` prefix and an uppercase hex tail.
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(workflows): self-run outputs to results/<run-id>/"
```

### Task 5.10: playwright-automation — handoff renders via kata handoff render

**Files:**
- Modify: `.ai/core/skills/playwright-automation/references/handoff.md`

- [ ] **Step 1: Rewrite handoff step**

Replace `handoff.md` content with:
```markdown
# Handoff

Each completed self-run produces a double-track handoff:

1. **handoff.json** (`features/<featureId>/results/<run-id>/handoff.json`) — strict `PlaywrightAutomationHandoff@2` JSON. Written by self-run step.
2. **handoff.md** — rendered from json by `kata handoff render <featureId> --run <run-id>`. Header `<!-- generated by kata handoff render; do not edit -->`. Never hand-edit.

Quality gate `handoff_double_track` enforces both files exist and md has the generated header.

Schema reference: `.ai/core/schemas/PlaywrightAutomationHandoff.v2.schema.json`.
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(workflows): handoff double-track (json + render)"
```

### Task 5.11: playwright-automation — quality-gate updated to 15 checks

**Files:**
- Modify: `.ai/core/skills/playwright-automation/references/quality-gate.md`
- Modify: `.ai/core/workflows/playwright-automation.workflow.yaml`

- [ ] **Step 1: Rewrite quality-gate.md**

Replace contents with:
```markdown
# Quality Gates (15 checks)

| # | Name | Source | Notes |
|---|---|---|---|
| 1 | no_weak_assertions | engine/src/lint/weak-assertion.ts | preserved |
| 2 | no_env_local | engine/src/lint/... | preserved |
| 3 | runner_is_aggregator | engine/src/lint/... | preserved |
| 4 | cases_in_cases_dir | engine/src/lint/... | preserved |
| 5 | session_compliant | engine/src/lint/... | preserved |
| 6 | env_profile_compliance | engine/src/lint/... | preserved |
| 7 | cases_lint | engine/src/lint/source-ref-registry.ts | upgraded to registry |
| 8 | no_dangling_helpers | engine/src/lint/... | preserved |
| 9 | spec_structure_valid | engine/src/lint/... | preserved |
| 10 | metadata_present_and_valid | engine/src/cli/features-lint.ts | new |
| 11 | manifest_present_and_valid | engine/src/cli/features-lint.ts | new |
| 12 | case_traceability_header | engine/src/lint/case-traceability-header.ts | new |
| 13 | no_feature_local_helpers | engine/src/lint/no-feature-local-helpers.ts | new |
| 14 | no_debug_in_cases | engine/src/lint/no-debug-in-cases.ts | new |
| 15 | handoff_double_track | engine/src/lint/handoff-double-track.ts | new |

All 15 checks run via `kata cases lint --exit-code` in CI and at the end of every `playwright-automation` workflow. Any violation marks the run as `quality_gate_failed`.
```

- [ ] **Step 2: Update workflow.yaml**

Edit `.ai/core/workflows/playwright-automation.workflow.yaml`. Locate `quality-gate` step; ensure it calls `kata cases lint --exit-code --scope workspace`:
```yaml
- id: quality-gate
  ref: quality-gate.md
  run: kata cases lint --exit-code --severity fail-only --scope workspace
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(workflows): quality-gate expanded to 15 checks"
```

### Task 5.12: Re-render runtime projection

**Files:**
- Modify: `.claude/skills/case-draft/**`
- Modify: `.claude/skills/playwright-automation/**`
- Modify: `.agents/skills/case-draft/**`
- Modify: `.agents/skills/playwright-automation/**`

- [ ] **Step 1: Run projection renderer**

Run: (use the script identified in Task 5.1 Step 2; common commands include)
```bash
bun run lint:ai-core
# Or directly:
kata ai-core projection check --runtime all
kata ai-core projection inventory
```

If the projection renderer is `scripts/render-runtime-projection.ts` (path discovered earlier):
```bash
bun run scripts/render-runtime-projection.ts
```

Expected: `.claude/skills/...` and `.agents/skills/...` directories contain mirror of `.ai/core/skills/...`.

- [ ] **Step 2: Verify no drift**

Run: `bun run lint:ai-core`
Expected: PASS (no projection drift).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: re-render runtime projection for v2 workflow changes"
```

---

## Phase 5 Checkpoint

```bash
bun run lint:ai-core
bun run ci
```
Expected: PASS, no drift.

---

## Phase 6: Migration Script `kata migrate v2`

> All migration logic in `engine/src/cli/migrate-v2/`. The script itself is **deletable post-migration** (Task 6.13). Tests use a micro fixture workspace.

### Task 6.1: Migration scaffold + pre-flight checks

**Files:**
- Create: `engine/src/cli/migrate-v2/index.ts`
- Create: `engine/src/cli/migrate-v2/preflight.ts`
- Create: `engine/src/cli/migrate.ts` (namespace command)
- Modify: `engine/src/cli/index.ts`
- Create: `engine/tests/cli/migrate-v2/preflight.test.ts`
- Create: `engine/src/cli/migrate-v2/feature-slug-map.yaml` (initially empty schema)

- [ ] **Step 1: Write failing pre-flight test**

`engine/tests/cli/migrate-v2/preflight.test.ts`:
```typescript
import { describe, expect, it } from "bun:test";
import { runPreflight } from "../../../src/cli/migrate-v2/preflight.ts";

describe("migrate v2 preflight", () => {
  it("fails when not on migrate/v2-layout branch", async () => {
    const r = await runPreflight({ branch: "main", gitClean: true, confirmHardCut: true, freeDiskRatio: 5, nodeVersionOk: true, noActivePlaywright: true });
    expect(r.ok).toBe(false);
    expect(r.failed).toContain("branch_check");
  });

  it("fails when git not clean", async () => {
    const r = await runPreflight({ branch: "migrate/v2-layout", gitClean: false, confirmHardCut: true, freeDiskRatio: 5, nodeVersionOk: true, noActivePlaywright: true });
    expect(r.failed).toContain("git_clean");
  });

  it("fails when --confirm-hard-cut not passed", async () => {
    const r = await runPreflight({ branch: "migrate/v2-layout", gitClean: true, confirmHardCut: false, freeDiskRatio: 5, nodeVersionOk: true, noActivePlaywright: true });
    expect(r.failed).toContain("confirm_hard_cut");
  });

  it("passes when all checks ok", async () => {
    const r = await runPreflight({ branch: "migrate/v2-layout", gitClean: true, confirmHardCut: true, freeDiskRatio: 5, nodeVersionOk: true, noActivePlaywright: true });
    expect(r.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/cli/migrate-v2/preflight.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement preflight**

Create `engine/src/cli/migrate-v2/preflight.ts`:
```typescript
export interface PreflightContext {
  branch: string;
  gitClean: boolean;
  confirmHardCut: boolean;
  freeDiskRatio: number; // workspace size multiplier available
  nodeVersionOk: boolean;
  noActivePlaywright: boolean;
}

export interface PreflightResult {
  ok: boolean;
  failed: string[];
}

export async function runPreflight(ctx: PreflightContext): Promise<PreflightResult> {
  const failed: string[] = [];
  if (ctx.branch !== "migrate/v2-layout") failed.push("branch_check");
  if (!ctx.gitClean) failed.push("git_clean");
  if (!ctx.confirmHardCut) failed.push("confirm_hard_cut");
  if (ctx.freeDiskRatio < 2) failed.push("disk_space");
  if (!ctx.nodeVersionOk) failed.push("node_version");
  if (!ctx.noActivePlaywright) failed.push("active_playwright");
  return { ok: failed.length === 0, failed };
}
```

- [ ] **Step 4: Create migrate namespace**

Create `engine/src/cli/migrate.ts`:
```typescript
import { Command } from "commander";
import { runMigrateV2 } from "./migrate-v2/index.ts";

export function buildMigrateCommand(): Command {
  const migrate = new Command("migrate").description("一次性迁移脚本");
  migrate
    .command("v2")
    .description("v2 workspace layout migration (one-shot, hard-cut)")
    .option("--dry-run", "计算变更但不写盘", false)
    .option("--confirm-hard-cut", "明确确认不可逆迁移", false)
    .option("--project <name>", "目标项目（默认 dataAssets）", "dataAssets")
    .action(async (opts: { dryRun: boolean; confirmHardCut: boolean; project: string }) => {
      const r = await runMigrateV2(opts);
      console.log(`Migration ${opts.dryRun ? "DRY-RUN" : "REAL"} complete. report=${r.reportPath}`);
      if (!r.ok) process.exit(1);
    });
  return migrate;
}
```

Create `engine/src/cli/migrate-v2/index.ts` (scaffold; stages added in 6.2–6.11):
```typescript
// Note: `statfsSync` is available in Bun ≥ 1.1 (project uses Bun 1.3.8).
// In Node 22 it's also available; for older Node, fall back to `execSync("df ...")`.
import { existsSync, mkdirSync, statSync, statfsSync, writeFileSync, cpSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { repoRoot } from "../../../lib/paths.ts";
import { runPreflight } from "./preflight.ts";

function computeFreeDiskRatio(workspacePath: string): number {
  if (!existsSync(workspacePath)) return 0;
  try {
    const stats = statfsSync(workspacePath);
    const freeBytes = Number(stats.bavail) * Number(stats.bsize);
    const wsBytes = directorySizeBytes(workspacePath);
    if (wsBytes === 0) return 99;
    return freeBytes / wsBytes;
  } catch {
    return 0;
  }
}

function directorySizeBytes(dir: string): number {
  let total = 0;
  try {
    const out = execSync(`du -sk ${JSON.stringify(dir)}`, { encoding: "utf-8" });
    total = parseInt(out.trim().split(/\s+/)[0], 10) * 1024;
  } catch {
    total = 0;
  }
  return total;
}

function hasNoActivePlaywright(): boolean {
  try {
    const out = execSync("pgrep -f playwright", { encoding: "utf-8" }).trim();
    return out.length === 0;
  } catch {
    // pgrep returns non-zero when nothing matches — treat that as "no active playwright"
    return true;
  }
}

export interface MigrateV2Options {
  dryRun: boolean;
  confirmHardCut: boolean;
  project: string;
}

export async function runMigrateV2(opts: MigrateV2Options): Promise<{ ok: boolean; reportPath: string }> {
  // Collect preflight evidence
  let branch = "main";
  try {
    branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
  } catch {}
  let gitClean = false;
  try {
    gitClean = execSync("git status --porcelain", { encoding: "utf-8" }).trim().length === 0;
  } catch {}
  const nodeVersionOk = process.versions.node.split(".")[0] >= "22";

  const result = await runPreflight({
    branch,
    gitClean,
    confirmHardCut: opts.confirmHardCut,
    freeDiskRatio: computeFreeDiskRatio(join(root, "workspace")),
    nodeVersionOk,
    noActivePlaywright: hasNoActivePlaywright(),
  });

  const reportPath = join(repoRoot(), `migration-report-v2-${Date.now()}.json`);
  writeFileSync(reportPath, JSON.stringify({ ok: result.ok, failed: result.failed }, null, 2), "utf-8");

  if (!result.ok) return { ok: false, reportPath };

  // Stage 1+: implemented in subsequent tasks.
  return { ok: true, reportPath };
}
```

Register in `engine/src/cli/index.ts`:
```typescript
import { buildMigrateCommand } from "./migrate.ts";
kata.addCommand(buildMigrateCommand());
```

Create empty slug map: `engine/src/cli/migrate-v2/feature-slug-map.yaml`:
```yaml
schema: FeatureSlugMap@1
# Manual mapping from current feature directory names to new IDs.
# After Stage 2 dry-run, fill in `ascii_slug` for each entry the algorithm flagged ambiguous.
mappings: []
```

- [ ] **Step 5: Run test, commit**

Run: `bun test engine/tests/cli/migrate-v2/preflight.test.ts`
Expected: PASS.

```bash
git add -A
git commit -m "feat(migrate): scaffold v2 migration with preflight checks"
```

### Task 6.2: Stage 1 — snapshot

**Files:**
- Create: `engine/src/cli/migrate-v2/stage1-snapshot.ts`
- Modify: `engine/src/cli/migrate-v2/index.ts` (call stage1)
- Test: `engine/tests/cli/migrate-v2/stage1-snapshot.test.ts`

- [ ] **Step 1: Write failing test**

`engine/tests/cli/migrate-v2/stage1-snapshot.test.ts`:
```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runStage1Snapshot } from "../../../src/cli/migrate-v2/stage1-snapshot.ts";

describe("migrate v2 stage 1 snapshot", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "mig-stage1-"));
    mkdirSync(join(scratch, "workspace/dataAssets/features/202604-x"), { recursive: true });
    writeFileSync(join(scratch, "workspace/dataAssets/features/202604-x/archive.md"), "x");
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("copies workspace/ to workspace.bak/ in real mode", async () => {
    const r = await runStage1Snapshot({ workspaceRoot: join(scratch, "workspace"), backupRoot: join(scratch, "workspace.bak"), dryRun: false });
    expect(r.copied).toBe(true);
    expect(existsSync(join(scratch, "workspace.bak/dataAssets/features/202604-x/archive.md"))).toBe(true);
  });

  it("skips copy in dry-run", async () => {
    await runStage1Snapshot({ workspaceRoot: join(scratch, "workspace"), backupRoot: join(scratch, "workspace.bak"), dryRun: true });
    expect(existsSync(join(scratch, "workspace.bak"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/cli/migrate-v2/stage1-snapshot.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement stage 1**

Create `engine/src/cli/migrate-v2/stage1-snapshot.ts`:
```typescript
import { cpSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

export interface Stage1Context {
  workspaceRoot: string;
  backupRoot: string;
  dryRun: boolean;
}

export async function runStage1Snapshot(ctx: Stage1Context): Promise<{ copied: boolean; tag: string }> {
  const tag = `pre-migrate-v2-${Date.now()}`;
  if (!ctx.dryRun) {
    try { execSync(`git tag ${tag}`, { stdio: "pipe" }); } catch {}
    if (existsSync(ctx.workspaceRoot) && !existsSync(ctx.backupRoot)) {
      cpSync(ctx.workspaceRoot, ctx.backupRoot, { recursive: true });
      return { copied: true, tag };
    }
  }
  return { copied: false, tag };
}
```

- [ ] **Step 4: Wire into index.ts**

Edit `engine/src/cli/migrate-v2/index.ts`, after preflight check:
```typescript
import { runStage1Snapshot } from "./stage1-snapshot.ts";
// ...
const root = repoRoot();
const stage1 = await runStage1Snapshot({
  workspaceRoot: join(root, "workspace"),
  backupRoot: join(root, "workspace.bak"),
  dryRun: opts.dryRun,
});
```

- [ ] **Step 5: Run test, commit**

Run: `bun test engine/tests/cli/migrate-v2/stage1-snapshot.test.ts`
Expected: PASS.

```bash
git add -A
git commit -m "feat(migrate): stage 1 snapshot (git tag + workspace.bak)"
```

### Task 6.3: Stage 2 — features rename + slug map

**Files:**
- Create: `engine/src/cli/migrate-v2/stage2-rename.ts`
- Modify: `engine/src/cli/migrate-v2/index.ts`
- Test: `engine/tests/cli/migrate-v2/stage2-rename.test.ts`

- [ ] **Step 1: Write failing test**

`engine/tests/cli/migrate-v2/stage2-rename.test.ts`:
```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runStage2Rename } from "../../../src/cli/migrate-v2/stage2-rename.ts";

describe("migrate v2 stage 2 rename", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "mig-stage2-"));
    mkdirSync(join(scratch, "workspace/dataAssets/features/202604-【通用配置】json格式配置"), { recursive: true });
    mkdirSync(join(scratch, "workspace/dataAssets/features/202605-数据资产v6.3回归"), { recursive: true });
    writeFileSync(join(scratch, "slug-map.yaml"), `schema: FeatureSlugMap@1
mappings:
  - source_dir: 202604-【通用配置】json格式配置
    ascii_slug: dq-json-config
  - source_dir: 202605-数据资产v6.3回归
    ascii_slug: assets-v63-regression
`);
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("renames using slug-map in real mode", async () => {
    await runStage2Rename({
      workspaceRoot: join(scratch, "workspace"),
      project: "dataAssets",
      slugMapPath: join(scratch, "slug-map.yaml"),
      dryRun: false,
    });
    expect(existsSync(join(scratch, "workspace/dataAssets/features/2026-04-dq-json-config"))).toBe(true);
    expect(existsSync(join(scratch, "workspace/dataAssets/features/2026-05-assets-v63-regression"))).toBe(true);
    expect(existsSync(join(scratch, "workspace/dataAssets/features/202604-【通用配置】json格式配置"))).toBe(false);
  });

  it("returns plan in dry-run without renaming", async () => {
    const r = await runStage2Rename({
      workspaceRoot: join(scratch, "workspace"),
      project: "dataAssets",
      slugMapPath: join(scratch, "slug-map.yaml"),
      dryRun: true,
    });
    expect(r.plan).toHaveLength(2);
    expect(existsSync(join(scratch, "workspace/dataAssets/features/202604-【通用配置】json格式配置"))).toBe(true);
  });

  it("reports conflict when slug-map missing entry", async () => {
    mkdirSync(join(scratch, "workspace/dataAssets/features/202606-mystery"), { recursive: true });
    const r = await runStage2Rename({
      workspaceRoot: join(scratch, "workspace"),
      project: "dataAssets",
      slugMapPath: join(scratch, "slug-map.yaml"),
      dryRun: true,
    });
    expect(r.conflicts).toContain("202606-mystery");
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/cli/migrate-v2/stage2-rename.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement stage 2**

Create `engine/src/cli/migrate-v2/stage2-rename.ts`:
```typescript
import { existsSync, readFileSync, readdirSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export interface Stage2Context {
  workspaceRoot: string;
  project: string;
  slugMapPath: string;
  dryRun: boolean;
}

interface PlanEntry { from: string; to: string; }

export async function runStage2Rename(ctx: Stage2Context): Promise<{ plan: PlanEntry[]; conflicts: string[] }> {
  const featuresRoot = join(ctx.workspaceRoot, ctx.project, "features");
  const slugMap = parse(readFileSync(ctx.slugMapPath, "utf-8"));
  const byDir = new Map<string, string>();
  for (const entry of slugMap.mappings ?? []) {
    byDir.set(entry.source_dir, entry.ascii_slug);
  }

  const plan: PlanEntry[] = [];
  const conflicts: string[] = [];

  for (const name of readdirSync(featuresRoot)) {
    const full = join(featuresRoot, name);
    if (!statSync(full).isDirectory()) continue;
    if (name === "INDEX.md") continue;

    // Already in v2 form
    if (/^\d{4}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
      continue;
    }

    // Expected legacy form: YYYYMM-<chinese|mixed>
    const m = name.match(/^(\d{4})(\d{2})-(.+)$/);
    if (!m) {
      conflicts.push(name);
      continue;
    }
    const yyyy = m[1];
    const mm = m[2];
    const slug = byDir.get(name);
    if (!slug) {
      conflicts.push(name);
      continue;
    }
    const newName = `${yyyy}-${mm}-${slug}`;
    plan.push({ from: full, to: join(featuresRoot, newName) });
  }

  if (!ctx.dryRun) {
    for (const p of plan) {
      if (!existsSync(p.to)) renameSync(p.from, p.to);
    }
  }
  return { plan, conflicts };
}
```

- [ ] **Step 4: Wire into index.ts**

Edit `engine/src/cli/migrate-v2/index.ts`:
```typescript
import { runStage2Rename } from "./stage2-rename.ts";
// after stage1:
const stage2 = await runStage2Rename({
  workspaceRoot: join(root, "workspace"),
  project: opts.project,
  slugMapPath: join(root, "engine/src/cli/migrate-v2/feature-slug-map.yaml"),
  dryRun: opts.dryRun,
});
if (stage2.conflicts.length > 0) {
  console.error(`[stage 2] conflicts: ${stage2.conflicts.join(", ")}`);
  if (!opts.dryRun) return { ok: false, reportPath };
}
```

- [ ] **Step 5: Run test, commit**

Run: `bun test engine/tests/cli/migrate-v2/stage2-rename.test.ts`
Expected: PASS.

```bash
git add -A
git commit -m "feat(migrate): stage 2 features rename via slug-map"
```

### Task 6.4: Stage 3 — generate metadata.yaml

**Files:**
- Create: `engine/src/cli/migrate-v2/stage3-metadata.ts`
- Modify: `engine/src/cli/migrate-v2/index.ts`
- Test: `engine/tests/cli/migrate-v2/stage3-metadata.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parse } from "yaml";
import { runStage3Metadata } from "../../../src/cli/migrate-v2/stage3-metadata.ts";

describe("migrate v2 stage 3 metadata generation", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "mig-stage3-"));
    mkdirSync(join(scratch, "workspace/dataAssets/features/2026-04-dq-json-config"), { recursive: true });
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("writes metadata.yaml for each feature", async () => {
    await runStage3Metadata({
      workspaceRoot: join(scratch, "workspace"),
      project: "dataAssets",
      dryRun: false,
      slugInfo: {
        "2026-04-dq-json-config": {
          displayName: "【通用配置】json 格式配置",
          modules: ["dq"],
          customers: ["standard"],
          owners: ["koco"],
          createdAt: "2026-04-15",
        },
      },
    });
    const yaml = parse(readFileSync(
      join(scratch, "workspace/dataAssets/features/2026-04-dq-json-config/metadata.yaml"),
      "utf-8",
    ));
    expect(yaml.id).toBe("2026-04-dq-json-config");
    expect(yaml.display_name).toBe("【通用配置】json 格式配置");
    expect(yaml.modules).toEqual(["dq"]);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/cli/migrate-v2/stage3-metadata.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement stage 3**

Create `engine/src/cli/migrate-v2/stage3-metadata.ts`:
```typescript
import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stringify } from "yaml";

export interface SlugInfo {
  displayName: string;
  modules: string[];
  customers: string[];
  owners: string[];
  createdAt: string;
}

export interface Stage3Context {
  workspaceRoot: string;
  project: string;
  dryRun: boolean;
  slugInfo: Record<string, SlugInfo>;
}

export async function runStage3Metadata(ctx: Stage3Context): Promise<{ written: number }> {
  const featuresRoot = join(ctx.workspaceRoot, ctx.project, "features");
  let written = 0;
  for (const name of readdirSync(featuresRoot)) {
    const dir = join(featuresRoot, name);
    if (!statSync(dir).isDirectory()) continue;
    if (name === "INDEX.md") continue;
    if (existsSync(join(dir, "metadata.yaml"))) continue;

    const info = ctx.slugInfo[name];
    const today = new Date().toISOString().slice(0, 10);
    const meta = {
      schema: "FeatureMetadata@1",
      id: name,
      display_name: info?.displayName ?? name,
      status: "active",
      created_at: info?.createdAt ?? today,
      updated_at: today,
      modules: info?.modules ?? [],
      customers: info?.customers ?? [],
      versions: [],
      owners: info?.owners ?? [],
      inputs: [],
      relates_to: [],
      emits: { cases_xmind: true, archive: true, playwright_tests: true },
    };
    if (!ctx.dryRun) {
      writeFileSync(join(dir, "metadata.yaml"), stringify(meta), "utf-8");
      written++;
    } else {
      written++;
    }
  }
  return { written };
}
```

- [ ] **Step 4: Wire into index.ts** (Slug info collected from slug-map.yaml; extend slug-map schema to optionally include display_name, modules, customers, owners, created_at)

Edit `engine/src/cli/migrate-v2/feature-slug-map.yaml` schema example:
```yaml
mappings:
  - source_dir: 202604-【通用配置】json格式配置
    ascii_slug: dq-json-config
    display_name: "【通用配置】json 格式配置"
    modules: [dq]
    customers: [standard]
    owners: [koco]
    created_at: "2026-04-15"
```

Edit `engine/src/cli/migrate-v2/index.ts`:
```typescript
import { runStage3Metadata } from "./stage3-metadata.ts";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

const slugMap = parse(readFileSync(join(root, "engine/src/cli/migrate-v2/feature-slug-map.yaml"), "utf-8"));
const slugInfo: Record<string, any> = {};
for (const m of slugMap.mappings ?? []) {
  const newId = `${m.source_dir.slice(0, 4)}-${m.source_dir.slice(4, 6)}-${m.ascii_slug}`;
  slugInfo[newId] = {
    displayName: m.display_name ?? m.ascii_slug,
    modules: m.modules ?? [],
    customers: m.customers ?? [],
    owners: m.owners ?? [],
    createdAt: m.created_at ?? new Date().toISOString().slice(0, 10),
  };
}
const stage3 = await runStage3Metadata({
  workspaceRoot: join(root, "workspace"),
  project: opts.project,
  dryRun: opts.dryRun,
  slugInfo,
});
```

- [ ] **Step 5: Run test, commit**

Run: `bun test engine/tests/cli/migrate-v2/stage3-metadata.test.ts`
Expected: PASS.

```bash
git add -A
git commit -m "feat(migrate): stage 3 generate metadata.yaml from slug-map"
```

### Task 6.5: Stage 4 — upgrade manifest.json to v2

**Files:**
- Create: `engine/src/cli/migrate-v2/stage4-manifest.ts`
- Modify: `engine/src/cli/migrate-v2/index.ts`
- Test: `engine/tests/cli/migrate-v2/stage4-manifest.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runStage4Manifest } from "../../../src/cli/migrate-v2/stage4-manifest.ts";

describe("migrate v2 stage 4 manifest upgrade", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "mig-stage4-"));
    const dir = join(scratch, "workspace/dataAssets/features/2026-04-x");
    mkdirSync(join(dir, "tests/cases"), { recursive: true });
    writeFileSync(join(dir, "archive.md"), "# archive");
    writeFileSync(join(dir, "cases.xmind"), "binary");
    writeFileSync(join(dir, "tests/cases/t01.ts"), "// intent: SR-INTENT-X\nimport...");
    writeFileSync(join(dir, "tests/cases/manifest.json"), JSON.stringify({ "file-entries": { "content.json": {}, "metadata.json": {} } }));
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("writes FeatureManifest@2 with derived status", async () => {
    await runStage4Manifest({ workspaceRoot: join(scratch, "workspace"), project: "dataAssets", dryRun: false });
    const m = JSON.parse(readFileSync(join(scratch, "workspace/dataAssets/features/2026-04-x/manifest.json"), "utf-8"));
    expect(m.schema).toBe("FeatureManifest@2");
    expect(m.feature_id).toBe("2026-04-x");
    expect(m.case_drafting.status).toBe("completed"); // archive.md exists
    expect(m.automation.status).toBe("ready"); // cases dir has files
    expect(m.automation.intents[0].intent_id).toBe("SR-INTENT-X");
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/cli/migrate-v2/stage4-manifest.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement stage 4**

Create `engine/src/cli/migrate-v2/stage4-manifest.ts`:
```typescript
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

export interface Stage4Context {
  workspaceRoot: string;
  project: string;
  dryRun: boolean;
}

function extractIntentIds(filePath: string): string[] {
  const content = readFileSync(filePath, "utf-8");
  const matches = content.match(/SR-INTENT-[A-Z0-9-]+/g) ?? [];
  return [...new Set(matches)];
}

export async function runStage4Manifest(ctx: Stage4Context): Promise<{ upgraded: number }> {
  const featuresRoot = join(ctx.workspaceRoot, ctx.project, "features");
  let upgraded = 0;
  for (const name of readdirSync(featuresRoot)) {
    const dir = join(featuresRoot, name);
    if (!statSync(dir).isDirectory()) continue;
    if (name === "INDEX.md") continue;

    const archivePath = join(dir, "archive.md");
    const xmindPath = join(dir, "cases.xmind");
    const casesDir = join(dir, "tests/cases");

    const intents: any[] = [];
    if (existsSync(casesDir)) {
      for (const f of readdirSync(casesDir)) {
        if (!f.endsWith(".ts")) continue;
        const intentIds = extractIntentIds(join(casesDir, f));
        for (const id of intentIds) {
          intents.push({
            intent_id: id,
            case_files: [`tests/cases/${f}`],
            automation_status: "ready",
          });
        }
      }
    }

    const manifest = {
      schema: "FeatureManifest@2",
      feature_id: name,
      case_drafting: {
        status: existsSync(archivePath) ? "completed" : "not-started",
        archive_path: existsSync(archivePath) ? "archive.md" : null,
        xmind_path: existsSync(xmindPath) ? "cases.xmind" : null,
        requirement_atoms: [],
        coverage_matrix_path: null,
      },
      automation: {
        status: intents.length > 0 ? "ready" : "not-started",
        intents,
        last_handoff_path: null,
        last_run_status: "not-run",
      },
      files: {
        archive: existsSync(archivePath) ? "archive.md" : null,
        xmind: existsSync(xmindPath) ? "cases.xmind" : null,
        tests_root: existsSync(casesDir) ? "tests/" : null,
        latest_results: null,
      },
    };

    if (!ctx.dryRun) {
      writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");
      // Remove old test/cases/manifest.json if present
      const oldManifest = join(casesDir, "manifest.json");
      if (existsSync(oldManifest)) unlinkSync(oldManifest);
    }
    upgraded++;
  }
  return { upgraded };
}
```

- [ ] **Step 4: Wire + commit**

Edit `engine/src/cli/migrate-v2/index.ts`:
```typescript
import { runStage4Manifest } from "./stage4-manifest.ts";
const stage4 = await runStage4Manifest({ workspaceRoot: join(root, "workspace"), project: opts.project, dryRun: opts.dryRun });
```

Run: `bun test engine/tests/cli/migrate-v2/stage4-manifest.test.ts`
Expected: PASS.

```bash
git add -A
git commit -m "feat(migrate): stage 4 upgrade manifest.json to v2"
```

### Task 6.6: Stage 5 — feature internal restructure

**Files:**
- Create: `engine/src/cli/migrate-v2/stage5-restructure.ts`
- Test: `engine/tests/cli/migrate-v2/stage5-restructure.test.ts`

- [ ] **Step 1: Write failing test covering 6 moves**

```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runStage5Restructure } from "../../../src/cli/migrate-v2/stage5-restructure.ts";

describe("migrate v2 stage 5 restructure", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "mig-stage5-"));
    const dir = join(scratch, "workspace/dataAssets/features/2026-04-x");
    mkdirSync(join(dir, "images"), { recursive: true });
    mkdirSync(join(dir, "tmp"), { recursive: true });
    mkdirSync(join(dir, "tests/.runs/playwright-report"), { recursive: true });
    mkdirSync(join(dir, "tests/.debug"), { recursive: true });
    mkdirSync(join(dir, "tests/unit"), { recursive: true });
    writeFileSync(join(dir, "images/foo.png"), "");
    writeFileSync(join(dir, "tmp/notes.txt"), "");
    writeFileSync(join(dir, "tests/.runs/playwright-report/index.html"), "");
    writeFileSync(join(dir, "tests/.task-state.json"), "{}");
    writeFileSync(join(dir, "playwright-automation-handoff.md"), "# old");
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("moves images, tmp, tests/.runs, .debug; removes tests/unit and old handoff md", async () => {
    await runStage5Restructure({ workspaceRoot: join(scratch, "workspace"), project: "dataAssets", kataRoot: join(scratch, ".kata"), dryRun: false });
    const dir = join(scratch, "workspace/dataAssets/features/2026-04-x");
    expect(existsSync(join(dir, "inputs/lanhu-snapshots/foo.png"))).toBe(true);
    expect(existsSync(join(dir, "inputs/reference-docs/notes.txt"))).toBe(true);
    expect(existsSync(join(dir, "results"))).toBe(true);
    expect(existsSync(join(dir, ".debug"))).toBe(true);
    expect(existsSync(join(scratch, ".kata/state/features/2026-04-x.json"))).toBe(true);
    expect(existsSync(join(dir, "tests/unit"))).toBe(false);
    expect(existsSync(join(dir, "images"))).toBe(false);
    expect(existsSync(join(dir, "tmp"))).toBe(false);
    expect(existsSync(join(dir, "playwright-automation-handoff.md"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/cli/migrate-v2/stage5-restructure.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement stage 5**

Create `engine/src/cli/migrate-v2/stage5-restructure.ts`:
```typescript
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, unlinkSync } from "node:fs";
import { extname, join } from "node:path";

export interface Stage5Context {
  workspaceRoot: string;
  project: string;
  kataRoot: string;
  dryRun: boolean;
}

const IMG_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);

export async function runStage5Restructure(ctx: Stage5Context): Promise<void> {
  if (ctx.dryRun) return;
  const featuresRoot = join(ctx.workspaceRoot, ctx.project, "features");
  for (const name of readdirSync(featuresRoot)) {
    const dir = join(featuresRoot, name);
    if (!statSync(dir).isDirectory()) continue;
    if (name === "INDEX.md") continue;

    // images/ → inputs/lanhu-snapshots/
    const images = join(dir, "images");
    if (existsSync(images)) {
      const target = join(dir, "inputs/lanhu-snapshots");
      mkdirSync(target, { recursive: true });
      for (const f of readdirSync(images)) {
        renameSync(join(images, f), join(target, f));
      }
      rmSync(images, { recursive: true });
    }

    // tmp/ → inputs/reference-docs/
    const tmp = join(dir, "tmp");
    if (existsSync(tmp)) {
      const target = join(dir, "inputs/reference-docs");
      mkdirSync(target, { recursive: true });
      for (const f of readdirSync(tmp)) {
        renameSync(join(tmp, f), join(target, f));
      }
      rmSync(tmp, { recursive: true });
    }

    // tests/.runs/ → results/legacy-archive/
    const oldRuns = join(dir, "tests/.runs");
    if (existsSync(oldRuns)) {
      const target = join(dir, "results/legacy-archive");
      mkdirSync(target, { recursive: true });
      for (const f of readdirSync(oldRuns)) {
        renameSync(join(oldRuns, f), join(target, f));
      }
      rmSync(oldRuns, { recursive: true });
    }
    // Always ensure results/ dir exists
    mkdirSync(join(dir, "results"), { recursive: true });

    // tests/.debug/ → .debug/ (one level up)
    const oldDebug = join(dir, "tests/.debug");
    if (existsSync(oldDebug)) {
      const target = join(dir, ".debug");
      if (!existsSync(target)) renameSync(oldDebug, target);
    } else {
      mkdirSync(join(dir, ".debug"), { recursive: true });
    }

    // tests/.task-state.json → .kata/state/features/<id>.json
    const oldTaskState = join(dir, "tests/.task-state.json");
    if (existsSync(oldTaskState)) {
      const target = join(ctx.kataRoot, "state/features", `${name}.json`);
      mkdirSync(join(ctx.kataRoot, "state/features"), { recursive: true });
      renameSync(oldTaskState, target);
    }

    // tests/unit/ → delete
    const unitDir = join(dir, "tests/unit");
    if (existsSync(unitDir)) rmSync(unitDir, { recursive: true });

    // playwright-automation-handoff.md → delete (info already in manifest.json from stage 4)
    const oldHandoff = join(dir, "playwright-automation-handoff.md");
    if (existsSync(oldHandoff)) unlinkSync(oldHandoff);

    // tests/helpers/ → deferred to stage 6 (AST rewrite required)
  }
}
```

- [ ] **Step 4: Wire + commit**

Edit `engine/src/cli/migrate-v2/index.ts`:
```typescript
import { runStage5Restructure } from "./stage5-restructure.ts";
const stage5 = await runStage5Restructure({
  workspaceRoot: join(root, "workspace"),
  project: opts.project,
  kataRoot: join(root, ".kata"),
  dryRun: opts.dryRun,
});
```

Run: `bun test engine/tests/cli/migrate-v2/stage5-restructure.test.ts`
Expected: PASS.

```bash
git add -A
git commit -m "feat(migrate): stage 5 feature internal restructure"
```

### Task 6.7: Stage 6 — hoist helpers/pages to _shared/pages

**Files:**
- Create: `engine/src/cli/migrate-v2/stage6-hoist-helpers.ts`
- Test: `engine/tests/cli/migrate-v2/stage6-hoist.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runStage6HoistHelpers } from "../../../src/cli/migrate-v2/stage6-hoist-helpers.ts";

describe("migrate v2 stage 6 hoist helpers", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "mig-stage6-"));
    const featA = join(scratch, "workspace/dataAssets/features/2026-04-a");
    const featB = join(scratch, "workspace/dataAssets/features/2026-04-b");
    mkdirSync(join(featA, "tests/helpers"), { recursive: true });
    mkdirSync(join(featA, "tests/cases"), { recursive: true });
    mkdirSync(join(featB, "tests/helpers"), { recursive: true });
    mkdirSync(join(featB, "tests/cases"), { recursive: true });
    writeFileSync(join(featA, "tests/helpers/dq-page.ts"), "export const dqPage = 'a';");
    writeFileSync(join(featB, "tests/helpers/sec-page.ts"), "export const secPage = 'b';");
    writeFileSync(join(featA, "tests/cases/t01.ts"), `import { dqPage } from "../helpers/dq-page.ts";\nconsole.log(dqPage);`);
    writeFileSync(join(featB, "tests/cases/t02.ts"), `import { secPage } from "../helpers/sec-page.ts";\nconsole.log(secPage);`);
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("hoists helpers to _shared/pages and rewrites imports", async () => {
    await runStage6HoistHelpers({ workspaceRoot: join(scratch, "workspace"), project: "dataAssets", dryRun: false });
    expect(existsSync(join(scratch, "workspace/dataAssets/_shared/pages/dq-page.ts"))).toBe(true);
    expect(existsSync(join(scratch, "workspace/dataAssets/_shared/pages/sec-page.ts"))).toBe(true);
    expect(existsSync(join(scratch, "workspace/dataAssets/features/2026-04-a/tests/helpers"))).toBe(false);
    const caseA = readFileSync(join(scratch, "workspace/dataAssets/features/2026-04-a/tests/cases/t01.ts"), "utf-8");
    expect(caseA).toContain('from "../../../_shared/pages/dq-page.ts"');
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/cli/migrate-v2/stage6-hoist.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `engine/src/cli/migrate-v2/stage6-hoist-helpers.ts`:
```typescript
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { relative, join, dirname } from "node:path";

export interface Stage6Context {
  workspaceRoot: string;
  project: string;
  dryRun: boolean;
}

export async function runStage6HoistHelpers(ctx: Stage6Context): Promise<{ hoisted: string[]; rewritten: string[]; conflicts: string[] }> {
  const featuresRoot = join(ctx.workspaceRoot, ctx.project, "features");
  const sharedPages = join(ctx.workspaceRoot, ctx.project, "_shared/pages");
  if (!ctx.dryRun) mkdirSync(sharedPages, { recursive: true });

  const hoisted: string[] = [];
  const rewritten: string[] = [];
  const conflicts: string[] = [];
  const moved: Array<{ from: string; toRel: string }> = [];

  for (const name of readdirSync(featuresRoot)) {
    const dir = join(featuresRoot, name);
    if (!statSync(dir).isDirectory()) continue;
    const helpers = join(dir, "tests/helpers");
    if (!existsSync(helpers)) continue;
    for (const f of readdirSync(helpers)) {
      const src = join(helpers, f);
      const dst = join(sharedPages, f);
      if (existsSync(dst)) {
        conflicts.push(`${name}/tests/helpers/${f} -> _shared/pages/${f} (already exists)`);
        continue;
      }
      if (!ctx.dryRun) renameSync(src, dst);
      moved.push({ from: src, toRel: `_shared/pages/${f}` });
      hoisted.push(f);
    }
    if (!ctx.dryRun && existsSync(helpers) && readdirSync(helpers).length === 0) rmSync(helpers, { recursive: true });
  }

  // Rewrite imports in all case files
  for (const name of readdirSync(featuresRoot)) {
    const dir = join(featuresRoot, name);
    if (!statSync(dir).isDirectory()) continue;
    const cases = join(dir, "tests/cases");
    if (!existsSync(cases)) continue;
    for (const f of readdirSync(cases)) {
      if (!f.endsWith(".ts")) continue;
      const caseFile = join(cases, f);
      let content = readFileSync(caseFile, "utf-8");
      let changed = false;
      // Match `../helpers/<file>.ts` style imports
      content = content.replace(/(["'])(\.\.\/+helpers\/([a-zA-Z0-9_-]+\.ts))(["'])/g, (_full, q1, _path, fileName, q2) => {
        const sharedPath = relative(dirname(caseFile), join(sharedPages, fileName));
        changed = true;
        return `${q1}${sharedPath.replace(/\\/g, "/")}${q2}`;
      });
      if (changed) {
        if (!ctx.dryRun) writeFileSync(caseFile, content, "utf-8");
        rewritten.push(caseFile);
      }
    }
  }

  return { hoisted, rewritten, conflicts };
}
```

- [ ] **Step 4: Wire + commit**

Edit `engine/src/cli/migrate-v2/index.ts`:
```typescript
import { runStage6HoistHelpers } from "./stage6-hoist-helpers.ts";
const stage6 = await runStage6HoistHelpers({ workspaceRoot: join(root, "workspace"), project: opts.project, dryRun: opts.dryRun });
if (stage6.conflicts.length > 0) console.warn(`[stage 6] conflicts: ${stage6.conflicts.length}`);
```

Run: `bun test engine/tests/cli/migrate-v2/stage6-hoist.test.ts`
Expected: PASS.

```bash
git add -A
git commit -m "feat(migrate): stage 6 hoist helpers/pages to _shared/pages"
```

### Task 6.8: Stage 7 — workspace top-level consolidation

**Files:**
- Create: `engine/src/cli/migrate-v2/stage7-workspace-tops.ts`
- Test: `engine/tests/cli/migrate-v2/stage7-tops.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runStage7WorkspaceTops } from "../../../src/cli/migrate-v2/stage7-workspace-tops.ts";

describe("migrate v2 stage 7 workspace top-level consolidation", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "mig-stage7-"));
    const ws = join(scratch, "workspace/dataAssets");
    mkdirSync(join(ws, "knowledge"), { recursive: true });
    writeFileSync(join(ws, "knowledge/_index.md"), "x");
    mkdirSync(join(ws, "rules"), { recursive: true });
    writeFileSync(join(ws, "rules/note.md"), "r");
    mkdirSync(join(ws, "env"), { recursive: true });
    writeFileSync(join(ws, "env/ci63.yaml"), "base_url: x");
    mkdirSync(join(ws, "reports/allure"), { recursive: true });
    mkdirSync(join(ws, ".repos"), { recursive: true });
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("moves knowledge/rules/env into _shared and .repos into .kata/repos", async () => {
    await runStage7WorkspaceTops({ workspaceRoot: join(scratch, "workspace"), project: "dataAssets", kataRoot: join(scratch, ".kata"), dryRun: false });
    expect(existsSync(join(scratch, "workspace/dataAssets/_shared/knowledge/_index.md"))).toBe(true);
    expect(existsSync(join(scratch, "workspace/dataAssets/_shared/rules/note.md"))).toBe(true);
    expect(existsSync(join(scratch, "workspace/dataAssets/_shared/env/ci63.yaml"))).toBe(true);
    expect(existsSync(join(scratch, ".kata/repos/dataAssets"))).toBe(true);
    expect(existsSync(join(scratch, "workspace/dataAssets/knowledge"))).toBe(false);
    expect(existsSync(join(scratch, "workspace/dataAssets/.repos"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/cli/migrate-v2/stage7-tops.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `engine/src/cli/migrate-v2/stage7-workspace-tops.ts`:
```typescript
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

export interface Stage7Context {
  workspaceRoot: string;
  project: string;
  kataRoot: string;
  dryRun: boolean;
}

const SIMPLE_MAP: Array<{ from: string; toSharedSub: string }> = [
  { from: "knowledge", toSharedSub: "knowledge" },
  { from: "rules", toSharedSub: "rules" },
  { from: "shared", toSharedSub: "helpers" },
  { from: "env", toSharedSub: "env" },
];

export async function runStage7WorkspaceTops(ctx: Stage7Context): Promise<void> {
  if (ctx.dryRun) return;
  const ws = join(ctx.workspaceRoot, ctx.project);
  const shared = join(ws, "_shared");
  mkdirSync(shared, { recursive: true });

  for (const m of SIMPLE_MAP) {
    const src = join(ws, m.from);
    const dst = join(shared, m.toSharedSub);
    if (!existsSync(src)) continue;
    if (!existsSync(dst)) {
      renameSync(src, dst);
    } else {
      // merge contents
      for (const f of readdirSync(src)) renameSync(join(src, f), join(dst, f));
      rmSync(src, { recursive: true });
    }
  }

  // .repos → .kata/repos/<project>
  const reposSrc = join(ws, ".repos");
  if (existsSync(reposSrc)) {
    const reposDst = join(ctx.kataRoot, "repos", ctx.project);
    mkdirSync(join(ctx.kataRoot, "repos"), { recursive: true });
    if (!existsSync(reposDst)) renameSync(reposSrc, reposDst);
    else rmSync(reposSrc, { recursive: true });
  }

  // reports/audits/history/issues/regressions/* — move per-feature artifacts into features/<id>/results/legacy-archive/
  // For artifacts that cannot be mapped to a feature, move to _shared/published-reports/_unassigned/
  const reports = join(ws, "reports");
  if (existsSync(reports)) {
    const unassigned = join(shared, "published-reports/_unassigned");
    mkdirSync(unassigned, { recursive: true });
    // simple bulk move: move all under reports/ to _unassigned; mapping back to features is done manually
    for (const sub of readdirSync(reports)) {
      renameSync(join(reports, sub), join(unassigned, sub));
    }
    rmSync(reports, { recursive: true });
  }

  for (const subdir of ["audits", "history", "issues", "regressions"]) {
    const src = join(ws, subdir);
    if (!existsSync(src)) continue;
    const dst = join(shared, "archive", subdir);
    mkdirSync(join(shared, "archive"), { recursive: true });
    renameSync(src, dst);
  }
}
```

- [ ] **Step 4: Wire + commit**

Edit `engine/src/cli/migrate-v2/index.ts`:
```typescript
import { runStage7WorkspaceTops } from "./stage7-workspace-tops.ts";
await runStage7WorkspaceTops({ workspaceRoot: join(root, "workspace"), project: opts.project, kataRoot: join(root, ".kata"), dryRun: opts.dryRun });
```

Run: `bun test engine/tests/cli/migrate-v2/stage7-tops.test.ts`
Expected: PASS.

```bash
git add -A
git commit -m "feat(migrate): stage 7 workspace top-level consolidation"
```

### Task 6.9: Stage 8 — root-level hidden dirs consolidation

**Files:**
- Create: `engine/src/cli/migrate-v2/stage8-hidden-dirs.ts`
- Test: `engine/tests/cli/migrate-v2/stage8-hidden.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runStage8HiddenDirs } from "../../../src/cli/migrate-v2/stage8-hidden-dirs.ts";

describe("migrate v2 stage 8 hidden dirs", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "mig-stage8-"));
    mkdirSync(join(scratch, ".auth/dataAssets"), { recursive: true });
    writeFileSync(join(scratch, ".auth/dataAssets/session-ci63.json"), "{}");
    mkdirSync(join(scratch, ".worktrees"), { recursive: true });
    mkdirSync(join(scratch, ".temp"), { recursive: true });
    mkdirSync(join(scratch, ".kata/_desktop"), { recursive: true });
    writeFileSync(join(scratch, ".kata/session.json"), "{}");
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("collapses .auth, .worktrees, .temp into .kata/", async () => {
    await runStage8HiddenDirs({ repoRoot: scratch, dryRun: false });
    expect(existsSync(join(scratch, ".kata/auth/dataAssets/session-ci63.json"))).toBe(true);
    expect(existsSync(join(scratch, ".kata/worktrees"))).toBe(true);
    expect(existsSync(join(scratch, ".kata/temp"))).toBe(true);
    expect(existsSync(join(scratch, ".kata/state/session.json"))).toBe(true);
    expect(existsSync(join(scratch, ".auth"))).toBe(false);
    expect(existsSync(join(scratch, ".worktrees"))).toBe(false);
    expect(existsSync(join(scratch, ".temp"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/cli/migrate-v2/stage8-hidden.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `engine/src/cli/migrate-v2/stage8-hidden-dirs.ts`:
```typescript
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

export interface Stage8Context {
  repoRoot: string;
  dryRun: boolean;
}

const MOVES: Array<{ src: string; dst: string }> = [
  { src: ".auth", dst: ".kata/auth" },
  { src: ".worktrees", dst: ".kata/worktrees" },
  { src: ".temp", dst: ".kata/temp" },
  { src: ".runs", dst: ".kata/runs" },
];

export async function runStage8HiddenDirs(ctx: Stage8Context): Promise<void> {
  if (ctx.dryRun) return;
  const kataDir = join(ctx.repoRoot, ".kata");
  mkdirSync(kataDir, { recursive: true });
  mkdirSync(join(kataDir, "state"), { recursive: true });

  // Existing .kata/_desktop + .kata/session.json get moved under .kata/state/
  const oldSession = join(kataDir, "session.json");
  if (existsSync(oldSession)) renameSync(oldSession, join(kataDir, "state/session.json"));
  const oldDesktop = join(kataDir, "_desktop");
  if (existsSync(oldDesktop)) {
    const dst = join(kataDir, "state/_desktop");
    if (!existsSync(dst)) renameSync(oldDesktop, dst);
  }

  for (const m of MOVES) {
    const src = join(ctx.repoRoot, m.src);
    const dst = join(ctx.repoRoot, m.dst);
    if (!existsSync(src)) continue;
    if (!existsSync(dst)) {
      renameSync(src, dst);
    } else {
      for (const f of readdirSync(src)) renameSync(join(src, f), join(dst, f));
      rmSync(src, { recursive: true });
    }
  }
}
```

- [ ] **Step 4: Wire + commit**

Edit `engine/src/cli/migrate-v2/index.ts`:
```typescript
import { runStage8HiddenDirs } from "./stage8-hidden-dirs.ts";
await runStage8HiddenDirs({ repoRoot: root, dryRun: opts.dryRun });
```

Run: `bun test engine/tests/cli/migrate-v2/stage8-hidden.test.ts`
Expected: PASS.

```bash
git add -A
git commit -m "feat(migrate): stage 8 consolidate root hidden dirs into .kata/"
```

### Task 6.10: Stage 9 — .gitignore rewrite + ancillary cleanup

**Files:**
- Create: `engine/src/cli/migrate-v2/stage9-contracts.ts`
- Test: `engine/tests/cli/migrate-v2/stage9-contracts.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runStage9Contracts } from "../../../src/cli/migrate-v2/stage9-contracts.ts";

describe("migrate v2 stage 9 contracts", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "mig-stage9-"));
    writeFileSync(join(scratch, ".gitignore"), "# big legacy file with 60 lines");
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("rewrites .gitignore to ≤ 20 lines", async () => {
    await runStage9Contracts({ repoRoot: scratch, dryRun: false });
    const lines = readFileSync(join(scratch, ".gitignore"), "utf-8").split("\n").filter((l) => l.trim() !== "");
    expect(lines.length).toBeLessThanOrEqual(20);
    expect(lines.some((l) => l.includes(".kata/"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/cli/migrate-v2/stage9-contracts.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `engine/src/cli/migrate-v2/stage9-contracts.ts`:
```typescript
import { writeFileSync } from "node:fs";
import { join } from "node:path";

export interface Stage9Context {
  repoRoot: string;
  dryRun: boolean;
}

const NEW_GITIGNORE = `# Dependencies
node_modules/

# Secrets / local env
.env
.env.local
config.json

# Hidden runtime root (project + repo level)
.kata/
**/.kata/

# Feature runtime products
workspace/*/features/*/results/
workspace/*/features/*/.debug/

# System / build
.DS_Store
*.log
dist/
*.tsbuildinfo
`;

export async function runStage9Contracts(ctx: Stage9Context): Promise<void> {
  if (ctx.dryRun) return;
  writeFileSync(join(ctx.repoRoot, ".gitignore"), NEW_GITIGNORE, "utf-8");
}
```

- [ ] **Step 4: Wire + commit**

Edit `engine/src/cli/migrate-v2/index.ts`:
```typescript
import { runStage9Contracts } from "./stage9-contracts.ts";
await runStage9Contracts({ repoRoot: root, dryRun: opts.dryRun });
```

Run: `bun test engine/tests/cli/migrate-v2/stage9-contracts.test.ts`
Expected: PASS.

```bash
git add -A
git commit -m "feat(migrate): stage 9 rewrite .gitignore contract-driven"
```

### Task 6.11: Stage 10 — verify + self-delete + final report

**Files:**
- Create: `engine/src/cli/migrate-v2/stage10-verify.ts`
- Modify: `engine/src/cli/migrate-v2/index.ts`

- [ ] **Step 1: Implement verify**

Create `engine/src/cli/migrate-v2/stage10-verify.ts`:
```typescript
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

export interface Stage10Context {
  repoRoot: string;
  reportPath: string;
  dryRun: boolean;
  stats: Record<string, unknown>;
}

export async function runStage10Verify(ctx: Stage10Context): Promise<{ ok: boolean }> {
  const verifyOk = { ok: true };
  if (ctx.dryRun) {
    writeFileSync(ctx.reportPath, JSON.stringify({ mode: "dry-run", stats: ctx.stats }, null, 2), "utf-8");
    return verifyOk;
  }
  try {
    execSync(`bun ${join(ctx.repoRoot, "engine/bin/kata")} features lint --exit-code`, { stdio: "pipe" });
    execSync(`bun ${join(ctx.repoRoot, "engine/bin/kata")} features index`, { stdio: "pipe" });
    execSync(`bun run type-check`, { cwd: ctx.repoRoot, stdio: "pipe" });
    writeFileSync(ctx.reportPath, JSON.stringify({ mode: "real", ok: true, stats: ctx.stats }, null, 2), "utf-8");
    return { ok: true };
  } catch (err) {
    writeFileSync(ctx.reportPath, JSON.stringify({ mode: "real", ok: false, error: String(err), stats: ctx.stats }, null, 2), "utf-8");
    return { ok: false };
  }
}
```

- [ ] **Step 2: Wire into index.ts final return**

Edit `engine/src/cli/migrate-v2/index.ts` end:
```typescript
import { runStage10Verify } from "./stage10-verify.ts";
const stage10 = await runStage10Verify({
  repoRoot: root,
  reportPath,
  dryRun: opts.dryRun,
  stats: { stage1, stage2: { plan: stage2.plan.length, conflicts: stage2.conflicts.length }, stage3, stage6 },
});
return { ok: stage10.ok, reportPath };
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(migrate): stage 10 verify + report"
```

### Task 6.12: Pinyin / sanitize helper for slug-map seed

**Files:**
- Create: `engine/src/cli/migrate-v2/seed-slug-map.ts`
- Test: `engine/tests/cli/migrate-v2/seed-slug-map.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parse } from "yaml";
import { runSeedSlugMap } from "../../../src/cli/migrate-v2/seed-slug-map.ts";

describe("seed slug-map", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "seed-slug-"));
    mkdirSync(join(scratch, "workspace/dataAssets/features/202604-【通用配置】json格式配置"), { recursive: true });
    mkdirSync(join(scratch, "workspace/dataAssets/features/202605-数据资产v6.3回归"), { recursive: true });
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("writes slug-map.yaml with proposed ascii slugs", async () => {
    const path = join(scratch, "slug-map.yaml");
    await runSeedSlugMap({ workspaceRoot: join(scratch, "workspace"), project: "dataAssets", outputPath: path });
    const data = parse(readFileSync(path, "utf-8"));
    expect(data.mappings).toHaveLength(2);
    expect(data.mappings[0].source_dir).toMatch(/^\d{6}-/);
    expect(data.mappings[0].ascii_slug.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `bun test engine/tests/cli/migrate-v2/seed-slug-map.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `engine/src/cli/migrate-v2/seed-slug-map.ts`:
```typescript
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stringify } from "yaml";
import { sanitizeSlug } from "../../features/slug.ts";

export interface SeedContext {
  workspaceRoot: string;
  project: string;
  outputPath: string;
}

export async function runSeedSlugMap(ctx: SeedContext): Promise<void> {
  const featuresRoot = join(ctx.workspaceRoot, ctx.project, "features");
  const mappings: any[] = [];
  for (const name of readdirSync(featuresRoot)) {
    const dir = join(featuresRoot, name);
    if (!statSync(dir).isDirectory()) continue;
    if (name === "INDEX.md") continue;
    if (/^\d{4}-\d{2}-[a-z0-9-]+$/.test(name)) continue; // already v2
    const m = name.match(/^(\d{4})(\d{2})-(.+)$/);
    if (!m) continue;
    mappings.push({
      source_dir: name,
      ascii_slug: sanitizeSlug(m[3]),
      display_name: m[3],
      modules: [],
      customers: [],
      owners: [],
      created_at: `${m[1]}-${m[2]}-01`,
    });
  }
  writeFileSync(ctx.outputPath, stringify({ schema: "FeatureSlugMap@1", mappings }), "utf-8");
}
```

- [ ] **Step 4: Wire as `kata migrate v2 seed-slug-map`**

Edit `engine/src/cli/migrate.ts`:
```typescript
import { runSeedSlugMap } from "./migrate-v2/seed-slug-map.ts";
// inside buildMigrateCommand:
migrate
  .command("v2-seed-slug-map")
  .description("Generate initial slug-map.yaml from existing dirs")
  .option("--project <name>", "project name", "dataAssets")
  .option("--out <path>", "output path", join(repoRoot(), "engine/src/cli/migrate-v2/feature-slug-map.yaml"))
  .action(async (opts: { project: string; out: string }) => {
    await runSeedSlugMap({ workspaceRoot: join(repoRoot(), "workspace"), project: opts.project, outputPath: opts.out });
    console.log(`Seeded ${opts.out}`);
  });
```

- [ ] **Step 5: Run test, commit**

Run: `bun test engine/tests/cli/migrate-v2/seed-slug-map.test.ts`
Expected: PASS.

```bash
git add -A
git commit -m "feat(migrate): seed slug-map command"
```

### Task 6.13: Migration script self-delete (deferred to Phase 8)

The `engine/src/cli/migrate-v2/` directory + `engine/src/cli/migrate.ts` + tests are deleted in Phase 8 after migration succeeds. Implementation note: do not auto-delete; this is a manual step under user supervision in Task 8.5.

---

## Phase 6 Checkpoint

```bash
bun test engine/tests/cli/migrate-v2/
kata migrate v2 --help
kata migrate v2-seed-slug-map --help
```
Expected: all stage tests PASS; help screens render.

---

## Phase 7: Docs + CI

### Task 7.1: Author `.ai/core/docs/layout-v2.md`

**Files:**
- Create: `.ai/core/docs/layout-v2.md`

- [ ] **Step 1: Write the doc**

Create `.ai/core/docs/layout-v2.md`:
```markdown
# Workspace Layout v2

This is the single authoritative reference for the v2 workspace layout. Other docs (README, CLAUDE.md, AGENTS.md, INSTALL.md) link here.

## Top-Level Structure

```
workspace/<project>/
├── features/                    # Flat feature directories (one source of truth)
│   ├── INDEX.md                 # Auto-generated by `kata features index`
│   └── <YYYY-MM>-<slug>/        # Per-feature directory (ASCII only)
├── _shared/                     # Cross-feature shared resources
│   ├── _meta/                   # Enum: modules.yaml, customers.yaml, versions.yaml
│   ├── pages/                   # Page objects (hoisted from features/*/tests/helpers)
│   ├── helpers/                 # Generic helpers (login, wait, assertions)
│   ├── fixtures/                # Shared data fixtures
│   ├── env/                     # Environment profiles (ci63.yaml, ltqc-*.yaml)
│   ├── knowledge/               # Business knowledge
│   ├── rules/                   # Business rules
│   ├── archive/                 # Old artifacts archive
│   └── published-reports/       # `kata results publish` output
├── .kata/                       # Optional project-scoped runtime root
├── project.json                 # Workspace metadata
└── tsconfig.json
```

Root-level `.kata/` is the **only** hidden runtime directory at repo root.

## Feature Naming

- Directory regex: `^\d{4}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$`
- Examples: `2026-04-dq-json-config`, `2026-05-multimodal-file-detail`
- Chinese display name lives in `metadata.yaml#display_name`, never in the directory name

## metadata.yaml + manifest.json

Each feature MUST have both files. Schemas:
- `FeatureMetadata@1` — `.ai/core/schemas/FeatureMetadata.v1.schema.json`
- `FeatureManifest@2` — `.ai/core/schemas/FeatureManifest.v2.schema.json`

`kata features lint` validates both.

## Results layout

```
features/<slug>/results/<YYYYMMDD-HHmm>-<runId>/
├── handoff.json
├── handoff.md
├── playwright/
├── allure-results/
└── stdout.log
```

See `PlaywrightAutomationHandoff@2` schema for handoff.json structure.

## CLI

- `kata features new/ls/show/lint/index`
- `kata cases lint/validate`
- `kata results path/publish/prune`
- `kata handoff render`
- `kata env check`
- `kata migrate v2` (one-shot)
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "docs: add layout-v2 authoritative reference"
```

### Task 7.2: Update CLAUDE.md / AGENTS.md / README

**Files:**
- Modify: `CLAUDE.md`
- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `README-EN.md`
- Modify: `INSTALL.md`

- [ ] **Step 1: Update CLAUDE.md `## Workspace Boundary` section**

Edit `CLAUDE.md`. Replace the `## Workspace Boundary` block with:
```markdown
## Workspace Boundary

- 工作区固定为 `workspace/<project>/`，仅三个顶级：`features/` + `_shared/` + `.kata/`。
- 每个 feature 路径形如 `features/<YYYY-MM>-<slug>/`，metadata.yaml + manifest.json 强制存在。
- 运行产物落点：`features/<slug>/results/<run-id>/`。共享资源（pages/helpers/env/knowledge/rules）一律在 `_shared/`。
- 详细布局：`.ai/core/docs/layout-v2.md`。
```

- [ ] **Step 2: Mirror in AGENTS.md**

Apply the same edit pattern to `AGENTS.md`.

- [ ] **Step 3: Update README.md / README-EN.md path examples**

Search and replace any old path examples (`workspace/<p>/features/<chinese-name>/`, `reports/allure/`, etc.) with v2 equivalents. Update screenshots if directory tree appears.

- [ ] **Step 4: Update INSTALL.md "create new feature" step**

Replace ad-hoc creation steps with:
```markdown
## Creating a new feature

```bash
kata features new dq-rule-task \
  --display-name="数据质量-规则任务" \
  --modules=dq \
  --customers=standard \
  --inputs=prd,lanhu
```
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md AGENTS.md README.md README-EN.md INSTALL.md
git commit -m "docs: update onboarding docs for v2 layout"
```

### Task 7.3: Add CI workflow `features-lint.yml`

**Files:**
- Create: `.github/workflows/features-lint.yml`

- [ ] **Step 1: Create workflow**

Create `.github/workflows/features-lint.yml`:
```yaml
name: features-lint

on:
  push:
    branches: [main]
    paths:
      - 'workspace/**'
      - '.ai/core/schemas/**'
      - 'engine/src/cli/features-lint.ts'
      - 'engine/src/schemas/loaders.ts'
  pull_request:
    paths:
      - 'workspace/**'
      - '.ai/core/schemas/**'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      - run: bun install
      - run: cd engine && bun link --force && cd ..
      - run: kata features lint --exit-code
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/features-lint.yml
git commit -m "ci: add features-lint workflow"
```

### Task 7.4: Add CI workflow `features-index.yml`

**Files:**
- Create: `.github/workflows/features-index.yml`

- [ ] **Step 1: Create workflow**

```yaml
name: features-index

on:
  push:
    branches: [main]
    paths:
      - 'workspace/*/features/**/metadata.yaml'
      - 'workspace/*/features/**/manifest.json'

jobs:
  index:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: cd engine && bun link --force && cd ..
      - run: kata features index
      - name: Commit regenerated INDEX
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          if ! git diff --quiet; then
            git add 'workspace/*/features/INDEX.md'
            git commit -m "chore: regenerate features INDEX [skip ci]"
            git push
          fi
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/features-index.yml
git commit -m "ci: add features-index auto-regen workflow"
```

### Task 7.5: Add CI workflow `schema-check.yml`

**Files:**
- Create: `.github/workflows/schema-check.yml`

- [ ] **Step 1: Create workflow**

```yaml
name: schema-check

on:
  push:
    paths:
      - '.ai/core/schemas/**'
      - 'engine/src/schemas/**'

jobs:
  schemas:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test engine/tests/schemas/
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/schema-check.yml
git commit -m "ci: add schema-check workflow"
```

### Task 7.6: Add CI workflow `gitignore-no-bloat.yml`

**Files:**
- Create: `.github/workflows/gitignore-no-bloat.yml`

- [ ] **Step 1: Create workflow**

```yaml
name: gitignore-no-bloat

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Count non-blank, non-comment lines
        run: |
          LINES=$(grep -vE '^\s*(#|$)' .gitignore | wc -l)
          echo "non-blank, non-comment .gitignore lines: $LINES"
          if [ "$LINES" -gt 25 ]; then
            echo "::error::.gitignore exceeds 25 effective lines; new artifact paths must be governed by directory contracts, not gitignore patterns."
            exit 1
          fi
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/gitignore-no-bloat.yml
git commit -m "ci: prevent .gitignore re-bloat"
```

### Task 7.7: Add CI workflow `migrate-script-removed.yml`

**Files:**
- Create: `.github/workflows/migrate-script-removed.yml`

- [ ] **Step 1: Create workflow** (active **after** Phase 8 self-delete)

```yaml
name: migrate-script-removed

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Forbid re-adding migration script
        run: |
          if [ -d engine/src/cli/migrate-v2 ]; then
            echo "::error::engine/src/cli/migrate-v2/ was deleted in Phase 8. Do not re-add it."
            exit 1
          fi
```

- [ ] **Step 2: Commit (workflow disabled by file presence until Phase 8 completes)**

```bash
git add .github/workflows/migrate-script-removed.yml
git commit -m "ci: guard against re-adding deleted migrate-v2 script"
```

---

## Phase 7 Checkpoint

```bash
ls .github/workflows/{features-lint,features-index,schema-check,gitignore-no-bloat,migrate-script-removed}.yml
```
Expected: all 5 files exist.

---

## Phase 8: Execute Migration + Acceptance

> This phase is **dispatched manually** by the operator. The previous 7 phases produced the migration capability; this phase exercises it on real data.

### Task 8.1: Seed slug-map.yaml from existing features

**Files:**
- Modify: `engine/src/cli/migrate-v2/feature-slug-map.yaml`

- [ ] **Step 1: Generate initial slug-map**

Run from repo root:
```bash
kata migrate v2-seed-slug-map --project dataAssets
```
Expected: `engine/src/cli/migrate-v2/feature-slug-map.yaml` populated with ~100 entries.

- [ ] **Step 2: Manually review slug entries**

Open `engine/src/cli/migrate-v2/feature-slug-map.yaml`. For each entry:
- Confirm `ascii_slug` is meaningful (sanitizeSlug uses pinyin; sometimes the result is too long or ambiguous — edit to a sensible kebab-case)
- Fill in `modules` (from `_shared/_meta/modules.yaml` enum, which will be seeded next step)
- Fill in `customers`
- Fill in `owners`

Estimated time: 60–120 minutes for ~100 features.

- [ ] **Step 3: Seed `_shared/_meta/*.yaml` enums** (one-time)

Create `workspace/dataAssets/_shared/_meta/modules.yaml`:
```yaml
enum:
  - dq
  - security
  - metadata
  - modeling
  - standard
  - assets
  - multimodal
  - generalConfig
  - lifecycle
```

Create `workspace/dataAssets/_shared/_meta/customers.yaml`:
```yaml
enum:
  - standard
  - ltqc            # 岚图
  - dongfeng        # 东风商用车
  - yht             # 益禾堂
  - taiji           # 太极
  - shouchuang      # 首创
  - jungong717      # 军工717
  - zdxx            # 中电信息
  - huatai          # 华泰期货
```

Create `workspace/dataAssets/_shared/_meta/versions.yaml`:
```yaml
enum:
  - v6.3
  - v6.4
  - v6.4.10
```

Adjust enums based on actual data in your repo.

- [ ] **Step 4: Commit slug-map + enums**

```bash
git add engine/src/cli/migrate-v2/feature-slug-map.yaml workspace/dataAssets/_shared/_meta/
git commit -m "chore(migrate): seed slug-map and _shared/_meta enums"
```

### Task 8.2: Dry-run migration; iterate until 0 conflicts

- [ ] **Step 1: Run dry-run**

```bash
kata migrate v2 --dry-run --project dataAssets --confirm-hard-cut
```
Expected: prints stage-by-stage plan; writes `migration-report-v2-*.json`.

- [ ] **Step 2: Inspect report for conflicts**

```bash
cat migration-report-v2-*.json | jq '.stats.stage2.conflicts'
cat migration-report-v2-*.json | jq '.stats.stage6.conflicts'
```
Expected: all conflict lists empty.

- [ ] **Step 3: Fix conflicts in slug-map.yaml** (if any), then rerun dry-run until clean.

### Task 8.3: Real migration

- [ ] **Step 1: Verify preconditions**

Run:
```bash
git status                                # clean
git branch --show-current                 # migrate/v2-layout
df -h .                                   # at least 2x workspace size free
pgrep -f playwright                       # no active playwright processes
```

- [ ] **Step 2: Run real migration**

```bash
kata migrate v2 --project dataAssets --confirm-hard-cut
```
Expected: exits 0; `migration-report-v2-*.json` has `ok: true`; `workspace.bak/` exists.

- [ ] **Step 3: Rollback procedure (if migration fails partway)**

If the real migration fails mid-stage, the migration script writes a partial `migration-report-v2-*.json` with `"ok": false` and `"stage_failed": <N>`. Recovery depends on which stage failed:

1. **Stage 1–3 failed** (snapshot, slug-map, metadata): safe to re-run. The dry-run is read-only for these stages.
2. **Stage 4–5 failed** (manifest, restructure): restore from `workspace.bak/`:
   ```bash
   rm -rf workspace/dataAssets
   cp -a workspace.bak/dataAssets workspace/dataAssets
   ```
3. **Stage 6–9 failed** (case headers, env-precond, hidden dirs, .gitignore): restore full workspace:
   ```bash
   rm -rf workspace/
   cp -a workspace.bak/ workspace/
   ```
4. **Worst case**: `git checkout main` discards the migration branch; `git branch -D migrate/v2-layout`; start over from Phase 0.

`workspace.bak/` is created by Stage 1 (snapshot). Do NOT delete `workspace.bak/` until Task 8.4 acceptance checklist passes. The pre-migration git tag `pre-migrate-v2-<timestamp>` serves as a secondary recovery point.

### Task 8.4: Verify acceptance checklist (from spec §6.6)

Run each verification command and confirm expected result:

- [ ] **Verification 1: workspace top-level structure**

```bash
ls workspace/dataAssets/
```
Expected output: `_shared  .kata  features  project.json  tsconfig.json`

- [ ] **Verification 2: feature directories match regex**

```bash
ls workspace/dataAssets/features/ | grep -vE '^(\d{4}-\d{2}-[a-z0-9-]+|INDEX\.md)$' && echo "VIOLATIONS FOUND" || echo "OK"
```
Expected: `OK`

- [ ] **Verification 3: features lint passes**

```bash
kata features lint --exit-code
```
Expected: exit code 0.

- [ ] **Verification 4: INDEX.md regenerates**

```bash
kata features index
cat workspace/dataAssets/features/INDEX.md | head -20
```
Expected: header `<!-- generated by kata features index; do not edit -->`.

- [ ] **Verification 5: .gitignore lean**

```bash
grep -vE '^\s*(#|$)' .gitignore | wc -l
```
Expected: ≤ 20.

- [ ] **Verification 6: a representative feature smoke list**

Pick one migrated feature (e.g. `2026-04-dq-json-config`):
```bash
npx playwright test 'workspace/dataAssets/features/2026-04-dq-json-config/tests/runners/full.spec.ts' --list --project=chromium
```
Expected: at least 1 test discovered, no compile errors.

- [ ] **Verification 7: hidden dirs collapsed**

```bash
ls -la / | grep -E '^d.*\s\.(auth|worktrees|temp|runs|kata)$' | wc -l
```
Expected: `1` (`.kata` only) — replace `/` with repo root.

- [ ] **Verification 8: kata binary unique**

```bash
which kata-cli || echo "removed"
which kata
```
Expected: `removed` for kata-cli; `~/.bun/bin/kata` for kata.

- [ ] **Verification 9: cleanup-duplicates.sh absent**

```bash
test ! -f cleanup-duplicates.sh && echo "OK" || echo "VIOLATION"
```
Expected: `OK`.

- [ ] **Step 10: Type-check + run full CI**

```bash
bun run ci
```
Expected: PASS.

### Task 8.5: Delete migration script (self-delete)

**Files:**
- Delete: `engine/src/cli/migrate-v2/` (entire directory)
- Delete: `engine/src/cli/migrate.ts`
- Delete: `engine/tests/cli/migrate-v2/`
- Modify: `engine/src/cli/index.ts` (remove `buildMigrateCommand` registration + import)

- [ ] **Step 1: Remove migration code**

```bash
git rm -r engine/src/cli/migrate-v2/ engine/src/cli/migrate.ts engine/tests/cli/migrate-v2/
```

- [ ] **Step 2: Remove import + registration**

Edit `engine/src/cli/index.ts`:
- Remove `import { buildMigrateCommand } from "./migrate.ts";`
- Remove `kata.addCommand(buildMigrateCommand());`

- [ ] **Step 3: Verify CI guard now active**

```bash
test ! -d engine/src/cli/migrate-v2 && echo "guard OK"
```
Expected: `guard OK`. `migrate-script-removed.yml` now actively prevents re-addition.

- [ ] **Step 4: Type-check + commit**

```bash
bun run type-check
bun test
git add -A
git commit -m "chore: remove migrate-v2 script (one-shot complete)"
```

### Task 8.6: Final cleanup + PR

- [ ] **Step 1: Optionally remove workspace.bak after verification (manual)**

After Task 8.4 passes and user confirms migration is healthy:
```bash
rm -rf workspace.bak
git status                  # ensure workspace.bak is not tracked
```

Keep `pre-migrate-v2-<timestamp>` git tag for at least 1 month (permanent if disk allows).

- [ ] **Step 2: Push branch**

```bash
git push -u origin migrate/v2-layout
```

- [ ] **Step 3: Open PR**

```bash
gh pr create --title "Workspace v2 layout + two-phase hardening (one-shot migration)" \
  --body "$(cat <<'EOF'
## Summary
- Migrate kata workspace from convention-driven to contract-driven layout
- Unify `kata-cli` into `kata` binary (gh/docker style)
- Add 4 v2 schemas + 6 new quality gates
- Replace ~100 chinese-named feature directories with ASCII slug + metadata.yaml
- Consolidate 5 root hidden dirs into single `.kata/`
- Delete obsolete v3 migration + cleanup-duplicates.sh
- Add 5 new CI workflows
- Migration script self-deleted after success

## Test plan
- [x] `bun run ci` passes
- [x] `kata features lint --exit-code` passes
- [x] `kata features index` regenerates INDEX
- [x] At least one feature smoke list succeeds via `npx playwright test --list`
- [x] `workspace/dataAssets/` has exactly 3 directories (features, _shared, .kata) + 2 files
- [x] Root has exactly 1 hidden runtime dir (.kata)
- [x] `.gitignore` ≤ 25 effective lines
- [x] `kata-cli` binary removed; `kata` is sole entry point
- [x] `cleanup-duplicates.sh` removed
- [x] `engine/src/cli/migrate-v2/` deleted post-migration

## Migration spec
See `docs/superpowers/specs/2026-05-14-workspace-v2-and-two-phase-hardening-design.md`
EOF
)"
```

---

## Phase 8 Checkpoint (Final)

```bash
bun run ci
kata features lint --exit-code
kata features index
ls workspace/dataAssets/
ls -la | grep '^\.'
test ! -d engine/src/cli/migrate-v2 && echo "post-migration OK"
```
Expected: all checks pass; PR pushed; ready for review.

---

## Plan-Level Self-Review Checklist

Run these checks before declaring the plan complete (operator/agent reviews):

- [ ] Every spec section (chapters 1–7 of the design doc) is covered by at least one task. Cross-reference:
  - Spec §1 (overview/goals/scope) — implicit; not a task
  - Spec §2 (audit findings) — Phase 1–5 each finding has a corresponding task
  - Spec §3 (directory governance) — Tasks 3.0–3.5 (CLI), 6.x (migration)
  - Spec §4 (workflow hardening) — Phase 5 + Phase 4 quality gates
  - Spec §5 (CLI + index) — Phase 3
  - Spec §6 (migration) — Phase 6 + Phase 8
  - Spec §7 (acceptance, risks, follow-ups) — Phase 8 verification + Phase 7 CI
- [ ] All file paths are absolute or relative to repo root and exact
- [ ] All TDD tasks have the 5-step pattern: failing test → run → impl → run → commit
- [ ] No "TBD" / "TODO" / "implement later" placeholders anywhere
- [ ] Type signatures introduced in early tasks match references in later tasks (e.g., `FeatureRow`, `FeaturesNewContext`, `Stage2Context`)
- [ ] Commands have expected output described or "Expected: PASS"
- [ ] Phase checkpoint commits are explicit per phase

---

## Execution Handoff

Plan complete and saved. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, two-stage review between tasks, fast iteration. Best for a plan this size (8 phases × multi-task each).

**2. Inline Execution** — execute tasks in this session using `executing-plans`, batch execution with checkpoints between phases.

Tell me which approach you want.





