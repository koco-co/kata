# Workspace 产物分层重组 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `workspace/{project}/features/` 重组为「版本层 + feature 内 cases/automation/runs 三区」结构，配套统一 run-id、metadata 合并、迁移/清理/归档 CLI 与全部 skill 路径契约更新。

**Architecture:** 新增中心布局模块 `lib/features/layout.ts` 作为目录结构唯一定义；所有 CLI、lint、测试从它取路径。`manifest.json` 合并进 `metadata.yaml`（schema 升级到 `FeatureMetadata@2`），由 `lib/features/feature-meta.ts` 统一读写。迁移由 `kata features migrate`（dry-run 先行）一次性完成 dataAssets + xyzh。

**Tech Stack:** Bun >= 1.3、TypeScript、commander、bun:test、yaml 包。已有 CLI 入口 `.claude/scripts/_shared/cli/index.ts`，features 命令组在 `features.ts`。

**Spec:** `docs/superpowers/specs/2026-06-10-workspace-restructure-design.md`

---

## 既定事实（执行者必读）

调研已确认的现状，写计划时已核对过，执行时不要再凭印象推断：

1. **目录名与机器主键分离**：磁盘 feature 目录名是中文人读标签（`【v6411】【岚图汽车】...`），机器主键是 `manifest.json#feature_id`（slug，如 `2026-04-dq-json-config`）。见 `.claude/skills/case-draft/rules/naming-convention.md` 末节。
2. **INDEX.md 链接已断**：`features-index.ts` 用 `[${r.id}](${r.id}/)` 渲染链接，但目录名 ≠ id，所以链接全部 404。本计划顺带修复（链接改用实际目录名）。
3. **`results/`、`.process/`、`.debug/`、`_shared/` 都是 gitignored**（根 `.gitignore` L16-18、`workspace/dataAssets/.gitignore`）。所以 results→runs 的移动是纯 fs rename，不走 `git mv`；而 `archive.md`、`tests/` 等是 tracked，必须 `git mv` 保历史。
4. **`git mv <目录>` 是文件系统级 rename**：目录里的 untracked/ignored 文件会跟着一起移动，index 只更新 tracked 部分。整 feature 目录入版本层用一次 `git mv` 即可。
5. **lint 规则注册**：feature 级 lint 走 `lint/types.ts` 的 `LintRuleId`（L1–L11）+ `cli/cases-lint.ts`；新规则注册为 L12。
6. **版本号双轨**：目录名里是紧凑版（`v6411`/`v647`），`_shared/_meta/versions.yaml` 枚举与 metadata.versions 里是语义版（`v6.4.11`/`v6.4.7`）。换算规则 `^v(\d)(\d)(\d{1,2})$` → `v$1.$2.${去前导零($3)}`。
7. **测试命令**：局部 `bun test .claude/scripts/_shared/tests/<file>`，全量 `bun test`；lint 检查 `bun run check`；skill 契约 `bun run check:skills`。
8. **命名偏差说明**：spec 里中心契约文件写的是 `lib/features/paths.ts`，本计划改名为 `lib/features/layout.ts`——因为 `lib/paths.ts` 已存在，同名会造成 import 歧义。语义不变，spec 不回改。
9. **测试 temp 目录**：计划代码里的 `makeTempDir()/makeTempDirForThisTest()` 是示意，实现时参照邻近测试（如 `tests/features-new.test.ts`）的现有写法，用 `mkdtempSync(join(tmpdir(), "kata-"))` + afterEach 清理，不新造共享 helper（除非邻近测试已有）。

## 文件结构总览

```
新增：
.claude/scripts/_shared/lib/features/layout.ts          # 中心布局契约（三区、版本层、扫描）
.claude/scripts/_shared/lib/features/feature-meta.ts    # FeatureMetadata@2 读写 + manifest 合并
.claude/scripts/_shared/cli/features-migrate.ts         # kata features migrate
.claude/scripts/_shared/cli/features-archive.ts         # kata features archive <version>
.claude/scripts/_shared/lint/feature-root-layout.ts     # L12：三区之外散落产物报错
.claude/scripts/_shared/tests/features/layout.test.ts
.claude/scripts/_shared/tests/features/feature-meta.test.ts
.claude/scripts/_shared/tests/features-migrate.test.ts
.claude/scripts/_shared/tests/features-archive.test.ts
.claude/scripts/_shared/tests/lint/feature-root-layout.test.ts

重写/大改：
.claude/scripts/_shared/lib/features/run-id.ts          # run-id v2（type+seq）
.claude/scripts/_shared/cli/features-ls.ts              # 版本层扫描 + 只读 metadata.yaml
.claude/scripts/_shared/cli/features-index.ts            # 按版本分组渲染 INDEX
.claude/scripts/_shared/cli/results-prune.ts             # runs/ 保留策略（latest3+baseline+published）
.claude/scripts/_shared/cli/results-path.ts              # results→runs + run-id v2

小改（路径/字段适配）：
features.ts, features-new.ts, features-resolve.ts, features-show.ts, features-lint.ts,
cases-verify.ts, cases-validate.ts, cases-lint.ts, lib/paths.ts,
lint/{v2-quality-gates,no-feature-local-helpers,no-debug-in-cases,case-traceability-header,
      source-ref-registry,archive-case-qa,case-md-sourceref-leak,path-treatment,hardcode-path,tests-layout}.ts,
对应 tests/**（20+ 文件 fixture 路径）

文档契约：
.claude/skills/{case-draft,case-edit,case-hotfix,playwright-automation}/**（详见 Task 9 映射表）,
.gitignore, CLAUDE.md, .claude/rules/project-workflow-rules.md, .claude/rules/git-workflow.md
```

---

### Task 0: 准备 worktree

**Files:** 无代码改动。

- [ ] **Step 1: 主工作树快照提交**

```bash
cd /Users/poco/Projects/kata
git add -A && git commit -m "chore: 🧹 save pre-worktree local changes"
```

注意：`git status` 当前有 `workspace/dataAssets/features/【v6411】.../archive.md` 与 `cases.xmind` 的未提交改动，必须先入快照。

- [ ] **Step 2: 创建 detached worktree 并 symlink runtime 目录**

```bash
ROOT=$(pwd)
W="$ROOT/.worktrees/workspace-restructure"
git worktree add --detach "$W" main
ln -s "$ROOT/node_modules" "$W/node_modules"
mkdir -p "$W/workspace/dataAssets" "$W/workspace/xyzh"
ln -s "$ROOT/workspace/dataAssets/.kata" "$W/workspace/dataAssets/.kata"
ln -s "$ROOT/workspace/xyzh/.kata" "$W/workspace/xyzh/.kata"
```

- [ ] **Step 3: 基线验证**

```bash
cd "$W" && bun test && bun run check
```

Expected: 全绿（基线本来就是绿的；如有红，先停下报告，不得带病开工）。

**注意**：后续每次 commit 前必须查 `git status --short` 的 staged 清单，确认 symlink 的 `node_modules`、`.kata` 没被 `git add -A` 误纳入。

---

### Task 1: 中心布局契约 `layout.ts`

