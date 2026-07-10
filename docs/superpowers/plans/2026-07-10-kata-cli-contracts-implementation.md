# kata CLI 与契约实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 v1 contracts 与唯一 `kata` CLI，使 39 个叶子命令共享同一注册表、帮助、输出、退出码、metadata、用例文件名和运行目录契约。

**Architecture:** JSON Schema 是类型与校验的唯一来源；`packages/cli` 只依赖 `packages/contracts` 与注入的 services，不反向读取 `skills/`。命令注册表同时驱动 parser、三层帮助、JSON help 和示例测试；领域服务负责 feature、cases、automation、runs，DTStack SDK 只返回值，不直接输出或退出。

**Tech Stack:** Bun 1.3.8、TypeScript 6、Commander 14、AJV 8、json-schema-to-typescript 15.0.4、JSZip、xmind-generator、YAML。

## Global Constraints

- 设计来源：`docs/superpowers/specs/2026-07-10-kata-cli-design.md`。
- 只保留 `kata` 一个 root `bin`；不得注册隐藏旧命令。
- 正式命令树固定为 11 组、39 个叶子；新增或删除命令必须先改设计。
- `--format` 只允许 `text|json`；用例导出目标使用 `--to markdown|xmind|csv`。
- `stdout` 只写最终结果；过程、警告和详细错误写 `stderr`。
- action、SDK 与 service 不得调用 `process.exit()`；只有 bin 设置 `process.exitCode`。
- 所有新行为先写失败测试并确认失败原因，再实现最小代码。
- metadata 缺失或无效返回 `invalid`；不得扫描固定文件名回退。
- contracts → CLI → Skill scripts，依赖不得反向。
- 一次性旧格式迁移由清理计划执行；本计划不保留多版本运行时读取器。
- 每个 Task 只能暂存其 Files 清单中的路径。只有 Task 独占新建目录时才允许目录级 pathspec；move/delete 使用带明确 source 与 destination 的 `git add -A -- <paths>`。提交前运行 `git diff --cached --name-only`，出现清单外路径就停止并取消该路径的暂存。

---

### Task 1: 建立 packages 边界并迁移 DTStack SDK

**Files:**
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/src/index.ts`
- Create: `packages/cli/package.json`
- 先整体移动：`.claude/packages/dtstack/` → `packages/dtstack/`
- 整体移动后再重命名：`packages/dtstack/__tests__/` → `packages/dtstack/tests/`
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `tsconfig.base.json`
- Modify: `tsconfig.json`
- Test: `packages/cli/tests/layout/package-boundaries.test.ts`

**Interfaces:**
- Consumes: 根 Bun workspace 与当前 `dtstack-sdk` 源码。
- Produces: `@kata/contracts`、`@kata/cli`、`@kata/dtstack` package boundaries；root bin 在 Task 4 的 kernel 可用后切换。

- [ ] **Step 1: 写失败的包边界测试**

```ts
import { describe, expect, test } from "bun:test";

