# AI Testing Platform — MVP Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the kata read-only access platform's headless backend — a tested catalog read layer plus two thin transports (MCP stdio server + Bun.serve HTTP/SSE API) — under TDD, replacing the off-process P1/P2 code.

**Architecture:** `engine/` stays the domain core (facade `kata-engine`). New code lives under `apps/`: `apps/core` holds the read layer (catalog) + shared types + typed errors; `apps/mcp` and `apps/console` are thin transports that consume `apps/core`. The catalog wraps the `kata-engine` facade (`runFeaturesLs`, `runFeaturesShow`, `listProjects`, `workspaceDir`) and adds artifact reading + `cases.xmind` parsing (via `jszip`). Everything is read-only; nothing mutates the workspace.

**Tech Stack:** Bun ≥1.3 (`bun test`, `Bun.serve`, `Bun.stdin`), TypeScript, Biome, `jszip` (root dep), `yaml` (engine dep). Tests use `bun:test` with `mkdtempSync` temp-workspace fixtures driven by `process.env.KATA_WORKSPACE_ROOT`.

**Scope note:** This plan is the backend half of the MVP. The React+Vite web UI is a separate plan (`2026-05-20-ai-testing-platform-mvp-web.md`). This plan produces working, testable software on its own: an MCP server with 6 read tools and an HTTP API, both fully unit-tested.

**Spec:** `docs/superpowers/specs/2026-05-20-ai-testing-platform-design.md`

---

## File Structure

Created by this plan:

```
apps/
  core/
    types.ts                       # shared types (ProjectSummary, ArtifactInfo, XmindSheet, SkillSummary, FeatureDetail)
    errors.ts                      # NotFoundError / InvalidInputError / ForbiddenError
    test-helpers.ts                # temp-workspace fixture: seedProject/seedFeature/seedXmind/withWorkspace
    catalog/
      guards.ts                    # FEATURE_ID_RE, TEXT_ARTIFACTS, assertProject/assertFeatureId/featurePath/assertInsideFeature
      projects.ts                  # listProjectSummaries
      features.ts                  # listFeatures, getFeature
      artifacts.ts                 # listArtifacts, readTextArtifact
      xmind.ts                     # parseXmind (+ toXmindNode)
      skills.ts                    # listSkills (reads .ai/core/skills/*/skill.yaml)
      index.ts                     # barrel re-export
      guards.test.ts
      projects.test.ts
      features.test.ts
      artifacts.test.ts
      xmind.test.ts
      skills.test.ts
  mcp/
    tools.ts                       # ToolDef registry (6 read tools)
    dispatch.ts                    # pure JSON-RPC dispatch(req) -> response | null
    server.ts                      # stdio loop (Bun.stdin) calling dispatch
    dispatch.test.ts
    tools.test.ts
  console/
    errors-http.ts                 # errToResponse: typed error -> Response (404/400/403/500)
    api.ts                         # handleApi(url) -> Response | null (all /api/* routes)
    static.ts                      # serveStatic(pathname) -> Response (web/dist + SPA fallback, traversal guard)
    server.ts                      # Bun.serve wiring (port from KATA_CONSOLE_PORT ?? 4317)
    api.test.ts
  tsconfig.json                    # bun types, includes apps/**/*.ts
```

Modified:

```
.mcp.json                         # point at apps/mcp/server.ts (recreate after reset)
package.json                      # scripts: console / mcp / test:apps
```

Removed (Task 1 — full reset of off-process P1/P2):

```
apps/console/{server.ts,public/*}  apps/mcp/{server.ts,tools.ts}  apps/shared/{catalog.ts,skills.ts}  .mcp.json
```

---

## Phase 0 — Full reset

### Task 1: Remove off-process P1/P2 code

The off-process console/MCP was committed in `07ed27bad`. Per the full-reset decision, delete it so the rebuild starts clean. Keep `engine/src/api.ts` facade exports (correct, additive, reused by the new catalog). Keep `apps/tsconfig.json` only if present and correct; we recreate it in Task 2 to be safe.

**Files:**
- Delete: `apps/console/`, `apps/mcp/`, `apps/shared/`, `apps/tsconfig.json`, `.mcp.json`

- [ ] **Step 1: Remove the old files**

```bash
git rm -r apps/console apps/mcp apps/shared apps/tsconfig.json .mcp.json
```

- [ ] **Step 2: Verify only intended files are staged for deletion**

Run: `git status --short`
Expected: only `D apps/...`, `D .mcp.json` lines (10 deletions); no other paths touched.

- [ ] **Step 3: Verify baseline still green after removal**

Run: `bun test`
Expected: same as clean baseline (1662 pass, 1 skip, 0 fail) — nothing in `engine/` depended on `apps/`.

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor: ♻️ remove off-process console/mcp before TDD rebuild"
```

---

## Phase 1 — Core: types, errors, fixtures

### Task 2: Shared types + typed errors + apps tsconfig

**Files:**
- Create: `apps/core/types.ts`
- Create: `apps/core/errors.ts`
- Create: `apps/tsconfig.json`

No tests (pure types + trivial error subclasses; exercised by later tasks).

- [ ] **Step 1: Create `apps/core/types.ts`**

```ts
/**
 * Shared types for the kata platform read layer.
 * Re-exports the engine FeatureRow so every transport imports one source.
 */
export type { FeatureRow } from "kata-engine";

export interface ProjectSummary {
  readonly name: string;
  readonly featureCount: number;
}

export interface ArtifactInfo {
  readonly name: string;
  readonly bytes: number;
}

export interface XmindNode {
  readonly title: string;
  readonly markers: readonly string[];
  readonly note: string | null;
  readonly children: readonly XmindNode[];
}

export interface XmindSheet {
  readonly title: string;
  readonly root: XmindNode;
}

export interface SkillSummary {
  readonly id: string;
  readonly name: string;
  readonly kind: string | null;
  readonly status: string | null;
  readonly summary: string | null;
  readonly mustTriggerWhen: readonly string[];
  readonly mustNotTriggerWhen: readonly string[];
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
}

export interface FeatureDetail {
  readonly metadata: unknown;
  readonly manifest: unknown;
  readonly recentRuns: readonly string[];
  readonly artifacts: readonly ArtifactInfo[];
}
```

- [ ] **Step 2: Create `apps/core/errors.ts`**

```ts
/**
 * Typed errors so transports can map failures to HTTP codes / MCP isError
 * without string matching.
 */
export class NotFoundError extends Error {
  readonly kind = "not_found" as const;
}
export class InvalidInputError extends Error {
  readonly kind = "invalid_input" as const;
}
export class ForbiddenError extends Error {
  readonly kind = "forbidden" as const;
}
```

- [ ] **Step 3: Create `apps/tsconfig.json`**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": ".",
    "types": ["bun"]
  },
  "include": ["**/*.ts"]
}
```

- [ ] **Step 4: Type-check the new files compile**