**Files:**
- Create: `.claude/scripts/_shared/lib/features/layout.ts`
- Test: `.claude/scripts/_shared/tests/features/layout.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// .claude/scripts/_shared/tests/features/layout.test.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  ALLOWED_FEATURE_ROOT_ENTRIES,
  compactToVersionDir,
  listFeatureDirs,
  runsTmpDir,
  VERSION_DIR_RE,
} from "@shared/lib/features/layout.ts";
import { makeTempDir, removeTempDir } from "../helpers/temp.ts"; // 若无此 helper，参照邻近测试用 mkdtempSync

let root: string;

beforeEach(() => {
  root = makeTempDir();
});
afterEach(() => {
  removeTempDir(root);
});

describe("compactToVersionDir", () => {
  it("converts compact version to semantic dir name", () => {
    expect(compactToVersionDir("v6411")).toBe("v6.4.11");
    expect(compactToVersionDir("v647")).toBe("v6.4.7");
    expect(compactToVersionDir("v6410")).toBe("v6.4.10");
  });
  it("returns null for non-compact input", () => {
    expect(compactToVersionDir("v6.4.10")).toBeNull();
    expect(compactToVersionDir("2099")).toBeNull();
  });
});

describe("listFeatureDirs", () => {
  it("scans version layer, _standing, _archived and legacy flat dirs", () => {
    const features = join(root, "features");
    mkdirSync(join(features, "v6.4.11", "【v6411】【数据资产】适配lindorm"), { recursive: true });
    mkdirSync(join(features, "_standing", "2099-01-lt-dq-smoke"), { recursive: true });
    mkdirSync(join(features, "_archived", "v6.4.6", "【v646】【数据标准】DBC落标检查"), {
      recursive: true,
    });
    mkdirSync(join(features, "【v647】【数据质量】产品名称修改"), { recursive: true });
    writeFileSync(join(features, "INDEX.md"), "x", "utf-8");

    const entries = listFeatureDirs(features);
    const byZone = Object.groupBy(entries, (e) => e.zone);
    expect(byZone.active?.[0]).toMatchObject({
      group: "v6.4.11",
      dirName: "【v6411】【数据资产】适配lindorm",
    });
    expect(byZone.standing?.[0]?.group).toBe("_standing");
    expect(byZone.archived?.[0]?.group).toBe("_archived/v6.4.6");
    expect(byZone["legacy-flat"]?.[0]?.dirName).toBe("【v647】【数据质量】产品名称修改");
    expect(entries).toHaveLength(4); // INDEX.md 不计
  });
});

describe("area helpers", () => {
  it("builds three-area paths and whitelists root entries", () => {
    expect(runsTmpDir("/f")).toBe("/f/runs/_tmp");
    expect(VERSION_DIR_RE.test("v6.4.10")).toBe(true);
    expect(VERSION_DIR_RE.test("v6.4")).toBe(true);
    expect(VERSION_DIR_RE.test("_standing")).toBe(false);
    for (const n of ["metadata.yaml", "prd.md", "cases", "automation", "runs", "inputs"]) {
      expect(ALLOWED_FEATURE_ROOT_ENTRIES.has(n)).toBe(true);
    }
    expect(ALLOWED_FEATURE_ROOT_ENTRIES.has("results")).toBe(false);
    expect(ALLOWED_FEATURE_ROOT_ENTRIES.has("manifest.json")).toBe(false);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test .claude/scripts/_shared/tests/features/layout.test.ts`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现 layout.ts**

```ts
// .claude/scripts/_shared/lib/features/layout.ts
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// ─── Feature 内三区 ───
export const AREA_CASES = "cases";
export const AREA_AUTOMATION = "automation";
export const AREA_RUNS = "runs";
export const RUNS_TMP = "_tmp";

// ─── features/ 顶层特殊目录 ───
export const STANDING_DIR = "_standing";
export const ARCHIVED_DIR = "_archived";

// 版本目录名：语义版本，两段或三段（v6.4 / v6.4.10）
export const VERSION_DIR_RE = /^v\d+(?:\.\d+){1,2}$/;

export type FeatureZone = "active" | "standing" | "archived" | "legacy-flat";

export interface FeatureDirEntry {
  /** 分组：版本目录名(v6.4.10)、_standing，或 _archived/v6.4.6；legacy 平铺为 "" */
  group: string;
  zone: FeatureZone;
  /** 目录名（中文人读标签或 slug） */
  dirName: string;
  /** 绝对路径 */
  dir: string;
}

/** 紧凑版本号(v6411/v647) → 语义版本目录名(v6.4.11/v6.4.7)；不匹配返回 null */
export function compactToVersionDir(compact: string): string | null {
  const m = /^v(\d)(\d)(\d{1,2})$/.exec(compact);
  if (!m) return null;
  return `v${m[1]}.${m[2]}.${Number(m[3])}`;
}

function isDir(p: string): boolean {
  return existsSync(p) && statSync(p).isDirectory();
}

function listChildDirs(p: string): string[] {
  if (!isDir(p)) return [];
  return readdirSync(p).filter((n) => !n.startsWith(".") && isDir(join(p, n)));
}

/** 扫描 features/ 两级结构；迁移前的平铺目录以 zone=legacy-flat 返回，供 migrate 与 lint 识别 */
export function listFeatureDirs(featuresRoot: string): FeatureDirEntry[] {
  const entries: FeatureDirEntry[] = [];
  for (const top of listChildDirs(featuresRoot)) {
    const topDir = join(featuresRoot, top);
    if (VERSION_DIR_RE.test(top)) {
      for (const name of listChildDirs(topDir)) {
        entries.push({ group: top, zone: "active", dirName: name, dir: join(topDir, name) });
      }
    } else if (top === STANDING_DIR) {
      for (const name of listChildDirs(topDir)) {
        entries.push({
          group: STANDING_DIR,
          zone: "standing",
          dirName: name,
          dir: join(topDir, name),
        });
      }
    } else if (top === ARCHIVED_DIR) {
      for (const version of listChildDirs(topDir)) {
        for (const name of listChildDirs(join(topDir, version))) {
          entries.push({
            group: `${ARCHIVED_DIR}/${version}`,
            zone: "archived",
            dirName: name,
            dir: join(topDir, version, name),
          });
        }
      }
    } else {
      entries.push({ group: "", zone: "legacy-flat", dirName: top, dir: topDir });
    }
  }
  return entries;
}

/** feature 根下允许出现的非隐藏条目；其余视为散落产物，由 L12 lint 报错 */
export const ALLOWED_FEATURE_ROOT_ENTRIES = new Set([
  "metadata.yaml",
  "prd.md",
  "README.md",
  AREA_CASES,
  AREA_AUTOMATION,
  AREA_RUNS,
  "inputs",
]);

export function casesDir(featureDir: string): string {
  return join(featureDir, AREA_CASES);
}
export function automationDir(featureDir: string): string {
  return join(featureDir, AREA_AUTOMATION);
}
export function runsDir(featureDir: string): string {
  return join(featureDir, AREA_RUNS);
}
export function runsTmpDir(featureDir: string): string {
  return join(featureDir, AREA_RUNS, RUNS_TMP);
}
```

注意：`.process/`、`.debug/`、`.published` 等隐藏条目天然被白名单逻辑放过（lint 只检非 `.` 开头条目），保持现状不动。

- [ ] **Step 4: 跑测试确认通过**

Run: `bun test .claude/scripts/_shared/tests/features/layout.test.ts`
Expected: PASS。若 `Object.groupBy` 在当前 Bun 版本不可用，改用手写 reduce 分组，不引依赖。

- [ ] **Step 5: lint + commit**

```bash
bun run check && git add .claude/scripts/_shared/lib/features/layout.ts .claude/scripts/_shared/tests/features/layout.test.ts
git commit -m "feat: 🧩 add central feature layout contract"
```

---

### Task 2: run-id v2（type + seq）

**Files:**
- Rewrite: `.claude/scripts/_shared/lib/features/run-id.ts`
- Modify: `.claude/scripts/_shared/cli/results-path.ts`（调用方签名适配，目录切换在 Task 5 做）
- Test: `.claude/scripts/_shared/tests/features/run-id.test.ts`（现有文件重写）

- [ ] **Step 1: 重写失败测试**

