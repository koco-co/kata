# Cross-Model Stable Artifacts (case-draft pilot) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `case-draft` produce a path-identical, schema-identical, input-complete artifact set under both Claude (Opus) and Codex (GPT), proven by an end-to-end harness that runs both runtimes on one frozen Lanhu snapshot.

**Architecture:** Move path computation, schema enforcement, and input-consumption proof out of model discretion into the deterministic `kata` engine; unify the `case-draft` contract so both runtimes execute one runtime-neutral workflow; add a three-layer `kata cases verify` gate, a `kata cases compare` cross-model differ, and a dual-runtime e2e harness using a frozen snapshot fixture.

**Tech Stack:** Bun (≥1.3) + TypeScript, Commander.js CLI, AJV 2020-12 JSON-Schema, `bun:test`, YAML contracts under `.ai/core/`, projection engine rendering to `.claude/` + `.agents/`.

**Spec:** `docs/superpowers/specs/2026-05-23-cross-model-stable-artifacts-design.md`

---

## File Structure (created / modified)

**Phase 0 — deterministic path**
- Create `engine/src/cli/features-resolve.ts` — `runFeaturesResolve()` (pure path computation + idempotency/conflict).
- Modify `engine/src/cli/features.ts` — register `features resolve` subcommand.
- Modify `engine/src/features/slug.ts` — add `deriveSlugFromSource()` + `hexFallbackSlug()`.
- Create `engine/tests/cli/features-resolve.test.ts`.

**Phase 1 — schema tightening**
- Modify `.ai/core/schemas/FeatureManifest.v2.schema.json` — `if/then` on `case_drafting.status == completed`.
- Modify `engine/tests/schemas/feature-manifest.test.ts` — add completed-status cases.

**Phase 2 — `kata cases verify` (three-layer gate)**
- Create `engine/src/cli/cases-verify.ts` — `runCasesVerify()` orchestrating L1/L2/L3 + report.
- Create `engine/src/cases/verify-layers.ts` — pure layer checkers (`verifyL1Structure`, `verifyL2Inputs`, `verifyL3Quality`).
- Create `engine/src/source-ref/resolve-target.ts` — `resolveSourceRefTarget(ref, ctx)` (ref → workspace content).
- Modify `engine/src/cli/cases-lint.ts` — register `cases verify` on the `cases` command.
- Create `engine/tests/cli/cases-verify.test.ts`, `engine/tests/cases/verify-layers.test.ts`, `engine/tests/source-ref/resolve-target.test.ts`.

**Phase 3 — `kata cases compare`**
- Create `engine/src/cli/cases-compare.ts` — `runCasesCompare()` (two dirs → stability report, FAIL/WARN).
- Create `engine/src/cases/source-fact-set.ts` — `extractSourceFactSet()` + `jaccard()`.
- Modify `engine/src/cli/cases-lint.ts` — register `cases compare`.
- Create `engine/tests/cli/cases-compare.test.ts`, `engine/tests/cases/source-fact-set.test.ts`.

**Phase 4 — contract refactor + projection**
- Modify `.ai/core/skills/case-draft/references/execution-protocol.md` — runtime-neutral orchestration.
- Modify `.ai/core/skills/case-draft/references/worker-prompt.md` — runtime-neutral dispatch language.
- Create `.ai/core/skills/case-draft/references/source-confirm.md` — source-code confirmation step.
- Modify `.ai/core/skills/case-draft/skill.yaml` — remove output-changing `codex_override`, add `source-confirm` step + reference, add `required_inputs`.
- Modify `.ai/core/runtimes/projection-inventory.yaml` — add the new reference for both runtimes.
- Regenerate `.claude/**`, `.agents/**`, `.ai/core/runtimes/projection-lock.json` via `kata ai-core projection render`.
- Create `engine/tests/ai-core/case-draft-contract.test.ts` — assert claude/codex SKILL.md parity.

**Phase 5 — e2e harness**
- Create `engine/src/e2e/runtime-invoke.ts` — `invokeClaude()` / `invokeCodex()` (`spawnSync`).
- Create `engine/src/e2e/case-draft-e2e.ts` — orchestrate fixture → dual run → verify → compare.
- Create `engine/src/cli/cases-e2e.ts` — register `cases e2e`.
- Create `engine/tests/fixtures/case-draft-e2e/` — frozen `source_snapshot` fixture.
- Create `engine/tests/e2e/case-draft-e2e.test.ts` — fixture-replay regression (no real model calls) for CI.
- Modify `package.json` — add `test:e2e:fixture` to `ci`.

---

## Phase 0 — Deterministic path: `kata features resolve`

Today the model invents the slug (`module-identify.md` → `YYYY-MM-english-slug`). This phase moves path computation into the engine so both runtimes get a byte-identical path.

### Task 0.1: Slug derivation helpers

**Files:**
- Modify: `engine/src/features/slug.ts`
- Test: `engine/tests/features/slug-derive.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// engine/tests/features/slug-derive.test.ts
import { describe, expect, it } from "bun:test";
import { deriveSlugFromSource, hexFallbackSlug } from "../../src/features/slug.ts";

describe("deriveSlugFromSource", () => {
  it("derives a valid slug from a Lanhu pageId", () => {
    expect(deriveSlugFromSource({ kind: "lanhu", pageId: "7afabbf5e1c2" })).toBe("lanhu-7afabbf5");
  });
  it("derives a slug from a PRD filename", () => {
    expect(deriveSlugFromSource({ kind: "prd", filename: "15696_通用配置_json格式配置.txt" })).toBe(
      "15696-tong-yong-pei-zhi-json-ge-shi-pei-zhi",
    );
  });
  it("returns null when no usable source field", () => {
    expect(deriveSlugFromSource({ kind: "lanhu" })).toBeNull();
  });
});

describe("hexFallbackSlug", () => {
  it("builds an unresolved slug with module + 8 hex", () => {
    const s = hexFallbackSlug("dq", "any seed text");
    expect(s).toMatch(/^unresolved-dq-[a-f0-9]{8}$/);
  });
  it("is deterministic for the same seed", () => {
    expect(hexFallbackSlug("dq", "seed")).toBe(hexFallbackSlug("dq", "seed"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test engine/tests/features/slug-derive.test.ts`
Expected: FAIL — `deriveSlugFromSource is not a function`.

- [ ] **Step 3: Implement the helpers**

Append to `engine/src/features/slug.ts` (reuse existing `sanitizeSlug` for pinyin/lowercasing; add `createHash` import at top):

```typescript
import { createHash } from "node:crypto";

export type SlugSource =
  | { kind: "lanhu"; pageId?: string }
  | { kind: "prd"; filename?: string };

export function deriveSlugFromSource(source: SlugSource): string | null {
  if (source.kind === "lanhu" && source.pageId) {
    return `lanhu-${source.pageId.slice(0, 8).toLowerCase()}`;
  }
  if (source.kind === "prd" && source.filename) {
    const base = source.filename.replace(/\.[^.]+$/, "");
    const slug = sanitizeSlug(base);
    return isValidSlug(slug) ? slug.slice(0, 32).replace(/-+$/, "") : null;
  }
  return null;
}

export function hexFallbackSlug(module: string, seed: string): string {
  const hex = createHash("sha256").update(seed).digest("hex").slice(0, 8);
  return `unresolved-${module}-${hex}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test engine/tests/features/slug-derive.test.ts`
Expected: PASS (4 tests). If `sanitizeSlug` output for the Chinese example differs, adjust the expected string in the test to the actual pinyin output — keep it deterministic.

- [ ] **Step 5: Commit**

```bash
git add engine/src/features/slug.ts engine/tests/features/slug-derive.test.ts
git commit -m "feat: 🌱 add deterministic slug derivation helpers"
```

### Task 0.2: `runFeaturesResolve` — path computation with idempotency

**Files:**
- Create: `engine/src/cli/features-resolve.ts`
- Test: `engine/tests/cli/features-resolve.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// engine/tests/cli/features-resolve.test.ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stringify } from "yaml";
import { runFeaturesResolve } from "../../src/cli/features-resolve.ts";