Run: `bunx tsc --noEmit -p apps/tsconfig.json`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/core/types.ts apps/core/errors.ts apps/tsconfig.json
git commit -m "feat: ✨ add platform core types + typed errors"
```

### Task 3: Temp-workspace test fixture

A reusable helper that creates a temp workspace, points `KATA_WORKSPACE_ROOT` at it (absolute path → `workspaceDir()` returns it verbatim), seeds projects/features, and restores env on cleanup.

**Files:**
- Create: `apps/core/test-helpers.ts`

- [ ] **Step 1: Create `apps/core/test-helpers.ts`**

```ts
/**
 * Test fixtures for the catalog read layer.
 *
 * workspaceDir() = resolve(repoRoot(), KATA_WORKSPACE_ROOT ?? "workspace").
 * Setting KATA_WORKSPACE_ROOT to an ABSOLUTE temp dir makes workspaceDir()
 * return that dir verbatim, isolating tests from the real workspace.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";

export interface SeedFeatureInput {
  readonly project: string;
  readonly id: string;
  readonly displayName?: string;
  readonly status?: string;
  readonly modules?: string[];
  readonly customers?: string[];
  readonly versions?: string[];
  readonly owners?: string[];
  readonly createdAt?: string;
  readonly automationStatus?: string;
  readonly lastRunStatus?: string;
  readonly archiveMd?: string;
}

export interface Workspace {
  readonly root: string;
  seedFeature(input: SeedFeatureInput): string; // returns feature dir
  seedXmind(project: string, id: string, contentJson: unknown): Promise<void>;
  writeArtifact(project: string, id: string, name: string, body: string): void;
  cleanup(): void;
}

export function makeWorkspace(): Workspace {
  const prev = process.env.KATA_WORKSPACE_ROOT;
  const root = mkdtempSync(join(tmpdir(), "kata-platform-test-"));
  process.env.KATA_WORKSPACE_ROOT = root;

  function featureDir(project: string, id: string): string {
    return join(root, project, "features", id);
  }

  return {
    root,
    seedFeature(input) {
      const dir = featureDir(input.project, input.id);
      mkdirSync(dir, { recursive: true });
      const meta = {
        id: input.id,
        display_name: input.displayName ?? input.id,
        status: input.status ?? "active",
        modules: input.modules ?? ["dq"],
        customers: input.customers ?? [],
        versions: input.versions ?? ["v1"],
        owners: input.owners ?? ["qa"],
        created_at: input.createdAt ?? "2026-01",
      };
      const metaYaml = Object.entries(meta)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join("\n");
      writeFileSync(join(dir, "metadata.yaml"), `${metaYaml}\n`);
      writeFileSync(
        join(dir, "manifest.json"),
        JSON.stringify(
          {
            automation: {
              status: input.automationStatus ?? "not-started",
              last_run_status: input.lastRunStatus ?? "not-run",
            },
          },
          null,
          2,
        ),
      );
      if (input.archiveMd !== undefined) {
        writeFileSync(join(dir, "archive.md"), input.archiveMd);
      }
      return dir;
    },
    async seedXmind(project, id, contentJson) {
      const zip = new JSZip();
      zip.file("content.json", JSON.stringify(contentJson));
      const buf = await zip.generateAsync({ type: "nodebuffer" });
      writeFileSync(join(featureDir(project, id), "cases.xmind"), buf);
    },
    writeArtifact(project, id, name, body) {
      writeFileSync(join(featureDir(project, id), name), body);
    },
    cleanup() {
      if (prev === undefined) delete process.env.KATA_WORKSPACE_ROOT;
      else process.env.KATA_WORKSPACE_ROOT = prev;
      rmSync(root, { recursive: true, force: true });
    },
  };
}
```

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit -p apps/tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/core/test-helpers.ts
git commit -m "test: ✅ add temp-workspace catalog fixture"
```

---

## Phase 2 — Catalog read layer (TDD)

### Task 4: Guards

**Files:**
- Create: `apps/core/catalog/guards.ts`
- Test: `apps/core/catalog/guards.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { ForbiddenError, InvalidInputError } from "../errors.ts";
import { makeWorkspace, type Workspace } from "../test-helpers.ts";
import {
  assertFeatureId,
  assertInsideFeature,
  assertProject,
  FEATURE_ID_RE,
  featurePath,
  TEXT_ARTIFACTS,
} from "./guards.ts";

let ws: Workspace;
beforeEach(() => {
  ws = makeWorkspace();
  ws.seedFeature({ project: "demo", id: "2026-01-dq-smoke" });
});
afterEach(() => ws.cleanup());

describe("guards", () => {
  test("FEATURE_ID_RE accepts valid ids and rejects traversal", () => {
    expect(FEATURE_ID_RE.test("2026-01-dq-smoke")).toBe(true);
    expect(FEATURE_ID_RE.test("2099-XX-dq-smoke")).toBe(true);
    expect(FEATURE_ID_RE.test("../etc")).toBe(false);
    expect(FEATURE_ID_RE.test("2026-01-DQ")).toBe(false);
  });

  test("assertProject throws InvalidInputError for unknown project", () => {
    expect(() => assertProject("demo")).not.toThrow();
    expect(() => assertProject("ghost")).toThrow(InvalidInputError);
  });

  test("assertFeatureId throws InvalidInputError for bad id", () => {
    expect(() => assertFeatureId("2026-01-dq-smoke")).not.toThrow();
    expect(() => assertFeatureId("../../etc/passwd")).toThrow(InvalidInputError);
  });

  test("assertInsideFeature throws ForbiddenError on escape", () => {
    const inside = featurePath("demo", "2026-01-dq-smoke", "archive.md");
    expect(() => assertInsideFeature("demo", "2026-01-dq-smoke", inside)).not.toThrow();
    const outside = featurePath("demo", "2026-01-dq-smoke", "..", "..", "secret");
    expect(() => assertInsideFeature("demo", "2026-01-dq-smoke", outside)).toThrow(ForbiddenError);
  });

  test("TEXT_ARTIFACTS whitelists archive.md but not cases.xmind", () => {
    expect(TEXT_ARTIFACTS.has("archive.md")).toBe(true);
    expect(TEXT_ARTIFACTS.has("cases.xmind")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/core/catalog/guards.test.ts`
Expected: FAIL — `Cannot find module './guards.ts'`.

- [ ] **Step 3: Write minimal implementation**

```ts
import { join, resolve } from "node:path";
import { listProjects, workspaceDir } from "kata-engine";
import { ForbiddenError, InvalidInputError } from "../errors.ts";

// Mirrors engine FEATURE_ID_RE (engine/lib/paths.ts) — guards path traversal.
export const FEATURE_ID_RE = /^\d{4}-?(?:\d{2}|XX)(?:-[a-z][a-z0-9-]*)+$/;

// Text artifacts safe to expose verbatim. Additive only; never globs.
export const TEXT_ARTIFACTS: ReadonlySet<string> = new Set([
  "archive.md",
  "archive.draft.md",
  "metadata.yaml",
  "manifest.json",
  "prd.md",
  "enhanced.md",
  "resolved.md",
  "confirmation-package.md",
  "unresolved-summary.md",
  "source-facts.json",
]);

export function assertProject(project: string): void {
  if (!listProjects().includes(project)) {
    throw new InvalidInputError(`Unknown project: ${project}`);
  }
}

export function assertFeatureId(featureId: string): void {
  if (!FEATURE_ID_RE.test(featureId)) {
    throw new InvalidInputError(`Invalid feature id: ${featureId}`);
  }
}

export function featurePath(project: string, featureId: string, ...segments: string[]): string {
  return join(workspaceDir(), project, "features", featureId, ...segments);
}

export function assertInsideFeature(project: string, featureId: string, full: string): void {
  if (!resolve(full).startsWith(resolve(featurePath(project, featureId)))) {
    throw new ForbiddenError(`Path escape: ${full}`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/core/catalog/guards.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/core/catalog/guards.ts apps/core/catalog/guards.test.ts
git commit -m "feat: ✨ add catalog path guards + whitelist"
```

### Task 5: Project listing

**Files:**
- Create: `apps/core/catalog/projects.ts`
- Test: `apps/core/catalog/projects.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, expect, test } from "bun:test";
import { makeWorkspace, type Workspace } from "../test-helpers.ts";
import { listProjectSummaries } from "./projects.ts";

let ws: Workspace;
beforeEach(() => {
  ws = makeWorkspace();
});
afterEach(() => ws.cleanup());

test("listProjectSummaries counts features per project, sorted, INDEX.md excluded", () => {
  ws.seedFeature({ project: "beta", id: "2026-01-dq-one" });
  ws.seedFeature({ project: "alpha", id: "2026-01-dq-one" });
  ws.seedFeature({ project: "alpha", id: "2026-02-dq-two" });
  const summaries = listProjectSummaries();
  expect(summaries).toEqual([
    { name: "alpha", featureCount: 2 },
    { name: "beta", featureCount: 1 },
  ]);
});

test("listProjectSummaries returns [] when workspace empty", () => {
  expect(listProjectSummaries()).toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/core/catalog/projects.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { listProjects, workspaceDir } from "kata-engine";
import type { ProjectSummary } from "../types.ts";

export function listProjectSummaries(): ProjectSummary[] {
  return listProjects()
    .map((name) => {
      const dir = join(workspaceDir(), name, "features");
      let featureCount = 0;
      if (existsSync(dir)) {
        featureCount = readdirSync(dir).filter((n) => {
          if (n === "INDEX.md") return false;
          return statSync(join(dir, n)).isDirectory();
        }).length;
      }
      return { name, featureCount };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/core/catalog/projects.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/core/catalog/projects.ts apps/core/catalog/projects.test.ts
git commit -m "feat: ✨ add catalog project listing"
```

### Task 6: Feature listing + detail

**Files:**
- Create: `apps/core/catalog/features.ts`
- Test: `apps/core/catalog/features.test.ts`
- Depends on: `apps/core/catalog/artifacts.ts` (`listArtifacts`) — created in Task 7. To keep this task self-contained, `getFeature` imports `listArtifacts` from `./artifacts.ts`; write Task 7's file first if executing strictly in order, OR stub. **Execution note:** do Task 7 before Task 6's `getFeature` step, or temporarily inline an empty artifacts list. The steps below assume `./artifacts.ts` exists; if not yet, run Task 7 Step 3 first.

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, expect, test } from "bun:test";
import { InvalidInputError, NotFoundError } from "../errors.ts";
import { makeWorkspace, type Workspace } from "../test-helpers.ts";
import { getFeature, listFeatures } from "./features.ts";

let ws: Workspace;
beforeEach(() => {
  ws = makeWorkspace();
  ws.seedFeature({ project: "demo", id: "2026-01-dq-alpha", modules: ["dq"], status: "active" });
  ws.seedFeature({ project: "demo", id: "2026-02-meta-beta", modules: ["metadata"], status: "draft" });
});
afterEach(() => ws.cleanup());

test("listFeatures returns all features sorted by id", async () => {
  const rows = await listFeatures("demo");
  expect(rows.map((r) => r.id)).toEqual(["2026-01-dq-alpha", "2026-02-meta-beta"]);
});

test("listFeatures filters by module", async () => {
  const rows = await listFeatures("demo", { module: "metadata" });
  expect(rows.map((r) => r.id)).toEqual(["2026-02-meta-beta"]);
});

test("listFeatures rejects unknown project", async () => {
  await expect(listFeatures("ghost")).rejects.toThrow(InvalidInputError);
});

test("getFeature returns metadata, manifest, artifacts", async () => {
  ws.writeArtifact("demo", "2026-01-dq-alpha", "archive.md", "# cases");
  const detail = await getFeature("demo", "2026-01-dq-alpha");
  expect((detail.metadata as { id: string }).id).toBe("2026-01-dq-alpha");
  expect(detail.artifacts.some((a) => a.name === "archive.md")).toBe(true);
});

test("getFeature throws NotFoundError for missing feature dir", async () => {
  await expect(getFeature("demo", "2099-XX-dq-missing")).rejects.toThrow(NotFoundError);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/core/catalog/features.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import { existsSync } from "node:fs";
import { runFeaturesLs, runFeaturesShow, workspaceDir } from "kata-engine";
import type { FeatureRow } from "kata-engine";
import { NotFoundError } from "../errors.ts";
import type { FeatureDetail } from "../types.ts";
import { listArtifacts } from "./artifacts.ts";
import { assertFeatureId, assertProject, featurePath } from "./guards.ts";

export type FeatureFilters = Partial<
  Omit<Parameters<typeof runFeaturesLs>[0], "project" | "workspaceRoot">
>;

export async function listFeatures(
  project: string,
  filters: FeatureFilters = {},
): Promise<FeatureRow[]> {
  assertProject(project);
  return runFeaturesLs({ project, workspaceRoot: workspaceDir(), ...filters });
}

export async function getFeature(project: string, featureId: string): Promise<FeatureDetail> {
  assertProject(project);
  assertFeatureId(featureId);
  if (!existsSync(featurePath(project, featureId))) {
    throw new NotFoundError(`Feature not found: ${featureId}`);
  }
  const detail = await runFeaturesShow({ project, featureId, workspaceRoot: workspaceDir() });
  return { ...detail, artifacts: listArtifacts(project, featureId) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/core/catalog/features.test.ts`
Expected: PASS (5 tests). (Requires Task 7's `artifacts.ts`.)

- [ ] **Step 5: Commit**

```bash
git add apps/core/catalog/features.ts apps/core/catalog/features.test.ts
git commit -m "feat: ✨ add catalog feature listing + detail"
```

### Task 7: Artifacts (list + read)

**Files:**
- Create: `apps/core/catalog/artifacts.ts`
- Test: `apps/core/catalog/artifacts.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, expect, test } from "bun:test";
import { ForbiddenError, NotFoundError } from "../errors.ts";
import { makeWorkspace, type Workspace } from "../test-helpers.ts";
import { listArtifacts, readTextArtifact } from "./artifacts.ts";

let ws: Workspace;
beforeEach(() => {
  ws = makeWorkspace();
  ws.seedFeature({ project: "demo", id: "2026-01-dq-alpha" });
  ws.writeArtifact("demo", "2026-01-dq-alpha", "archive.md", "# cases\n");
});
afterEach(() => ws.cleanup());

test("listArtifacts reports present whitelisted artifacts with byte sizes", () => {
  const arts = listArtifacts("demo", "2026-01-dq-alpha");
  const names = arts.map((a) => a.name);
  expect(names).toContain("metadata.yaml");
  expect(names).toContain("manifest.json");
  expect(names).toContain("archive.md");
  const archive = arts.find((a) => a.name === "archive.md");
  expect(archive?.bytes).toBeGreaterThan(0);
});

test("readTextArtifact returns whitelisted file content", () => {
  expect(readTextArtifact("demo", "2026-01-dq-alpha", "archive.md")).toBe("# cases\n");
});

test("readTextArtifact rejects non-whitelisted name with ForbiddenError", () => {
  expect(() => readTextArtifact("demo", "2026-01-dq-alpha", "secret.env")).toThrow(ForbiddenError);
});

test("readTextArtifact throws NotFoundError when whitelisted file absent", () => {
  expect(() => readTextArtifact("demo", "2026-01-dq-alpha", "prd.md")).toThrow(NotFoundError);
});

test("readTextArtifact rejects bad feature id", () => {
  expect(() => readTextArtifact("demo", "../../etc", "archive.md")).toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/core/catalog/artifacts.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { NotFoundError } from "../errors.ts";
import type { ArtifactInfo } from "../types.ts";
import {
  assertFeatureId,
  assertInsideFeature,
  assertProject,
  featurePath,
  TEXT_ARTIFACTS,
} from "./guards.ts";

export function listArtifacts(project: string, featureId: string): ArtifactInfo[] {
  const dir = featurePath(project, featureId);
  if (!existsSync(dir)) return [];
  const names = ["cases.xmind", ...TEXT_ARTIFACTS];
  return names
    .filter((name) => existsSync(join(dir, name)))
    .map((name) => ({ name, bytes: statSync(join(dir, name)).size }));
}

export function readTextArtifact(project: string, featureId: string, name: string): string {
  assertProject(project);
  assertFeatureId(featureId);
  if (!TEXT_ARTIFACTS.has(name)) {
    throw new ForbiddenError(`Artifact not allowed: ${name}`);
  }
  const full = featurePath(project, featureId, name);
  assertInsideFeature(project, featureId, full);
  if (!existsSync(full)) {
    throw new NotFoundError(`Artifact not found: ${name}`);
  }
  return readFileSync(full, "utf-8");
}
```

Note: add `ForbiddenError` to the import from `../errors.ts` (used above):

```ts
import { ForbiddenError, NotFoundError } from "../errors.ts";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/core/catalog/artifacts.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/core/catalog/artifacts.ts apps/core/catalog/artifacts.test.ts
git commit -m "feat: ✨ add catalog artifact list + safe read"
```

### Task 8: XMind parsing

**Files:**
- Create: `apps/core/catalog/xmind.ts`
- Test: `apps/core/catalog/xmind.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, expect, test } from "bun:test";
import { NotFoundError } from "../errors.ts";
import { makeWorkspace, type Workspace } from "../test-helpers.ts";
import { parseXmind } from "./xmind.ts";

let ws: Workspace;
beforeEach(() => {
  ws = makeWorkspace();
  ws.seedFeature({ project: "demo", id: "2026-01-dq-alpha" });
});
afterEach(() => ws.cleanup());

test("parseXmind returns sheets with nested topic tree, markers, notes", async () => {
  await ws.seedXmind("demo", "2026-01-dq-alpha", [
    {
      title: "Sheet 1",
      rootTopic: {
        title: "root",
        markers: [{ markerId: "priority-1" }],
        notes: { plain: { content: "root note" } },
        children: {
          attached: [{ title: "child A", children: { attached: [{ title: "grandchild" }] } }],
        },
      },
    },
  ]);
  const sheets = await parseXmind("demo", "2026-01-dq-alpha");
  expect(sheets).toHaveLength(1);
  expect(sheets[0].title).toBe("Sheet 1");
  expect(sheets[0].root.title).toBe("root");
  expect(sheets[0].root.markers).toEqual(["priority-1"]);
  expect(sheets[0].root.note).toBe("root note");
  expect(sheets[0].root.children[0].title).toBe("child A");
  expect(sheets[0].root.children[0].children[0].title).toBe("grandchild");
});

test("parseXmind throws NotFoundError when cases.xmind absent", async () => {
  await expect(parseXmind("demo", "2026-01-dq-alpha")).rejects.toThrow(NotFoundError);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/core/catalog/xmind.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import { existsSync, readFileSync } from "node:fs";
import JSZip from "jszip";
import { NotFoundError } from "../errors.ts";
import type { XmindNode, XmindSheet } from "../types.ts";
import { assertFeatureId, assertProject, featurePath } from "./guards.ts";

function toXmindNode(topic: Record<string, unknown>): XmindNode {
  const markers = Array.isArray(topic.markers)
    ? (topic.markers as Array<{ markerId?: string }>).map((m) => m.markerId ?? "").filter(Boolean)
    : [];
  const attached = (topic.children as { attached?: unknown[] } | undefined)?.attached ?? [];
  const note =
    typeof topic.notes === "object" && topic.notes !== null
      ? ((topic.notes as { plain?: { content?: string } }).plain?.content ?? null)
      : null;
  return {
    title: typeof topic.title === "string" ? topic.title : "",
    markers,
    note,
    children: attached.map((c) => toXmindNode(c as Record<string, unknown>)),
  };
}

export async function parseXmind(project: string, featureId: string): Promise<XmindSheet[]> {
  assertProject(project);
  assertFeatureId(featureId);
  const full = featurePath(project, featureId, "cases.xmind");
  if (!existsSync(full)) {
    throw new NotFoundError("cases.xmind not found");
  }
  const zip = await JSZip.loadAsync(readFileSync(full));
  const entry = zip.file("content.json");
  if (!entry) {
    throw new NotFoundError("content.json missing in cases.xmind");
  }
  const sheets = JSON.parse(await entry.async("text")) as Array<{
    title?: string;
    rootTopic: Record<string, unknown>;
  }>;
  return sheets.map((sheet) => ({
    title: typeof sheet.title === "string" ? sheet.title : "",
    root: toXmindNode(sheet.rootTopic),
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/core/catalog/xmind.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/core/catalog/xmind.ts apps/core/catalog/xmind.test.ts
git commit -m "feat: ✨ add catalog cases.xmind parser"
```

### Task 9: Skills catalog

**Files:**
- Create: `apps/core/catalog/skills.ts`
- Test: `apps/core/catalog/skills.test.ts`

This reads the real `.ai/core/skills/*/skill.yaml` (repo-relative, not workspace) so the test asserts invariants against the real repo. Uses `parseDocument(text, {strict:false}).toJS()` to tolerate backtick-prefixed scalars deep in `body.hard_rules`.

- [ ] **Step 1: Write the failing test**

```ts
import { expect, test } from "bun:test";
import { listSkills } from "./skills.ts";