```ts
// .claude/scripts/_shared/tests/features/run-id.test.ts
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { generateRunId, RUN_ID_RE, runIdType } from "@shared/lib/features/run-id.ts";
// temp 目录构造方式与 layout.test.ts 保持一致

describe("generateRunId v2", () => {
  const now = new Date("2026-06-10T08:30:00Z");

  it("formats as YYYYMMDD-HHmm-<type>-<seq>", () => {
    expect(generateRunId({ type: "run", now })).toBe("20260610-0830-run-01");
    expect(generateRunId({ type: "preflight", now })).toBe("20260610-0830-preflight-01");
  });

  it("increments seq per same-day same-type runs in runsDir", () => {
    const runs = join(makeTempDirForThisTest(), "runs");
    mkdirSync(join(runs, "20260610-0700-run-01"), { recursive: true });
    mkdirSync(join(runs, "20260610-0800-run-02"), { recursive: true });
    mkdirSync(join(runs, "20260610-0810-preflight-01"), { recursive: true });
    expect(generateRunId({ type: "run", runsDir: runs, now })).toBe("20260610-0830-run-03");
    expect(generateRunId({ type: "baseline", runsDir: runs, now })).toBe(
      "20260610-0830-baseline-01",
    );
  });

  it("parses type from run-id; legacy ids return null", () => {
    expect(runIdType("20260610-0830-baseline-01")).toBe("baseline");
    expect(runIdType("20260519-1443-faddbcf8")).toBeNull();
    expect(RUN_ID_RE.test("20260610-0830-selfrun-02")).toBe(true);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test .claude/scripts/_shared/tests/features/run-id.test.ts`
Expected: FAIL（新签名/导出不存在）。

- [ ] **Step 3: 实现 run-id.ts**

```ts
// .claude/scripts/_shared/lib/features/run-id.ts
import { existsSync, readdirSync } from "node:fs";

export const RUN_TYPES = ["preflight", "run", "selfrun", "repair", "baseline"] as const;
export type RunType = (typeof RUN_TYPES)[number];

export const RUN_ID_RE = /^(\d{8})-(\d{4})-(preflight|run|selfrun|repair|baseline)-(\d{2})$/;

export interface GenerateRunIdOptions {
  type: RunType;
  /** runs/ 目录绝对路径；用于推导当日同 type 序号，缺省或目录不存在时序号从 01 起 */
  runsDir?: string;
  now?: Date;
}

export function generateRunId(opts: GenerateRunIdOptions): string {
  const now = opts.now ?? new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const min = String(now.getUTCMinutes()).padStart(2, "0");
  const day = `${yyyy}${mm}${dd}`;

  let seq = 1;
  if (opts.runsDir && existsSync(opts.runsDir)) {
    seq +=
      readdirSync(opts.runsDir).filter((n) => {
        const m = RUN_ID_RE.exec(n);
        return m !== null && m[1] === day && m[3] === opts.type;
      }).length;
  }
  return `${day}-${hh}${min}-${opts.type}-${String(seq).padStart(2, "0")}`;
}

/** 解析 run-id 的 type 段；旧格式（hex 后缀等）返回 null */
export function runIdType(runId: string): RunType | null {
  const m = RUN_ID_RE.exec(runId);
  return m ? (m[3] as RunType) : null;
}
```

- [ ] **Step 4: 适配现有调用方 results-path.ts**

`results-path.ts:19` 现为 `generateRunId(ctx.now)`。改为：

```ts
const runId = generateRunId({ type: "run", runsDir: resultsRoot, now: ctx.now });
```

并在 `ResultsPathContext` 增加可选 `runType?: RunType`，CLI 透传（`results.ts` 的 path 子命令加 `--type <type>` option，默认 `run`）。`grep -rn "generateRunId" .claude/scripts --include="*.ts"` 确认无其他调用方。

- [ ] **Step 5: 跑测试 + commit**

```bash
bun test .claude/scripts/_shared/tests/features/run-id.test.ts .claude/scripts/_shared/tests/results-path.test.ts
```

Expected: run-id PASS；results-path.test 若断言旧 hex 格式则同步改断言（新格式 `20260610-XXXX-run-01`）。

```bash
bun run check && git add -A ':!workspace' && git commit -m "feat: 🧩 run-id v2 with type and sequence"
```

---

### Task 3: FeatureMetadata@2 与 manifest 合并读写

**Files:**
- Create: `.claude/scripts/_shared/lib/features/feature-meta.ts`
- Test: `.claude/scripts/_shared/tests/features/feature-meta.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// .claude/scripts/_shared/tests/features/feature-meta.test.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import {
  mergeManifestIntoMetadata,
  readFeatureMeta,
} from "@shared/lib/features/feature-meta.ts";
import { parse, stringify } from "yaml";

function seedLegacyFeature(dir: string): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "metadata.yaml"),
    stringify({
      schema: "FeatureMetadata@1",
      id: "2026-04-dq-json-config",
      display_name: "JSON格式配置",
      status: "active",
      created_at: "2026-04-01",
      updated_at: "2026-04-01",
      modules: ["dq"],
      customers: [],
      versions: ["v6.4.10"],
      owners: [],
      inputs: [],
      relates_to: [],
      emits: { cases_xmind: true, archive: true, playwright_tests: true },
    }),
    "utf-8",
  );
  writeFileSync(
    join(dir, "manifest.json"),
    JSON.stringify({
      schema: "FeatureManifest@2",
      feature_id: "2026-04-dq-json-config",
      case_drafting: { status: "done", archive_path: "archive.md", xmind_path: "cases.xmind" },
      automation: { status: "ready", intents: [], last_run_status: "passed" },
      files: { archive: "archive.md", tests_root: "tests", latest_results: "results/run-1" },
    }),
    "utf-8",
  );
}

describe("mergeManifestIntoMetadata", () => {
  it("merges manifest sections into metadata.yaml@2 with path rewrite, removes manifest.json", () => {
    const dir = join(makeTempDirForThisTest(), "feat");
    seedLegacyFeature(dir);
    const r = mergeManifestIntoMetadata(dir);
    expect(r.merged).toBe(true);
    expect(existsSync(join(dir, "manifest.json"))).toBe(false);
    const meta = parse(readFileSync(join(dir, "metadata.yaml"), "utf-8"));
    expect(meta.schema).toBe("FeatureMetadata@2");
    expect(meta.feature_id).toBe("2026-04-dq-json-config");
    expect(meta.case_drafting.archive_path).toBe("cases/archive.md");
    expect(meta.automation.last_run_status).toBe("passed");
    expect(meta.files.tests_root).toBe("automation/tests");
    expect(meta.files.latest_results).toBe("runs/run-1");
  });

  it("is idempotent: second merge is a no-op", () => {
    const dir = join(makeTempDirForThisTest(), "feat");
    seedLegacyFeature(dir);
    mergeManifestIntoMetadata(dir);
    expect(mergeManifestIntoMetadata(dir).merged).toBe(false);
  });
});

describe("readFeatureMeta", () => {
  it("reads @2 directly and returns null when metadata.yaml missing", () => {
    const dir = join(makeTempDirForThisTest(), "feat");
    seedLegacyFeature(dir);
    mergeManifestIntoMetadata(dir);
    const meta = readFeatureMeta(dir);
    expect(meta?.automation?.status).toBe("ready");
    expect(readFeatureMeta(join(dir, "nope"))).toBeNull();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test .claude/scripts/_shared/tests/features/feature-meta.test.ts`
Expected: FAIL。

- [ ] **Step 3: 实现 feature-meta.ts**