describe("package boundaries", () => {
  test("uses only the three target workspaces", async () => {
    const root = await Bun.file("package.json").json();
    expect(root.workspaces).toEqual([
      "packages/contracts",
      "packages/cli",
      "packages/dtstack",
    ]);
  });

  test("dtstack is an SDK without a bin", async () => {
    const pkg = await Bun.file("packages/dtstack/package.json").json();
    expect(pkg.name).toBe("@kata/dtstack");
    expect(pkg.bin).toBeUndefined();
  });
});
```

- [ ] **Step 2: 运行测试确认 RED**

Run:

```bash
bun test packages/cli/tests/layout/package-boundaries.test.ts
```

Expected: 失败，因为 `packages/cli`、`packages/contracts` 尚不存在，root bin 仍指向 `.claude`。

- [ ] **Step 3: 建立最小 package manifests 与 bin**

`packages/contracts/package.json`:

```json
{
  "name": "@kata/contracts",
  "version": "4.0.0-alpha.1",
  "type": "module",
  "private": true,
  "exports": { ".": "./src/index.ts" }
}
```

`packages/cli/package.json`:

```json
{
  "name": "@kata/cli",
  "version": "4.0.0-alpha.1",
  "type": "module",
  "private": true,
  "dependencies": {
    "@kata/contracts": "workspace:*",
    "@kata/dtstack": "workspace:*"
  }
}
```

更新 root workspace 和 TypeScript include/path aliases；`@contracts/*` 指向 `packages/contracts/src/*`，`@cli/*` 指向 `packages/cli/src/*`，`@skills/*` 暂时保留旧路径直到 Skill 迁移 Task。root `bin.kata` 暂时保持旧入口，避免在 `app.ts` 尚不存在时制造不可运行的 executable。

- [ ] **Step 4: 运行 GREEN 与旧 DTStack 测试**

```bash
bun install
bun test packages/cli/tests/layout/package-boundaries.test.ts packages/dtstack/tests --timeout 30000
bun run type-check
```

Expected: 0 fail；`packages/dtstack` 测试保持通过；旧 `kata` 入口仍可运行到 Task 4。

- [ ] **Step 5: 提交**

```bash
git add -A -- .claude/packages/dtstack packages/dtstack package.json bun.lock tsconfig.base.json tsconfig.json packages/contracts/package.json packages/contracts/src/index.ts packages/cli/package.json packages/cli/tests/layout/package-boundaries.test.ts
git commit -m "refactor: ✨ establish kata package boundaries"
```

---

### Task 2: 建立 v1 JSON Schema、生成类型和 validator

**Files:**
- Create: `packages/contracts/schemas/v1/CliResult.v1.schema.json`
- Create: `packages/contracts/schemas/v1/FeatureMetadata.v1.schema.json`
- Create: `packages/contracts/schemas/v1/CaseDraft.v1.schema.json`
- Create: `packages/contracts/schemas/v1/AutomationIntent.v1.schema.json`
- Create: `packages/contracts/schemas/v1/CaseTaskList.v1.schema.json`
- Create: `packages/contracts/schemas/v1/Run.v1.schema.json`
- Create: `packages/contracts/schemas/v1/RunResult.v1.schema.json`
- Create: `packages/contracts/schemas/v1/Handoff.v1.schema.json`
- Create: `packages/contracts/scripts/generate-types.ts`
- Create: `packages/contracts/src/generated/v1.ts`
- Create: `packages/contracts/src/validators.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/contracts/package.json`
- Create: `packages/contracts/tests/fixtures/v1/*.json`
- Test: `packages/contracts/tests/schema-validation.test.ts`
- Test: `packages/contracts/tests/generated-types.test.ts`
- Modify: `package.json`
- Modify: `bun.lock`

**Interfaces:**
- Consumes: CLI 设计中已经固定的 JSON Schema 2020-12 字段。
- Produces: `ContractName`、`ContractTypeMap`、`validateContract()`、`parseContract()` 与生成的 v1 类型。

- [ ] **Step 1: 写失败的 schema 测试**

```ts
import { describe, expect, test } from "bun:test";
import { parseContract, validateContract } from "../src/validators.ts";

describe("v1 contracts", () => {
  test("accepts one valid fixture for every contract", async () => {
    const names = [
      "CliResult", "FeatureMetadata", "CaseDraft", "AutomationIntent",
      "CaseTaskList", "Run", "RunResult", "Handoff",
    ] as const;
    for (const name of names) {
      const value = await Bun.file(`packages/contracts/tests/fixtures/v1/${name}.json`).json();
      expect(validateContract(name, value)).toEqual({ ok: true, value });
    }
  });

  test("rejects missing, extra and invalid enum fields", () => {
    expect(validateContract("Run", { schema_version: 1 })).toMatchObject({ ok: false });
    expect(() => parseContract("RunResult", { schema_version: 1, extra: true })).toThrow();
  });
});
```

- [ ] **Step 2: 运行测试确认 RED**

```bash
bun test packages/contracts/tests/schema-validation.test.ts
```

Expected: 失败，并显示 `Cannot find module '../src/validators.ts'`。

- [ ] **Step 3: 写 schema 与生成器**

每个 schema 使用 `additionalProperties: false`、`schema_version: { "const": 1 }`，并逐字实现设计文档“公共数据结构”表中的核心字段和枚举。`CliResult` 的公共结构固定为：

`packages/contracts/package.json` 同时固定 `files: ["src", "schemas"]`。CLI 打包器只从指定 Git ref 读取这份 allowlist，并把其中的 runtime schema 资产装入 tgz；后续新增 `CodexSkillResponse`、`ReleaseManifest` 或 Cleanup schema 时无需再写第二份文件清单。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kata.local/schemas/v1/CliResult.v1.schema.json",
  "type": "object",
  "required": ["schema_version", "command", "status", "data", "artifacts", "warnings", "errors", "required_input"],
  "additionalProperties": false,
  "properties": {
    "schema_version": { "const": 1 },
    "command": { "type": "string", "minLength": 1 },
    "status": { "enum": ["passed", "failed", "invalid", "unavailable", "needs_input"] },
    "data": {},
    "artifacts": { "type": "array", "items": { "$ref": "#/$defs/artifact" } },
    "warnings": { "type": "array", "items": { "$ref": "#/$defs/message" } },
    "errors": { "type": "array", "items": { "$ref": "#/$defs/message" } },
    "required_input": { "type": "array", "items": { "$ref": "#/$defs/requiredInput" } }
  },
  "$defs": {
    "artifact": {
      "type": "object",
      "required": ["kind", "path"],
      "additionalProperties": false,
      "properties": {
        "kind": { "type": "string" }, "path": { "type": "string" },
        "sha256": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
        "case_id": { "type": "string" }
      }
    },
    "message": {
      "type": "object",
      "required": ["code", "message"],
      "additionalProperties": false,
      "properties": { "code": { "type": "string" }, "message": { "type": "string" }, "details": {} }
    },
    "requiredInput": {
      "type": "object",
      "required": ["field", "prompt"],
      "additionalProperties": false,
      "properties": {
        "field": { "type": "string" }, "prompt": { "type": "string" },
        "choices": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}
```

其余七份 schema 必须逐项实现下列字段；表中 `?` 表示可选，其余全部 required。每个嵌套 object 同样使用 `additionalProperties: false`：

```ts
type RelativePath = string; // 语义校验：相对路径、NFC、不含 NUL 和 ".." 路径段
type IsoDateTime = string; // 格式：date-time
type Sha256 = string; // ^[a-f0-9]{64}$

interface FeatureMetadata {
  schema_version: 1;
  feature_id: string;
  project: string;
  version: string;
  requirement: {
    id?: string;
    name: string;
    filename_stem: string; // ^[\p{Script=Han}A-Za-z0-9]+$, <= 180 UTF-8 bytes
  };
  artifacts: {
    case_markdown: RelativePath; // cases/<filename_stem>.md
    case_xmind: RelativePath; // cases/<filename_stem>.xmind
  };
  paths: {
    feature_dir: RelativePath;
    automation_dir: RelativePath;
  };
}

interface CaseDraft {
  schema_version: 1;
  feature_id: string;
  requirement_name: string;
  source_refs: Array<{
    kind: "url" | "file" | "image" | "fixture" | "description";
    ref: string;
    title?: string;
    sha256?: Sha256;
  }>;
  cases: Array<{
    case_id: string;
    title: string;
    priority: "P0" | "P1" | "P2" | "P3";
    preconditions: string[];
    steps: Array<{ action: string; expected: string }>;
    tags: string[];
  }>;
  open_questions: Array<{
    question_id: string;
    question: string;
    blocking: boolean;
  }>;
}

interface AutomationIntent {
  schema_version: 1;
  feature_id: string;
  case_id: string;
  title: string;
  case_file: RelativePath;
  mode: "read_only" | "mutating";
  status: "planned" | "ready" | "blocked" | "automated" | "excluded";
  steps: string[];
  expected: string[];
  ui_constraints: {
    submitted_name?: string;
    name_max_length?: number;
    expected_rule_count?: number;
    expected_package_count?: number;
    data_source_type?: string;
    duplicate_rule_fingerprints?: string[];
    sampling?: string;
    partitions?: string[];
    filters?: string[];
    strength?: "strong" | "weak";
  };
  business_record: {
    required: boolean;
    expected_name?: string;
    expected_status?: string;
  };
}

interface CaseTaskList {
  schema_version: 1;
  feature_id: string;
  source_intents_sha256: Sha256;
  tasks: Array<{
    case_id: string;
    intent_path: RelativePath;
    intent_sha256: Sha256;
    output_spec: RelativePath;
    status: "planned" | "running" | "completed" | "blocked" | "excluded";
  }>;
}

interface CommandRecord {
  argv: string[];
  cwd: RelativePath;
  started_at: IsoDateTime;
  finished_at: IsoDateTime;
  exit_code: number;
}

interface Run {
  schema_version: 1;
  run_id: string; // ^\d{8}T\d{6}Z[A-Z0-9]{6}$
  feature_id: string;
  created_at: IsoDateTime;
  commands: CommandRecord[];
  selected_case_ids: string[];
  source_revision: string;
  status: "created" | "running" | "completed" | "failed" | "blocked";
  published_at?: IsoDateTime;
  retention?: "active" | "pinned" | "prunable";
}

interface CaseCounts {
  declared: number;
  executed: number;
  passed: number;
  failed: number;
  skipped: number;
}

interface TestCounts {
  collected: number;
  passed: number;
  failed: number;
  skipped: number;
}

interface BusinessRecord {
  case_id: string;
  name?: string;
  id?: string;
  status?: string;
  evidence_path: RelativePath;
}

interface RunResult {
  schema_version: 1;
  run_id: string;
  status: "passed" | "failed" | "blocked";
  case_counts: CaseCounts;
  test_counts: TestCounts;
  case_results: Array<{
    case_id: string;
    status: "passed" | "failed" | "skipped" | "blocked";
    playwright_test_ids: string[];
    artifact_paths: RelativePath[];
  }>;
  artifacts: Array<{ kind: string; path: RelativePath; sha256?: Sha256; case_id?: string }>;
  business_records: BusinessRecord[];
  started_at: IsoDateTime;
  finished_at: IsoDateTime;
}

interface Handoff {
  schema_version: 1;
  run_id: string;
  status: "passed" | "failed" | "blocked";
  commands: CommandRecord[];
  case_counts: CaseCounts;
  test_counts: TestCounts;
  report_paths: {
    run_json: RelativePath;
    result_json: RelativePath;
    handoff_json: RelativePath;
    handoff_markdown: RelativePath;
    allure_results: RelativePath;
    allure_report?: RelativePath;
  };
  business_records: BusinessRecord[];
  excluded_cases: Array<{ case_id: string; reason: string }>;
  unresolved_blockers: Array<{ code: string; message: string; case_id?: string }>;
}
```

Schema 层的 `required`、enum、minLength/minItems、integer/minimum 和 format 必须与上述定义一致。`FeatureMetadata` 的语义校验器还要断言 `requirement.filename_stem`、`artifacts.case_markdown` 和 `artifacts.case_xmind` 使用同一个 stem；所有持久化相对路径都经过同一套越界检查。`RunResult` 与 `Handoff` 的计数等式、mutating 业务记录要求由语义校验器负责，并在对应的 schema fixture 测试中覆盖。

在根 `devDependencies` 精确加入 `"json-schema-to-typescript": "15.0.4"`；在 `packages/contracts/package.json` 的 `dependencies` 精确加入 `"ajv": "8.17.1"` 与 `"ajv-formats": "3.0.1"`。`generate-types.ts` 按文件名排序生成 `src/generated/v1.ts`，文件头写入 `// Generated. Do not edit.`；`--check` 在内存中重新生成并逐字比较，因而也能检查尚未暂存的新文件。

- [ ] **Step 4: 实现 typed validator**

```ts
export type ContractName =
  | "CliResult" | "FeatureMetadata" | "CaseDraft" | "AutomationIntent"
  | "CaseTaskList" | "Run" | "RunResult" | "Handoff";

export interface ContractTypeMap {
  CliResult: CliResult;
  FeatureMetadata: FeatureMetadata;
  CaseDraft: CaseDraft;
  AutomationIntent: AutomationIntent;
  CaseTaskList: CaseTaskList;
  Run: Run;
  RunResult: RunResult;
  Handoff: Handoff;
}

export type ContractError = { instancePath: string; keyword: string; message: string };

export function validateContract<K extends ContractName>(
  name: K,
  value: unknown,
): { ok: true; value: ContractTypeMap[K] } | { ok: false; errors: ContractError[] };

export function parseContract<K extends ContractName>(
  name: K,
  value: unknown,
): ContractTypeMap[K];
```

AJV 实例启用 `allErrors: true` 和 `strict: true`；错误按 `instancePath, keyword` 稳定排序。

- [ ] **Step 5: 验证 GREEN 和类型无漂移**

```bash
bun run contracts:generate
bun test packages/contracts/tests --timeout 30000
bun run contracts:generate --check
```

Expected: 0 fail；`--check` 确认生成文件与当前 schema 逐字节一致。

- [ ] **Step 6: 提交**

```bash
git add package.json bun.lock packages/contracts/package.json packages/contracts/schemas/v1 packages/contracts/scripts/generate-types.ts packages/contracts/src/generated/v1.ts packages/contracts/src/validators.ts packages/contracts/src/index.ts packages/contracts/tests
git commit -m "feat: ✨ add kata v1 contracts"
```

---

### Task 3: 实现需求名称文件算法

**Files:**
- Create: `packages/contracts/src/naming/requirement-filename.ts`
- Test: `packages/contracts/tests/requirement-filename.test.ts`
- Modify: `packages/contracts/src/index.ts`

**Interfaces:**
- Consumes: 需求名称、feature ID、可选 requirement ID 与已占用的 stems。
- Produces: `normalizeRequirementFilenamePart()`、`deriveRequirementFilenameStem()`、`assertRequirementFilenameStem()`、`caseArtifactPaths()`。

- [ ] **Step 1: 写表驱动失败测试**

```ts
import { describe, expect, test } from "bun:test";
import { deriveRequirementFilenameStem, caseArtifactPaths } from "../src/naming/requirement-filename.ts";

describe("requirement filename", () => {
  test.each([
    ["数据质量任务：支持规则 SQL 合并（第一期）", "数据质量任务支持规则SQL合并第一期"],
    ["StarRocks 3.x 数据源适配", "StarRocks3x数据源适配"],
    [" -- ", "需求"],
  ])("normalizes %s", (requirementName, expected) => {
    expect(deriveRequirementFilenameStem({ featureId: "f1", requirementName })).toBe(expected);
  });

  test("uses sanitized ID, then stable digest on collisions", () => {
    const occupied = new Set(["需求", "需求REQ123"]);
    const stem = deriveRequirementFilenameStem({
      featureId: "feature-a", requirementName: " -- ", requirementId: "REQ-123", occupiedStems: occupied,
    });
    expect(stem).toMatch(/^需求REQ123[a-f0-9]{8}$/);
  });

  test("returns same-stem artifacts", () => {
    expect(caseArtifactPaths("需求A")).toEqual({
      caseMarkdown: "cases/需求A.md", caseXmind: "cases/需求A.xmind",
    });
  });
});
```

- [ ] **Step 2: 运行 RED**

```bash
bun test packages/contracts/tests/requirement-filename.test.ts
```

Expected: 失败，因为目标模块尚不存在。

- [ ] **Step 3: 实现纯函数**

```ts
import { createHash } from "node:crypto";

const ALLOWED = /[\p{Script=Han}A-Za-z0-9]/u;
const MAX_BYTES = 180;

export interface RequirementFilenameInput {
  featureId: string;
  requirementName: string;
  requirementId?: string;
  occupiedStems?: ReadonlySet<string>;
}

export function normalizeRequirementFilenamePart(value: string): string {
  return [...value.normalize("NFC")].filter((char) => ALLOWED.test(char)).join("");
}

function collisionKey(value: string): string {
  return value.normalize("NFC").replace(/[A-Z]/g, (char) => char.toLowerCase());
}

function truncateUtf8(value: string, maxBytes: number): string {
  let result = "";
  for (const char of [...value]) {
    if (Buffer.byteLength(result + char, "utf8") > maxBytes) break;
    result += char;
  }
  return result;
}

function fit(base: string, suffix: string): string {
  let prefix = "";
  for (const char of [...base]) {
    if (Buffer.byteLength(prefix + char + suffix, "utf8") > MAX_BYTES) break;
    prefix += char;
  }
  return prefix + suffix;
}

export function deriveRequirementFilenameStem(input: RequirementFilenameInput): string {
  const base = normalizeRequirementFilenamePart(input.requirementName) || "需求";
  const occupied = new Set([...input.occupiedStems ?? []].map(collisionKey));
  const unique = (candidate: string) => !occupied.has(collisionKey(candidate));
  const direct = fit(base, "");
  if (unique(direct)) return direct;

  const id = truncateUtf8(normalizeRequirementFilenamePart(input.requirementId ?? ""), 64);
  if (id) {
    const withId = fit(base, id);
    if (unique(withId)) return withId;
  }

  const digest = createHash("sha256")
    .update(`${input.featureId}\n${input.requirementName.normalize("NFC")}`)
    .digest("hex");
  for (const length of [8, 12, 16, 64]) {
    const candidate = fit(base, `${id}${digest.slice(0, length)}`);
    if (unique(candidate)) return candidate;
  }
  throw new Error("unable to derive a unique requirement filename");
}

export function assertRequirementFilenameStem(stem: string): void {
  if (
    !stem ||
    Buffer.byteLength(stem, "utf8") > MAX_BYTES ||
    [...stem].some((char) => !ALLOWED.test(char))
  ) {
    throw new Error("requirement filename stem must contain only Han, ASCII letters and digits");
  }
}

export function caseArtifactPaths(stem: string) {
  assertRequirementFilenameStem(stem);
  return {
    caseMarkdown: `cases/${stem}.md` as const,
    caseXmind: `cases/${stem}.xmind` as const,
  };
}
```

补充 180 UTF-8 字节、不截断字符、NFC/NFD 等价碰撞、大小写碰撞、摘要扩展，以及传入空格、标点、路径分隔符时 `caseArtifactPaths()` 拒绝的测试。

- [ ] **Step 4: 运行 GREEN**

```bash
bun test packages/contracts/tests/requirement-filename.test.ts
```

Expected: 全部用例通过。

- [ ] **Step 5: 提交**

```bash
git add packages/contracts/src/naming/requirement-filename.ts packages/contracts/src/index.ts packages/contracts/tests/requirement-filename.test.ts
git commit -m "feat: ✨ normalize requirement artifact names"
```

---

### Task 4: 实现 CLI kernel、统一结果与退出码

**Files:**
- Create: `packages/cli/src/core/types.ts`
- Create: `packages/cli/src/core/errors.ts`
- Create: `packages/cli/src/core/result.ts`
- Create: `packages/cli/src/core/io.ts`
- Create: `packages/cli/src/core/render.ts`
- Create: `packages/cli/src/core/execute.ts`
- Create: `packages/cli/src/app.ts`
- Create: `packages/cli/bin/kata`
- Create: `packages/cli/src/bin/kata.ts`
- Create: `packages/cli/src/services/types.ts`
- Create: `packages/cli/src/services/default-services.ts`
- Modify: `packages/cli/package.json`
- Modify: `package.json`
- Test: `packages/cli/tests/core/result.test.ts`
- Test: `packages/cli/tests/core/execute.test.ts`
- Test: `packages/cli/tests/core/output.test.ts`
- Modify: `packages/cli/tests/layout/package-boundaries.test.ts`

**Interfaces:**
- Consumes: `CliResult` contract。
- Produces: `CommandContext`, `CommandHandler`, `KataCliError`, `statusExitCode()`, `executeCommand()`, `runCli()`。

- [ ] **Step 1: 写五种状态和 stdout/stderr 失败测试**

```ts
test("maps statuses to exact exit codes", () => {
  expect(["passed", "failed", "invalid", "unavailable", "needs_input"].map(statusExitCode))
    .toEqual([0, 1, 2, 3, 4]);
});

test("json mode emits one JSON document to stdout", async () => {
  const io = memoryIo();
  const code = await executeCommand(fakeDefinition(passed({ ok: true })), {}, context({ io }), "json");
  expect(code).toBe(0);
  expect(io.stdoutLines).toHaveLength(1);
  expect(JSON.parse(io.stdoutLines[0]).status).toBe("passed");
  expect(io.stderrLines).toEqual([]);
});
```

- [ ] **Step 2: 运行 RED**

```bash
bun test packages/cli/tests/core
```

Expected: 失败，因为 core 模块尚不存在。

- [ ] **Step 3: 实现 exact types 和 status mapping**

```ts
export type CommandStatus = "passed" | "failed" | "invalid" | "unavailable" | "needs_input";
export type ExitCode = 0 | 1 | 2 | 3 | 4;

export const EXIT_CODES: Record<CommandStatus, ExitCode> = {
  passed: 0, failed: 1, invalid: 2, unavailable: 3, needs_input: 4,
};

export interface CliIo {
  stdout(text: string): void;
  stderr(text: string): void;
  isTTY: boolean;
}

export interface CommandContext {
  cwd: string;
  env: Readonly<Record<string, string | undefined>>;
  now(): Date;
  randomBytes(size: number): Uint8Array;
  io: CliIo;
  services: CommandServices;
}

export interface CommandServices {
  dtstack?: unknown;
  plugins?: unknown;
  skills?: unknown;
  workspace?: unknown;
}

export type CommandHandler<I, O> = (
  input: I,
  context: CommandContext,
) => Promise<CommandResult<O>>;
```

`KataCliError` 只携带 `CommandStatus`、稳定错误码、消息和可选 details。`executeCommand()` 捕获该错误并生成符合 contract 的结果；未知错误统一转为 `failed`，仅在 verbose 模式下把堆栈写入 stderr。

Task 4 暂时把四个尚未接入的外部 service slot 声明为 `unknown`，让 kernel 可以先通过类型检查；Task 10/11 在注册真实 handler 前将其替换为精确 port。Feature/cases/automation/runs 属于同一 package 内的领域 handler，不伪装成外部 service。

`runCli(argv, options)` 接受注入的 `CommandRegistry`；Task 4 默认使用可编译的 empty registry，`--version` 可运行，其他命令返回 `unavailable`。Task 5 创建完整 descriptor registry 后修改 `app.ts` 的默认值；不得让 Task 4 前向导入尚不存在的 `commands/registry.ts`。

- [ ] **Step 4: 实现 bin-safe runCli**

`runCli()` 返回 `ExitCode`；只有 `src/bin/kata.ts` 可以把它赋给 `process.exitCode`。`createDefaultServices()` 返回当前已经实现的 services，尚未实现的 port 保持缺省；统一的缺失 service 映射器返回 `unavailable`。迁入 `packages/` 的代码不得保留 `process.exit()`。

只在 `app.ts` 已经存在后创建可执行入口：

```ts
// packages/cli/src/bin/kata.ts
import { runCli } from "../app.ts";

process.exitCode = await runCli(Bun.argv.slice(2));
```

`packages/cli/bin/kata` 只导入该模块。随后把根 `bin` 改为 `{ "kata": "packages/cli/bin/kata" }`，把 `@kata/cli` package 的 `bin` 改为 `{ "kata": "bin/kata" }`。

- [ ] **Step 5: 运行 GREEN 与静态检查**

```bash
bun test packages/cli/tests/core
bun test packages/cli/tests/layout/package-boundaries.test.ts
bun run type-check
rg -n 'process\.exit\(' packages/cli packages/contracts
```

Expected: tests 与 type-check 通过；根 package 只发布一个 `kata` 可执行文件；`rg` 没有输出。

- [ ] **Step 6: 提交**

```bash
git add package.json packages/cli/package.json packages/cli/bin/kata packages/cli/src/bin/kata.ts packages/cli/src/app.ts packages/cli/src/core packages/cli/src/services packages/cli/tests/core packages/cli/tests/layout/package-boundaries.test.ts
git commit -m "feat: ✨ add unified kata CLI kernel"
```

---

### Task 5: 建立封闭命令注册表和三层帮助

**Files:**
- Create: `packages/cli/src/commands/registry.ts`
- Create: `packages/cli/src/core/help.ts`
- Modify: `packages/cli/src/app.ts`
- Create: `packages/cli/tests/fixtures/public-command-paths.json`
- Test: `packages/cli/tests/contract/command-tree.test.ts`
- Test: `packages/cli/tests/contract/help.test.ts`
- Test: `packages/cli/tests/contract/help-json.test.ts`

**Interfaces:**
- Consumes: CLI kernel。
- Produces: `CommandDefinition`, `COMMAND_REGISTRY`, `renderRootHelp()`, `renderGroupHelp()`, `renderLeafHelp()`, `helpAsJson()`。

- [ ] **Step 1: 固定 39 个叶子路径 fixture**

```json
[
  "auth login", "auth logout", "auth whoami",
  "db exec", "db ping",
  "project ensure", "project setup",
  "env check",
  "plugins pack", "plugins install", "plugins check",
  "skills list", "skills audit", "skills route-check",
  "cases validate", "cases lint", "cases compare", "cases verify", "cases export", "cases e2e",
  "automation scaffold", "automation normalize", "automation tasks", "automation run",
  "features create", "features list", "features show", "features check", "features index", "features resolve", "features archive",
  "runs create", "runs publish", "runs prune", "runs handoff",
  "workspace format", "workspace check", "workspace clean", "workspace check-command"
]
```

- [ ] **Step 2: 写失败的命令树和帮助测试**

测试实际 registry paths 等于 fixture；根帮助含 11 groups/version/exit codes；组帮助含全部 leaves；叶子帮助含 usage、required/optional、effects、text/json、exit codes、examples、related；unknown command 返回 `invalid` 和相近建议。

- [ ] **Step 3: 运行 RED**

```bash
bun test packages/cli/tests/contract/command-tree.test.ts packages/cli/tests/contract/help.test.ts packages/cli/tests/contract/help-json.test.ts
```

Expected: 失败，因为 registry 与 help 尚不存在。

- [ ] **Step 4: 实现 CommandDefinition**

```ts
export interface CommandDefinition<I = unknown, O = unknown> {
  path: readonly [group: string, action: string];
  summary: string;
  description: string;
  usage: string;
  arguments: readonly ArgumentDefinition[];
  options: readonly OptionDefinition[];
  readsStdin: boolean;
  effects: readonly ("filesystem" | "session" | "database" | "platform")[];
  supportsDryRun: boolean;
  envelopeSchema: "CliResult";
  dataSchema?: ContractName;
  exitCodes: readonly ExitCode[];
  examples: readonly CommandExample[];
  related: readonly string[];
  parse(raw: ParsedCommandInput): I;
  run: CommandHandler<I, O>;
  renderText(result: CommandResult<O>): string;
}
```

命令注册定义是 parser、help 与文档的唯一来源。`kata help cases export --format json` 序列化同一份定义；README 不再维护第二份参数表。

Task 5 构建 `createCommandRegistry(handlers)`：命令元数据始终完整，尚未接入的 handler 由统一 missing-service handler 返回 `unavailable`。后续领域 Task 注入真实 handler；不得复制第二份命令表，也不得放置返回 `passed` 的占位 handler。

- [ ] **Step 5: 运行 GREEN**

```bash
bun test packages/cli/tests/contract
```

Expected: 正好 11 个 groups、39 个 leaves；不存在隐藏路径。

- [ ] **Step 6: 提交**

```bash
git add packages/cli/src/commands/registry.ts packages/cli/src/core/help.ts packages/cli/src/app.ts packages/cli/tests/fixtures/public-command-paths.json packages/cli/tests/contract/command-tree.test.ts packages/cli/tests/contract/help.test.ts packages/cli/tests/contract/help-json.test.ts
git commit -m "feat: ✨ define kata command registry and help"
```

---

### Task 6: 实现 Feature 生命周期与严格 metadata store

**Files:**
- Create: `packages/cli/src/domain/features/layout.ts`
- Create: `packages/cli/src/domain/features/metadata-store.ts`
- Create: `packages/cli/src/domain/features/resolve-feature.ts`
- Create: `packages/cli/src/commands/features/index.ts`
- Modify: `packages/cli/src/commands/registry.ts`
- Test: `packages/cli/tests/domain/metadata-store.test.ts`
- Test: `packages/cli/tests/domain/feature-resolution.test.ts`
- Test: `packages/cli/tests/commands/features.test.ts`

**Interfaces:**
- Consumes: `FeatureMetadata`、文件名 helpers 与 CLI registry。
- Produces: `ResolvedFeature`、`resolveFeatureRef()`、`readFeatureMetadata()`、`writeFeatureMetadataAtomic()` 与 7 个 feature handlers。

- [ ] **Step 1: 写 strict metadata 失败测试**

```ts
test("does not guess files when metadata is missing", () => {
  const feature = fixtureFeature({ files: ["cases/archive.md", "cases/cases.xmind"] });
  expect(() => resolveFeatureRef({ workspaceRoot: feature.root, ref: feature.dir }))
    .toThrow(/metadata\.yaml is required/);
});

test("rejects duplicate feature_id", () => {
  const root = fixtureWorkspaceWithDuplicateIds("feature-1");
  expect(() => resolveFeatureRef({ workspaceRoot: root, ref: "feature-1" }))
    .toThrow(/multiple features use feature_id/);
});
```

- [ ] **Step 2: 运行 RED**

```bash
bun test packages/cli/tests/domain/metadata-store.test.ts packages/cli/tests/domain/feature-resolution.test.ts
```

Expected: 失败，因为领域 services 尚不存在。

- [ ] **Step 3: 实现 exact interfaces**

```ts
export interface ResolvedFeature {
  featureDir: string;
  metadataPath: string;
  metadata: FeatureMetadata;
}

export function resolveFeatureRef(input: {
  workspaceRoot: string;
  project?: string;
  ref: string;
}): ResolvedFeature;

export function readFeatureMetadata(path: string): FeatureMetadata;
export function writeFeatureMetadataAtomic(path: string, value: FeatureMetadata): void;
```

原子写入依次使用同目录临时文件、`fsync` 和 rename。解析只接受明确目录或精确 `feature_id`；没有匹配或匹配多个时返回 `invalid`，不得退回第一个结果。

- [ ] **Step 4: 注册 7 个 feature handlers 并测试 dry-run**

根据 registry 实现 `create/list/show/check/index/resolve/archive`。所有文件系统 handler 在 dry-run 时只返回计划产物，不写入任何文件。

- [ ] **Step 5: 运行 GREEN**

```bash
bun test packages/cli/tests/domain packages/cli/tests/commands/features.test.ts
```

Expected: 0 fail；metadata paths 始终指向同 stem 的 Markdown/XMind。

- [ ] **Step 6: 提交**

```bash
git add packages/cli/src/domain/features packages/cli/src/commands/features packages/cli/src/commands/registry.ts packages/cli/tests/domain/metadata-store.test.ts packages/cli/tests/domain/feature-resolution.test.ts packages/cli/tests/commands/features.test.ts
git commit -m "feat: ✨ add strict feature metadata lifecycle"
```

---

### Task 7: 迁移 Cases 命令与同名产物转换

**Files:**
- Create: `packages/cli/src/domain/cases/archive.ts`
- Create: `packages/cli/src/domain/cases/xmind.ts`
- Create: `packages/cli/src/domain/cases/csv.ts`
- Create: `packages/cli/src/domain/cases/case-document.ts`
- Create: `packages/cli/src/domain/cases/assets/case-document.md.hbs`
- Create: `packages/cli/src/commands/cases/index.ts`
- Modify: `packages/cli/src/commands/registry.ts`
- 复制并调整逻辑，旧文件停止参与运行并留给清理计划复核：`.claude/scripts/_shared/cli/archive-gen.ts`、`.claude/scripts/_shared/cli/xmind-gen/**`、`.claude/scripts/_shared/cli/xmind-patch.ts`
- 把模板复制到 CLI 所有的 asset；旧模板保留到 case-draft Skill Task 更新完引用：`.claude/skills/case-draft/templates/archive.md.hbs`
- Test: `packages/cli/tests/commands/cases.test.ts`
- Test: `packages/cli/tests/e2e/case-artifact-flow.test.ts`

**Interfaces:**
- Consumes: 严格的 `ResolvedFeature` 与 metadata artifact paths。
- Produces: `validate/lint/compare/verify/export/e2e` handlers，以及无损的 Markdown/XMind/CSV 转换。

- [ ] **Step 1: 写 metadata-only 和 `--to` 失败测试**

测试必须证明：`export --to markdown` 校验并返回 metadata 指向的现有 Markdown；`--to xmind|csv` 从该 Markdown 转换；不得扫描固定文件名；全局 `--format json` 保持独立。

- [ ] **Step 2: 运行 RED**

```bash
bun test packages/cli/tests/commands/cases.test.ts packages/cli/tests/e2e/case-artifact-flow.test.ts
```

Expected: 失败，因为 cases domain 尚未注册。

- [ ] **Step 3: 移动并收敛 conversion APIs**

```ts
export type CaseDocument = CaseDraft;

export function parseCaseMarkdown(markdown: string): CaseDocument;
export function renderCaseMarkdown(document: CaseDocument): string;
export function readXmind(path: string): Promise<CaseDocument>;
export function writeXmind(path: string, document: CaseDocument): Promise<void>;
export function readCaseCsv(path: string): Promise<CaseDocument>;
export function writeCaseCsv(path: string, document: CaseDocument): Promise<void>;
```

所有转换都通过 `CaseDocument` 完成往返；产物路径仍由 metadata 决定。

- [ ] **Step 4: 运行 GREEN 和回读测试**

```bash
bun test packages/cli/tests/commands/cases.test.ts packages/cli/tests/e2e/case-artifact-flow.test.ts
```

Expected: 生成的 `.md` 与 `.xmind` 使用完全相同的 stem，回读后得到相等的 `CaseDocument`。

- [ ] **Step 5: 提交**

```bash
git add packages/cli/src/domain/cases packages/cli/src/commands/cases packages/cli/src/commands/registry.ts packages/cli/tests/commands/cases.test.ts packages/cli/tests/e2e/case-artifact-flow.test.ts
git commit -m "refactor: ✨ migrate case artifact commands"
```

---

### Task 8: 实现 AutomationIntent、CaseTaskList 与 automation commands

**Files:**
- Create: `packages/cli/src/domain/automation/intents.ts`
- Create: `packages/cli/src/domain/automation/case-task-list.ts`
- Create: `packages/cli/src/commands/automation/index.ts`
- Modify: `packages/cli/src/commands/registry.ts`
- 从以下文件复制并调整逻辑：`.claude/skills/playwright-automation/scripts/build-case-tasks.ts`
- 改为薄兼容 wrapper，保留到 Skills Task 12 删除：`.claude/skills/playwright-automation/scripts/build-case-tasks.ts`
- Test: `packages/cli/tests/domain/automation-intent.test.ts`
- Test: `packages/cli/tests/domain/case-task-list.test.ts`
- Test: `packages/cli/tests/commands/automation.test.ts`

**Interfaces:**
- Consumes: `automation/intents/<case-id>.json`、contracts 与 `ResolvedFeature`。
- Produces: `loadAutomationIntents()`、`buildCaseTaskList()` 与 `scaffold/normalize/tasks` handlers；在 Task 9 提供 Run services 前，`automation run` 保持 `unavailable`。

- [ ] **Step 1: 写失败测试，禁止 archive/manifest 启发式**

```ts
test("fails when a selected case has no explicit intent", () => {
  const feature = fixtureFeatureWithCaseIds(["C01"]);
  expect(() => buildCaseTaskList({ feature, intents: [] })).toThrow(/C01.*intent/);
});

test("stores canonical task locations", () => {
  const list = buildCaseTaskList({ feature, intents: [mutatingIntent("C01")] });
  expect(list.tasks[0].intent_path).toBe("automation/intents/C01.json");
});
```

- [ ] **Step 2: 运行 RED**

```bash
bun test packages/cli/tests/domain/automation-intent.test.ts packages/cli/tests/domain/case-task-list.test.ts
```

Expected: 失败，因为严格的 intent services 尚不存在。

- [ ] **Step 3: 实现 canonical APIs**

```ts
export function loadAutomationIntents(feature: ResolvedFeature): AutomationIntent[];
export function buildCaseTaskList(input: {
  feature: ResolvedFeature;
  intents: readonly AutomationIntent[];
}): CaseTaskList;
```

`source_intents_sha256` 对按 `case_id` 排序后的 canonical JSON 计算摘要；每个 task 保存自己的 `intent_sha256`。删除 manifest/archive fallback，也不再根据标题推断 read-only。

旧 `build-case-tasks.ts` 不再保留业务逻辑。它只从 `../../../../packages/cli/src/domain/automation/case-task-list.ts` 重新导出 `buildCaseTaskList`；若仍作为入口执行，则调用 `runCli(["automation", "tasks", ...Bun.argv.slice(2)])`。Skills Task 12 更新全部调用方并删除该 wrapper。

- [ ] **Step 4: 注册三个准备命令并运行 GREEN**

```bash
bun test packages/cli/tests/domain/automation-intent.test.ts packages/cli/tests/domain/case-task-list.test.ts packages/cli/tests/commands/automation.test.ts
```

Expected: 0 fail；dry-run 不创建目录或文件；缺少明确 intent 时返回 `invalid`；`automation run` 返回 `unavailable`，不能伪装成通过。

- [ ] **Step 5: 提交**

```bash
git add packages/cli/src/domain/automation/intents.ts packages/cli/src/domain/automation/case-task-list.ts packages/cli/src/commands/automation/index.ts packages/cli/src/commands/registry.ts packages/cli/tests/domain/automation-intent.test.ts packages/cli/tests/domain/case-task-list.test.ts packages/cli/tests/commands/automation.test.ts .claude/skills/playwright-automation/scripts/build-case-tasks.ts
git commit -m "feat: ✨ enforce explicit automation intents"
```

---

### Task 9: 实现原子 run、结果、Handoff 与 publish

**Files:**
- Create: `packages/cli/src/domain/runs/run-id.ts`
- Create: `packages/cli/src/domain/runs/path-safety.ts`
- Create: `packages/cli/src/domain/runs/run-store.ts`
- Create: `packages/cli/src/domain/runs/result-store.ts`
- Create: `packages/cli/src/domain/runs/handoff.ts`
- Create: `packages/cli/src/domain/runs/assets/handoff.md.hbs`
- Create: `packages/cli/src/domain/runs/publish.ts`
- Create: `packages/cli/src/domain/runs/prune.ts`
- Create: `packages/cli/src/domain/runs/report-pdf.ts`
- Create: `packages/cli/src/domain/automation/run.ts`
- Create: `packages/cli/src/commands/runs/index.ts`
- Modify: `packages/cli/src/commands/registry.ts`
- Modify: `packages/cli/src/commands/automation/index.ts`
- 从以下文件复制 canonical template：`.claude/skills/playwright-automation/templates/handoff.md.hbs`
- 替换为指向 CLI 所有模板的兼容 symlink，保留到 Skills Task 12 删除：`.claude/skills/playwright-automation/templates/handoff.md.hbs`
- 复制并调整执行逻辑，再保留薄 CLI wrapper 到 Skills Task 12：`.claude/skills/playwright-automation/scripts/run-tests-notify.ts`
- 复制并调整报告逻辑，再保留薄 API wrapper 到 Skills Task 12：`.claude/skills/playwright-automation/scripts/report-to-pdf.ts`
- Test: `packages/cli/tests/domain/run-id.test.ts`
- Test: `packages/cli/tests/domain/run-store.test.ts`
- Test: `packages/cli/tests/domain/handoff.test.ts`
- Test: `packages/cli/tests/domain/report-pdf.test.ts`
- Test: `packages/cli/tests/commands/runs.test.ts`
- Modify: `packages/cli/tests/commands/automation.test.ts`

**Interfaces:**
- Consumes: Run/RunResult/Handoff contracts。
- Produces: 原子 run IDs/directories、安全 artifact paths、`create/publish/prune/handoff` handlers，以及真实的 `automation run` handler。

- [ ] **Step 1: 写并发碰撞、路径越界和计数失败测试**

测试覆盖 `YYYYMMDDTHHMMSSZ[A-Z0-9]{6}` 的 UTC 排序、`EEXIST` 重试、零测试、三组计数等式、`..`/绝对路径/symlink 逃逸、缺少业务记录，以及禁止复制 `_shared/published-reports`。

- [ ] **Step 2: 运行 RED**

```bash
bun test packages/cli/tests/domain/run-id.test.ts packages/cli/tests/domain/run-store.test.ts packages/cli/tests/domain/handoff.test.ts packages/cli/tests/domain/report-pdf.test.ts
```

Expected: 失败，因为新的 run domain 尚不存在。

- [ ] **Step 3: 实现 run interfaces**

```ts
export const RUN_ID_RE = /^\d{8}T\d{6}Z[A-Z0-9]{6}$/;

export function createRunDirectory(input: {
  featureDir: string;
  now: Date;
  randomBytes(size: number): Uint8Array;
  maxAttempts?: number;
}): { runId: string; runDir: string };

export function buildHandoff(input: {
  featureDir: string;
  run: Run;
  result: RunResult;
}): Handoff;

export function publishRun(input: {
  featureDir: string;
  runId: string;
  publishedAt: string;
}): Promise<{ run: Run; handoff: Handoff; handoffJson: string; handoffMarkdown: string }>;

export function planRunPrune(input: {
  featureDir: string;
  retention: RunRetentionPolicy;
}): Promise<RunPruneCandidates>;
```

Create 使用非递归 `mkdir` 抢占最终目录；遇到 `EEXIST` 时重试，次数不得超过注入的上限。Publish 就地写入 `published_at` 和 `retention: pinned`，并且只依据 contracts 渲染 Handoff。`runs prune` 默认只返回 candidates/dry-run；现在就解析并记录 `--apply <cleanup-plan>`，但在 cleanup 子计划接入已复核引擎前返回 `unavailable`。

三个旧 Playwright 文件只保留兼容入口：`run-tests-notify.ts` 调用 `runCli(["automation", "run", ...])`；`report-to-pdf.ts` 只重新导出 `packages/cli/src/domain/runs/report-pdf.ts` 的 canonical API；`handoff.md.hbs` 改为指向 `../../../../packages/cli/src/domain/runs/assets/handoff.md.hbs` 的 symlink。wrapper 与 symlink 不得复制业务实现，统一由 Skills Task 12 删除。

- [ ] **Step 4: 运行 GREEN**

```bash
bun test packages/cli/tests/domain/run-id.test.ts packages/cli/tests/domain/run-store.test.ts packages/cli/tests/domain/handoff.test.ts packages/cli/tests/domain/report-pdf.test.ts packages/cli/tests/commands/runs.test.ts packages/cli/tests/commands/automation.test.ts
```

Expected: 0 fail；会改变业务状态的结果若缺少稳定 ID 和可核对记录，就不能 publish；`automation run` 通过 RunStore 执行，并保存本次 run 的结果记录。

- [ ] **Step 5: 提交**

```bash
git add -A -- packages/cli/src/domain/runs packages/cli/src/domain/automation/run.ts packages/cli/src/commands/runs/index.ts packages/cli/src/commands/automation/index.ts packages/cli/src/commands/registry.ts packages/cli/tests/domain/run-id.test.ts packages/cli/tests/domain/run-store.test.ts packages/cli/tests/domain/handoff.test.ts packages/cli/tests/domain/report-pdf.test.ts packages/cli/tests/commands/runs.test.ts packages/cli/tests/commands/automation.test.ts .claude/skills/playwright-automation/templates/handoff.md.hbs .claude/skills/playwright-automation/scripts/run-tests-notify.ts .claude/skills/playwright-automation/scripts/report-to-pdf.ts
git commit -m "feat: ✨ add atomic run and handoff lifecycle"
```

---

### Task 10: 合并 DTStack SDK 到 auth/db/project/env

**Files:**
- Modify: `packages/dtstack/package.json`
- Modify: `packages/dtstack/src/sdk/**`
- Modify: `packages/dtstack/src/core/**`
- 等价 registry tests 通过后删除：`packages/dtstack/src/cli.ts`
- 等价 registry tests 通过后删除：`packages/dtstack/src/cli/**`
- 等价 registry tests 通过后删除：`packages/dtstack/src/help/**`
- 等价 registry tests 通过后删除：`packages/dtstack/tests/cli/**`
- 等价 registry tests 通过后删除：`packages/dtstack/tests/docs/usage-mirror.test.ts`
- 等价 registry tests 通过后删除：`packages/dtstack/docs/usage.md`
- Create: `packages/cli/src/commands/auth/index.ts`
- Create: `packages/cli/src/commands/db/index.ts`
- Create: `packages/cli/src/commands/project/index.ts`
- Create: `packages/cli/src/commands/env/index.ts`
- Modify: `packages/cli/src/commands/registry.ts`
- Modify: `packages/cli/src/services/types.ts`
- Modify: `packages/cli/src/services/default-services.ts`
- Modify: `package.json`
- Modify: `bun.lock`
- Test: `packages/cli/tests/commands/auth.test.ts`
- Test: `packages/cli/tests/commands/db.test.ts`
- Test: `packages/cli/tests/commands/project.test.ts`
- Test: `packages/cli/tests/commands/env.test.ts`

**Interfaces:**
- Consumes: 无输出副作用的 `@kata/dtstack` SDK。
- Produces: 8 个已经注册、共享统一结果与帮助的 leaf handlers。

- [ ] **Step 1: 写失败测试覆盖旧命令映射**

通过注入的 DTStack services 测试 login/logout/whoami、db exec/ping、project ensure/setup 与 env check。断言不存在 `--json`；JSON 输出只使用全局 `--format json`。

- [ ] **Step 2: 运行 RED**

```bash
bun test packages/cli/tests/commands/auth.test.ts packages/cli/tests/commands/db.test.ts packages/cli/tests/commands/project.test.ts packages/cli/tests/commands/env.test.ts
```

Expected: 失败，因为目标 handlers 尚不存在。

- [ ] **Step 3: 删除 SDK 输出/退出副作用并接入 handlers**

SDK 函数只返回领域值或抛出带类型的错误；handler 把认证、配置、输入和服务错误映射为 CLI 状态。只有等价的注册表帮助测试通过后，才删除 DTStack bin、旧 CLI 测试与手写帮助源。

- [ ] **Step 4: 运行 GREEN 与唯一 bin 检查**

```bash
bun test packages/dtstack/tests packages/cli/tests/commands/auth.test.ts packages/cli/tests/commands/db.test.ts packages/cli/tests/commands/project.test.ts packages/cli/tests/commands/env.test.ts
bun -e 'const p = await Bun.file("package.json").json(); console.log(Object.keys(p.bin ?? {}))'
rg -n 'process\.exit\(' packages/cli packages/contracts packages/dtstack
```

Expected: 0 fail；输出为 `[ "kata" ]` 或等价的单键结果；`rg` 没有输出。

- [ ] **Step 5: 提交**

```bash
git add -A -- packages/dtstack/package.json packages/dtstack/src/sdk packages/dtstack/src/core packages/dtstack/src/cli.ts packages/dtstack/src/cli packages/dtstack/src/help packages/dtstack/tests/cli packages/dtstack/tests/docs/usage-mirror.test.ts packages/dtstack/docs/usage.md packages/cli/src/commands/auth/index.ts packages/cli/src/commands/db/index.ts packages/cli/src/commands/project/index.ts packages/cli/src/commands/env/index.ts packages/cli/src/commands/registry.ts packages/cli/src/services/types.ts packages/cli/src/services/default-services.ts packages/cli/tests/commands/auth.test.ts packages/cli/tests/commands/db.test.ts packages/cli/tests/commands/project.test.ts packages/cli/tests/commands/env.test.ts package.json bun.lock
git commit -m "refactor: ✨ merge DTStack CLI capabilities into kata"
```

---

### Task 11: 定义 plugins/skills/workspace service ports 和帮助示例测试

**Files:**
- Modify: `packages/cli/src/services/types.ts`
- Modify: `packages/cli/src/services/default-services.ts`
- Create: `packages/cli/src/commands/plugins/index.ts`
- Create: `packages/cli/src/commands/skills/index.ts`
- Create: `packages/cli/src/commands/workspace/index.ts`
- Modify: `packages/cli/src/commands/registry.ts`
- Test: `packages/cli/tests/contract/help-examples.test.ts`
- Test: `packages/cli/tests/commands/deferred-services.test.ts`

**Interfaces:**
- Consumes: 后续 Skill/plugin、content 与 cleanup 引擎实现的 ports。
- Produces: 不导入未来实现模块也能编译的稳定命令契约。

- [ ] **Step 1: 固定 DTO 所有权与持久化边界**

以下类型全部定义在 `packages/cli/src/services/types.ts`，属于 `packages/cli` 内部的命令与 service DTO。后续 Skills、Content、Cleanup 计划只能导入并实现这些类型，不得再次声明同名 interface。

这些 DTO 可以作为 `CliResult.data` 的内存值，但不得直接充当独立持久化文件的 schema。`dist/release-manifest.json`、`CleanupPlan`、`CleanupReport` 等长期文件必须由拥有它们的计划在 `packages/contracts` 或各自的严格 schema 中定义；这里的 DTO 只返回其路径、ID、摘要与执行概况。跨 package 的持久化数据只依赖 `packages/contracts`，不得让 `packages/contracts` 反向依赖 `packages/cli`。

```ts
export type RuntimeName = "codex" | "claude" | "reasonix" | "hermes";
export type SkillSource = "root" | "release-manifest";

export interface ServiceIssue {
  code: string;
  message: string;
  path?: string;
}

export interface PluginPackInput {
  runtime: RuntimeName;
  ref?: string; // 缺省为当前 HEAD
  output: string;
}

export interface PluginPackageResult {
  runtime: RuntimeName;
  archive_path: string;
  release_manifest_path: string;
  version: string;
  source_commit: string;
  input_tree_sha256: string;
  file_count: number;
  sha256: string;
}

export interface PluginInstallInput {
  runtime: RuntimeName;
  archive: string;
  target: string;
}

export interface PluginInstallResult {
  runtime: RuntimeName;
  target: string;
  installed_paths: string[];
  version: string;
  source_commit: string;
  skill_count: number;
}

export interface PluginCheckInput {
  runtime: RuntimeName;
  archive: string;
}

export interface PluginCheckResult {
  runtime: RuntimeName;
  archive: string;
  valid: boolean;
  version?: string;
  source_commit?: string;
  input_tree_sha256?: string;
  file_count: number;
  skill_count: number;
  sha256: string;
  issues: ServiceIssue[];
}

export interface SkillSummary {
  name: string;
  description: string;
  directory: string;
  business: boolean;
}

export interface SkillListInput {
  runtime?: RuntimeName;
  source: SkillSource;
  manifest_path?: string;
}

export interface SkillListResult {
  runtime?: RuntimeName;
  source: SkillSource;
  skills: SkillSummary[];
}

export interface SkillAuditInput {
  runtime: RuntimeName;
  source: SkillSource;
  manifest_path?: string;
}

export interface SkillAuditResult {
  runtime: RuntimeName;
  source: SkillSource;
  passed: boolean;
  checked_skills: number;
  issues: ServiceIssue[];
}

export interface RouteCheckInput {
  runtime: RuntimeName;
  source: SkillSource;
  fixture: string;
  manifest_path?: string;
}

export interface RouteCaseResult {
  id: string;
  expected_skill?: string;
  selected_skill?: string;
  status: "passed" | "failed" | "needs_input";
  issues: ServiceIssue[];
}

export interface RouteCheckResult {
  runtime: RuntimeName;
  source: SkillSource;
  fixture: string;
  total: number;
  passed: number;
  failed: number;
  cases: RouteCaseResult[];
}

export interface WorkspaceFileCheck {
  path: string;
  kind:
    | "text" | "csv" | "xml" | "jmx" | "xmind" | "xlsx" | "pdf"
    | "image" | "zip" | "symlink" | "other_binary" | "missing";
  disposition: "format" | "validate_binary" | "exclude_with_reason" | "needs_review";
  validation_kind:
    | "text" | "csv" | "xml" | "jmx" | "xmind" | "xlsx" | "pdf"
    | "image" | "zip" | "symlink" | "none";
  validation_root: "execution_worktree" | "source_worktree";
  format_kind?: "biome" | "prettier" | "ruff" | "shfmt" | "xml" | "csv-eol";
  policy_rule: string;
  reason?: string;
  dirty_at_baseline: boolean;
  status: "passed" | "failed" | "skipped" | "needs_review";
  checks: string[];
  issues: ServiceIssue[];
}

export interface WorkspaceFormatInput {
  paths: string[];
  dry_run: boolean;
}

export interface WorkspaceFormatResult {
  checked: number;
  changed: number;
  unchanged: number;
  skipped: number;
  needs_review: number;
  files: WorkspaceFileCheck[];
}

export interface WorkspaceCheckInput {
  paths: string[];
  language: boolean;
}

export interface WorkspaceCheckReport {
  schema_version: 1;
  command: "workspace check";
  git_commit: string;
  tool_versions: Record<string, string>;
  tracked_total: number;
  formatted: WorkspaceFileCheck[];
  validated_binary: WorkspaceFileCheck[];
  excluded_with_reason: WorkspaceFileCheck[];
  needs_review: WorkspaceFileCheck[];
  untracked: { roots: string[]; file_count: number };
  issues: ServiceIssue[];
}

export type WorkspaceCleanInput =
  | { mode: "dry-run" }
  | { mode: "plan"; plan_path: string }
  | { mode: "apply"; plan_path: string }
  | { mode: "verify-boundary"; plan_path: string };

export interface WorkspaceCleanReviewItem {
  path: string;
  reason_code: string;
  reason: string;
}

export interface WorkspaceCleanResult {
  mode: WorkspaceCleanInput["mode"];
  plan_id?: string;
  plan_path?: string;
  report_path?: string;
  apply_status?: "passed" | "failed";
  overall_status: "passed" | "needs_input" | "failed";
  summary: {
    keep: number;
    migrate: number;
    delete: number;
    needs_review: number;
    untracked: number;
  };
  needs_review: WorkspaceCleanReviewItem[];
}

export interface CheckCommandInput {
  argv: string[];
  cwd: string;
}

export interface CheckCommandResult {
  allowed: boolean;
  normalized_argv: string[];
  violations: Array<{
    code: string;
    message: string;
    argument_index?: number;
  }>;
}
```

- [ ] **Step 2: 写 service port 失败测试**

```ts
export interface PluginService {
  pack(input: PluginPackInput): Promise<PluginPackageResult>;
  install(input: PluginInstallInput): Promise<PluginInstallResult>;
  check(input: PluginCheckInput): Promise<PluginCheckResult>;
}

export interface SkillService {
  list(input: SkillListInput): Promise<SkillListResult>;
  audit(input: SkillAuditInput): Promise<SkillAuditResult>;
  routeCheck(input: RouteCheckInput): Promise<RouteCheckResult>;
}

export interface WorkspaceService {
  format(input: WorkspaceFormatInput): Promise<WorkspaceFormatResult>;
  check(input: WorkspaceCheckInput): Promise<WorkspaceCheckReport>;
  clean(input: WorkspaceCleanInput): Promise<WorkspaceCleanResult>;
  checkCommand(input: CheckCommandInput): Promise<CheckCommandResult>;
}
```

测试注入 fakes，证明真实引擎接入前 parser、result 与 help 已经可用。缺少 service 时返回 `unavailable`，绝不能返回 `passed`。`workspace check-command` 的真实实现归 content-governance Task 7；本 Task 只固定 port、parser、help 与 unavailable 行为。

测试还要构造每个 DTO 的完整 fixture，执行 TypeScript `satisfies` 检查，并断言公开 JSON key 与上述定义一致。任何未定义类型、重复声明或后续计划私自增加字段都必须让 type-check 或契约 fixture 失败。

skills 三个叶子命令共享 `--source root|release-manifest` 与 `--manifest-path <path>`：root 模式禁止传 manifest；release-manifest 模式必须同时给 runtime 与 manifest，缺项返回 `invalid`/exit 2。Task 11 的 fake service 先固定 parser、三层帮助与 unavailable 行为；Skills Task 3 接入真实 release-manifest service 后，同一组命令 fixture 必须前向复测为可用。帮助要明确 Claude、Reasonix、Hermes 的 route-check 只有静态包检查，真实路由执行仅支持 Codex。

- [ ] **Step 3: 运行 RED**

```bash
bun test packages/cli/tests/commands/deferred-services.test.ts
```

Expected: 失败，因为精确 service port 与延后接入的命令模块尚不存在。

- [ ] **Step 4: 实现 ports 与 unavailable adapter**

用上述精确 interfaces 替换 Task 4 的 `unknown` slots。`createDefaultServices()` 对尚未实现的引擎保持缺省；测试注入 typed fakes。Adapter 把缺失 service 映射为 `unavailable`，绝不能映射为 `passed`。

- [ ] **Step 5: 运行 GREEN 并执行全部帮助示例**

`help-examples.test.ts` 使用真实 parser 与 fake services 遍历全部 39 个 definitions。涉及文件系统或平台的示例必须使用 dry-run 或隔离的临时根目录。

```bash
bun test packages/cli/tests/commands/deferred-services.test.ts packages/cli/tests/contract/help-examples.test.ts
```

Expected: 每个文档示例都能解析，并返回声明的 status；0 个示例被跳过。

- [ ] **Step 6: 提交**

```bash
git add packages/cli/src/services/types.ts packages/cli/src/services/default-services.ts packages/cli/src/commands/plugins/index.ts packages/cli/src/commands/skills/index.ts packages/cli/src/commands/workspace/index.ts packages/cli/src/commands/registry.ts packages/cli/tests/contract/help-examples.test.ts packages/cli/tests/commands/deferred-services.test.ts
git commit -m "feat: ✨ expose plugin skill and workspace service ports"
```

---

### Task 12: 打包 CLI 并关闭旧入口

**Files:**
- Create: `scripts/package/package-cli.ts`
- Create: `packages/cli/tests/package/cli-package.test.ts`
- Modify: `package.json`
- Modify: `README.md`
- 保持不变，留给清理计划复核：`.claude/scripts/_shared/cli/**`
- 保持不变，留给清理计划复核：`.claude/scripts/_shared/bin/kata`
- 只在 package staging 中生成，不提交：`dist/command-registry.json`

**Interfaces:**
- Consumes: Tasks 1-11。
- Produces: `dist/cli/kata-<version>.tgz`、唯一可执行入口、生成的命令文档，以及可复现的 source commit/input tree SHA-256。

- [ ] **Step 1: 写安装包失败测试**

单元测试先用临时 Git fixture 检查：只从显式 ref 取输入、拒绝影响打包内容的未提交路径、归档顺序与时间戳稳定、相同 ref 两次摘要相同。真实仓库的干净 HEAD 安装验收留到实现提交之后。

- [ ] **Step 2: 运行 RED**

```bash
bun test packages/cli/tests/package/cli-package.test.ts --timeout 60000
```

Expected: 失败，因为 package script 尚不存在。

- [ ] **Step 3: 实现确定性 package script**

归档内容只包含指定 Git ref 中的 bundled CLI、package metadata、许可证、生成的命令文档，以及 `packages/contracts/package.json.files` 明确列出的 runtime schema 资产，不从当前工作树偷读文件。版本只读取该 ref 的根 `package.json`，时间戳统一规范化，最后输出 archive path、version、source commit、input tree SHA-256、file count 与 archive SHA-256。未指定 ref、ref 不可解析，或工作树中存在影响打包输入的未提交路径时立即拒绝。

- [ ] **Step 4: 运行实现与单元验收**

```bash
bun test packages/contracts/tests packages/cli/tests packages/dtstack/tests --timeout 30000
bun run contracts:generate
bun run contracts:generate --check
bun run type-check
bun ./packages/cli/bin/kata --help
bun ./packages/cli/bin/kata help cases export --format json
```

Expected: 0 fail；11 个 groups、39 个 leaves；生成文件无漂移；help 包含 effects、examples 与 exit codes；临时 fixture 的确定性打包测试通过。

- [ ] **Step 5: 提交**

```bash
git add scripts/package/package-cli.ts packages/cli/tests/package/cli-package.test.ts package.json README.md
git commit -m "build: 📦 package the unified kata CLI"
```

- [ ] **Step 6: 从已提交的干净 HEAD 做真实安装验收**

```bash
test -z "$(git status --porcelain=v1 --untracked-files=all)"
SOURCE_REF="$(git rev-parse HEAD)"
bun scripts/package/package-cli.ts --ref "$SOURCE_REF"
KATA_PACKAGE_SOURCE_REF="$SOURCE_REF" bun test packages/cli/tests/package/cli-package.test.ts --timeout 60000
```

Expected: tgz 的 source commit 等于 `SOURCE_REF`，input tree 与 archive 摘要可复算；安装到临时 prefix 后，`kata --version`、根/组/叶帮助和 JSON 帮助都通过；不存在 `dtstack-cli` 或隐藏入口。该验收不再修改任何 tracked 文件。