test("listSkills returns the kata skills sorted by id with parsed fields", () => {
  const skills = listSkills();
  const ids = skills.map((s) => s.id);
  expect(ids).toContain("case-draft");
  expect(ids).toContain("bug-file");
  // sorted ascending
  expect([...ids]).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
});

test("listSkills parses case-draft inputs/outputs without throwing on backtick scalars", () => {
  const draft = listSkills().find((s) => s.id === "case-draft");
  expect(draft).toBeDefined();
  expect(draft?.name.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/core/catalog/skills.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "kata-engine";
import { parseDocument } from "yaml";
import type { SkillSummary } from "../types.ts";

function skillsRoot(): string {
  return join(repoRoot(), ".ai/core/skills");
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function toSummary(doc: Record<string, unknown>): SkillSummary {
  const description = (doc.description ?? {}) as Record<string, unknown>;
  const inputs = (doc.inputs ?? {}) as Record<string, unknown>;
  return {
    id: typeof doc.id === "string" ? doc.id : "",
    name: typeof doc.name === "string" ? doc.name : "",
    kind: typeof doc.kind === "string" ? doc.kind : null,
    status: typeof doc.status === "string" ? doc.status : null,
    summary: typeof description.summary === "string" ? description.summary : null,
    mustTriggerWhen: asStringArray(description.must_trigger_when),
    mustNotTriggerWhen: asStringArray(description.must_not_trigger_when),
    inputs: Object.keys(inputs),
    outputs: asStringArray(doc.outputs),
  };
}

export function listSkills(): SkillSummary[] {
  const root = skillsRoot();
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((name) => statSync(join(root, name)).isDirectory())
    .map((name) => join(root, name, "skill.yaml"))
    .filter((path) => existsSync(path))
    .map((path) => {
      // strict:false tolerates backtick-prefixed scalars in body.hard_rules;
      // we only consume top-level fields, which recover cleanly.
      const doc = parseDocument(readFileSync(path, "utf-8"), { strict: false });
      return toSummary((doc.toJS() ?? {}) as Record<string, unknown>);
    })
    .filter((skill) => skill.id !== "")
    .sort((a, b) => a.id.localeCompare(b.id));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/core/catalog/skills.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/core/catalog/skills.ts apps/core/catalog/skills.test.ts
git commit -m "feat: ✨ add skills catalog reader"
```

### Task 10: Catalog barrel + full core test run

**Files:**
- Create: `apps/core/catalog/index.ts`

- [ ] **Step 1: Create the barrel**

```ts
export { listArtifacts, readTextArtifact } from "./artifacts.ts";
export { getFeature, listFeatures } from "./features.ts";
export type { FeatureFilters } from "./features.ts";
export { listProjectSummaries } from "./projects.ts";
export { listSkills } from "./skills.ts";
export { parseXmind } from "./xmind.ts";
```

- [ ] **Step 2: Run the whole core test suite**

Run: `bun test apps/core`
Expected: PASS — all catalog tests (guards 5, projects 2, features 5, artifacts 5, xmind 2, skills 2).

- [ ] **Step 3: Type-check + lint**

Run: `bunx tsc --noEmit -p apps/tsconfig.json && bunx biome check apps/core`
Expected: no errors. Fix any biome import-order/template issues with `bunx biome check --fix apps/core`.

- [ ] **Step 4: Commit**

```bash
git add apps/core/catalog/index.ts
git commit -m "feat: ✨ add catalog barrel export"
```

---

## Phase 3 — MCP transport (TDD)

### Task 11: Tool registry

**Files:**
- Create: `apps/mcp/tools.ts`
- Test: `apps/mcp/tools.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, expect, test } from "bun:test";
import { makeWorkspace, type Workspace } from "../core/test-helpers.ts";
import { TOOL_BY_NAME, TOOLS } from "./tools.ts";

let ws: Workspace;
beforeEach(() => {
  ws = makeWorkspace();
  ws.seedFeature({ project: "demo", id: "2026-01-dq-alpha" });
});
afterEach(() => ws.cleanup());

test("exposes exactly the 6 read tools", () => {
  expect(TOOLS.map((t) => t.name).sort()).toEqual(
    [
      "kata_get_cases",
      "kata_get_feature",
      "kata_list_features",
      "kata_list_projects",
      "kata_list_skills",
      "kata_read_artifact",
    ].sort(),
  );
});

test("kata_list_projects handler returns seeded project", async () => {
  const tool = TOOL_BY_NAME.get("kata_list_projects");
  const result = (await tool?.handler({})) as Array<{ name: string }>;
  expect(result.some((p) => p.name === "demo")).toBe(true);
});

test("kata_list_features handler requires project", async () => {
  const tool = TOOL_BY_NAME.get("kata_list_features");
  await expect(Promise.resolve(tool?.handler({}))).rejects.toThrow(/project/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/mcp/tools.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
/**
 * kata MCP tool registry — read-only slices of the catalog.
 * Same registry backs the in-platform agent (②) and external Claude Code /
 * Codex via `claude -p --mcp-config`. No tool mutates the workspace.
 */
import {
  getFeature,
  listFeatures,
  listProjectSummaries,
  listSkills,
  parseXmind,
  readTextArtifact,
} from "../core/catalog/index.ts";

export interface JsonSchema {
  readonly type: "object";
  readonly properties: Record<string, unknown>;
  readonly required?: readonly string[];
}

export interface ToolDef {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: JsonSchema;
  readonly handler: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

function str(args: Record<string, unknown>, key: string, required = true): string {
  const value = args[key];
  if (typeof value !== "string" || value === "") {
    if (required) throw new Error(`Missing required string argument: ${key}`);
    return "";
  }
  return value;
}

const FEATURE_FILTER_KEYS = [
  "module",
  "customer",
  "version",
  "owner",
  "createdAfter",
  "status",
  "automationStatus",
  "lastRun",
] as const;

export const TOOLS: readonly ToolDef[] = [
  {
    name: "kata_list_projects",
    description: "List kata workspace projects with their feature counts.",
    inputSchema: { type: "object", properties: {} },
    handler: () => listProjectSummaries(),
  },
  {
    name: "kata_list_features",
    description:
      "List QA features in a project. Returns id, display name, modules, status, automation status and last run. Filter by module/customer/version/owner/status/automationStatus/lastRun.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string", description: "Project name (see kata_list_projects)." },
        module: { type: "string" },
        customer: { type: "string" },
        version: { type: "string" },
        owner: { type: "string" },
        createdAfter: { type: "string", description: "yyyy-mm lower bound on created_at." },
        status: { type: "string" },
        automationStatus: { type: "string" },
        lastRun: { type: "string" },
      },
      required: ["project"],
    },
    handler: (args) => {
      const project = str(args, "project");
      const filters: Record<string, string> = {};
      for (const key of FEATURE_FILTER_KEYS) {
        const value = str(args, key, false);
        if (value) filters[key] = value;
      }
      return listFeatures(project, filters);
    },
  },
  {
    name: "kata_get_feature",
    description:
      "Get full detail for one feature: metadata.yaml, manifest.json, available artifacts and recent run ids.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string" },
        featureId: { type: "string", description: "e.g. 2026-02-dq-rule-task-edit-partition" },
      },
      required: ["project", "featureId"],
    },
    handler: (args) => getFeature(str(args, "project"), str(args, "featureId")),
  },
  {
    name: "kata_read_artifact",
    description:
      "Read a text artifact of a feature (archive.md, metadata.yaml, manifest.json, prd.md, enhanced.md, confirmation-package.md, unresolved-summary.md, source-facts.json, archive.draft.md, resolved.md).",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string" },
        featureId: { type: "string" },
        name: { type: "string", description: "Artifact file name from the allowed set." },
      },
      required: ["project", "featureId", "name"],
    },
    handler: (args) =>
      readTextArtifact(str(args, "project"), str(args, "featureId"), str(args, "name")),
  },
  {
    name: "kata_get_cases",
    description:
      "Get the test-case mind map (cases.xmind) of a feature parsed as a topic tree, including priority markers and notes.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string" },
        featureId: { type: "string" },
      },
      required: ["project", "featureId"],
    },
    handler: (args) => parseXmind(str(args, "project"), str(args, "featureId")),
  },
  {
    name: "kata_list_skills",
    description:
      "List kata QA skills (case-draft, case-edit, bug-file, ...) with trigger conditions, inputs and outputs, so an agent can route work to the right skill.",
    inputSchema: { type: "object", properties: {} },
    handler: () => listSkills(),
  },
];