```ts
// .claude/scripts/_shared/lib/features/feature-meta.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import { AREA_AUTOMATION, AREA_CASES, AREA_RUNS } from "./layout.ts";

/** FeatureMetadata@2：@1 全部字段 + 原 manifest.json 三段 */
export interface FeatureMeta {
  schema: string;
  id: string;
  feature_id?: string;
  display_name: string;
  status: string;
  created_at: string;
  updated_at: string;
  modules: string[];
  customers: string[];
  versions: string[];
  owners: string[];
  inputs: unknown[];
  relates_to: unknown[];
  emits: Record<string, boolean>;
  case_drafting?: Record<string, unknown>;
  automation?: Record<string, unknown> & { status?: string; last_run_status?: string };
  files?: Record<string, string | null>;
}

/** 旧布局相对路径 → 三区相对路径。仅处理 feature 内相对引用，绝对路径原样返回 */
export function rewriteLegacyPath(p: string): string {
  if (p.startsWith("/")) return p;
  if (p.startsWith("results/") || p === "results") return p.replace(/^results/, AREA_RUNS);
  if (p.startsWith("tests/") || p === "tests") return `${AREA_AUTOMATION}/${p}`;
  if (p.startsWith("scripts/") || p === "scripts") return `${AREA_AUTOMATION}/${p}`;
  if (/^(archive(\.draft)?\.md|cases\.xmind|test-point-checklist\.md)$/.test(p)) {
    return `${AREA_CASES}/${p}`;
  }
  if (p === "AUTOMATION-PLAN.md") return `${AREA_AUTOMATION}/${p}`;
  return p;
}

function rewritePathsDeep(value: unknown): unknown {
  if (typeof value === "string") return rewriteLegacyPath(value);
  if (Array.isArray(value)) return value.map(rewritePathsDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, rewritePathsDeep(v)]),
    );
  }
  return value;
}

export function readFeatureMeta(featureDir: string): FeatureMeta | null {
  const p = join(featureDir, "metadata.yaml");
  if (!existsSync(p)) return null;
  return parse(readFileSync(p, "utf-8")) as FeatureMeta;
}

/** manifest.json 合并进 metadata.yaml 并删除 manifest；已是 @2 或无 manifest 时 no-op */
export function mergeManifestIntoMetadata(featureDir: string): { merged: boolean } {
  const metaPath = join(featureDir, "metadata.yaml");
  const manifestPath = join(featureDir, "manifest.json");
  if (!existsSync(metaPath) || !existsSync(manifestPath)) return { merged: false };
  const meta = parse(readFileSync(metaPath, "utf-8"));
  if (meta.schema === "FeatureMetadata@2") return { merged: false };
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  const merged: FeatureMeta = {
    ...meta,
    schema: "FeatureMetadata@2",
    feature_id: manifest.feature_id ?? meta.id,
    case_drafting: rewritePathsDeep(manifest.case_drafting) as FeatureMeta["case_drafting"],
    automation: rewritePathsDeep(manifest.automation) as FeatureMeta["automation"],
    files: rewritePathsDeep(manifest.files) as FeatureMeta["files"],
  };
  writeFileSync(metaPath, stringify(merged), "utf-8");
  // manifest.json 是 tracked 文件，调用方（migrate）负责 git rm；这里只做 fs 删除
  require("node:fs").rmSync(manifestPath);
  return { merged: true };
}
```

实现时把 `require("node:fs").rmSync` 改为顶部 import `rmSync`（示意而已，biome 会拦 require）。

- [ ] **Step 4: 跑测试确认通过**

Run: `bun test .claude/scripts/_shared/tests/features/feature-meta.test.ts`
Expected: PASS。

- [ ] **Step 5: lint + commit**

```bash
bun run check && git add -A ':!workspace' && git commit -m "feat: 🧩 FeatureMetadata@2 merge and reader"
```

---

### Task 4: CLI 接入版本层与 metadata@2

**Files:**
- Modify: `cli/features-ls.ts`、`cli/features-index.ts`、`cli/features-lint.ts`、`cli/features-show.ts`、`cli/features-resolve.ts`、`cli/features-new.ts`、`cli/features.ts`、`lib/paths.ts`
- Modify: `cli/cases-verify.ts`、`cli/cases-validate.ts`、`cli/cases-lint.ts`（manifest.json → metadata@2、archive.md → cases/archive.md）
- Test: `tests/features-ls.test.ts`、`tests/features-index.test.ts`、`tests/features-lint.test.ts`、`tests/features-show.test.ts`、`tests/features-resolve.test.ts`、`tests/features-new.test.ts`、`tests/cases-verify.test.ts`、`tests/cases-validate.test.ts`、`tests/cases-lint.test.ts`、`tests/paths.test.ts`

本任务全程 TDD：先改每个测试的 fixture（版本层目录 + metadata@2 + cases/ 路径），跑红，再改实现，跑绿。fixture 改法统一为：

- 旧 `mkdirSync(join(ws, "dataAssets", "features", "2026-04-x"))` → `mkdirSync(join(ws, "dataAssets", "features", "v6.4.10", "2026-04-x"))`
- 旧「写 metadata.yaml + manifest.json 两个文件」→ 只写一个 `FeatureMetadata@2` 的 metadata.yaml（含 `case_drafting`/`automation`/`files` 三段）
- 旧 `archive.md`、`cases.xmind` 落 feature 根 → 落 `cases/` 子目录

- [ ] **Step 1: features-ls 接入 layout 扫描与 metadata@2**

核心改动（`features-ls.ts:31-56` 的扫描循环整体替换）：

```ts
import { listFeatureDirs } from "@shared/lib/features/layout.ts";
import { readFeatureMeta } from "@shared/lib/features/feature-meta.ts";

export interface FeatureRow {
  id: string;
  dirName: string; // 新增：实际目录名，INDEX 链接用
  group: string; // 新增：版本目录 / _standing / _archived/vX
  zone: string; // 新增：active|standing|archived|legacy-flat
  displayName: string;
  status: string;
  modules: string[];
  customers: string[];
  versions: string[];
  owners: string[];
  createdAt: string;
  automationStatus: string;
  lastRunStatus: string;
  areas: { cases: boolean; automation: boolean; runs: boolean }; // 新增：产物齐全度
}

export async function runFeaturesLs(ctx: FeaturesLsContext): Promise<FeatureRow[]> {
  const featuresDir = join(ctx.workspaceRoot, ctx.project, "features");
  const rows: FeatureRow[] = [];
  for (const entry of listFeatureDirs(featuresDir)) {
    const meta = readFeatureMeta(entry.dir);
    if (!meta) continue;
    rows.push({
      id: meta.id,
      dirName: entry.dirName,
      group: entry.group,
      zone: entry.zone,
      displayName: meta.display_name,
      status: meta.status,
      modules: meta.modules ?? [],
      customers: meta.customers ?? [],
      versions: meta.versions ?? [],
      owners: meta.owners ?? [],
      createdAt: meta.created_at,
      automationStatus: meta.automation?.status ?? "not-started",
      lastRunStatus: meta.automation?.last_run_status ?? "not-run",
      areas: {
        cases: existsSync(join(entry.dir, "cases")),
        automation: existsSync(join(entry.dir, "automation")),
        runs: existsSync(join(entry.dir, "runs")),
      },
    });
  }
  // 过滤与排序逻辑保持不变
  ...
}
```

- [ ] **Step 2: features-index 按版本分组渲染并修复断链**

`features-index.ts` 的 `runFeaturesIndex` 渲染段替换为：

```ts
const byGroup = groupBy(rows, (r) => r.group);
// 排序：active 版本号降序在前，然后 _standing，最后 _archived/*
const groupOrder = [...byGroup.keys()].sort((a, b) => {
  const rank = (g: string) => (g.startsWith("_archived") ? 2 : g === "_standing" ? 1 : 0);
  return rank(a) - rank(b) || b.localeCompare(a, undefined, { numeric: true });
});
for (const group of groupOrder) {
  const items = byGroup.get(group) ?? [];
  lines.push(`## ${group || "(未分层 legacy)"} (${items.length})`);
  lines.push("| Feature | Display Name | Status | Automation | Last Run | 产物 |");
  lines.push("|---|---|---|---|---|---|");
  for (const r of items) {
    const rel = r.group ? `${r.group}/${r.dirName}/` : `${r.dirName}/`;
    const areas = [r.areas.cases && "cases", r.areas.automation && "auto", r.areas.runs && "runs"]
      .filter(Boolean)
      .join("+") || "-";
    lines.push(
      `| [${r.dirName}](${encodeURI(rel)}) | ${r.displayName} | ${r.status} | ${r.automationStatus} | ${r.lastRunStatus} | ${areas} |`,
    );
  }
  lines.push("");
}
```

保留文件头三行 generated 注释与 By Status/By Module 统计段。输出位置不变：`features/INDEX.md`。

- [ ] **Step 3: features-resolve / features-new 落到版本层**

`features-resolve.ts`：`FeaturesResolveContext` 增加 `version?: string`（语义版本，如 `v6.4.11`）。目录计算改为：

```ts
import { STANDING_DIR, VERSION_DIR_RE } from "@shared/lib/features/layout.ts";