describe("runFeaturesResolve", () => {
  let ws: string;
  const now = new Date("2026-05-23T10:00:00Z");
  beforeEach(() => {
    ws = join(mkdtempSync(join(tmpdir(), "kata-resolve-")), "workspace");
    mkdirSync(join(ws, "dataAssets/features"), { recursive: true });
  });
  afterEach(() => rmSync(ws, { recursive: true, force: true }));

  it("prefers an explicit slug", () => {
    const r = runFeaturesResolve({ project: "dataAssets", slug: "lt-dq-rule-set", module: "dq", workspaceRoot: ws, now });
    expect(r.featureId).toBe("2026-05-lt-dq-rule-set");
    expect(r.featureDir).toBe(join(ws, "dataAssets/features/2026-05-lt-dq-rule-set"));
    expect(r.reused).toBe(false);
  });

  it("derives from a non-model source field when no slug given", () => {
    const r = runFeaturesResolve({ project: "dataAssets", source: { kind: "lanhu", pageId: "7afabbf5e1" }, module: "dq", workspaceRoot: ws, now });
    expect(r.featureId).toBe("2026-05-lanhu-7afabbf5");
  });

  it("falls back to hex when nothing derivable", () => {
    const r = runFeaturesResolve({ project: "dataAssets", source: { kind: "lanhu" }, module: "dq", seed: "x", workspaceRoot: ws, now });
    expect(r.featureId).toMatch(/^2026-05-unresolved-dq-[a-f0-9]{8}$/);
  });

  it("is idempotent: reuses an existing dir built from the same source", () => {
    const a = runFeaturesResolve({ project: "dataAssets", slug: "lt-dq", module: "dq", workspaceRoot: ws, now });
    const b = runFeaturesResolve({ project: "dataAssets", slug: "lt-dq", module: "dq", workspaceRoot: ws, now });
    expect(b.featureId).toBe(a.featureId);
    expect(b.reused).toBe(true);
  });

  it("appends a deterministic suffix on a different-source collision", () => {
    // pre-create a dir recorded as coming from a different slug source
    const dir = join(ws, "dataAssets/features/2026-05-lt-dq");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "source-snapshot.json"), JSON.stringify({ slug_source: "prd:other.md" }));
    const r = runFeaturesResolve({ project: "dataAssets", slug: "lt-dq", slugSourceKey: "lanhu:7af", module: "dq", workspaceRoot: ws, now });
    expect(r.featureId).toBe("2026-05-lt-dq-2");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test engine/tests/cli/features-resolve.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `runFeaturesResolve`**

```typescript
// engine/src/cli/features-resolve.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import {
  type SlugSource,
  buildFeatureId,
  deriveSlugFromSource,
  hexFallbackSlug,
  isValidSlug,
  sanitizeSlug,
} from "../features/slug.ts";

export interface FeaturesResolveContext {
  project: string;
  module: string;
  workspaceRoot: string;
  slug?: string;
  source?: SlugSource;
  /** Stable identity of where the slug came from, used for idempotency/collision. */
  slugSourceKey?: string;
  /** Seed for hex fallback (e.g. raw Chinese title); defaults to JSON of source. */
  seed?: string;
  now?: Date;
}

export interface FeaturesResolveResult {
  featureId: string;
  featureDir: string;
  reused: boolean;
}

function yyyyMm(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function chooseSlug(ctx: FeaturesResolveContext): string {
  if (ctx.slug) {
    const s = isValidSlug(ctx.slug) ? ctx.slug : sanitizeSlug(ctx.slug);
    if (!isValidSlug(s)) throw new Error(`invalid slug: ${ctx.slug}`);
    return s;
  }
  if (ctx.source) {
    const derived = deriveSlugFromSource(ctx.source);
    if (derived) return derived;
  }
  return hexFallbackSlug(ctx.module, ctx.seed ?? JSON.stringify(ctx.source ?? {}));
}

function recordedSlugSource(dir: string): string | undefined {
  const metaPath = join(dir, "metadata.yaml");
  if (!existsSync(metaPath)) return undefined;
  try {
    return parse(readFileSync(metaPath, "utf-8"))?.notes?.slug_source;
  } catch {
    return undefined;
  }
}

export function runFeaturesResolve(ctx: FeaturesResolveContext): FeaturesResolveResult {
  const now = ctx.now ?? new Date();
  const baseSlug = chooseSlug(ctx);
  const sourceKey = ctx.slugSourceKey ?? ctx.slug ?? JSON.stringify(ctx.source ?? {});
  const featuresDir = join(ctx.workspaceRoot, ctx.project, "features");
  const month = yyyyMm(now);

  for (let n = 0; ; n++) {
    const slug = n === 0 ? baseSlug : `${baseSlug}-${n + 1}`;
    const featureId = buildFeatureId(month, slug);
    const featureDir = join(featuresDir, featureId);
    if (!existsSync(featureDir)) {
      return { featureId, featureDir, reused: false };
    }
    const recorded = recordedSlugSource(featureDir);
    if (recorded === undefined || recorded === sourceKey) {
      return { featureId, featureDir, reused: true };
    }
    // different source occupies this path → try next suffix
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test engine/tests/cli/features-resolve.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add engine/src/cli/features-resolve.ts engine/tests/cli/features-resolve.test.ts
git commit -m "feat: 🧭 add deterministic kata features resolve path computation"
```

### Task 0.3: Register `features resolve` subcommand

**Files:**
- Modify: `engine/src/cli/features.ts` (add subcommand near the `features new` registration)
- Test: `engine/tests/cli/features-resolve-cli.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// engine/tests/cli/features-resolve-cli.test.ts
import { describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { repoRoot } from "../../lib/paths.ts";

describe("kata features resolve (CLI)", () => {
  it("is registered as a subcommand", () => {
    const out = execSync(`bun ${join(repoRoot(), "engine/bin/kata")} features --help`, { encoding: "utf-8" });
    expect(out).toContain("resolve");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test engine/tests/cli/features-resolve-cli.test.ts`
Expected: FAIL — "resolve" not in help.

- [ ] **Step 3: Add the subcommand**

In `engine/src/cli/features.ts`, import and register (mirror the `features new` block):

```typescript
import { runFeaturesResolve } from "./features-resolve.ts";
import { repoRoot } from "../../lib/paths.ts";
import { join } from "node:path";

features
  .command("resolve")
  .description("确定性计算 feature_id 与目录(不创建文件)")
  .requiredOption("--project <name>", "项目名")
  .requiredOption("--module <name>", "模块名 (module-identify 产出)")
  .option("--slug <slug>", "显式 slug (最高优先级)")
  .option("--lanhu-page <id>", "Lanhu pageId (派生来源)")
  .option("--prd-file <name>", "PRD 文件名 (派生来源)")
  .option("--json", "输出 JSON", false)
  .action((opts: Record<string, string | boolean>) => {
    const source = opts.lanhuPage
      ? { kind: "lanhu" as const, pageId: String(opts.lanhuPage) }
      : opts.prdFile
        ? { kind: "prd" as const, filename: String(opts.prdFile) }
        : undefined;
    const result = runFeaturesResolve({
      project: String(opts.project),
      module: String(opts.module),
      slug: opts.slug ? String(opts.slug) : undefined,
      source,
      workspaceRoot: join(repoRoot(), "workspace"),
    });
    console.log(opts.json ? JSON.stringify(result) : `${result.featureId}\t${result.featureDir}`);
  });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test engine/tests/cli/features-resolve-cli.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add engine/src/cli/features.ts engine/tests/cli/features-resolve-cli.test.ts
git commit -m "feat: 🧭 register kata features resolve subcommand"
```

---

## Phase 1 — Schema tightening (close the empty-evidence loophole)

`workspace/xyzh/features/2026-04-dq-overview/manifest.json` shows `requirement_atoms: []` with `status: completed`. Tighten so a completed draft must carry evidence.

### Task 1.1: `if/then` conditional on completed manifests

**Files:**
- Modify: `.ai/core/schemas/FeatureManifest.v2.schema.json`
- Test: `engine/tests/schemas/feature-manifest.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `engine/tests/schemas/feature-manifest.test.ts` (the file compiles the live schema):

```typescript
it("rejects completed case_drafting with empty requirement_atoms", () => {
  const bad = {
    ...baseManifest,
    case_drafting: { ...baseManifest.case_drafting, status: "completed", requirement_atoms: [] },
  };
  expect(validate(bad)).toBe(false);
});

it("rejects completed case_drafting with null coverage_matrix_path", () => {
  const bad = {
    ...baseManifest,
    case_drafting: { ...baseManifest.case_drafting, status: "completed", coverage_matrix_path: null },
  };
  expect(validate(bad)).toBe(false);
});

it("still accepts not-started case_drafting with empty atoms", () => {
  const ok = {
    ...baseManifest,
    case_drafting: { status: "not-started", archive_path: null, xmind_path: null, requirement_atoms: [], coverage_matrix_path: null },
  };
  expect(validate(ok)).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test engine/tests/schemas/feature-manifest.test.ts`
Expected: FAIL — current schema accepts empty atoms when completed.

- [ ] **Step 3: Add the conditional to the schema**

In `.ai/core/schemas/FeatureManifest.v2.schema.json`, inside the `case_drafting` object schema (alongside `type`/`required`/`properties`), add:

```json
"if": { "properties": { "status": { "const": "completed" } }, "required": ["status"] },
"then": {
  "required": ["status", "requirement_atoms", "coverage_matrix_path"],
  "properties": {
    "requirement_atoms": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "source_ref"],
        "additionalProperties": false,
        "properties": {
          "id": { "type": "string", "minLength": 1 },
          "source_ref": { "type": "string", "minLength": 1 }
        }
      }
    },
    "coverage_matrix_path": { "type": "string", "minLength": 1 }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test engine/tests/schemas/feature-manifest.test.ts`
Expected: PASS (existing + 3 new). Also run `bun run lint:ai-core` to confirm no contract-schema regressions.

- [ ] **Step 5: Verify no existing workspace manifest silently breaks**

Run: `bun ${PWD}/engine/bin/kata cases lint --scope workspace`
Expected: It will now flag existing completed-but-empty manifests (e.g. `2026-04-dq-overview`). Record the list — these become known-debt, fixed under Phase 2 verify rollout or marked `in-progress`. Do NOT mass-edit here.

- [ ] **Step 6: Commit**

```bash
git add .ai/core/schemas/FeatureManifest.v2.schema.json engine/tests/schemas/feature-manifest.test.ts
git commit -m "feat: 🔒 require evidence on completed case_drafting manifests"
```

---

## Phase 2 — `kata cases verify`: three-layer hard gate

Extend the existing `cases-validate.ts` concept into a three-layer gate with its own subcommand. Layer checkers are pure functions for testability.

### Task 2.1: SourceRef target resolver (L2 traceability primitive)

**Files:**
- Create: `engine/src/source-ref/resolve-target.ts`
- Test: `engine/tests/source-ref/resolve-target.test.ts`

Maps a canonical ref ID to a real workspace target so L2 can confirm "the ref points back to a real input".

- [ ] **Step 1: Write the failing test**

```typescript
// engine/tests/source-ref/resolve-target.test.ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveSourceRefTarget, sourceRefKind } from "../../src/source-ref/resolve-target.ts";

describe("sourceRefKind", () => {
  it("extracts the scheme", () => {
    expect(sourceRefKind("knowledge.entry:terms#sha256:" + "a".repeat(64))).toBe("knowledge.entry");
    expect(sourceRefKind("repo.line:dt-insight-studio/src/x.ts:42#sha256:" + "a".repeat(64))).toBe("repo.line");
  });
});

describe("resolveSourceRefTarget", () => {
  let ws: string;
  beforeEach(() => {
    ws = join(mkdtempSync(join(tmpdir(), "kata-resolve-target-")), "workspace");
    mkdirSync(join(ws, "dataAssets/_shared/knowledge"), { recursive: true });
    writeFileSync(join(ws, "dataAssets/_shared/knowledge/terms.md"), "# terms\n");
    mkdirSync(join(ws, "dataAssets/.kata/repos/dt-insight-studio/src"), { recursive: true });
    writeFileSync(join(ws, "dataAssets/.kata/repos/dt-insight-studio/src/x.ts"), "export const a = 1;\n");
  });
  afterEach(() => rmSync(ws, { recursive: true, force: true }));

  it("resolves a knowledge.entry to a file under _shared/knowledge", () => {
    const t = resolveSourceRefTarget("knowledge.entry:terms#sha256:" + "a".repeat(64), { workspaceRoot: ws, project: "dataAssets" });
    expect(t.found).toBe(true);
    expect(t.content).toContain("# terms");
  });

  it("resolves a repo.line to a file under .kata/repos", () => {
    const t = resolveSourceRefTarget("repo.line:dt-insight-studio/src/x.ts:1#sha256:" + "a".repeat(64), { workspaceRoot: ws, project: "dataAssets" });
    expect(t.found).toBe(true);
    expect(t.content).toContain("export const a");
  });

  it("reports not found for a missing knowledge entry", () => {
    const t = resolveSourceRefTarget("knowledge.entry:missing#sha256:" + "a".repeat(64), { workspaceRoot: ws, project: "dataAssets" });
    expect(t.found).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test engine/tests/source-ref/resolve-target.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the resolver**

```typescript
// engine/src/source-ref/resolve-target.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type SourceRefKind =
  | "prd.file" | "command.output" | "knowledge.entry"
  | "repo.line" | "case.archive" | "workspace.config" | "lanhu.fixture";

export interface ResolveCtx {
  workspaceRoot: string;
  project: string;
  /** absolute feature dir, for prd/lanhu refs that live under inputs/. */
  featureDir?: string;
}

export interface ResolvedTarget {
  found: boolean;
  content?: string;
  path?: string;
}

export function sourceRefKind(ref: string): SourceRefKind {
  return ref.slice(0, ref.indexOf(":")) as SourceRefKind;
}

/** id between the first ":" and the "#sha256:" suffix. */
function refId(ref: string): string {
  return ref.slice(ref.indexOf(":") + 1, ref.indexOf("#sha256:"));
}

export function resolveSourceRefTarget(ref: string, ctx: ResolveCtx): ResolvedTarget {
  const kind = sourceRefKind(ref);
  const id = refId(ref);
  const read = (p: string): ResolvedTarget =>
    existsSync(p) ? { found: true, content: readFileSync(p, "utf-8"), path: p } : { found: false, path: p };

  switch (kind) {
    case "knowledge.entry": {
      // id like "terms" or "modules/dq" → file under _shared/knowledge
      const base = join(ctx.workspaceRoot, ctx.project, "_shared", "knowledge");
      const idNoAnchor = id.split("#")[0];
      return read(join(base, idNoAnchor.endsWith(".md") ? idNoAnchor : `${idNoAnchor}.md`));
    }
    case "repo.line": {
      // id like "<repo>/<path>:<line>" → file under .kata/repos
      const filePart = id.replace(/:\d+$/, "");
      return read(join(ctx.workspaceRoot, ctx.project, ".kata", "repos", filePart));
    }
    case "case.archive":
      return read(join(ctx.workspaceRoot, ctx.project, "_shared", "archive", id.split(":")[0]));
    case "prd.file":
    case "lanhu.fixture":
      if (ctx.featureDir) return read(join(ctx.featureDir, "inputs", id.split(":")[0]));
      return { found: false };
    default:
      return { found: false };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test engine/tests/source-ref/resolve-target.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add engine/src/source-ref/resolve-target.ts engine/tests/source-ref/resolve-target.test.ts
git commit -m "feat: 🔗 resolve canonical source-refs to workspace targets"
```

### Task 2.2: Layer checkers (L1/L2/L3) as pure functions

**Files:**
- Create: `engine/src/cases/verify-layers.ts`
- Test: `engine/tests/cases/verify-layers.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// engine/tests/cases/verify-layers.test.ts
import { describe, expect, it } from "bun:test";
import { verifyL1Structure, verifyL2Inputs, verifyL3Quality } from "../../src/cases/verify-layers.ts";

const SHA = "a".repeat(64);
const completedManifest = {
  schema: "FeatureManifest@2",
  feature_id: "2026-05-lt-dq",
  case_drafting: {
    status: "completed",
    archive_path: "archive.md",
    xmind_path: "cases.xmind",
    coverage_matrix_path: "archive.md#coverage",
    requirement_atoms: [
      { id: "RA-1", source_ref: `lanhu.fixture:form#sha256:${SHA}` },
      { id: "RA-2", source_ref: `knowledge.entry:terms#sha256:${SHA}` },
      { id: "RA-3", source_ref: `repo.line:dt-insight-studio/src/x.ts:1#sha256:${SHA}` },
    ],
  },
  automation: { status: "not-started", intents: [], last_handoff_path: null, last_run_status: "not-run" },
  files: { archive: "archive.md", xmind: "cases.xmind", tests_root: null, latest_results: null },
};

describe("verifyL1Structure", () => {
  it("fails when manifest violates schema", () => {
    const bad = { ...completedManifest, case_drafting: { ...completedManifest.case_drafting, requirement_atoms: [] } };
    const issues = verifyL1Structure({ manifest: bad, archiveMd: "# A", featureDir: "/x" });
    expect(issues.some((i) => i.layer === "L1" && i.rule === "manifest_schema_invalid")).toBe(true);
  });
  it("fails on SourceRef leak in human-readable archive", () => {
    const issues = verifyL1Structure({ manifest: completedManifest, archiveMd: "step refs SR-001 and csv::row", featureDir: "/x" });
    expect(issues.some((i) => i.rule === "sourceref_leak")).toBe(true);
  });
  it("passes a clean completed artifact", () => {
    const issues = verifyL1Structure({ manifest: completedManifest, archiveMd: "# Cases\n- step / expected", featureDir: "/x" });
    expect(issues).toHaveLength(0);
  });
});

describe("verifyL2Inputs", () => {
  it("fails when required kinds are not all covered", () => {
    const onlyLanhu = { ...completedManifest, case_drafting: { ...completedManifest.case_drafting, requirement_atoms: [{ id: "RA-1", source_ref: `lanhu.fixture:f#sha256:${SHA}` }] } };
    const issues = verifyL2Inputs({ manifest: onlyLanhu, requiredKinds: ["lanhu.fixture", "knowledge.entry", "repo.line"], resolve: () => ({ found: true, content: "x" }) });
    expect(issues.some((i) => i.layer === "L2" && i.rule === "required_input_uncovered" && i.message.includes("knowledge.entry"))).toBe(true);
  });
  it("fails when a ref does not resolve to a real target", () => {
    const issues = verifyL2Inputs({ manifest: completedManifest, requiredKinds: ["lanhu.fixture", "knowledge.entry", "repo.line"], resolve: (ref) => ({ found: !ref.startsWith("repo.line") }) });
    expect(issues.some((i) => i.rule === "source_ref_unresolved" && i.message.includes("repo.line"))).toBe(true);
  });
  it("passes when all kinds covered and resolvable", () => {
    const issues = verifyL2Inputs({ manifest: completedManifest, requiredKinds: ["lanhu.fixture", "knowledge.entry", "repo.line"], resolve: () => ({ found: true, content: "x" }) });
    expect(issues).toHaveLength(0);
  });
});

describe("verifyL3Quality", () => {
  it("fails when a case has no atom traceability", () => {
    const issues = verifyL3Quality({ cases: [{ case_id: "C1", requirement_atom_ids: [], steps: ["s"], expected: "e", title: "t" }], atomIds: ["RA-1"] });
    expect(issues.some((i) => i.layer === "L3" && i.rule === "case_untraceable")).toBe(true);
  });
  it("fails when a case has empty steps or expected", () => {
    const issues = verifyL3Quality({ cases: [{ case_id: "C1", requirement_atom_ids: ["RA-1"], steps: [], expected: "", title: "t" }], atomIds: ["RA-1"] });
    expect(issues.some((i) => i.rule === "case_incomplete")).toBe(true);
  });
  it("passes a complete traceable case", () => {
    const issues = verifyL3Quality({ cases: [{ case_id: "C1", requirement_atom_ids: ["RA-1"], steps: ["click"], expected: "ok", title: "Login" }], atomIds: ["RA-1"] });
    expect(issues).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test engine/tests/cases/verify-layers.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the layer checkers**

```typescript
// engine/src/cases/verify-layers.ts
import { loadFeatureManifestValidator } from "../schemas/loaders.ts";
import type { ResolvedTarget } from "../source-ref/resolve-target.ts";
import { sourceRefKind } from "../source-ref/resolve-target.ts";

export interface VerifyIssue {
  layer: "L1" | "L2" | "L3";
  rule: string;
  message: string;
  fix?: string;
}

// Identifiers that must never appear in human-readable artifacts.
const LEAK_PATTERNS = [/\bSR-\d/, /csv::/, /#sha256:[a-f0-9]{64}/, /\b(?:prd\.file|lanhu\.fixture|knowledge\.entry|repo\.line|case\.archive):/];

export function verifyL1Structure(input: { manifest: unknown; archiveMd: string; featureDir: string }): VerifyIssue[] {
  const issues: VerifyIssue[] = [];
  const validate = loadFeatureManifestValidator();
  if (!validate(input.manifest)) {
    issues.push({ layer: "L1", rule: "manifest_schema_invalid", message: JSON.stringify(validate.errors), fix: "修正 manifest.json 至符合 FeatureManifest@2" });
  }
  for (const re of LEAK_PATTERNS) {
    if (re.test(input.archiveMd)) {
      issues.push({ layer: "L1", rule: "sourceref_leak", message: `archive.md 人类可读层出现 SourceRef 标识: ${re}`, fix: "把 SourceRef 标识移出 archive.md，仅保留在 manifest/结构化层" });
      break;
    }
  }
  return issues;
}

export function verifyL2Inputs(input: {
  manifest: { case_drafting?: { requirement_atoms?: { id: string; source_ref: string }[] } };
  requiredKinds: string[];
  resolve: (ref: string) => ResolvedTarget;
}): VerifyIssue[] {
  const issues: VerifyIssue[] = [];
  const atoms = input.manifest.case_drafting?.requirement_atoms ?? [];
  const presentKinds = new Set(atoms.map((a) => sourceRefKind(a.source_ref)));
  for (const kind of input.requiredKinds) {
    if (!presentKinds.has(kind as never)) {
      issues.push({ layer: "L2", rule: "required_input_uncovered", message: `没有任何 requirement_atom 引用 ${kind}`, fix: `补充至少一个 source_ref kind=${kind} 的证据` });
    }
  }
  for (const a of atoms) {
    if (!input.resolve(a.source_ref).found) {
      issues.push({ layer: "L2", rule: "source_ref_unresolved", message: `source_ref 无法解析到真实目标: ${a.source_ref}`, fix: "确认引用的知识条目/源码路径真实存在且已确认 triple" });
    }
  }
  return issues;
}

export interface CaseRecord {
  case_id: string;
  requirement_atom_ids: string[];
  steps: string[];
  expected: string;
  title: string;
}

export function verifyL3Quality(input: { cases: CaseRecord[]; atomIds: string[] }): VerifyIssue[] {
  const issues: VerifyIssue[] = [];
  const known = new Set(input.atomIds);
  for (const c of input.cases) {
    const traced = c.requirement_atom_ids.filter((id) => known.has(id));
    if (traced.length === 0) {
      issues.push({ layer: "L3", rule: "case_untraceable", message: `用例 ${c.case_id} 无法追溯到任何 requirement_atom`, fix: "为用例补 requirement_atom_ids" });
    }
    if (c.steps.length === 0 || c.expected.trim() === "" || c.title.trim() === "") {
      issues.push({ layer: "L3", rule: "case_incomplete", message: `用例 ${c.case_id} 缺步骤/预期/标题`, fix: "补全步骤、预期结果与标题" });
    }
  }
  return issues;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test engine/tests/cases/verify-layers.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add engine/src/cases/verify-layers.ts engine/tests/cases/verify-layers.test.ts
git commit -m "feat: 🚦 add three-layer case verification checkers"
```

### Task 2.3: `runCasesVerify` orchestrator + subcommand

**Files:**
- Create: `engine/src/cli/cases-verify.ts`
- Modify: `engine/src/cli/cases-lint.ts` (register `cases verify` in `buildCasesCommand`)
- Test: `engine/tests/cli/cases-verify.test.ts`

> **Note on case parsing for L3:** the structured case list comes from the feature's archive structured layer. Reuse the existing archive parser the repo already uses for `lintCaseMdSourceRefLeak`/case linting (search `engine/src/lint/` for the archive case extractor) to build `CaseRecord[]`. If a structured `cases.json`/`coverage` file is present, parse that; otherwise parse `archive.md` headings. Do NOT invent a new format.

- [ ] **Step 1: Write the failing test**

```typescript
// engine/tests/cli/cases-verify.test.ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCasesVerify } from "../../src/cli/cases-verify.ts";

const SHA = "a".repeat(64);

describe("runCasesVerify", () => {
  let ws: string;
  beforeEach(() => {
    ws = join(mkdtempSync(join(tmpdir(), "kata-verify-")), "workspace");
    mkdirSync(join(ws, "dataAssets/_shared/knowledge"), { recursive: true });
    writeFileSync(join(ws, "dataAssets/_shared/knowledge/terms.md"), "# terms\n");
    mkdirSync(join(ws, "dataAssets/.kata/repos/dt-insight-studio/src"), { recursive: true });
    writeFileSync(join(ws, "dataAssets/.kata/repos/dt-insight-studio/src/x.ts"), "x\n");
  });
  afterEach(() => rmSync(ws, { recursive: true, force: true }));

  function seed(featureId: string, manifest: object, archive: string) {
    const dir = join(ws, "dataAssets/features", featureId);
    mkdirSync(join(dir, "inputs"), { recursive: true });
    writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
    writeFileSync(join(dir, "archive.md"), archive);
    return dir;
  }

  it("fails L2 when knowledge/source inputs are missing", async () => {
    seed("2026-05-lt-dq", {
      schema: "FeatureManifest@2", feature_id: "2026-05-lt-dq",
      case_drafting: { status: "completed", archive_path: "archive.md", xmind_path: null, coverage_matrix_path: "archive.md#cov",
        requirement_atoms: [{ id: "RA-1", source_ref: `lanhu.fixture:f#sha256:${SHA}` }] },
      automation: { status: "not-started", intents: [], last_handoff_path: null, last_run_status: "not-run" },
      files: { archive: "archive.md", xmind: null, tests_root: null, latest_results: null },
    }, "# Cases\n");
    const r = await runCasesVerify({ project: "dataAssets", featureId: "2026-05-lt-dq", workspaceRoot: ws, requiredKinds: ["lanhu.fixture", "knowledge.entry", "repo.line"] });
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.layer === "L2" && i.rule === "required_input_uncovered")).toBe(true);
  });

  it("returns ok for a complete, traceable artifact", async () => {
    seed("2026-05-ok", {
      schema: "FeatureManifest@2", feature_id: "2026-05-ok",
      case_drafting: { status: "completed", archive_path: "archive.md", xmind_path: null, coverage_matrix_path: "archive.md#cov",
        requirement_atoms: [
          { id: "RA-1", source_ref: `lanhu.fixture:f#sha256:${SHA}` },
          { id: "RA-2", source_ref: `knowledge.entry:terms#sha256:${SHA}` },
          { id: "RA-3", source_ref: `repo.line:dt-insight-studio/src/x.ts:1#sha256:${SHA}` },
        ] },
      automation: { status: "not-started", intents: [], last_handoff_path: null, last_run_status: "not-run" },
      files: { archive: "archive.md", xmind: null, tests_root: null, latest_results: null },
    }, "# Cases\n## Login\n- step: click / expected: ok [RA-1]\n");
    const r = await runCasesVerify({ project: "dataAssets", featureId: "2026-05-ok", workspaceRoot: ws, requiredKinds: ["lanhu.fixture", "knowledge.entry", "repo.line"] });
    expect(r.issues).toEqual([]);
    expect(r.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test engine/tests/cli/cases-verify.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `runCasesVerify`**

```typescript
// engine/src/cli/cases-verify.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "commander";
import { type CaseRecord, type VerifyIssue, verifyL1Structure, verifyL2Inputs, verifyL3Quality } from "../cases/verify-layers.ts";
import { resolveSourceRefTarget } from "../source-ref/resolve-target.ts";
import { repoRoot } from "../../lib/paths.ts";

export interface CasesVerifyContext {
  project: string;
  featureId: string;
  workspaceRoot: string;
  requiredKinds: string[];
}
export interface CasesVerifyResult { ok: boolean; issues: VerifyIssue[] }

// Build CaseRecord[] from the feature's structured layer. Reuse the existing
// archive case extractor in engine/src/lint/ (see Note above) — placeholder import:
import { extractCaseRecords } from "../cases/case-extract.ts";

export async function runCasesVerify(ctx: CasesVerifyContext): Promise<CasesVerifyResult> {
  const dir = join(ctx.workspaceRoot, ctx.project, "features", ctx.featureId);
  const manifestPath = join(dir, "manifest.json");
  if (!existsSync(manifestPath)) {
    return { ok: false, issues: [{ layer: "L1", rule: "feature_not_found", message: `missing ${manifestPath}` }] };
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  const archiveMd = existsSync(join(dir, "archive.md")) ? readFileSync(join(dir, "archive.md"), "utf-8") : "";

  const issues: VerifyIssue[] = [];
  issues.push(...verifyL1Structure({ manifest, archiveMd, featureDir: dir }));
  issues.push(
    ...verifyL2Inputs({
      manifest,
      requiredKinds: ctx.requiredKinds,
      resolve: (ref) => resolveSourceRefTarget(ref, { workspaceRoot: ctx.workspaceRoot, project: ctx.project, featureDir: dir }),
    }),
  );
  const atomIds: string[] = (manifest.case_drafting?.requirement_atoms ?? []).map((a: { id: string }) => a.id);
  const cases: CaseRecord[] = extractCaseRecords(dir);
  issues.push(...verifyL3Quality({ cases, atomIds }));

  return { ok: issues.length === 0, issues };
}

export function registerCasesVerify(cases: Command): void {
  cases
    .command("verify")
    .description("三层硬校验门 (schema / 输入消费 / 内容质量)")
    .requiredOption("--project <name>", "项目名")
    .requiredOption("--feature <id>", "feature_id")
    .option("--required-kinds <list>", "逗号分隔的必需 source_ref kinds", "lanhu.fixture,knowledge.entry,repo.line")
    .option("--exit-code", "exit non-zero on any issue", false)
    .action(async (opts: { project: string; feature: string; requiredKinds: string; exitCode: boolean }) => {
      const r = await runCasesVerify({
        project: opts.project,
        featureId: opts.feature,
        workspaceRoot: join(repoRoot(), "workspace"),
        requiredKinds: opts.requiredKinds.split(",").map((s) => s.trim()),
      });
      for (const i of r.issues) console.log(`[${i.layer}] ${i.rule}: ${i.message}${i.fix ? `\n  fix: ${i.fix}` : ""}`);
      console.log(r.ok ? "verify: OK" : `verify: ${r.issues.length} issue(s)`);
      if (opts.exitCode && !r.ok) process.exit(1);
    });
}
```

- [ ] **Step 4: Create the case extractor (reuse existing parser)**

Before this compiles, create `engine/src/cases/case-extract.ts` exporting `extractCaseRecords(featureDir: string): CaseRecord[]`. First grep for the existing archive parser:

Run: `grep -rn "case_id" engine/src/lint engine/src/cases 2>/dev/null | head`

Wire `extractCaseRecords` to that parser (return `[]` if no archive). Add a focused test `engine/tests/cases/case-extract.test.ts` seeding one `archive.md` with a `[RA-1]` traceability tag and asserting one `CaseRecord` with `requirement_atom_ids: ["RA-1"]`.

- [ ] **Step 5: Register the subcommand**

In `engine/src/cli/cases-lint.ts`, inside `buildCasesCommand()`, add:

```typescript
import { registerCasesVerify } from "./cases-verify.ts";
// ... within buildCasesCommand, after existing registrations:
registerCasesVerify(cases);
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun test engine/tests/cli/cases-verify.test.ts engine/tests/cases/case-extract.test.ts`
Expected: PASS. Then `bun ${PWD}/engine/bin/kata cases --help` shows `verify`.

- [ ] **Step 7: Commit**

```bash
git add engine/src/cli/cases-verify.ts engine/src/cases/case-extract.ts engine/src/cli/cases-lint.ts engine/tests/cli/cases-verify.test.ts engine/tests/cases/case-extract.test.ts
git commit -m "feat: 🚦 add kata cases verify three-layer gate"
```

---

## Phase 3 — `kata cases compare`: cross-model stability report

### Task 3.1: Source-fact set extraction + Jaccard

**Files:**
- Create: `engine/src/cases/source-fact-set.ts`
- Test: `engine/tests/cases/source-fact-set.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// engine/tests/cases/source-fact-set.test.ts
import { describe, expect, it } from "bun:test";
import { extractSourceFactSet, jaccard } from "../../src/cases/source-fact-set.ts";

const SHA = "a".repeat(64);
function manifest(refs: string[]) {
  return { case_drafting: { requirement_atoms: refs.map((r, i) => ({ id: `RA-${i}`, source_ref: r })) } };
}

describe("extractSourceFactSet", () => {
  it("normalizes a ref to kind:id (drops the hash)", () => {
    const set = extractSourceFactSet(manifest([`lanhu.fixture:form#sha256:${SHA}`]));
    expect([...set]).toEqual(["lanhu.fixture:form"]);
  });
});

describe("jaccard", () => {
  it("is 1 for identical sets", () => {
    expect(jaccard(new Set(["a", "b"]), new Set(["b", "a"]))).toBe(1);
  });
  it("is 0.5 for half overlap", () => {
    expect(jaccard(new Set(["a", "b"]), new Set(["a", "c"]))).toBeCloseTo(1 / 3, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test engine/tests/cases/source-fact-set.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// engine/src/cases/source-fact-set.ts
export function extractSourceFactSet(manifest: {
  case_drafting?: { requirement_atoms?: { source_ref: string }[] };
}): Set<string> {
  const set = new Set<string>();
  for (const a of manifest.case_drafting?.requirement_atoms ?? []) {
    set.add(a.source_ref.split("#sha256:")[0]); // kind:id, model-independent
  }
  return set;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test engine/tests/cases/source-fact-set.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add engine/src/cases/source-fact-set.ts engine/tests/cases/source-fact-set.test.ts
git commit -m "feat: 📊 add source-fact set extraction and jaccard"
```

### Task 3.2: `runCasesCompare` (FAIL/WARN) + subcommand

**Files:**
- Create: `engine/src/cli/cases-compare.ts`
- Modify: `engine/src/cli/cases-lint.ts` (register `cases compare`)
- Test: `engine/tests/cli/cases-compare.test.ts`

"Critical" source facts = those whose atom carries `ambiguity_class: blocking_unknown` or `confidence: high`. The manifest's lightweight atoms don't carry these, so the comparator reads the per-atom RequirementAtom contracts when present; otherwise treats all facts as non-critical (WARN-only). Keep this rule explicit.

- [ ] **Step 1: Write the failing test**

```typescript
// engine/tests/cli/cases-compare.test.ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCasesCompare } from "../../src/cli/cases-compare.ts";

const SHA = "a".repeat(64);
function writeManifest(dir: string, featureId: string, refs: string[]) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "manifest.json"), JSON.stringify({
    schema: "FeatureManifest@2", feature_id: featureId,
    case_drafting: { status: "completed", archive_path: "archive.md", xmind_path: null, coverage_matrix_path: "archive.md#cov",
      requirement_atoms: refs.map((r, i) => ({ id: `RA-${i}`, source_ref: r })) },
    automation: { status: "not-started", intents: [], last_handoff_path: null, last_run_status: "not-run" },
    files: { archive: "archive.md", xmind: null, tests_root: null, latest_results: null },
  }, null, 2));
}

describe("runCasesCompare", () => {
  let root: string;
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), "kata-compare-")); });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("FAILs on path mismatch", () => {
    writeManifest(join(root, "claude/features/2026-05-a"), "2026-05-a", [`lanhu.fixture:f#sha256:${SHA}`]);
    writeManifest(join(root, "codex/features/2026-05-b"), "2026-05-b", [`lanhu.fixture:f#sha256:${SHA}`]);
    const r = runCasesCompare({ leftDir: join(root, "claude/features/2026-05-a"), rightDir: join(root, "codex/features/2026-05-b"), threshold: 0.9 });
    expect(r.fail).toBe(true);
    expect(r.findings.some((f) => f.rule === "path_mismatch" && f.severity === "FAIL")).toBe(true);
  });

  it("WARNs (not FAIL) when non-critical coverage dips below threshold", () => {
    const dir = "2026-05-x";
    writeManifest(join(root, `claude/features/${dir}`), dir, [`lanhu.fixture:a#sha256:${SHA}`, `knowledge.entry:b#sha256:${SHA}`]);
    writeManifest(join(root, `codex/features/${dir}`), dir, [`lanhu.fixture:a#sha256:${SHA}`]);
    const r = runCasesCompare({ leftDir: join(root, `claude/features/${dir}`), rightDir: join(root, `codex/features/${dir}`), threshold: 0.9 });
    expect(r.fail).toBe(false);
    expect(r.findings.some((f) => f.rule === "coverage_below_threshold" && f.severity === "WARN")).toBe(true);
  });

  it("passes clean when sets match and paths agree", () => {
    const dir = "2026-05-x";
    const refs = [`lanhu.fixture:a#sha256:${SHA}`, `knowledge.entry:b#sha256:${SHA}`];
    writeManifest(join(root, `claude/features/${dir}`), dir, refs);
    writeManifest(join(root, `codex/features/${dir}`), dir, refs);
    const r = runCasesCompare({ leftDir: join(root, `claude/features/${dir}`), rightDir: join(root, `codex/features/${dir}`), threshold: 0.9 });
    expect(r.fail).toBe(false);
    expect(r.findings).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test engine/tests/cli/cases-compare.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `runCasesCompare`**

```typescript
// engine/src/cli/cases-compare.ts
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { Command } from "commander";
import { extractSourceFactSet, jaccard } from "../cases/source-fact-set.ts";

export interface CasesCompareContext { leftDir: string; rightDir: string; threshold: number; criticalFacts?: Set<string> }
export interface CompareFinding { severity: "FAIL" | "WARN"; rule: string; message: string }
export interface CasesCompareResult { fail: boolean; jaccard: number; findings: CompareFinding[] }

function loadManifest(dir: string): { case_drafting?: { requirement_atoms?: { source_ref: string }[] } } {
  return JSON.parse(readFileSync(join(dir, "manifest.json"), "utf-8"));
}

export function runCasesCompare(ctx: CasesCompareContext): CasesCompareResult {
  const findings: CompareFinding[] = [];
  if (!existsSync(join(ctx.leftDir, "manifest.json")) || !existsSync(join(ctx.rightDir, "manifest.json"))) {
    return { fail: true, jaccard: 0, findings: [{ severity: "FAIL", rule: "missing_manifest", message: "one side has no manifest.json" }] };
  }
  // Path identity: inner feature_id must match.
  if (basename(ctx.leftDir) !== basename(ctx.rightDir)) {
    findings.push({ severity: "FAIL", rule: "path_mismatch", message: `feature_id differs: ${basename(ctx.leftDir)} vs ${basename(ctx.rightDir)}` });
  }
  const left = extractSourceFactSet(loadManifest(ctx.leftDir));
  const right = extractSourceFactSet(loadManifest(ctx.rightDir));
  const j = jaccard(left, right);

  // Critical facts (if provided) must be 100% covered on both sides.
  if (ctx.criticalFacts) {
    for (const f of ctx.criticalFacts) {
      if (!left.has(f) || !right.has(f)) {
        findings.push({ severity: "FAIL", rule: "critical_fact_missing", message: `critical fact not on both sides: ${f}` });
      }
    }
  }
  if (j < ctx.threshold) {
    findings.push({ severity: "WARN", rule: "coverage_below_threshold", message: `source-fact jaccard ${j.toFixed(3)} < ${ctx.threshold}` });
  }
  return { fail: findings.some((f) => f.severity === "FAIL"), jaccard: j, findings };
}

export function registerCasesCompare(cases: Command): void {
  cases
    .command("compare")
    .description("跨模型产物稳定性比对 (FAIL/WARN)")
    .requiredOption("--left <dir>", "claude 产物 feature 目录")
    .requiredOption("--right <dir>", "codex 产物 feature 目录")
    .option("--threshold <n>", "非关键源事实 Jaccard 阈值", "0.9")
    .option("--exit-code", "exit non-zero on FAIL", false)
    .action((opts: { left: string; right: string; threshold: string; exitCode: boolean }) => {
      const r = runCasesCompare({ leftDir: opts.left, rightDir: opts.right, threshold: Number(opts.threshold) });
      for (const f of r.findings) console.log(`[${f.severity}] ${f.rule}: ${f.message}`);
      console.log(`jaccard=${r.jaccard.toFixed(3)} ${r.fail ? "FAIL" : "OK"}`);
      if (opts.exitCode && r.fail) process.exit(1);
    });
}
```

- [ ] **Step 4: Register + run tests**

In `engine/src/cli/cases-lint.ts` `buildCasesCommand()`, add `registerCasesCompare(cases);` (import it).
Run: `bun test engine/tests/cli/cases-compare.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add engine/src/cli/cases-compare.ts engine/src/cli/cases-lint.ts engine/tests/cli/cases-compare.test.ts
git commit -m "feat: 📊 add kata cases compare cross-model stability report"
```

---

## Phase 4 — case-draft contract refactor + projection re-render

This phase has no unit-test red/green for prose; verification is `bun run lint:ai-core`, `kata ai-core projection check`, and a parity assertion test. Edit `.ai/core/` sources, then re-render.

### Task 4.1: Make `execution-protocol.md` runtime-neutral

**Files:**
- Modify: `.ai/core/skills/case-draft/references/execution-protocol.md`

- [ ] **Step 1: Read the current file**

Read `.ai/core/skills/case-draft/references/execution-protocol.md` fully. It references claude-only tool names (`TodoWrite`, `Agent tool subagent_type=general-purpose`).

- [ ] **Step 2: Replace claude-only tool names with runtime-neutral phrasing**

For each occurrence, edit to name both runtimes' equivalent primitive:
- `TodoWrite` → `运行时任务可视化工具（Claude Code: TodoWrite；Codex: update_plan）`
- `Agent tool，subagent_type=general-purpose` → `运行时子代理派发（Claude Code: Agent tool subagent_type=general-purpose；Codex: spawn_agent + send_input + wait_agent）`
- Any "二阶段审查" steps: keep the stages identical; only annotate the dispatch primitive per runtime.

Keep step ORDER and review strength identical. The file must read as one workflow that both runtimes execute with their own primitives.

- [ ] **Step 3: Verify contract lint**

Run: `bun run lint:ai-core`
Expected: PASS (reference is verbatim-copied; no schema impact). Fix any path/debris lint that trips.

- [ ] **Step 4: Commit**

```bash
git add .ai/core/skills/case-draft/references/execution-protocol.md
git commit -m "refactor: ♻️ make case-draft execution-protocol runtime-neutral"
```

### Task 4.2: Make `worker-prompt.md` runtime-neutral

**Files:**
- Modify: `.ai/core/skills/case-draft/references/worker-prompt.md`

- [ ] **Step 1: Read the file and find runtime-specific dispatch language**

Read `.ai/core/skills/case-draft/references/worker-prompt.md`. It is mostly runtime-neutral (Status Envelope JSON), but the dispatch wrapper and "Agent tool" references must become neutral.

- [ ] **Step 2: Edit dispatch references**

Replace any `Agent tool` / `subagent_type` phrasing with the neutral `运行时子代理派发` phrasing from Task 4.1. Leave the JSON Status Envelope and BlockedEnvelope contract unchanged.

- [ ] **Step 3: Verify + commit**

Run: `bun run lint:ai-core`
Expected: PASS.

```bash
git add .ai/core/skills/case-draft/references/worker-prompt.md
git commit -m "refactor: ♻️ make case-draft worker-prompt runtime-neutral"
```

### Task 4.3: Add the source-code confirmation reference

**Files:**
- Create: `.ai/core/skills/case-draft/references/source-confirm.md`

- [ ] **Step 1: Write the reference**

Content (the step that fires AFTER `module-identify` produces a stable module/project context, BEFORE `historical-context`):

```markdown
# Source-code confirmation

Trigger: after module-identify has produced a stable {project, module} context, before historical-context.

Goal: pin the front-end and back-end source repos (group / projectname / branch) that this feature's cases must consult, as a deterministic, user-confirmed input.

Procedure:
1. Derive a recommendation:
   - First, look up the knowledge base mapping "开发版本 → repos+branch" (see knowledge entry `source-repo-map`). The Lanhu/Axure PRD usually carries a "开发版本" keyword (e.g. "开发版本：6.3岚图定制化分支").
   - If unmapped, infer semantically from the PRD/page content.
2. Present ONE confirmation round (front-end + back-end together) via the runtime's ask-user primitive:
   > 请确认该功能涉及的前端和后端 GitHub 仓库：
   > 前端: <group>/<repo>@<branch>
   > 后端: <group>/<repo>@<branch>
3. If `.kata/repos` already contains the confirmed repos, present them as the default; if missing, request them (give clone guidance) or record a blocking todo.
4. Write the confirmed triples into `source-snapshot.json#confirmed_source_repos[]` and record `source-snapshot.json#slug_source`. Keep `metadata.yaml` limited to its schema fields, with the Lanhu/PRD source in `metadata.yaml#inputs`. These become required inputs for verification (repo.line source_refs must resolve into these confirmed triples).

Do NOT proceed to historical-context until the triples are confirmed or explicitly deferred as blocking.
```

- [ ] **Step 2: Commit**

```bash
git add .ai/core/skills/case-draft/references/source-confirm.md
git commit -m "feat: 📝 add case-draft source-code confirmation reference"
```

### Task 4.4: Rewrite `skill.yaml` — remove output-changing codex_override, add step + required_inputs

**Files:**
- Modify: `.ai/core/skills/case-draft/skill.yaml`

- [ ] **Step 1: Insert the source-confirm step into `routing_summary`**

In `body.always_load.routing_summary`, change the step chain to insert `source-confirm` after `module-identify`:

```
固定执行 source-intake → module-identify → source-confirm → historical-context → requirement-atomize → ambiguity-scan → confirmation-package → product-feedback-merge → coverage-matrix → case-draft → case-review → output → automation-handoff。
```

Replace the path template line `workspace/{project}/features/{YYYY-MM-english-slug}/` with: `首步执行 kata features resolve，从返回 JSON 取 featureDir 作为所有产物的唯一写入根目录；featureId 写入 metadata.yaml#id，slug 来源写入 source-snapshot.json#slug_source；禁止自行拼接 workspace/{project}/features/{YYYY-MM-xxx} 路径。`

- [ ] **Step 2: Add `required_inputs` under the skill body**

Add a new key (top-level of the skill doc, near `outputs`):

```yaml
required_inputs:
  - kind: requirement_source   # lanhu.fixture | prd.file
    required: true
  - kind: knowledge.entry
    required: true
  - kind: repo.line
    required: true
  - kind: case.archive
    required: false
```

- [ ] **Step 3: Delete `body.codex_override.routing_summary` and `body.codex_override.hard_rules`**

Remove those two sub-keys entirely so codex renders from the same `routing_summary` + `hard_rules` as claude (projection falls back to the main body when codex_override arrays are empty/absent — confirmed in `skill-renderer.ts` `renderRoutingSummary`/`effectiveHardRules`). If a `codex_override` block is required structurally, leave it present but empty, or keep only genuine capability-adaptation notes that do NOT change steps/outputs.

- [ ] **Step 4: Register the `source-confirm` reference**

In `references:`, add:

```yaml
  - path: references/source-confirm.md
    type: normative
    load_phases:
      - source-confirm
    purpose: 在 module-identify 产出稳定上下文后，一轮确认前后端源码 triple 并写入 source-snapshot。
    load_when: step.id == source-confirm
```

- [ ] **Step 5: Validate the contract**

Run: `bun run lint:ai-core`
Expected: PASS. Fix any schema/field issues the linter reports (e.g. unknown key `required_inputs` → if the product-skill contract schema rejects it, add the field to the skill contract schema under `engine/src/ai-core/specs.ts` productSkill spec `allowed` list, with a test).

- [ ] **Step 6: Commit**

```bash
git add .ai/core/skills/case-draft/skill.yaml
git commit -m "refactor: ♻️ unify case-draft workflow, add source-confirm + required_inputs"
```

### Task 4.5: Register new reference in projection inventory + re-render

**Files:**
- Modify: `.ai/core/runtimes/projection-inventory.yaml`
- Regenerate: `.claude/**`, `.agents/**`, `.ai/core/runtimes/projection-lock.json`

- [ ] **Step 1: Add inventory rows for the new reference (both runtimes)**

In `.ai/core/runtimes/projection-inventory.yaml`, add 2 rows:

```yaml
  - path: .claude/skills/case-draft/references/source-confirm.md
    runtime: claude
    disposition: generated
    source: .ai/core/skills/case-draft/references/source-confirm.md
  - path: .agents/skills/case-draft/references/source-confirm.md
    runtime: codex
    disposition: generated
    source: .ai/core/skills/case-draft/references/source-confirm.md
```

Also add the same path to `generated_files` in `.ai/core/runtimes/claude.yaml` and `.ai/core/runtimes/codex.yaml`.

- [ ] **Step 2: Re-render the projection**

Run: `bun ${PWD}/engine/bin/kata ai-core projection render`
Expected: regenerates `.claude/skills/case-draft/**`, `.agents/skills/case-draft/**`, and updates `projection-lock.json`.

- [ ] **Step 3: Verify projection integrity**

Run: `bun ${PWD}/engine/bin/kata ai-core projection check --runtime all`
Expected: PASS (no missing/extra/hash-mismatch). Also `bun run lint:ai-core`.

- [ ] **Step 4: Commit**

```bash
git add .ai/core/runtimes/projection-inventory.yaml .ai/core/runtimes/claude.yaml .ai/core/runtimes/codex.yaml .ai/core/runtimes/projection-lock.json .claude .agents
git commit -m "build: 🏗️ re-render projection for unified case-draft contract"
```

### Task 4.6: Assert claude/codex SKILL.md parity

**Files:**
- Create: `engine/tests/ai-core/case-draft-contract.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// engine/tests/ai-core/case-draft-contract.test.ts
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "../../lib/paths.ts";

function section(md: string, heading: string): string {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start < 0) return "";
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) if (/^#{1,3}\s/.test(lines[i])) { end = i; break; }
  return lines.slice(start + 1, end).join("\n").trim();
}

describe("case-draft contract parity", () => {
  const claude = readFileSync(join(repoRoot(), ".claude/skills/case-draft/SKILL.md"), "utf-8");
  const codex = readFileSync(join(repoRoot(), ".agents/skills/case-draft/SKILL.md"), "utf-8");

  it("routing summaries are identical across runtimes", () => {
    expect(section(codex, "## 路由摘要")).toBe(section(claude, "## 路由摘要"));
  });
  it("both include the source-confirm step", () => {
    expect(claude).toContain("source-confirm");
    expect(codex).toContain("source-confirm");
  });
  it("neither hardcodes the english-slug path template", () => {
    expect(claude).not.toContain("{YYYY-MM-english-slug}");
    expect(codex).not.toContain("{YYYY-MM-english-slug}");
  });
});
```

- [ ] **Step 2: Run + commit**

Run: `bun test engine/tests/ai-core/case-draft-contract.test.ts`
Expected: PASS.

```bash
git add engine/tests/ai-core/case-draft-contract.test.ts
git commit -m "test: 🧪 assert case-draft SKILL.md parity across runtimes"
```

### Task 4.7: Seed the knowledge-base version→repo map

**Files:**
- Create: `workspace/dataAssets/_shared/knowledge/source-repo-map.md`

- [ ] **Step 1: Write the mapping the user provided**

```markdown
# 开发版本 → 源码仓库映射

| 开发版本关键词 | 前端 | 后端 |
|---|---|---|
| 6.3岚图定制化分支 | customltem/dt-insight-studio@dataAssets/release_6.3.x_ltqc | customltem/dt-center-assets@release_6.3.x_ltqc |

> source-confirm 步骤优先查本表；未命中再 LLM 语义兜底；任何情况都过一轮 AskUser 人工确认。
```

(Confirm/extend the table with any additional mappings the user supplies — see spec §13.)

- [ ] **Step 2: Commit**

```bash
git add workspace/dataAssets/_shared/knowledge/source-repo-map.md
git commit -m "docs: 📝 seed dataAssets version-to-repo source map"
```

---

## Phase 5 — e2e harness (dual-runtime real run + fixture replay)

No headless invocation infra exists; build it. Real model runs are slow/non-deterministic, so split: (a) a real dual-runtime command for on-demand use, (b) a fixture-replay test wired into CI that exercises verify+compare logic without calling models.

### Task 5.1: Runtime invocation wrapper

**Files:**
- Create: `engine/src/e2e/runtime-invoke.ts`
- Test: `engine/tests/e2e/runtime-invoke.test.ts`

- [ ] **Step 1: Write the failing test (inject a fake spawn)**

```typescript
// engine/tests/e2e/runtime-invoke.test.ts
import { describe, expect, it } from "bun:test";
import { buildClaudeArgs, buildCodexArgs } from "../../src/e2e/runtime-invoke.ts";

describe("runtime arg builders", () => {
  it("builds claude headless args", () => {
    const a = buildClaudeArgs({ prompt: "do it", cwd: "/w" });
    expect(a).toContain("-p");
    expect(a).toContain("do it");
  });
  it("builds codex exec args", () => {
    const a = buildCodexArgs({ prompt: "do it", cwd: "/w" });
    expect(a[0]).toBe("exec");
    expect(a).toContain("do it");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test engine/tests/e2e/runtime-invoke.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement (arg builders pure; invoke uses spawnSync)**

```typescript
// engine/src/e2e/runtime-invoke.ts
import { spawnSync } from "node:child_process";

export interface InvokeOpts { prompt: string; cwd: string; env?: NodeJS.ProcessEnv; timeoutMs?: number }

export function buildClaudeArgs(o: InvokeOpts): string[] {
  return ["-p", o.prompt, "--permission-mode", "acceptEdits"];
}
export function buildCodexArgs(o: InvokeOpts): string[] {
  return ["exec", o.prompt];
}

export interface InvokeResult { ok: boolean; stdout: string; stderr: string }

export function invokeClaude(o: InvokeOpts): InvokeResult {
  const r = spawnSync("claude", buildClaudeArgs(o), { cwd: o.cwd, env: o.env, encoding: "utf-8", timeout: o.timeoutMs ?? 1_800_000 });
  return { ok: r.status === 0, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}
export function invokeCodex(o: InvokeOpts): InvokeResult {
  const r = spawnSync("codex", buildCodexArgs(o), { cwd: o.cwd, env: o.env, encoding: "utf-8", timeout: o.timeoutMs ?? 1_800_000 });
  return { ok: r.status === 0, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}
```

> Confirm the exact non-interactive flags for the installed `claude` and `codex` CLIs before relying on real runs (`claude --help`, `codex exec --help`). Adjust `buildClaudeArgs`/`buildCodexArgs` and update the test to match.

- [ ] **Step 4: Run + commit**

Run: `bun test engine/tests/e2e/runtime-invoke.test.ts`
Expected: PASS.

```bash
git add engine/src/e2e/runtime-invoke.ts engine/tests/e2e/runtime-invoke.test.ts
git commit -m "feat: 🤖 add dual-runtime headless invocation wrappers"
```

### Task 5.2: Frozen snapshot fixture

**Files:**
- Create: `engine/tests/fixtures/case-draft-e2e/source_snapshot.json`
- Create: `engine/tests/fixtures/case-draft-e2e/expected/claude/manifest.json`
- Create: `engine/tests/fixtures/case-draft-e2e/expected/codex/manifest.json`

- [ ] **Step 1: Capture one real Lanhu fetch into a snapshot**

Using the pilot Lanhu URL (spec §13), run source-intake once and save the resulting `source_snapshot` (Lanhu content + confirmed source triples + knowledge snapshot refs) to `source_snapshot.json`. This is the byte-frozen input both runtimes will consume.

- [ ] **Step 2: Record two expected manifests**

Run case-draft once per runtime against the frozen snapshot (manually, first time), and save each `manifest.json` as the expected fixture. These let CI replay compare/verify logic deterministically without model calls.

- [ ] **Step 3: Commit**

```bash
git add engine/tests/fixtures/case-draft-e2e/
git commit -m "test: 🧪 add frozen case-draft e2e snapshot + expected manifests"
```

### Task 5.3: e2e orchestrator + fixture-replay test + CI wiring

**Files:**
- Create: `engine/src/e2e/case-draft-e2e.ts`
- Create: `engine/src/cli/cases-e2e.ts` (register `cases e2e`)
- Create: `engine/tests/e2e/case-draft-e2e.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the fixture-replay test (no model calls)**

```typescript
// engine/tests/e2e/case-draft-e2e.test.ts
import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { repoRoot } from "../../lib/paths.ts";
import { runCasesCompare } from "../../src/cli/cases-compare.ts";

describe("case-draft e2e (fixture replay)", () => {
  const base = join(repoRoot(), "engine/tests/fixtures/case-draft-e2e/expected");
  it("frozen claude vs codex manifests pass compare (no FAIL)", () => {
    const r = runCasesCompare({ leftDir: join(base, "claude"), rightDir: join(base, "codex"), threshold: 0.9 });
    expect(r.fail).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails (then make fixtures consistent)**

Run: `bun test engine/tests/e2e/case-draft-e2e.test.ts`
Expected: FAIL if expected fixtures are missing/inconsistent. Adjust the recorded expected manifests until compare passes (this captures the agreed cross-model baseline).

- [ ] **Step 3: Implement the orchestrator + `cases e2e` command**

```typescript
// engine/src/e2e/case-draft-e2e.ts
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { invokeClaude, invokeCodex } from "./runtime-invoke.ts";
import { runCasesVerify } from "../cli/cases-verify.ts";
import { runCasesCompare } from "../cli/cases-compare.ts";

export interface E2eOpts { project: string; featureId: string; snapshotPath: string; outRoot: string; workspaceRoot: string; threshold: number; requiredKinds: string[] }

export async function runCaseDraftE2e(o: E2eOpts) {
  const prompt = `Run case-draft for project ${o.project} feature ${o.featureId} consuming the frozen source_snapshot at ${o.snapshotPath}. Write artifacts under {runtimeRoot}/workspace/${o.project}/features/${o.featureId}/.`;
  const claudeRoot = join(o.outRoot, "claude");
  const codexRoot = join(o.outRoot, "codex");
  mkdirSync(claudeRoot, { recursive: true });
  mkdirSync(codexRoot, { recursive: true });

  invokeClaude({ prompt: prompt.replace("{runtimeRoot}", claudeRoot), cwd: claudeRoot });
  invokeCodex({ prompt: prompt.replace("{runtimeRoot}", codexRoot), cwd: codexRoot });

  const featRel = join("workspace", o.project, "features", o.featureId);
  const v1 = await runCasesVerify({ project: o.project, featureId: o.featureId, workspaceRoot: join(claudeRoot, "workspace"), requiredKinds: o.requiredKinds });
  const v2 = await runCasesVerify({ project: o.project, featureId: o.featureId, workspaceRoot: join(codexRoot, "workspace"), requiredKinds: o.requiredKinds });
  const cmp = runCasesCompare({ leftDir: join(claudeRoot, featRel), rightDir: join(codexRoot, featRel), threshold: o.threshold });

  return { verifyClaude: v1, verifyCodex: v2, compare: cmp, ok: v1.ok && v2.ok && !cmp.fail };
}
```

Then create `engine/src/cli/cases-e2e.ts` registering `cases e2e` with options (`--project`, `--feature`, `--snapshot`, `--out`, `--threshold`) calling `runCaseDraftE2e` and printing the stability report; register it in `buildCasesCommand()`.

- [ ] **Step 4: Wire CI to the fixture-replay test only**

In `package.json`, add a script and include it in `ci` (the real `cases e2e` stays manual/on-demand):

```json
"test:e2e:fixture": "bun test engine/tests/e2e/case-draft-e2e.test.ts engine/tests/e2e/runtime-invoke.test.ts",
```

Append ` && bun run test:e2e:fixture` to the `ci` script.

- [ ] **Step 5: Run the full gate + commit**

Run: `bun run test:e2e:fixture`
Expected: PASS.

```bash
git add engine/src/e2e/case-draft-e2e.ts engine/src/cli/cases-e2e.ts engine/src/cli/cases-lint.ts engine/tests/e2e/case-draft-e2e.test.ts package.json
git commit -m "feat: 🧪 add case-draft cross-model e2e harness + CI fixture replay"
```

### Task 5.4: Real dual-runtime acceptance run (manual, on-demand)

**Files:** none (operational)

- [ ] **Step 1: Run the real e2e against the pilot Lanhu fixture**

Run: `bun ${PWD}/engine/bin/kata cases e2e --project dataAssets --feature <resolved-feature-id> --snapshot engine/tests/fixtures/case-draft-e2e/source_snapshot.json --out .kata/e2e-results/$(date +%s) --threshold 0.9`
Expected: `verifyClaude.ok && verifyCodex.ok && !compare.fail` — paths identical, both verify pass, critical facts 100%, non-critical ≥0.9 (else WARN).

- [ ] **Step 2: If FAIL, triage by layer**

- `path_mismatch` → engine resolve not invoked / different inputs → re-check Task 0.x wiring in the skill.
- `verify L2 required_input_uncovered` → a runtime skipped knowledge/source consumption → tighten `source-confirm`/`required_inputs` wording.
- `critical_fact_missing` → genuine cross-model divergence on a blocking requirement → inspect both manifests; this is the real signal the project exists to catch.

- [ ] **Step 3: Record the accepted baseline**

Update the frozen expected manifests (Task 5.2) to the accepted run, so CI replay reflects the proven baseline.

---

## Self-Review

**1. Spec coverage**

| Spec section | Covered by |
|---|---|
| §4 architecture (4 parts) | Phases 0–5 |
| §5 contract refactor: unify codex_override | Task 4.4 (delete override) + 4.1/4.2 (neutral refs) + 4.6 (parity test) |
| §5.1 execution-protocol equivalence | Tasks 4.1, 4.2 |
| §5 source-code confirmation step | Tasks 4.3, 4.4, 4.7 |
| §5 required_inputs | Task 4.4 |
| §5 tighten output schema | Phase 1 |
| §6 deterministic path + propagation | Phase 0 + Task 4.4 (path written to metadata/source_snapshot) |
| §7 three-layer verify + traceability | Phase 2 (L2 traceability = Task 2.1) |
| §8 compare, source-fact set, FAIL/WARN | Phase 3 |
| §9 e2e snapshot + dual run + assertions | Phase 5 |
| §11 progress.json superseded | Audit report = `kata cases verify` output (Phase 2); no repo-level progress.json work — matches §12 |
| §14 DoD items 1–7 | Phases 4, 0, 2, 3, 5, 5(CI), 2 respectively |

**2. Placeholder scan** — One deliberate integration point: `extractCaseRecords` (Task 2.3 Step 4) wires to the repo's existing archive parser, which must be located via grep before implementing; the task makes that explicit with a fallback test. Real-CLI flags for `claude`/`codex` (Task 5.1) are flagged for confirmation against the installed binaries. No silent TBDs.

**3. Type consistency** — `VerifyIssue` (`{layer, rule, message, fix?}`), `CompareFinding` (`{severity, rule, message}`), `CaseRecord` (`{case_id, requirement_atom_ids, steps, expected, title}`), `ResolvedTarget` (`{found, content?, path?}`), `FeaturesResolveResult` (`{featureId, featureDir, reused}`) are defined once and reused consistently across tasks. `runCasesVerify`/`runCasesCompare`/`runFeaturesResolve` signatures match between their defining task and their Phase 5 callers.

**Open inputs (spec §13, needed before Phase 5 real run):** pilot Lanhu URL; 2–3 known defect examples (to extend L1/L3 rules); any additional version→repo mappings.