export const TOOL_BY_NAME: ReadonlyMap<string, ToolDef> = new Map(TOOLS.map((t) => [t.name, t]));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/mcp/tools.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mcp/tools.ts apps/mcp/tools.test.ts
git commit -m "feat: ✨ add MCP read-tool registry"
```

### Task 12: Pure JSON-RPC dispatch

**Files:**
- Create: `apps/mcp/dispatch.ts`
- Test: `apps/mcp/dispatch.test.ts`

`dispatch` is the testable heart: a request object in, a response object (or `null` for notifications) out — no stdout writes.

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, expect, test } from "bun:test";
import { makeWorkspace, type Workspace } from "../core/test-helpers.ts";
import { dispatch } from "./dispatch.ts";

let ws: Workspace;
beforeEach(() => {
  ws = makeWorkspace();
  ws.seedFeature({ project: "demo", id: "2026-01-dq-alpha" });
});
afterEach(() => ws.cleanup());

test("initialize echoes protocol + serverInfo", async () => {
  const res = await dispatch({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
  expect(res?.result).toMatchObject({ serverInfo: { name: "kata" } });
});

test("notifications/initialized returns null (no response)", async () => {
  const res = await dispatch({ jsonrpc: "2.0", method: "notifications/initialized" });
  expect(res).toBeNull();
});

test("tools/list returns 6 tools", async () => {
  const res = await dispatch({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  expect((res?.result as { tools: unknown[] }).tools).toHaveLength(6);
});

test("tools/call success wraps text content", async () => {
  const res = await dispatch({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: "kata_list_projects", arguments: {} },
  });
  const content = (res?.result as { content: Array<{ type: string; text: string }> }).content;
  expect(content[0].type).toBe("text");
  expect(content[0].text).toContain("demo");
});

test("tools/call unknown tool yields isError", async () => {
  const res = await dispatch({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: { name: "nope", arguments: {} },
  });
  expect((res?.result as { isError: boolean }).isError).toBe(true);
});

test("tools/call missing required arg yields isError", async () => {
  const res = await dispatch({
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: { name: "kata_list_features", arguments: {} },
  });
  expect((res?.result as { isError: boolean }).isError).toBe(true);
});

test("unknown method returns -32601 error", async () => {
  const res = await dispatch({ jsonrpc: "2.0", id: 6, method: "bogus" });
  expect((res?.error as { code: number }).code).toBe(-32601);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/mcp/dispatch.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import { TOOL_BY_NAME, TOOLS } from "./tools.ts";

const SERVER_INFO = { name: "kata", version: "0.1.0" } as const;
const DEFAULT_PROTOCOL = "2025-06-18";

export type JsonRpcId = string | number | null;

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: { code: number; message: string };
}

async function callTool(
  name: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const tool = TOOL_BY_NAME.get(name);
  if (!tool) {
    return { isError: true, content: [{ type: "text", text: `Unknown tool: ${name}` }] };
  }
  try {
    const value = await tool.handler(args ?? {});
    const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    return { content: [{ type: "text", text }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { isError: true, content: [{ type: "text", text: message }] };
  }
}

/**
 * Pure dispatch: request -> response object, or null for notifications
 * (requests without an id). Never writes to stdout — the stdio loop does that.
 */
export async function dispatch(req: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  const { id, method, params } = req;
  const isNotification = id === undefined;
  const rid: JsonRpcId = id ?? null;

  switch (method) {
    case "initialize": {
      const requested = (params?.protocolVersion as string) ?? DEFAULT_PROTOCOL;
      return {
        jsonrpc: "2.0",
        id: rid,
        result: {
          protocolVersion: requested,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
        },
      };
    }
    case "notifications/initialized":
    case "initialized":
      return null;
    case "ping":
      return isNotification ? null : { jsonrpc: "2.0", id: rid, result: {} };
    case "tools/list":
      return {
        jsonrpc: "2.0",
        id: rid,
        result: {
          tools: TOOLS.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        },
      };
    case "tools/call": {
      const name = params?.name as string;
      const args = (params?.arguments as Record<string, unknown>) ?? {};
      return { jsonrpc: "2.0", id: rid, result: await callTool(name, args) };
    }
    default:
      if (isNotification) return null;
      return {
        jsonrpc: "2.0",
        id: rid,
        error: { code: -32601, message: `Method not found: ${method}` },
      };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/mcp/dispatch.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mcp/dispatch.ts apps/mcp/dispatch.test.ts
git commit -m "feat: ✨ add pure MCP JSON-RPC dispatch"
```