const groupDir = ctx.version ?? STANDING_DIR;
if (ctx.version && !VERSION_DIR_RE.test(ctx.version)) {
  throw new Error(`invalid version dir: ${ctx.version} (expect v6.4.11 style)`);
}
const featuresDir = join(ctx.workspaceRoot, ctx.project, "features", groupDir);
```

CLI（`features.ts` 的 resolve 子命令）加 `--feature-version <v>` option 并透传（避免与 commander 内置 `--version` 冲突）。`features-new.ts` 同理：放置目录取 `ctx.versions[0]`（已是语义版本，且 `assertDeclared` 已校验在 `_meta/versions.yaml` 枚举内）；`versions` 为空 → 落 `_standing/`。`features-new` 不再写 `manifest.json`，metadata 直接产出 `FeatureMetadata@2`（含三段初始值，从现 manifest 模板搬入）；同时 `mkdirSync` 初始化 `cases/`、`automation/`、`runs/` 三个空目录（各放 `.gitkeep`）。

- [ ] **Step 4: lib/paths.ts 的 featureDir/featureFile 增加 group 参数**

```ts
export function featureDir(project: string, group: string, featureId: string): string {
  // group: 版本目录(v6.4.10)或 _standing；featureId 校验逻辑保持
  assertFeatureId(featureId);
  return join(projectDir(project), "features", group, featureId);
}
```

调用方同步更新：`grep -rn "featureDir(\|featureFile(" .claude --include="*.ts" | grep -v node_modules` 逐个改签名（已知调用方：`skills/case-edit/scripts/history-convert/paths.ts`、`tests/paths.test.ts`、`skills/workspace-manage/scripts/create-project.ts`）。history-convert 导入的历史用例归 `_standing`。

- [ ] **Step 5: cases-verify / cases-validate / cases-lint 切到 metadata@2 + cases/ 路径**

三个文件的统一改法：

- `JSON.parse(readFileSync(join(dir, "manifest.json")))` → `readFeatureMeta(dir)`，字段取值路径不变（`case_drafting.*`、`automation.*`、`files.*` 三段在 @2 里同名）。
- `join(featureDir, "archive.md")` → `join(featureDir, "cases", "archive.md")`；`archive.draft.md`、`cases.xmind`、`confirmation-package.md`、`unresolved-summary.md` 同样进 `cases/`。
- `.process/`、`inputs/lanhu-snapshots` 引用不动（仍在 feature 根）。
- 扫描循环统一换 `listFeatureDirs`（cases-lint.ts:39-54 的目录遍历）。

- [ ] **Step 6: 跑本任务全部测试**

```bash
bun test .claude/scripts/_shared/tests/
```

Expected: PASS（包括 Task 1-3 的新测试）。失败逐个修，不得 skip。

- [ ] **Step 7: commit**

```bash
bun run check && git add -A ':!workspace' && git commit -m "refactor: ✨ CLI adopts version layer and metadata v2"
```

---

### Task 5: runs 目录、clean 与 archive 命令

**Files:**
- Modify: `cli/results-path.ts`、`cli/results-prune.ts`、`cli/results-publish.ts`、`cli/results.ts`、`cli/handoff.ts`（grep `"results"` 确认）
- Create: `cli/features-archive.ts`
- Modify: `cli/features.ts`（注册 `clean`/`archive` 子命令）
- Test: `tests/results-path.test.ts`、`tests/results-prune.test.ts`、`tests/results-publish.test.ts`、`tests/handoff-render.test.ts`、`tests/features-archive.test.ts`（新建）

- [ ] **Step 1: results-* 目录从 `results/` 切到 `runs/`**

`grep -rn '"results"' .claude/scripts/_shared/cli/*.ts` 逐处替换为 `AREA_RUNS`（从 layout.ts import）。`results-path.ts` 的 featureRoot 计算改为接受 feature 目录绝对路径或经 `listFeatureDirs` 按 dirName 查找（featureId 现在可能在任意版本层下）：

```ts
const entry = listFeatureDirs(join(ctx.workspaceRoot, ctx.project, "features")).find(
  (e) => e.dirName === ctx.featureId,
);
if (!entry) throw new Error(`feature not found: ${ctx.featureId}`);
const runsRoot = runsDir(entry.dir);
```

CLI 命令组名保持 `kata results ...` 不变（减少 skill 文档与肌肉记忆的破坏面），仅目录与提示文案换 runs。

- [ ] **Step 2: results-prune 重写为保留策略并注册 `kata features clean`**

`results-prune.ts` 的 `pruneForFeature` 替换为：

```ts
import { runIdType } from "@shared/lib/features/run-id.ts";
import { listFeatureDirs, runsDir, RUNS_TMP } from "@shared/lib/features/layout.ts";

function planPruneForFeature(
  featureDirAbs: string,
  keep: number,
): { remove: string[]; keep: string[] } {
  const dir = runsDir(featureDirAbs);
  if (!existsSync(dir)) return { remove: [], keep: [] };
  const all = readdirSync(dir).filter(
    (n) => n !== RUNS_TMP && statSync(join(dir, n)).isDirectory(),
  );
  all.sort(); // run-id 字典序即时间序
  const published = new Set(all.filter((n) => existsSync(join(dir, n, ".published"))));
  const baselines = new Set(all.filter((n) => runIdType(n) === "baseline"));
  const latest = new Set(all.slice(-keep));
  const keepSet = new Set([...published, ...baselines, ...latest]);
  return {
    keep: all.filter((n) => keepSet.has(n)),
    remove: all.filter((n) => !keepSet.has(n)),
  };
}
```

外层 `runResultsPrune`：增加 `apply: boolean`（默认 false=dry-run 只打印清单）；`apply` 时 `rmSync` 删除 remove 清单 + 清空每个 feature 的 `runs/_tmp/*`；遍历目标用 `listFeatureDirs`（active+standing，archived 不清）。在 `features.ts` 注册：

```ts
features
  .command("clean")
  .description("按保留策略清理 runs/（最近N次+baseline+published；含 _tmp）")
  .option("--project <name>", "项目名", "dataAssets")
  .option("--feature <dirName>", "只清理单个 feature")
  .option("--keep <n>", "保留最近 N 次", "3")
  .option("--apply", "真正删除（缺省 dry-run）", false)
```

- [ ] **Step 3: features-archive 命令（TDD）**

测试（`tests/features-archive.test.ts`）：构造 `features/v6.4.10/<两个feature>` 临时目录（含 runs/ 内文件模拟 untracked），断言 archive 后整目录出现在 `features/_archived/v6.4.10/`、原目录消失、INDEX 重新生成。实现：

```ts
// cli/features-archive.ts
import { existsSync, renameSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ARCHIVED_DIR, VERSION_DIR_RE } from "@shared/lib/features/layout.ts";
import { runFeaturesIndex } from "./features-index.ts";

export interface FeaturesArchiveContext {
  project: string;
  workspaceRoot: string;
  version: string; // v6.4.10
  /** 测试里注入 renameSync；真实执行注入 git mv 包装 */
  move?: (from: string, to: string) => void;
}