### Task 13: stdio server loop

**Files:**
- Create: `apps/mcp/server.ts`

Thin I/O shell around `dispatch`. No new unit test (pure I/O); verified by a manual smoke step.

- [ ] **Step 1: Write the server**

```ts
#!/usr/bin/env bun
/**
 * kata MCP server — zero-dependency stdio JSON-RPC 2.0 (MCP).
 * stdout is reserved for protocol messages; all logging goes to stderr.
 * Run:  bun apps/mcp/server.ts   (or  bun run mcp)
 */
import { dispatch, type JsonRpcRequest } from "./dispatch.ts";
import { TOOLS } from "./tools.ts";

function log(...args: unknown[]): void {
  process.stderr.write(`[kata-mcp] ${args.join(" ")}\n`);
}

function send(message: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

async function main(): Promise<void> {
  log(`ready · ${TOOLS.length} tools`);
  const decoder = new TextDecoder();
  let buffer = "";

  for await (const chunk of Bun.stdin.stream()) {
    buffer += decoder.decode(chunk, { stream: true });
    let newline = buffer.indexOf("\n");
    while (newline !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) {
        try {
          const res = await dispatch(JSON.parse(line) as JsonRpcRequest);
          if (res) send(res as unknown as Record<string, unknown>);
        } catch (error) {
          log("parse/handle error:", error instanceof Error ? error.message : String(error));
        }
      }
      newline = buffer.indexOf("\n");
    }
  }
}

main().catch((error) => {
  log("fatal:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
```