export async function runFeaturesArchive(ctx: FeaturesArchiveContext): Promise<{ from: string; to: string }> {
  if (!VERSION_DIR_RE.test(ctx.version)) throw new Error(`invalid version: ${ctx.version}`);
  const featuresDir = join(ctx.workspaceRoot, ctx.project, "features");
  const from = join(featuresDir, ctx.version);
  const to = join(featuresDir, ARCHIVED_DIR, ctx.version);
  if (!existsSync(from)) throw new Error(`version dir not found: ${from}`);
  if (existsSync(to)) throw new Error(`already archived: ${to}`);
  mkdirSync(join(featuresDir, ARCHIVED_DIR), { recursive: true });
  (ctx.move ?? renameSync)(from, to);
  await runFeaturesIndex({ project: ctx.project, workspaceRoot: ctx.workspaceRoot });
  return { from, to };
}
```

`features.ts` 注册 `archive <version>` 子命令，action 里 `move` 注入 `execSync(\`git mv "${from}" "${to}"\`)`，git mv 失败（如非 git 环境）回退 `renameSync` 并打印 WARN。

- [ ] **Step 4: 跑测试 + commit**

```bash
bun test .claude/scripts/_shared/tests/ && bun run check
git add -A ':!workspace' && git commit -m "feat: 🧩 runs dir with clean and archive commands"
```

---

### Task 6: lint 规则更新 + 新增 L12 布局检查

**Files:**
- Modify: `lint/v2-quality-gates.ts`、`lint/no-feature-local-helpers.ts`、`lint/no-debug-in-cases.ts`、`lint/case-traceability-header.ts`、`lint/source-ref-registry.ts`、`lint/archive-case-qa.ts`、`lint/case-md-sourceref-leak.ts`、`lint/path-treatment.ts`、`lint/hardcode-path.ts`、`lint/tests-layout.ts`、`lint/types.ts`
- Create: `lint/feature-root-layout.ts`
- Modify: `cli/cases-lint.ts`（注册 L12）
- Test: `tests/lint/**` 对应文件 + 新建 `tests/lint/feature-root-layout.test.ts`

- [ ] **Step 1: glob 模式统一升级**

所有 `*/features/*/tests/...` 形态的 glob（v2-quality-gates L51/L68/L89/L222、no-feature-local-helpers L7、no-debug-in-cases L13、case-traceability-header L27、source-ref-registry L37、tests-layout）统一改为：

```
*/features/**/automation/tests/...
```

`**` 同时覆盖 `v6.4.10/<feature>`、`_standing/<feature>`、`_archived/v6.4.6/<feature>` 三种深度。先改各 lint 的测试 fixture（目录加版本层 + automation 前缀），跑红，再改 glob，跑绿。

- [ ] **Step 2: 文件级路径与白名单**

- `archive-case-qa.ts` L30/L115/L126/L135：`join(featureDir, "archive.md")` → `join(featureDir, "cases", "archive.md")`。
- `case-md-sourceref-leak.ts` L7 文件清单不变（按文件名匹配）；L145 `manifest.json` → 改用 `readFeatureMeta`。
- `hardcode-path.ts` L34/L44 白名单：`/results/` → `/runs/`，`.temp` 保留。
- `path-treatment.ts` L23 提示文案：`workspace/{p}/features/{ym-slug}/...` → `workspace/{p}/features/{version}/{feature}/...`。

- [ ] **Step 3: 新增 L12 feature-root-layout（TDD）**

测试先行（fixture：一个规范 feature + 一个根级混入 `AUTOMATION-PLAN.md`、`results/` 的 feature + 一个 legacy 平铺 feature）。实现：

```ts
// lint/feature-root-layout.ts
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  ALLOWED_FEATURE_ROOT_ENTRIES,
  listFeatureDirs,
} from "@shared/lib/features/layout.ts";
import type { LintViolation } from "./types.ts";

/** L12：feature 根只允许三区与白名单条目；legacy 平铺目录整体报错 */
export function lintFeatureRootLayout(featuresRoot: string): LintViolation[] {
  const violations: LintViolation[] = [];
  for (const entry of listFeatureDirs(featuresRoot)) {
    if (entry.zone === "legacy-flat") {
      violations.push({
        rule: "L12",
        file: entry.dir,
        message: "feature 目录未进版本层（v*/、_standing/、_archived/），先跑 kata features migrate",
      });
      continue;
    }
    for (const name of readdirSync(entry.dir)) {
      if (name.startsWith(".")) continue;
      if (ALLOWED_FEATURE_ROOT_ENTRIES.has(name)) continue;
      violations.push({
        rule: "L12",
        file: join(entry.dir, name),
        message: `feature 根级散落条目 "${name}"：用例进 cases/，自动化进 automation/，运行结果进 runs/`,
      });
    }
  }
  return violations;
}
```

`lint/types.ts` 的 `LintRuleId` 联合类型加 `"L12"`；`cases-lint.ts` 按 L1-L11 现有注册方式接入并在 INDEX.md 同级跳过逻辑处复用。

- [ ] **Step 4: 跑全量 lint 测试 + commit**

```bash
bun test .claude/scripts/_shared/tests/lint/ && bun test .claude/scripts/_shared/tests/ && bun run check
git add -A ':!workspace' && git commit -m "refactor: ✨ lint rules adopt three-area layout with L12"
```

---

### Task 7: `kata features migrate` 迁移命令

**Files:**
- Create: `cli/features-migrate.ts`
- Modify: `cli/features.ts`（注册子命令）
- Test: `tests/features-migrate.test.ts`

- [ ] **Step 1: 写失败测试**

fixture 构造一个 legacy 平铺 feature（中文目录名带 `【v6411】`，含 archive.md、cases.xmind、AUTOMATION-PLAN.md、tests/cases/t1.ts、scripts/x.mjs、results/run-1/r.txt、tmp/t.md、metadata.yaml@1、manifest.json、inputs/、.process/）+ 一个 `2099-01-lt-dq-smoke` + 一个无版本可推断的目录。断言：

1. dry-run 返回 plan：前两个有目标 group（`v6.4.11`、`_standing`），第三个标 `unresolved`，磁盘无任何改动。
2. apply 后：`features/v6.4.11/【v6411】.../cases/archive.md`、`automation/tests/cases/t1.ts`、`automation/scripts/x.mjs`、`automation/AUTOMATION-PLAN.md`、`runs/run-1/r.txt`、`runs/_tmp/t.md` 存在；根级 `archive.md`/`tests`/`results`/`tmp`/`manifest.json` 消失；metadata.yaml 升级为 @2；`inputs/`、`.process/` 留在 feature 根。
3. 存在 unresolved 时 apply 抛错（必须先人工归位或传 `--allow-unresolved` 跳过该目录）。
4. 幂等：对已迁移工作区再跑 dry-run，plan 为空。

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test .claude/scripts/_shared/tests/features-migrate.test.ts`
Expected: FAIL。

- [ ] **Step 3: 实现 features-migrate.ts**

```ts
// cli/features-migrate.ts
import { existsSync, mkdirSync, readdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import {
  AREA_AUTOMATION,
  AREA_CASES,
  AREA_RUNS,
  compactToVersionDir,
  listFeatureDirs,
  RUNS_TMP,
  STANDING_DIR,
} from "@shared/lib/features/layout.ts";
import { mergeManifestIntoMetadata, readFeatureMeta } from "@shared/lib/features/feature-meta.ts";
import { runFeaturesIndex } from "./features-index.ts";

// feature 根条目 → 三区目标（相对 feature 根）；不在表内且非保留条目 → warn
const ZONE_MAP: [RegExp, (name: string) => string][] = [
  [/^(archive(\.draft)?\.md|cases\.xmind|test-point-checklist\.md|confirmation-package\.md|unresolved-summary\.md|.*\.csv)$/, (n) => join(AREA_CASES, n)],
  [/^(AUTOMATION-PLAN\.md|tests|scripts)$/, (n) => join(AREA_AUTOMATION, n)],
  [/^results$/, () => AREA_RUNS],
  [/^tmp$/, () => join(AREA_RUNS, RUNS_TMP)],
];
const KEEP_AT_ROOT = new Set(["metadata.yaml", "manifest.json", "prd.md", "README.md", "inputs", "cases", "automation", "runs"]);

export interface MigratePlanRow {
  dirName: string;
  from: string;
  targetGroup: string | null; // null = unresolved
  moves: { from: string; to: string }[];
  warns: string[];
}

export interface FeaturesMigrateContext {
  project: string;
  workspaceRoot: string;
  apply: boolean;
  allowUnresolved?: boolean;
  /** tracked 文件移动注入 git mv；测试与 ignored 路径用 renameSync */
  move?: (from: string, to: string) => void;
}

function resolveGroup(dirName: string, featureDir: string): string | null {
  const m = /【(v\d{2,4})】/.exec(dirName);
  if (m) {
    const v = compactToVersionDir(m[1]);
    if (v) return v;
  }
  if (/^2099-/.test(dirName)) return STANDING_DIR;
  const meta = readFeatureMeta(featureDir);
  const fromMeta = meta?.versions?.at(-1); // 多版本取最新
  if (fromMeta && /^v\d+(\.\d+){1,2}$/.test(fromMeta)) return fromMeta;
  return null;
}

export function planMigrate(ctx: FeaturesMigrateContext): MigratePlanRow[] {
  const featuresDir = join(ctx.workspaceRoot, ctx.project, "features");
  const rows: MigratePlanRow[] = [];
  for (const entry of listFeatureDirs(featuresDir)) {
    if (entry.zone !== "legacy-flat") continue;
    const row: MigratePlanRow = {
      dirName: entry.dirName,
      from: entry.dir,
      targetGroup: resolveGroup(entry.dirName, entry.dir),
      moves: [],
      warns: [],
    };
    for (const name of readdirSync(entry.dir)) {
      if (name.startsWith(".")) continue; // .process/.debug 留在根
      const hit = ZONE_MAP.find(([re]) => re.test(name));
      if (hit) {
        row.moves.push({ from: name, to: hit[1](name) });
      } else if (!KEEP_AT_ROOT.has(name)) {
        row.warns.push(`未知根级条目 "${name}"，保持原位，请人工归类`);
      }
    }
    rows.push(row);
  }
  return rows;
}

export async function runFeaturesMigrate(ctx: FeaturesMigrateContext): Promise<MigratePlanRow[]> {
  const rows = planMigrate(ctx);
  if (!ctx.apply) return rows;
  const unresolved = rows.filter((r) => r.targetGroup === null);
  if (unresolved.length > 0 && !ctx.allowUnresolved) {
    throw new Error(`无法推断版本的目录（请补 metadata.versions 或人工归位）：\n${unresolved.map((r) => r.dirName).join("\n")}`);
  }
  const move = ctx.move ?? renameSync;
  const featuresDir = join(ctx.workspaceRoot, ctx.project, "features");
  for (const row of rows) {
    if (row.targetGroup === null) continue;
    // 1. feature 内三区归位（先建目标父目录再移动）
    for (const mv of row.moves) {
      const to = join(row.from, mv.to);
      mkdirSync(join(to, ".."), { recursive: true });
      move(join(row.from, mv.from), to);
    }
    // 2. manifest 合并进 metadata@2（含路径重写）
    mergeManifestIntoMetadata(row.from);
    // 3. 整目录移入版本层
    const groupDir = join(featuresDir, row.targetGroup);
    mkdirSync(groupDir, { recursive: true });
    move(row.from, join(groupDir, row.dirName));
  }
  await runFeaturesIndex({ project: ctx.project, workspaceRoot: ctx.workspaceRoot });
  return rows;
}
```

CLI 注册（features.ts）：`migrate` 子命令，options `--project`（必填或 `--all`）、`--apply`、`--allow-unresolved`。dry-run 输出对齐的「旧 → 新」映射表与 warns 清单。action 注入的 `move`：先试 `execSync(\`git mv -k "${from}" "${to}"\`)`；对 untracked/ignored 路径 git mv 会失败，捕获后回退 `renameSync`。注意 `mkdirSync(join(to, ".."))` 应写成 `mkdirSync(dirname(to))`（import `dirname`），实现时修正。

- [ ] **Step 4: 跑测试确认通过 + commit**

```bash
bun test .claude/scripts/_shared/tests/features-migrate.test.ts && bun test .claude/scripts/_shared/tests/ && bun run check
git add -A ':!workspace' && git commit -m "feat: 🧩 kata features migrate command"
```

---

### Task 8: .gitignore 与 skill / 规则文档契约更新

**Files:**
- Modify: `.gitignore`（根）
- Modify: `.claude/skills/case-draft/`：`SKILL.md`、`rules/naming-convention.md`、`prompts/agent-worker.md`、`prompts/agent-spec-reviewer.md`
- Modify: `.claude/skills/case-edit/`：`SKILL.md`、`references/apply-corrections.md`、`references/archive-xmind-sync.md`、`scripts/history-convert/paths.ts`（Task 4 已改签名，这里校文档）
- Modify: `.claude/skills/case-hotfix/`：`SKILL.md`、`references/hotfix-archive-format.md`
- Modify: `.claude/skills/playwright-automation/`：`SKILL.md`、`phases/§1,§2,§3,§4,§6,§7,§8,§9,§11,§12`、`references/cli-essentials.md`、`references/execution-protocol.md`、`prompts/agent-worker.md`、`prompts/agent-spec-reviewer.md`、`scripts/run-tests-notify.ts`（注释）、`scripts/build-case-tasks.ts`
- Modify: `CLAUDE.md`、`.claude/rules/project-workflow-rules.md`、`.claude/rules/git-workflow.md`

- [ ] **Step 1: 更新根 .gitignore**

L16-18 三行：

```diff
-workspace/*/features/*/.process/
-workspace/*/features/*/results/
-workspace/*/features/*/.debug/
+workspace/*/features/**/.process/
+workspace/*/features/**/runs/
+workspace/*/features/**/.debug/
```

`**` 覆盖版本层与 `_archived/v*` 的额外深度。L31 `**/tmp/` 保留（迁移后无业务 tmp/，但不影响）。改完跑 `git status` 确认 ignored 行为符合预期（`git check-ignore -v workspace/dataAssets/features/v6.4.11/x/runs/a` 应命中新规则）。

- [ ] **Step 2: 全局路径映射表（所有文档按此替换）**

| 旧文案/路径 | 新文案/路径 |
| --- | --- |
| `features/<featureId>/archive.md`（或根级 `archive.md`） | `features/<version>/<featureId>/cases/archive.md` |
| `archive.draft.md`、`cases.xmind`、`test-point-checklist.md`、`confirmation-package.md`、`unresolved-summary.md`（feature 根） | 同名文件移到 `cases/` 前缀 |
| `tests/cases/`、`tests/runners/`、`tests/helpers/`、`tests/data/`、`tests/precond/` | `automation/tests/...`（内层结构不变） |
| `scripts/`（feature 级） | `automation/scripts/` |
| `AUTOMATION-PLAN.md` | `automation/AUTOMATION-PLAN.md` |
| `results/<run-id>/...` | `runs/<run-id>/...` |
| run-id 格式说明（hex 后缀） | `YYYYMMDD-HHmm-<type>-<seq>`，type ∈ preflight/run/selfrun/repair/baseline |
| `manifest.json#automation.intents` 等 manifest 字段引用 | `metadata.yaml#automation.intents`（FeatureMetadata@2） |
| `workspace/{p}/features/{ym-slug}/` 目录示例 | `workspace/{p}/features/{version}/{feature}/` |
| `tmp/` 临时产物 | `runs/_tmp/` |

执行方式：对上面列出的每个文件 `grep -n` 旧模式逐处人工替换（不要盲目 sed，文档里有反例、对比示例等语境），替换完每个 skill 跑一次 `bun run check:skills`。

- [ ] **Step 3: naming-convention.md 增补版本层说明**

在「字段规则」前加一节：

```markdown
## 目录层级

feature 目录位于版本层之下：`workspace/{project}/features/{version}/{feature}/`，
`{version}` 为语义版本目录（如 `v6.4.10`，与 `_shared/_meta/versions.yaml` 枚举一致）。
长期主流程/冒烟用例放 `features/_standing/`；已交付版本由 `kata features archive` 整体移入 `features/_archived/{version}/`。
feature 内只允许 `cases/`（用例产物）、`automation/`（自动化）、`runs/`（运行结果）三区与 `metadata.yaml`、`prd.md`、`inputs/`。
```

- [ ] **Step 3.5: 其余 skill 的输出位置显式声明**

spec §4.2 要求：`defect-analyze`、`sql-merge-validate` 等输出落 `_shared/archive/` 既有分类的 skill，路径不变，但要在各自 SKILL.md（或 references 产物规范文档）里补一句明确声明输出目录，例如「报告写入 `workspace/{project}/_shared/archive/reports/`，不写入 feature 目录」。改动文件：`.claude/skills/defect-analyze/SKILL.md`、`.claude/skills/sql-merge-validate/SKILL.md`、`.claude/skills/infra-diagnose/SKILL.md`（先 grep 确认各自现有产物说明的位置，在原段落补充，注意 SKILL.md 行数上限 500）。

- [ ] **Step 4: CLAUDE.md 与 rules 同步**

- `CLAUDE.md` 路由规则行「只发需求功能**目录**路径或目录名（如 `features/【v...】...`）」→ 文字不变仍成立（目录名规则未变），但「命名约定」一节的格式行后补一句：`目录位于 features/{version}/ 版本层之下，详细规则见 naming-convention.md`。
- `.claude/rules/project-workflow-rules.md`「命名约定」与「QA 产物自检」两节同步版本层与三区表述。
- `.claude/rules/git-workflow.md` 中「feature `results/`」字样 → 「feature `runs/`」。
- **改前必做**：`grep -n "features\|results\|worktree" .claude/scripts/_shared/lib/skills/runtime-detach.ts` 与 `bun run check:skills`，确认要改的句子不在 runtime-detach 子串校验清单内；在清单内的句子保持原文或同步改校验（先列清单再动手）。

- [ ] **Step 5: 验证 + commit**

```bash
bun run check:skills && bun test .claude/scripts/_shared/tests/skills/ && bun run check
git add -A ':!workspace' && git commit -m "docs: 📝 skill contracts adopt three-area layout"
```

Expected: check:skills 退出码 0；skills 相关测试全绿。

---

### Task 9: 执行迁移（dataAssets + xyzh）

**Files:** 仅 `workspace/**` 数据移动与根目录两个散落文件，无代码改动。

**前置**：本任务在 worktree 内执行会有坑——workspace 下的 ignored 目录（results/、_shared/ 等）只存在于主工作树。因此本任务放在 Task 1-8 合并回 main 之后，在**主工作树**执行（见 Task 10 的顺序说明）。

- [ ] **Step 1: dry-run 并人工审表**

```bash
bun .claude/scripts/_shared/bin/kata features migrate --project dataAssets
bun .claude/scripts/_shared/bin/kata features migrate --project xyzh
```

输出全量「旧 → 新」映射与 warns。重点核对：①每个目录的 targetGroup 是否合理（`【v646】→v6.4.6`、`2099-*→_standing`）；②unresolved 清单逐个处理（补 metadata.versions 或手工挪）；③warns 里的未知根级条目（如 lindorm 目录的 `manifest.json` 之外残留）给出归类决定。

- [ ] **Step 2: apply 迁移**

```bash
bun .claude/scripts/_shared/bin/kata features migrate --project dataAssets --apply
bun .claude/scripts/_shared/bin/kata features migrate --project xyzh --apply
```

- [ ] **Step 3: 归档仓库根散落文件**

```bash
mkdir -p workspace/dataAssets/_shared/archive/history
git rm --cached "数据资产_STD-用例.csv" "质量规则合并细节技术方案.md"
mv "数据资产_STD-用例.csv" "质量规则合并细节技术方案.md" workspace/dataAssets/_shared/archive/history/
```

注意 `_shared/` 是 gitignored：这两个文件移入后脱离 git 追踪，属预期（_shared/archive 本来就是仓库外归档区）；commit body 里写明去向。

- [ ] **Step 4: 校验迁移结果**

```bash
bun .claude/scripts/_shared/bin/kata features lint --all --exit-code   # L12 应零违规
bun .claude/scripts/_shared/bin/kata features ls --project dataAssets | head -20
# cases 级 lint 的确切子命令名先查注册处再跑：
grep -n "command(" .claude/scripts/_shared/cli/cases-lint.ts .claude/scripts/_shared/cli/index.ts
git status --short | head -40   # 确认改动全部是预期内的 rename/删除
```

Expected: features lint 退出码 0；INDEX.md 重新生成且链接可点开（抽查 3 个）；`git status` 无意外条目（`.kata`、`node_modules` 不在列）。

- [ ] **Step 5: 提交迁移**

```bash
git add -A && git commit -m "refactor: ✨ migrate workspaces to versioned three-area layout"
```

commit body（中文）写明：迁移的 feature 数、unresolved 的人工处理记录、两个根文件的归档去向。

---

### Task 10: 合并与最终验证

执行顺序约定：Task 1-8 在 worktree 内完成并逐任务 commit → 合并回 main → Task 9 在主工作树执行 → 最终验证 → push。

- [ ] **Step 1: worktree 工作合并回 main**

```bash
cd "$W" && bun test && bun run check && bun run check:skills   # 合并前最终确认
SHA=$(git -C "$W" rev-parse HEAD)
cd /Users/poco/Projects/kata && git merge --no-ff "$SHA"
```

- [ ] **Step 2: 主工作树执行 Task 9（迁移）**

见 Task 9 各 step。

- [ ] **Step 3: 全量回归**

```bash
bun test && bun run check && bun run check:skills && bun run type-check
```

Expected: 全绿。汇报时写清确切命令、退出码、pass/fail/skip 数。

- [ ] **Step 4: push 与清理**

```bash
git push origin main
git worktree remove .worktrees/workspace-restructure
```

- [ ] **Step 5: 交付汇报（验证口径诚实）**

已验证范围：单测/lint/check:skills/type-check 全量、dataAssets+xyzh 迁移后 features lint 零违规、INDEX 链接抽查。
未验证范围（如实写）：①各 skill 在新路径下的端到端真实跑（case-draft 产出到 cases/、playwright-automation 写 runs/）需要下一次真实任务验证；②`kata features clean --apply` 未对真实数据执行（只跑过 dry-run 与单测）；③`_shared/archive` 内历史产物未重新整理（不在本次范围）。

---

## 风险与回退

- **迁移是数据移动**：apply 前必须有干净的 git 快照（Task 0 Step 1 + Task 10 Step 1 合并完成）；ignored 的 runs/ 数据不受 git 保护，apply 前对 `workspace/*/features/*/results/` 做一次 `tar` 备份到 `/tmp/kata-results-backup-$(date +%Y%m%d).tar.gz`，确认迁移无误后删除。
- **回退路径**：tracked 部分 `git revert` 合并提交；ignored 部分从 tar 备份恢复。
- **xyzh 工作区**：计划默认其结构与 dataAssets 同构；执行 Task 9 前先 `ls workspace/xyzh/features/ | head` 实地确认，若有结构差异先停下报告。
- **`KATA_WORKSPACE_ROOT` 环境变量**（lib/paths.ts）可重定向 workspace 根，测试与执行时不要设置它，避免迁移打到别的目录。