- [ ] **Step 2: Smoke-test the server over stdio**

Run:
```bash
printf '%s\n%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | bun apps/mcp/server.ts
```
Expected: two JSON lines on stdout — first with `"serverInfo":{"name":"kata"...}`, second listing 6 tools. `[kata-mcp] ready · 6 tools` on stderr.

- [ ] **Step 3: Commit**

```bash
git add apps/mcp/server.ts
git commit -m "feat: ✨ add MCP stdio server loop"
```

---

## Phase 4 — Console HTTP transport (TDD)

### Task 14: HTTP error mapping

**Files:**
- Create: `apps/console/errors-http.ts`

- [ ] **Step 1: Create error mapper**

```ts
import { ForbiddenError, InvalidInputError, NotFoundError } from "../core/errors.ts";

export function errToResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : String(error);
  let status = 500;
  if (error instanceof NotFoundError) status = 404;
  else if (error instanceof InvalidInputError) status = 400;
  else if (error instanceof ForbiddenError) status = 403;
  return Response.json({ error: message }, { status });
}
```

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit -p apps/tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/console/errors-http.ts
git commit -m "feat: ✨ add console HTTP error mapping"
```

### Task 15: API router

**Files:**
- Create: `apps/console/api.ts`
- Test: `apps/console/api.test.ts`

`handleApi(url)` returns a `Response` for `/api/*` and `null` otherwise (so the server can fall through to static).

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, expect, test } from "bun:test";
import { makeWorkspace, type Workspace } from "../core/test-helpers.ts";
import { handleApi } from "./api.ts";

let ws: Workspace;
beforeEach(() => {
  ws = makeWorkspace();
  ws.seedFeature({ project: "demo", id: "2026-01-dq-alpha" });
  ws.writeArtifact("demo", "2026-01-dq-alpha", "archive.md", "# cases\n");
});
afterEach(() => ws.cleanup());

async function get(path: string): Promise<Response> {
  const res = await handleApi(new URL(`http://x${path}`));
  if (!res) throw new Error(`no route for ${path}`);
  return res;
}

test("non-api path returns null", async () => {
  expect(await handleApi(new URL("http://x/index.html"))).toBeNull();
});

test("GET /api/projects lists projects", async () => {
  const res = await get("/api/projects");
  expect(res.status).toBe(200);
  const body = (await res.json()) as Array<{ name: string }>;
  expect(body.some((p) => p.name === "demo")).toBe(true);
});

test("GET /api/projects/:p/features lists features", async () => {
  const res = await get("/api/projects/demo/features");
  const body = (await res.json()) as Array<{ id: string }>;
  expect(body[0].id).toBe("2026-01-dq-alpha");
});

test("GET features with bad project -> 400", async () => {
  const res = await get("/api/projects/ghost/features");
  expect(res.status).toBe(400);
});

test("GET feature detail", async () => {
  const res = await get("/api/projects/demo/features/2026-01-dq-alpha");
  expect(res.status).toBe(200);
});

test("GET missing feature -> 404", async () => {
  const res = await get("/api/projects/demo/features/2099-XX-dq-missing");
  expect(res.status).toBe(404);
});

test("GET artifact content", async () => {
  const res = await get("/api/projects/demo/features/2026-01-dq-alpha/artifact/archive.md");
  expect(res.status).toBe(200);
  expect(await res.text()).toBe("# cases\n");
});

test("GET non-whitelisted artifact -> 403", async () => {
  const res = await get("/api/projects/demo/features/2026-01-dq-alpha/artifact/secret.env");
  expect(res.status).toBe(403);
});

test("GET /api/skills", async () => {
  const res = await get("/api/skills");
  expect(res.status).toBe(200);
});

test("unknown /api route -> 404", async () => {
  const res = await get("/api/nope");
  expect(res.status).toBe(404);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/console/api.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
/**
 * Console HTTP API router. Returns a Response for /api/* paths, or null so the
 * server falls through to static file serving. Read-only.
 */
import {
  getFeature,
  listArtifacts,
  listFeatures,
  listProjectSummaries,
  listSkills,
  parseXmind,
  readTextArtifact,
} from "../core/catalog/index.ts";
import type { FeatureFilters } from "../core/catalog/index.ts";
import { errToResponse } from "./errors-http.ts";

const FEATURE_FILTER_KEYS: Array<keyof FeatureFilters> = [
  "module",
  "customer",
  "version",
  "owner",
  "createdAfter",
  "status",
  "automationStatus",
  "lastRun",
];

function readFilters(url: URL): FeatureFilters {
  const filters: Record<string, string> = {};
  for (const key of FEATURE_FILTER_KEYS) {
    const value = url.searchParams.get(key as string);
    if (value) filters[key as string] = value;
  }
  return filters as FeatureFilters;
}

export async function handleApi(url: URL): Promise<Response | null> {
  const parts = url.pathname.split("/").filter(Boolean); // e.g. ["api","projects","demo","features"]
  if (parts[0] !== "api") return null;

  try {
    // /api/projects
    if (parts.length === 2 && parts[1] === "projects") {
      return Response.json(listProjectSummaries());
    }
    // /api/skills
    if (parts.length === 2 && parts[1] === "skills") {
      return Response.json(listSkills());
    }
    if (parts[1] === "projects" && parts.length >= 4 && parts[3] === "features") {
      const project = decodeURIComponent(parts[2]);
      // /api/projects/:p/features
      if (parts.length === 4) {
        return Response.json(await listFeatures(project, readFilters(url)));
      }
      const featureId = decodeURIComponent(parts[4]);
      // /api/projects/:p/features/:id
      if (parts.length === 5) {
        return Response.json(await getFeature(project, featureId));
      }
      // /api/projects/:p/features/:id/artifacts
      if (parts.length === 6 && parts[5] === "artifacts") {
        return Response.json(listArtifacts(project, featureId));
      }
      // /api/projects/:p/features/:id/xmind
      if (parts.length === 6 && parts[5] === "xmind") {
        return Response.json(await parseXmind(project, featureId));
      }
      // /api/projects/:p/features/:id/artifact/:name
      if (parts.length === 7 && parts[5] === "artifact") {
        const name = decodeURIComponent(parts[6]);
        return new Response(readTextArtifact(project, featureId, name), {
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }
    }
    return Response.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    return errToResponse(error);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/console/api.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/console/api.ts apps/console/api.test.ts
git commit -m "feat: ✨ add console HTTP API router"
```

### Task 16: Static serving + server wiring

**Files:**
- Create: `apps/console/static.ts`
- Create: `apps/console/server.ts`

Static serves the built web app (`apps/web/dist`) with a traversal guard and SPA fallback to `index.html`. Until the web plan runs, `dist` won't exist — `serveStatic` returns a friendly 503 telling the user to build the web app. No unit test for the I/O shell; smoke-tested.

- [ ] **Step 1: Create `apps/console/static.ts`**

```ts
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { repoRoot } from "kata-engine";

const WEB_DIST = join(repoRoot(), "apps/web/dist");

export async function serveStatic(pathname: string): Promise<Response> {
  if (!existsSync(WEB_DIST)) {
    return new Response(
      "web/dist not built yet. Run `bun run web:build` (see web plan).",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const full = resolve(WEB_DIST, rel);
  // Traversal guard: resolved path must stay inside dist.
  if (!full.startsWith(resolve(WEB_DIST))) {
    return new Response("Forbidden", { status: 403 });
  }
  const file = Bun.file(existsSync(full) ? full : join(WEB_DIST, "index.html"));
  return new Response(file);
}
```

- [ ] **Step 2: Create `apps/console/server.ts`**

```ts
#!/usr/bin/env bun
/**
 * kata console — Bun.serve HTTP + static host for the read-only platform UI.
 * PORT from KATA_CONSOLE_PORT (default 4317). Read-only.
 * Run:  bun apps/console/server.ts   (or  bun run console)
 */
import { handleApi } from "./api.ts";
import { serveStatic } from "./static.ts";

const port = Number(process.env.KATA_CONSOLE_PORT ?? 4317);

const server = Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const api = await handleApi(url);
    if (api) return api;
    return serveStatic(url.pathname);
  },
});

process.stderr.write(`[kata-console] listening on http://localhost:${server.port}\n`);
```

- [ ] **Step 3: Smoke-test the API over HTTP**

Run:
```bash
KATA_CONSOLE_PORT=4399 bun apps/console/server.ts &
sleep 0.5
curl -s http://localhost:4399/api/projects | head -c 200
kill %1
```
Expected: a JSON array of projects (real workspace). `[kata-console] listening on http://localhost:4399` on stderr.

- [ ] **Step 4: Commit**

```bash
git add apps/console/static.ts apps/console/server.ts
git commit -m "feat: ✨ add console static host + server wiring"
```

---

## Phase 5 — Wiring + verification

### Task 17: .mcp.json + package.json scripts

**Files:**
- Create: `.mcp.json`
- Modify: `package.json` (scripts block)

- [ ] **Step 1: Create `.mcp.json`**

```json
{
  "mcpServers": {
    "kata": {
      "command": "bun",
      "args": ["apps/mcp/server.ts"]
    }
  }
}
```

- [ ] **Step 2: Add scripts to `package.json`**

In the `"scripts"` object, add:

```json
"console": "bun apps/console/server.ts",
"mcp": "bun apps/mcp/server.ts",
"test:apps": "bun test apps"
```

- [ ] **Step 3: Verify scripts resolve**

Run: `bun run test:apps`
Expected: PASS — all apps tests (catalog + mcp + console). Count ≈ guards 5 + projects 2 + features 5 + artifacts 5 + xmind 2 + skills 2 + tools 3 + dispatch 7 + api 10 = 41 tests.

- [ ] **Step 4: Commit**

```bash
git add .mcp.json package.json
git commit -m "chore: 🔧 wire console/mcp scripts + .mcp.json"
```

### Task 18: Full verification + lint + type-check

- [ ] **Step 1: Lint apps**

Run: `bunx biome check apps`
Expected: no errors. If any, `bunx biome check --fix apps` then re-run.

- [ ] **Step 2: Type-check apps**

Run: `bunx tsc --noEmit -p apps/tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Full backend test suite (engine + apps)**

Run: `bun test`
Expected: engine baseline (1662 pass, 1 skip) **plus** ~41 apps tests, 0 fail.

- [ ] **Step 4: Confirm read-only invariant**

Run: `git -C workspace status --short 2>/dev/null | head` (or `git status --short`)
Expected: no modifications under `workspace/` caused by running the server/tests — the platform never writes the workspace.

- [ ] **Step 5: Commit any lint fixes**

```bash
git add -A apps
git commit -m "chore: 🔧 lint + type-check pass for platform backend" || echo "nothing to commit"
```

---

## Self-Review (completed during planning)

**1. Spec coverage:**
- §4 layering (engine core + apps consumers) → Tasks 1–16 build under `apps/`, import `kata-engine`. ✓
- §5.1 Catalog interface (listProjects/listFeatures/getFeature/listArtifacts/readTextArtifact/parseXmind/listSkills) → Tasks 5–10. ✓
- §5.4 Transport: testable `dispatch` + thin stdio loop → Tasks 12–13. ✓
- §6.1 HTTP routes (projects/features/detail/artifacts/artifact/xmind/skills + static) → Tasks 15–16. ✓
- §6.2 6 MCP tools → Task 11. ✓
- §7 typed errors → 404/400/403; MCP isError; path-safety guards → Tasks 2, 4, 7, 14, 15. ✓
- §8 TDD with temp-workspace fixtures, dispatch unit tests, console fetch tests → Tasks 3–16. ✓
- §5.2/5.3/5.5 Provider/RunStore/RequestContext are deferred seams — correctly NOT in this plan. ✓
- §1.1 full reset of off-process apps/ → Task 1 (corrected: code is committed in 07ed27bad, so `git rm`). ✓
- Web UI (§4 `apps/web`, §8 web tests) → separate plan, called out in Scope note. ✓

**2. Placeholder scan:** No TBD/TODO; every code step has full code; every run step has a command + expected output.

**3. Type consistency:** `FeatureFilters` defined in Task 6 reused in Task 15. `dispatch`/`JsonRpcRequest`/`JsonRpcResponse` defined in Task 12 reused in Task 13. `errToResponse` defined in Task 14 reused in Task 15. `NotFoundError`/`InvalidInputError`/`ForbiddenError` defined in Task 2 used in Tasks 4/6/7/8/14. `makeWorkspace`/`Workspace` defined in Task 3 used in Tasks 4–15. `listArtifacts` (Task 7) used by `getFeature` (Task 6) — execution-order note included in Task 6.
