# kata 清理与迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不碰用户现有改动的前提下，把旧用例命名、运行目录、Skill/CLI 路径和历史垃圾迁入已确认结构，并用可复核、带摘要、不可临时扩张的计划完成删除。

**Architecture:** 通用清理引擎只处理 Git 已跟踪的明确路径。扫描器生成稳定分类，计划生成器固定基准 commit、dirty 快照、类型、SHA-256、引用和动作；用户复核后，apply 在第一次写入前完成全量预检，只执行计划中的动作，并在独占阶段写执行记录与报告。用例改名和旧 run 转换由一次性 migration 生成明确映射，再交给通用引擎；无法判断业务价值、需求名称或有效运行的数据只进入 `needs_review`。

**Tech Stack:** Bun 1.3.8、TypeScript 6、JSON Schema 2020-12、AJV、Git、SHA-256、YAML、JSZip、kata CLI。

**Depends on:** [CLI 与 contracts 实施计划](2026-07-10-kata-cli-contracts-implementation.md) Task 1–12、[Skill 与插件实施计划](2026-07-10-kata-skills-plugins-implementation.md) Task 0–13，以及 [格式与内容治理实施计划](2026-07-10-kata-content-governance-implementation.md) Task 1–10 的本地实现。真实 Codex 与两个核心 live gate 只在路线图最终验收执行，不阻塞本地清理引擎。

## 固定安全模型

### 分类优先级

分类器按以下顺序停止：

1. `needs_review`：主工作树 dirty/untracked、唯一现场资料、内容或用途不明、来源冲突；
2. `keep`：当前正式输入、知识、用例、必要运行记录或仍有有效引用；
3. `migrate_then_delete`：新位置已定义但引用和验证尚未完成；
4. `delete`：可重建、重复、失效且引用检查通过。

后置规则不得覆盖 `needs_review`。这些条目保存在计划的独立清单中，不能进入 `actions`；它们可以与已确认动作共存，但最终仍要列入 `unresolved_blockers`。

### 计划与动作

`CleanupPlan.v1` 顶层：

```ts
export interface CleanupPlan {
  schema_version: 1;
  plan_id: string;
  created_at: string;
  repo_root: ".";
  baseline_commit: string;
  dirty_snapshot_path: "docs/migrations/kata-v4/preexisting-dirty.json";
  dirty_snapshot_sha256: string;
  policy_sha256: string;
  control_paths: {
    pre_apply: string[];
    execution_output: string[];
  };
  actions: CleanupAction[];
  keep: CleanupKeepItem[];
  needs_review: CleanupReviewItem[];
  untracked_summary: CleanupUntrackedSummary;
  summary: CleanupSummary;
}

export interface CleanupActionBase {
  action_id: string;
  order: number;
  source: string;
  source_type: "file" | "symlink";
  tracked: true;
  source_sha256: string;
  classification: "migrate_then_delete" | "delete";
  reason_code: string;
  reason: string;
  reference_paths: string[];
  reference_set_sha256: string;
  verifier: string[];
}

export interface CleanupMoveAction extends CleanupActionBase {
  action: "move";
  destination: string;
  destination_must_be_absent: true;
}

export interface CleanupDeleteAction extends CleanupActionBase {
  action: "delete";
}

export interface CleanupRewriteAction extends CleanupActionBase {
  action: "rewrite";
  replacement_path: string;
  replacement_sha256: string;
  result_sha256: string;
}

export type CleanupAction =
  | CleanupMoveAction
  | CleanupDeleteAction
  | CleanupRewriteAction;

export interface CleanupReviewItem {
  path: string;
  path_type: "file" | "symlink" | "directory" | "missing";
  tracked: boolean;
  source_sha256: string | null;
  classification: "needs_review";
  protected_by:
    | "dirty_snapshot"
    | "untracked_snapshot"
    | "ambiguous_content"
    | "source_conflict";
  reason_code: string;
  reason: string;
  reference_paths: string[];
  reference_set_sha256: string;
}

export interface CleanupKeepItem {
  path: string;
  source_type: "file" | "symlink";
  source_sha256: string;
  classification: "keep";
  reason_code: string;
  reason: string;
  reference_paths: string[];
  reference_set_sha256: string;
}

export interface CleanupUntrackedSummary {
  count: number;
  roots: string[];
  roots_sha256: string;
}

export interface CleanupSummary {
  keep_count: number;
  action_count: number;
  migrate_then_delete_count: number;
  move_count: number;
  rewrite_count: number;
  delete_count: number;
  needs_review_count: number;
  untracked_count: number;
}

export interface CleanupPreflightCheck {
  check:
    | "baseline"
    | "dirty_snapshot"
    | "policy"
    | "control_paths"
    | "source"
    | "reference_set"
    | "destination"
    | "payload";
  subject: string;
  status: "passed" | "failed";
  error_code: string | null;
}

export interface CleanupPreflightResult {
  status: "passed" | "failed";
  checked_at: string;
  checks: CleanupPreflightCheck[];
}

export interface CleanupActionResult {
  action_id: string;
  order: number;
  status: "passed" | "failed" | "not_run";
  started_at: string | null;
  finished_at: string | null;
  result_sha256: string | null;
  error_code: string | null;
}

export interface CleanupJournalRef {
  path: string;
  sha256: string;
}

export interface CleanupConfirmation {
  schema_version: 1;
  plan_id: string;
  plan_sha256: string;
  confirmed_at: string;
  confirmation_ref: string;
}
```

计划不对目录执行递归 move/delete；目录内每个已跟踪 file/symlink 都是独立动作，空目录由文件系统自然消失。symlink 摘要基于 link text，不跟随目标。rewrite 的完整替换内容写入 `docs/migrations/kata-v4/payloads/<action-id>`，计划同时固定 payload 摘要；apply 不重新运行迁移算法。所有路径必须是 NFC 的仓库相对路径，禁止绝对路径、`..`、NUL 与 symlink 穿越。

### 执行报告

`CleanupReport.v1` 固定记录：

```ts
export interface CleanupReport {
  schema_version: 1;
  plan_id: string;
  baseline_commit: string;
  started_at: string;
  finished_at: string;
  apply_status: "passed" | "failed";
  overall_status: "passed" | "needs_input" | "failed";
  preflight: CleanupPreflightResult;
  actions: CleanupActionResult[];
  confirmation: CleanupConfirmation;
  journal: CleanupJournalRef;
  unresolved_blockers: CleanupReviewItem[];
  git_diff_paths: string[];
  summary: CleanupSummary;
}
```

三个 schema 都要完整定义上述嵌套类型、`required`、枚举和 `additionalProperties: false`，不得依赖其他子计划里的临时类型。确认文件只保存 plan ID、plan SHA、确认时间和可定位到本次用户回复的简短引用，不保存整段对话。报告不保存文件正文、JMX 属性值、token、cookie、数据库地址或账号。执行记录关闭并完成 fsync 后，报告写入其仓库相对路径和最终 SHA-256。失败时精确记录停在哪个 action；只有全部 verifier 通过才能 `apply_status=passed`。只要 `unresolved_blockers` 非空，`overall_status` 必须是 `needs_input`，不能用计划内动作成功表示全仓清理完成。

### CLI 语义

```text
kata workspace clean --dry-run [--format text|json]
kata workspace clean --plan <path>
kata workspace clean --apply <path>
kata workspace clean --verify-boundary <path>
```

- `--dry-run`：只扫描和输出，不写任何文件；
- `--plan`：只写指定计划和可读预览，不移动、不删除；
- `--apply`：只接受现有计划，禁止重新扫描后增补动作；
- `--verify-boundary`：重新读取计划记录的主工作树，核对 status 摘要与实现分支 diff 是否碰到保护路径，只读不写；
- 四种模式互斥；无参数不执行清理；
- apply 不调用 `git add`、`git commit` 或模糊 glob；
- apply 必须在没有其他写入代理的独占阶段运行。
- apply 动作全部成功且无 blocker 时返回 `0 + passed/passed`；动作全部成功但仍有 needs_review 时返回 `4 + passed/needs_input`。这两种组合都表示 plan 已消费，不能重跑；写入途中失败才返回 failed，并保留 journal/report。

控制文件名由 plan 路径唯一推导：`<stem>-plan.json` 对应 `<stem>-plan.md`、`<stem>-confirmation.json`、`<stem>-journal.json`、`<stem>-report.json` 与 `<stem>-report.md`。因此 `cleanup-plan.json` 产生 `cleanup-confirmation.json`，`cleanup-finalize-plan.json` 产生 `cleanup-finalize-confirmation.json`；CLI 不接受另一个可覆盖任意路径的 report 参数。apply 前必须读取确认文件，核对 plan ID 与 plan SHA；缺失或不一致时零写入退出。

---

### Task 1: 扩展 Cleanup contracts

**Files:**
- Create: `packages/contracts/schemas/v1/CleanupPlan.v1.schema.json`
- Create: `packages/contracts/schemas/v1/CleanupConfirmation.v1.schema.json`
- Create: `packages/contracts/schemas/v1/CleanupReport.v1.schema.json`
- Create: `packages/contracts/tests/fixtures/v1/CleanupPlan.json`
- Create: `packages/contracts/tests/fixtures/v1/CleanupConfirmation.json`
- Create: `packages/contracts/tests/fixtures/v1/CleanupReport.json`
- Modify: `packages/contracts/scripts/generate-types.ts`
- Modify: `packages/contracts/src/validators.ts`
- Modify: `packages/contracts/src/generated/v1.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/contracts/tests/schema-validation.test.ts`
- Modify: `packages/contracts/tests/generated-types.test.ts`

**Interfaces:**
- 扩展：在 `ContractName` 与 `ContractTypeMap` 中注册 `CleanupPlan`、`CleanupConfirmation`、`CleanupReport`。
- 产出：供计划生成器、执行引擎和报告使用的严格 v1 类型。

- [ ] **Step 1: 写失败的 schema 测试**

合法 fixture 必须通过；缺摘要、非法路径、目录递归动作、delete 带 destination、move 缺 destination、rewrite 缺 replacement/result 摘要、`keep`/`needs_review` 混入 actions、keep 缺引用摘要、确认文件缺 plan SHA，以及额外字段必须失败。重复或非递增 order 属于 Task 4 的 semantic validator，不伪装成 JSON Schema 能力。

Run:

```bash
bun test packages/contracts/tests/schema-validation.test.ts packages/contracts/tests/generated-types.test.ts
```

Expected: FAIL；三个 contract 尚未注册。

- [ ] **Step 2: 写严格 schema 并重新生成类型**

三个 schema 使用 `additionalProperties: false`、`schema_version const 1`，并逐层声明本计划固定的全部嵌套类型。SHA-256 为 64 位小写十六进制；计划 actions 按 order 唯一递增的约束由运行时语义校验器补充。

- [ ] **Step 3: 验证 GREEN 与生成无漂移**

Run:

```bash
bun run contracts:generate
bun test packages/contracts/tests --timeout 30000
bun run contracts:generate --check
```

Expected: 0 fail；第二次生成无 diff。

- [ ] **Step 4: 提交**

```bash
git add packages/contracts
git commit -m "feat: ✨ add cleanup plan contracts"
```

---

### Task 2: 实现路径安全、摘要与 dirty 边界

**Files:**
- Create: `packages/cli/src/workspace/cleanup/path-safety.ts`
- Create: `packages/cli/src/workspace/cleanup/hash.ts`
- Create: `packages/cli/src/workspace/cleanup/dirty-boundary.ts`
- Create: `packages/cli/src/workspace/cleanup/verify-boundary.ts`
- Create: `packages/cli/tests/workspace/clean-path-safety.test.ts`
- Create: `packages/cli/tests/workspace/clean-dirty-boundary.test.ts`
- Create: `packages/cli/tests/workspace/clean-hash.test.ts`
- Create: `packages/cli/tests/fixtures/cleanup/safety/**`

**Interfaces:**

`DirtySnapshot` 与 `DirtySnapshotEntry` 直接导入内容治理 Task 1 固定的 `packages/cli/src/workspace/git-files.ts`；不得为清理器再写一套 status parser。

```ts
export interface CleanupBoundaryResult {
  status: "passed" | "failed";
  dirty_snapshot_matches: boolean;
  dirty_snapshot_sha256: string;
  protected_intersections: string[];
  issues: Array<{ code: string; path: string; message: string }>;
}

export function resolveSafeRepoPath(repoRoot: string, relativePath: string): string;
export function hashTrackedNode(repoRoot: string, relativePath: string): Promise<string>;
export function hashReferenceSet(paths: readonly string[]): string;
export function intersectsProtectedPath(path: string, snapshot: DirtySnapshot): boolean;
export async function verifyProtectedBoundary(input: {
  plan: CleanupPlan;
  implementationDiffPaths: readonly string[];
}): Promise<CleanupBoundaryResult>;
```

- [ ] **Step 1: 写失败测试**

覆盖绝对路径、`..`、空路径、NUL、Unicode 非 NFC、仓库外 symlink、目录内 symlink 穿越、重命名旧/新路径、deleted 路径和 untracked 根的子路径。

Run:

```bash
bun test packages/cli/tests/workspace/clean-path-safety.test.ts packages/cli/tests/workspace/clean-dirty-boundary.test.ts packages/cli/tests/workspace/clean-hash.test.ts
```

Expected: FAIL；安全模块不存在。

- [ ] **Step 2: 实现不跟随 symlink 的解析与摘要**

每一级使用 `lstat`，只允许最终 symlink 作为计划对象；父目录任何 symlink 都拒绝。计划动作只接受普通文件和 symlink，拒绝目录、设备文件、socket 与 FIFO。

- [ ] **Step 3: 实现保护集**

读取内容治理计划生成的 `preexisting-dirty.json`。主工作树 renamed 同时保护 from/to；untracked directory 保护完整子树；计划文档本身可在隔离 worktree 中更新，但不得覆盖主工作树保护路径。

- [ ] **Step 4: 验证并提交**

Run:

```bash
bun test packages/cli/tests/workspace/clean-path-safety.test.ts packages/cli/tests/workspace/clean-dirty-boundary.test.ts packages/cli/tests/workspace/clean-hash.test.ts
```

Expected: 0 fail；所有逃逸路径在读取或写入前被拒绝。

```bash
git add packages/cli/src/workspace/cleanup packages/cli/tests/workspace packages/cli/tests/fixtures/cleanup/safety
git commit -m "feat: ✨ enforce cleanup path safety"
```

---

### Task 3: 建立引用图与保守分类器

**Files:**
- Create: `config/cleanup-rules.yaml`
- Create: `packages/cli/src/workspace/cleanup/references.ts`
- Create: `packages/cli/src/workspace/cleanup/classify.ts`
- Create: `packages/cli/tests/workspace/clean-references.test.ts`
- Create: `packages/cli/tests/workspace/clean-classify.test.ts`
- Create: `packages/cli/tests/fixtures/cleanup/references/**`

**Interfaces:**

```ts
export interface ReferenceEdge {
  from: string;
  to: string;
  kind:
    | "import"
    | "link"
    | "command"
    | "manifest"
    | "metadata"
    | "template"
    | "symlink"
    | "literal_path";
  location: { line?: number; column?: number };
}

export interface ReferenceGraph {
  nodes: string[];
  edges: ReferenceEdge[];
  unresolved_dynamic_references: Array<{
    from: string;
    expression: string;
    location: { line?: number; column?: number };
  }>;
}

export interface ClassificationInput {
  path: string;
  source_type: "file" | "symlink" | "missing";
  tracked: boolean;
  dirty_snapshot: DirtySnapshot;
  incoming_references: ReferenceEdge[];
  has_unresolved_dynamic_reference: boolean;
  rule_id: string | null;
  unique_content: boolean | null;
  replacement_path: string | null;
}

export interface CleanupClassification {
  classification: "needs_review" | "keep" | "migrate_then_delete" | "delete";
  reason_code: string;
  reason: string;
  required_verifiers: string[];
}

export function buildReferenceGraph(repoRoot: string, trackedPaths: readonly string[]): ReferenceGraph;
export function classifyCandidate(input: ClassificationInput): CleanupClassification;
```

- [ ] **Step 1: 写失败测试**

覆盖 TS/JS/Python/Shell import 或调用、Markdown 相对链接、Skill 加载路径、CLI help、schema/metadata/template、manifest、symlink 与 `workspace/**` 跨目录引用。动态拼接无法静态解析时必须标记 needs_review。

Run:

```bash
bun test packages/cli/tests/workspace/clean-references.test.ts packages/cli/tests/workspace/clean-classify.test.ts
```

Expected: FAIL；引用图和分类器不存在。

- [ ] **Step 2: 实现引用扫描**

扫描器只读取已跟踪文件；二进制通过 metadata/manifest/Markdown 引用进入图，不全文搜索。JMX 只以路径作为节点，不读取或索引属性值。

- [ ] **Step 3: 定义清理规则**

`config/cleanup-rules.yaml` 只列可解释类别：

- legacy Skill/runtime trees；
- replaced CLI/schema paths；
- 固定用例产物文件名；
- 旧运行目录结构；
- `.DS_Store`、`.bak`、cache、lock、普通 log；
- 重复生成的 HTML；
- stale symlink。

每条规则有 reason_code、classification、required_verifiers；禁止一个规则匹配整个 `workspace/**`。

- [ ] **Step 4: 实现分类优先级并验证**

Run:

```bash
bun test packages/cli/tests/workspace/clean-references.test.ts packages/cli/tests/workspace/clean-classify.test.ts
```

Expected: 0 fail；dirty/unique/ambiguous 永远是 needs_review；无引用本身不能直接推出 delete。

- [ ] **Step 5: 提交**

```bash
git add config/cleanup-rules.yaml packages/cli/src/workspace/cleanup packages/cli/tests/workspace packages/cli/tests/fixtures/cleanup/references
git commit -m "feat: ✨ classify cleanup candidates conservatively"
```

---

### Task 4: 实现稳定的计划生成器与可读预览

**Files:**
- Create: `packages/cli/src/workspace/cleanup/plan.ts`
- Create: `packages/cli/src/workspace/cleanup/report.ts`
- Create: `packages/cli/tests/workspace/clean-plan.test.ts`
- Create: `packages/cli/tests/fixtures/cleanup/plans/**`

**Interfaces:**

```ts
export type CleanupCandidateAction =
  | { action: "move"; destination: string }
  | { action: "delete" }
  | {
      action: "rewrite";
      replacement_path: string;
      replacement_sha256: string;
      result_sha256: string;
    };

export interface CleanupCandidate {
  source: string;
  source_type: "file" | "symlink" | "missing";
  tracked: boolean;
  classification: CleanupClassification;
  reference_paths: string[];
  proposed_action: CleanupCandidateAction | null;
}

export interface BuildCleanupPlanInput {
  repoRoot: string;
  planPath: string;
  scope: "migration" | "finalize";
  baselineCommit: string;
  dirtySnapshotPath: string;
  policyPath: string;
  preApplyControlFiles: readonly string[];
  executionOutputFiles: readonly string[];
  candidates: readonly CleanupCandidate[];
  now: string;
}

export async function buildCleanupPlan(input: BuildCleanupPlanInput): Promise<CleanupPlan>;
export function renderCleanupPlanMarkdown(plan: CleanupPlan): string;
export function deriveCleanupArtifactPaths(planPath: string): {
  previewPath: string;
  confirmationPath: string;
  journalPath: string;
  reportJsonPath: string;
  reportMarkdownPath: string;
};
```

- [ ] **Step 1: 写失败测试**

断言相同输入得到逐字相同 actions、action_id、摘要和 Markdown 排序；`created_at` 和 plan_id 由注入值控制。summary 每项必须等于 keep/actions/needs_review/untracked 的实时分类数量。`policy_sha256` 来自 `policyPath`；`control_paths.pre_apply` 与 `execution_output` 分别来自去重排序后的两份输入，且不得重叠；`untracked_summary` 只从 dirty snapshot 派生。冲突 destination、重复 action、无 verifier、dirty source、受保护 destination、plan path 与 scope 不匹配均拒绝。另以 `cleanup-plan.json` 与 `cleanup-finalize-plan.json` 断言五个派生控制路径准确；拒绝不以 `-plan.json` 结尾、绝对路径和目录穿越。

Run:

```bash
bun test packages/cli/tests/workspace/clean-plan.test.ts
```

Expected: FAIL；计划生成器不存在。

- [ ] **Step 2: 实现不可变计划**

actions 按 `order`、source，以及 destination 或 replacement_path 稳定排序；keep 与 needs_review 也按规范化路径稳定排序。`action_id` 由规范化动作内容摘要生成。计划生成器不接受未跟踪 source；untracked 仅进入数量与根路径摘要。rewrite payload 必须位于 `control_paths.pre_apply`，其摘要在生成计划时固定；journal/report 只能位于 `execution_output`。

- [ ] **Step 3: 实现 Markdown 预览**

预览分为 keep/migrate/delete/needs_review，展示相对路径、原因、目标、引用数量和 verifier；不展示文件正文或敏感内容。

- [ ] **Step 4: 验证并提交**

Run:

```bash
bun test packages/cli/tests/workspace/clean-plan.test.ts
```

Expected: 0 fail；连续生成两次仅在显式注入不同时间时 metadata 不同，actions 不漂移。

```bash
git add packages/cli/src/workspace/cleanup/plan.ts packages/cli/src/workspace/cleanup/report.ts packages/cli/tests/workspace/clean-plan.test.ts packages/cli/tests/fixtures/cleanup/plans
git commit -m "feat: ✨ generate immutable cleanup plans"
```

---

### Task 5: 实现全量预检、独占 apply 与执行记录

**Files:**
- Create: `packages/cli/src/workspace/cleanup/preflight.ts`
- Create: `packages/cli/src/workspace/cleanup/apply.ts`
- Create: `packages/cli/src/workspace/cleanup/journal.ts`
- Create: `packages/cli/tests/workspace/clean-apply.test.ts`
- Create: `packages/cli/tests/fixtures/cleanup/apply/**`

**Interfaces:**

```ts
export async function preflightCleanupPlan(input: {
  repoRoot: string;
  plan: CleanupPlan;
  sourceWorktreeDirtySnapshot: DirtySnapshot;
  executionWorktreeDirtyPaths: readonly string[];
}): Promise<CleanupPreflightResult>;

export type CleanupApplyOutcome =
  | {
      kind: "preflight_rejected";
      preflight: CleanupPreflightResult;
      report: null;
    }
  | {
      kind: "executed";
      preflight: CleanupPreflightResult;
      report: CleanupReport;
    };

export async function applyCleanupPlan(input: {
  repoRoot: string;
  planPath: string;
  lockPath: string;
}): Promise<CleanupApplyOutcome>;
```

- [ ] **Step 1: 写失败测试**

必须覆盖：

- baseline commit、主工作树 dirty snapshot、policy、confirmation 的 plan ID/SHA、source type/hash、references、destination、rewrite payload 任一改变；
- 执行 worktree 出现 `control_paths.pre_apply` 以外的未提交路径；
- 任何一个后置 action 预检失败时，前置 action 也未写入；
- lock 已存在时拒绝；
- dry-run/plan 零写入；
- apply 不执行计划外路径；
- 预检失败不创建 journal/report；中途 I/O 失败写执行记录和 failed report，不继续后续动作；
- 不自动暂存 Git。

Run:

```bash
bun test packages/cli/tests/workspace/clean-apply.test.ts
```

Expected: FAIL；preflight/apply 不存在。

- [ ] **Step 2: 实现第一次写入前的全量预检**

预检重新验证整个 action set、确认文件与全部 verifier 的前置条件。主工作树 dirty 状态必须与用户复核时相同；执行 worktree 的未提交路径必须逐项等于 `control_paths.pre_apply`，`execution_output` 在此时必须全部不存在。任一失败返回 `preflight_rejected`，不创建 journal/report，文件树哈希与 git diff 保持不变。apply 不重新分类、不补动作。每个 rewrite 完成后立即核对 `result_sha256`，不一致则停止后续动作并写 failed 执行记录与报告。

- [ ] **Step 3: 实现独占执行**

通过 `git rev-parse --git-path kata-cleanup.lock` 找到所有 worktree 共享的 Git lock 路径，并用原子创建保证单执行者。预检全量通过后才按 plan stem 写派生的 journal；每个动作完成后 fsync 更新，结束后写含 confirmation 与 journal SHA 的 report。move 使用同文件系统 rename，rewrite 使用已校验 payload 的 sibling temp + fsync + rename，delete 只处理精确 source。

发生 I/O 失败时停止，保留执行记录并输出可继续诊断的 action_id。不要声称事务已回滚；恢复前重新生成计划并由用户复核。

- [ ] **Step 4: 验证并提交**

Run:

```bash
bun test packages/cli/tests/workspace/clean-apply.test.ts
```

Expected: 0 fail；preflight failure 零写入；运行失败不执行后续动作；无 `git add`。

```bash
git add packages/cli/src/workspace/cleanup packages/cli/tests/workspace/clean-apply.test.ts packages/cli/tests/fixtures/cleanup/apply
git commit -m "feat: ✨ apply reviewed cleanup plans safely"
```

---

### Task 6: 接入 `kata workspace clean` 与完整帮助

**Files:**
- Modify: `packages/cli/src/commands/workspace/index.ts`
- Modify: `packages/cli/src/services/types.ts`
- Modify: `packages/cli/src/services/default-services.ts`
- Create: `packages/cli/tests/commands/workspace-clean.test.ts`
- Modify: `packages/cli/tests/contract/help.test.ts`
- Modify: `packages/cli/tests/contract/help-examples.test.ts`

**Interfaces:**
- Implements: CLI 计划中 `WorkspaceService.clean`。
- Returns: 导入 CLI Task 11 的 `WorkspaceCleanResult`，只返回 plan/report 路径、ID、状态、数量和 needs_review；持久化的 `CleanupPlan`、`CleanupReport` 仍由严格 contracts 校验，不在本计划重复声明 service DTO。
- Public leaf: `workspace clean`，不增加命令数量。

- [ ] **Step 1: 写 parser/帮助失败测试**

断言 dry-run/plan/apply/verify-boundary 互斥；无模式退出 2；help 包含用途、分类、安全边界、派生 confirmation/journal/report 文件、参数、选项、输出、退出码、示例和相关命令。apply 示例必须先生成匹配的 confirmation。

Run:

```bash
bun test packages/cli/tests/commands/workspace-clean.test.ts packages/cli/tests/contract/help.test.ts packages/cli/tests/contract/help-examples.test.ts
```

Expected: FAIL；真实 service 尚未接入。

- [ ] **Step 2: 接入 handler**

`--format json` stdout 只包含一个 `CliResult`。扫描进度和 lock 信息进入 stderr；错误不得包含文件正文。

- [ ] **Step 3: 验证三种模式**

Run:

```bash
bun test packages/cli/tests/commands/workspace-clean.test.ts packages/cli/tests/contract/help.test.ts packages/cli/tests/contract/help-examples.test.ts
bun ./packages/cli/bin/kata workspace clean --help
```

Expected: 0 fail；help 示例可通过真实 parser 与隔离 fake filesystem。

- [ ] **Step 4: 提交**

```bash
git add packages/cli/src/commands/workspace packages/cli/src/services packages/cli/tests/commands/workspace-clean.test.ts packages/cli/tests/contract
git commit -m "feat: ✨ expose reviewed workspace cleanup"
```

---

### Task 7: 停止继续制造历史垃圾

**Files:**
- Modify: `packages/cli/src/domain/runs/publish.ts`
- Modify: `packages/cli/src/domain/runs/prune.ts`
- Modify: `packages/cli/src/commands/runs/index.ts`
- Modify: `packages/cli/src/services/types.ts`
- Modify: `packages/cli/src/services/default-services.ts`
- Create: `packages/cli/tests/domain/run-retention.test.ts`
- Create: `packages/cli/tests/workspace/no-new-debris.test.ts`
- Verify: `tests/runtime/fixtures/knowledge-curate/**`

**Interfaces:**
- Publish: 更新当前 run 的 schema/handoff，不复制 `_shared/published-reports`。
- Prune：默认只生成 cleanup candidate；`--apply <cleanup-plan>` 只能委托同一套已复核执行引擎。
- Knowledge: Skill Task 8 已关闭 `.history/*.bak`，本 Task 只做防回归验证，不再拥有其脚本。

- [ ] **Step 1: 写失败测试**

测试 published tree copy、未经计划直接删除 run，以及 knowledge fixture 生成 bak 三类旧行为。新断言要求这些副作用不存在。

Run:

```bash
bun test packages/cli/tests/domain/run-retention.test.ts packages/cli/tests/workspace/no-new-debris.test.ts tests/runtime/fixtures/knowledge-curate
```

Expected: FAIL；旧行为尚未全部关闭。

- [ ] **Step 2: 修改最低持久层**

run prune 返回候选及理由；只有用户提供 feature 内、通过 schema 校验且摘要未漂移的 CleanupPlan 时，才委托执行引擎删除。本任务用真实服务替换 CLI Task 9 中暂不可用的执行分支。publish 只写 run 内正式 JSON/Handoff，不得为了通过测试保留隐藏副本。

- [ ] **Step 3: 验证**

Run:

```bash
bun test packages/cli/tests/domain/run-retention.test.ts packages/cli/tests/workspace/no-new-debris.test.ts tests/runtime/fixtures/knowledge-curate
```

Expected: 0 fail；重复执行不新增 backup/published tree。

- [ ] **Step 4: 提交**

```bash
git add packages/cli/src/domain/runs/publish.ts packages/cli/src/domain/runs/prune.ts packages/cli/src/commands/runs/index.ts packages/cli/src/services/types.ts packages/cli/src/services/default-services.ts packages/cli/tests/domain/run-retention.test.ts packages/cli/tests/workspace/no-new-debris.test.ts
git commit -m "fix: 🐛 stop generating disposable history files"
```

---

### Task 8: 生成 FeatureMetadata v1 与同名用例迁移映射

**Files:**
- Create: `scripts/migrations/kata-v4/metadata/scan.ts`
- Create: `scripts/migrations/kata-v4/metadata/map-v2-to-v1.ts`
- Create: `scripts/migrations/kata-v4/metadata/build-actions.ts`
- Create: `scripts/migrations/kata-v4/cases/scan.ts`
- Create: `scripts/migrations/kata-v4/cases/resolve-name.ts`
- Create: `scripts/migrations/kata-v4/cases/build-actions.ts`
- Create: `tests/migrations/kata-v4/feature-metadata.test.ts`
- Create: `tests/migrations/kata-v4/case-artifacts.test.ts`
- Create: `docs/migrations/kata-v4/feature-metadata-map.json`
- Create: `docs/migrations/kata-v4/case-artifact-map.json`
- 复核后生成：`cleanup-plan.json` 中逐项列出的 workspace rewrite/move 动作与 payload

**Interfaces:**

```ts
export interface FeatureMetadataMigration {
  source_path: string;
  source_schema: "FeatureMetadata@2";
  feature_id: string;
  mapped_fields: Record<string, { source: string; value_sha256: string }>;
  unmapped_nonempty_fields: string[];
  target: FeatureMetadata;
  status: "ready" | "needs_review";
  reason: string;
}

export interface CaseArtifactMigration {
  feature_id: string;
  feature_dir: string;
  current_markdown?: string;
  current_xmind?: string;
  requirement_name_candidates: Array<{
    value: string;
    source: "metadata" | "prd" | "page" | "source" | "archive_suite" | "user";
    source_ref: string;
  }>;
  selected_requirement_name?: string;
  target_stem?: string;
  status: "ready" | "needs_review";
  reason: string;
}
```

- [ ] **Step 1: 写 metadata 字段迁移失败测试**

固定映射：

- `feature_id`：v2 `feature_id` 与 `id` 相同才采用；
- `project`：从 `workspace/<project>/` 精确目录获得；
- `version`：从最近的 `features/<version>/` 目录获得；
- `requirement.name/filename_stem`：来自本 Task 已确认的需求名称；
- `artifacts`：写入同 stem Markdown/XMind 的目标路径，不代表缺失文件已经生成；
- `paths.feature_dir/automation_dir`：从实际目录计算并做相对路径安全检查；
- v2 `case_drafting`/`automation` 中仍有效的 intent、coverage、handoff 路径分别迁入新正式文件或引用。

任何非空 v2 字段没有明确目标时写入 `unmapped_nonempty_fields` 并标记 needs_review；不得静默丢弃 `modules/customers/versions/owners/inputs/relates_to/status/timestamps/emits` 或工作流数据。用户确认某类冗余字段可舍弃时，把确认内容及其摘要写入映射规则，再重新生成。

Run:

```bash
bun test tests/migrations/kata-v4/feature-metadata.test.ts
```

Expected: FAIL；v2 mapper 尚不存在。

- [ ] **Step 2: 写用例文件迁移失败测试**

覆盖中文/ASCII/数字规范化、空格标点去除、大小写/NFC 冲突、64 字节 ID 截断、180 字节上限、Markdown/XMind 同 stem、metadata path 更新和全部 tracked 引用更新。

Run:

```bash
bun test tests/migrations/kata-v4/case-artifacts.test.ts
```

Expected: FAIL；一次性 case migration 尚不存在。

- [ ] **Step 3: 扫描实时 metadata 与固定名称文件**

扫描只依 schema、metadata 与精确旧路径，不把当前盘点数量写成验收常量。计划写作时观察到 82 份 FeatureMetadata@2、58 个 `archive.md`、38 个 `cases.xmind`、1 个 `archive.draft.md` 和 318 个引用仅作为风险基线；执行以实时 tracked 清单为准。

- [ ] **Step 4: 保守选择需求名称**

收集最新 PRD、当前页面、相关源码和 metadata 中明确保存的 requirement name。可同时读取的现行材料必须一致；任意两类不一致、时间先后不清或只有 `suite_name/display_name` 猜测时，条目进入 needs_review。只有一个明确现行来源时可以采用；用户明确确认值可解决分歧。不得按固定优先级覆盖冲突，也不得选择“看起来更像需求名”的值。

- [ ] **Step 5: 生成两份映射并运行测试**

Run:

```bash
bun scripts/migrations/kata-v4/cases/scan.ts --output docs/migrations/kata-v4/case-artifact-map.json
bun scripts/migrations/kata-v4/metadata/scan.ts --case-map docs/migrations/kata-v4/case-artifact-map.json --output docs/migrations/kata-v4/feature-metadata-map.json
bun test tests/migrations/kata-v4/feature-metadata.test.ts tests/migrations/kata-v4/case-artifacts.test.ts
```

Expected: 0 fail；ready metadata 通过真实 FeatureMetadata v1 validator；ready 产物拥有合法、唯一、同 stem 的目标；needs_review 不生成 move/rewrite 动作。

- [ ] **Step 6: 把 ready 映射转换为 CleanupAction**

每个 feature 的 Markdown、XMind、metadata 与引用重写形成同一验证组。若只存在一种产物，只迁移已存在文件，不擅自生成缺失产物；metadata 可以记录另一个预期路径，但 `features check` 必须报告文件缺失，不能声称产物存在。所有 rewrite 使用固化 payload 与 result SHA。

- [ ] **Step 7: 提交映射，不执行**

```bash
git add scripts/migrations/kata-v4/metadata scripts/migrations/kata-v4/cases tests/migrations/kata-v4/feature-metadata.test.ts tests/migrations/kata-v4/case-artifacts.test.ts docs/migrations/kata-v4/feature-metadata-map.json docs/migrations/kata-v4/case-artifact-map.json
git commit -m "docs: 📝 map metadata and requirement-named cases"
```

---

### Task 9: 生成旧运行目录迁移与保留映射

**Files:**
- Create: `scripts/migrations/kata-v4/runs/scan.ts`
- Create: `scripts/migrations/kata-v4/runs/classify.ts`
- Create: `scripts/migrations/kata-v4/runs/build-actions.ts`
- Create: `tests/migrations/kata-v4/run-history.test.ts`
- Create: `docs/migrations/kata-v4/run-history-map.json`
- 复核后生成：`cleanup-plan.json` 中逐项列出的 run move/rewrite/delete 动作与 payload

**Interfaces:**

```ts
export interface RunHistoryMigration {
  feature_id: string;
  source_run_dir: string;
  target_run_id?: string;
  discovered: {
    run_json: boolean;
    result_json: boolean;
    handoff_json: boolean;
    handoff_markdown: boolean;
    allure_results: boolean;
    allure_report: boolean;
    business_record_evidence: string[];
  };
  classification: "keep" | "migrate" | "delete_after_migrate" | "needs_review";
  reason: string;
}
```

- [ ] **Step 1: 写失败测试**

覆盖新 contract 完整 run、唯一失败现场、重复 HTML、Allure raw 有引用、无 run/result 的旧目录、名称冲突和跨 feature 引用。

Run:

```bash
bun test tests/migrations/kata-v4/run-history.test.ts
```

Expected: FAIL；run migration 不存在。

- [ ] **Step 2: 扫描实时旧 run**

计划写作时观察到一个 feature 下 14 个旧 run 目录、437 个 tracked 文件，且没有目录同时具备新 `run.json` 与 `result.json`。执行时重算；缺 schema 数据不得凭目录时间补造 passed 结果。

- [ ] **Step 3: 分类保留价值**

至少保留每个 feature 最近一次经 schema 验证的有效运行，以及仍被引用或唯一说明产品问题的失败运行。重复 Allure HTML 只有在原始结果/正式交付可重建且无引用时才能 delete。`allure-results` 只有必要附件已保留后才能删。

- [ ] **Step 4: 生成映射**

Run:

```bash
bun scripts/migrations/kata-v4/runs/scan.ts --output docs/migrations/kata-v4/run-history-map.json
bun test tests/migrations/kata-v4/run-history.test.ts
```

Expected: 0 fail；无法证明完整性的旧 run 为 needs_review，不进入删除动作。

- [ ] **Step 5: 提交映射，不执行**

```bash
git add scripts/migrations/kata-v4/runs tests/migrations/kata-v4/run-history.test.ts docs/migrations/kata-v4/run-history-map.json
git commit -m "docs: 📝 map legacy run history"
```

---

### Task 10: 生成全仓清理计划并暂停复核

**Files:**
- Create: `scripts/migrations/kata-v4/index.ts`
- Create: `scripts/migrations/kata-v4/build-candidates.ts`
- Create: `tests/migrations/kata-v4/cleanup-plan.test.ts`
- Create: `tests/skills/no-legacy-trees.test.ts`
- Create: `docs/migrations/kata-v4/cleanup-plan.json`
- Create: `docs/migrations/kata-v4/cleanup-plan.md`
- 仅在用户明确复核后创建：`docs/migrations/kata-v4/cleanup-confirmation.json`
- 为每个 rewrite 创建：`docs/migrations/kata-v4/payloads/<action-id>`
- Create: `docs/migrations/kata-v4/action-paths/cases-metadata.paths.txt`
- Create: `docs/migrations/kata-v4/action-paths/runs.paths.txt`
- Create: `docs/migrations/kata-v4/action-paths/legacy-skills.paths.txt`
- Create: `docs/migrations/kata-v4/action-paths/legacy-cli.paths.txt`
- Create: `docs/migrations/kata-v4/action-paths/debris.paths.txt`
- Create: `docs/migrations/kata-v4/action-paths/audit.paths.txt`

**Interfaces:**
- Consumes: case/run maps、legacy Skill/CLI maps、debris classifier、dirty snapshot。
- Produces: 用户首次复核的业务迁移与历史清理 plan；Task 14 的 `finalize` 模式只负责另行复核的一次性迁移工具。

- [ ] **Step 1: 聚合候选**

候选至少覆盖：

- 已由 root `skills/` 和安装包取代的旧 Skill/source/symlink tree；
- 已由 `packages/**` 取代的旧 CLI、schema、hook 和 tests；
- ready 的固定用例文件名及引用；
- ready 的旧 run 迁移与可重建副本；
- knowledge guard 停止生成后确认等价的 `.bak`；
- 非 dirty 且无引用的 `.DS_Store`、cache、lock、普通 log；
- 已被新 package 完整取代的旧脚本；本次新建的 `scripts/migrations/kata-v4/**` 与 tests 不进入首次 apply plan。

当前 dirty 和 untracked 路径只进入 needs_review/untracked_summary。

- [ ] **Step 2: 先提交计划生成器与 RED 排他测试**

`no-legacy-trees.test.ts` 精确断言旧 `.claude/skills` 残留、`.agents/skills`、`.reasonix/skills`、`.hermes/skills` 和旧 CLI source roots 在 apply 后不存在；此时预期 RED。`cleanup-plan.test.ts` 还要固定 `index.ts prepare`、`confirm`、`verify-controls`、`verify-confirmations` 与 `finalize` 五种模式：prepare 排除本轮迁移工具；confirm 只按当前 plan 生成严格确认文件，并拒绝空引用或摘要漂移；传入 `--previous-confirmation` 时还必须在写入前拒绝复用引用和不递增的确认时间；verify-controls 区分等待确认与 apply 前两个阶段；verify-confirmations 只读两组 plan/confirmation/report 原文件，重算 plan SHA，核对三方 plan_id/SHA/确认字段，要求两个 plan_id 与 confirmation_ref 分别不同，要求每次 `confirmed_at >= plan.created_at`，并要求 finalize 确认严格晚于 migration 确认；finalize 只在迁移类 blocker 清空后逐文件枚举三个收尾根，并拒绝审计文档、目录动作和未跟踪 source。verify-confirmations 任一失败都非 0，且不得写文件。

```bash
bun test tests/migrations/kata-v4/cleanup-plan.test.ts
git add scripts/migrations/kata-v4/index.ts scripts/migrations/kata-v4/build-candidates.ts tests/migrations/kata-v4/cleanup-plan.test.ts tests/skills/no-legacy-trees.test.ts
git commit -m "feat: ✨ build the kata cleanup preview"
```

Expected: 计划生成器测试 0 fail；旧目录排他测试仍是 Task 11 明确保留的 RED gate。

- [ ] **Step 3: 在干净 baseline 生成 plan、payload 与 Markdown**

先确认 execution worktree 除 roadmap 记录的外部主工作树改动外没有本地 diff。记录当前 HEAD 为 `baseline_commit`；生成后在用户复核与 apply 前不得提交或修改 HEAD。

Run:

```bash
bun ./packages/cli/bin/kata workspace clean \
  --plan docs/migrations/kata-v4/cleanup-plan.json
```

Expected: 只创建/更新 plan、preview、rewrite payload 和六份稳定排序的 action path manifests；没有 source 被移动、重写或删除。每份动作 manifest 对 move 同时列 source 与 destination，对 rewrite/delete 列精确 source，并包含该组需要提交的 metadata/ref 更新。`audit.paths.txt` 每条只出现一次：列出其余五份 manifest、audit 自身、plan、preview、未来的 confirmation/report/journal 和每个 payload。`control_paths.pre_apply` 精确列 plan、preview、confirmation、payload 与 manifests；`execution_output` 只列 journal 和两份 report。

- [ ] **Step 4: 验证零写入和计划确定性**

Run:

```bash
bun test tests/migrations/kata-v4/cleanup-plan.test.ts packages/cli/tests/workspace/clean-plan.test.ts
bun scripts/migrations/kata-v4/index.ts verify-controls \
  --plan docs/migrations/kata-v4/cleanup-plan.json \
  --phase awaiting-confirmation
git diff --name-status
```

Expected: 0 fail；因为生成器已提交，当前 diff 只包含 `control_paths.pre_apply` 中已经生成的子集，唯一尚不存在的 pre-apply 文件是 confirmation；`execution_output` 全部不存在，也没有计划内 source 的实际动作。

- [ ] **Step 5: 冻结计划，但不提交**

```bash
git rev-parse HEAD
shasum -a 256 docs/migrations/kata-v4/cleanup-plan.json
git status --short
```

Expected: HEAD 等于 plan 中 `baseline_commit`；status 只含 `control_paths.pre_apply` 当前已存在的子集。不要暂存或提交 plan，否则 baseline 失效并必须重新生成、重新复核。

- [ ] **Step 6: 强制用户复核点**

停止执行并向用户报告：

- migrate/delete/needs_review/untracked 各项数量；
- 用例命名 needs_review 清单；
- 旧 run needs_review 清单；
- 当前 dirty/untracked 保护根；
- 每项删除的原因与替代内容；
- 计划路径、plan_id、baseline commit、SHA-256。

没有用户对这份具体计划的明确确认，不得进入 Task 11。此前对总体设计或本实施计划的确认不能代替这一步。

- [ ] **Step 7: 只在用户确认后写入结构化确认文件**

执行者把当前用户回复的任务内引用写入环境变量；它只用于定位本次确认，不保存整段回复：

```bash
test -n "$KATA_USER_CONFIRMATION_REF"
bun scripts/migrations/kata-v4/index.ts confirm \
  --plan docs/migrations/kata-v4/cleanup-plan.json \
  --output docs/migrations/kata-v4/cleanup-confirmation.json \
  --confirmation-ref "$KATA_USER_CONFIRMATION_REF"
bun scripts/migrations/kata-v4/index.ts verify-controls \
  --plan docs/migrations/kata-v4/cleanup-plan.json \
  --phase pre-apply
```

Expected: 文件通过 `CleanupConfirmation` schema，plan_id 与当前 plan 相同，plan_sha256 等于实时摘要，`confirmed_at` 为本次回复后的 UTC 时间。此时工作树 diff 必须逐项等于全部 `control_paths.pre_apply`，`execution_output` 仍全部不存在；写入后不得改 plan、HEAD 或 action payload。

---

### Task 11: 独占执行用例、run、Skill 与 CLI 迁移

**Files:**
- Apply exactly: `docs/migrations/kata-v4/cleanup-plan.json`
- 读取并验证：`docs/migrations/kata-v4/cleanup-confirmation.json`
- Create: `docs/migrations/kata-v4/cleanup-journal.json`
- Create: `docs/migrations/kata-v4/cleanup-report.json`
- Create: `docs/migrations/kata-v4/cleanup-report.md`
- 修改、移动或删除：仅限已复核 plan 中列出的路径

**Interfaces:**
- Consumes: 用户明确确认且 preflight 通过的 plan 与匹配的 confirmation。
- Produces: 精确 Git diff 与 CleanupReport。

- [ ] **Step 1: 确认独占执行**

中止或等待所有其他写入代理；确认没有 formatter、generator、test watcher 或 package task 修改仓库。只读审阅可以继续。

- [ ] **Step 2: 运行全量预检**

Run:

```bash
set +e
bun ./packages/cli/bin/kata workspace clean \
  --apply docs/migrations/kata-v4/cleanup-plan.json \
  --format json > /tmp/kata-cleanup-apply.json
APPLY_EXIT=$?
set -e
APPLY_EXIT="$APPLY_EXIT" bun -e '
const code = Number(process.env.APPLY_EXIT);
const cli = await Bun.file("/tmp/kata-cleanup-apply.json").json();
const reportFile = Bun.file("docs/migrations/kata-v4/cleanup-report.json");
if (!(await reportFile.exists())) process.exit(1);
const report = await reportFile.json();
const applied = report.apply_status === "passed" && cli.data?.apply_status === "passed" && (
  (code === 0 && cli.status === "passed" && cli.data?.overall_status === "passed" && report.overall_status === "passed")
  || (code === 4 && cli.status === "needs_input" && cli.data?.overall_status === "needs_input" && report.overall_status === "needs_input")
);
if (applied) process.exit(0);
if (report.apply_status === "failed") process.exit(5);
process.exit(1);
'
```

Expected: preflight 先验证全部 action。任何摘要、确认、引用、dirty snapshot、baseline 或 destination 漂移时，命令退出非 0、没有 report/journal 且零动作；重新生成计划并回到 Task 10 用户复核。`0 + passed/passed` 与 `4 + passed/needs_input` 都表示这份 plan 已成功应用，必须继续 Step 3，绝不能重跑。若断言脚本退出 5，说明写入途中失败；保留 journal/report，按失败 action 诊断，修复后生成新 plan 并重新确认，也不能重跑旧 plan。

- [ ] **Step 3: 验证核心迁移组**

Run:

```bash
bun test tests/migrations/kata-v4/case-artifacts.test.ts tests/migrations/kata-v4/run-history.test.ts
bun test tests/skills/no-legacy-trees.test.ts packages/cli/tests/package/cli-package.test.ts --timeout 60000
```

Expected: 0 fail；ready 用例同名且 metadata/ref 更新；ready run 在新目录；旧 Skill/CLI 不再是运行入口。

- [ ] **Step 4: 审阅实际 diff 与报告**

比较 `CleanupReport.actions` 和 `git diff --name-status`。报告动作数必须与对应 Git move/rewrite/delete 一致；保护路径及其子路径不得出现在 diff。

- [ ] **Step 5: 分主题提交**

按 plan action group 分别暂存并提交：

```bash
git add --pathspec-from-file=docs/migrations/kata-v4/action-paths/cases-metadata.paths.txt
git commit -m "refactor: ✨ migrate requirement-named case files"
git add --pathspec-from-file=docs/migrations/kata-v4/action-paths/runs.paths.txt
git commit -m "refactor: ✨ normalize retained run history"
git add --pathspec-from-file=docs/migrations/kata-v4/action-paths/legacy-skills.paths.txt
git commit -m "refactor: ✨ remove legacy skill source trees"
git add --pathspec-from-file=docs/migrations/kata-v4/action-paths/legacy-cli.paths.txt
git commit -m "refactor: ✨ remove legacy CLI sources"
```

没有对应动作的组不创建空提交。每次 `git add` 使用 plan 列出的精确路径，不使用 `git add -A`。

---

### Task 12: 验证并提交已执行的安全垃圾动作

**Files:**
- 只复核：Task 11 已执行一次的 `.bak`、`.DS_Store`、cache、lock、log 与重复报告动作
- Modify: `docs/migrations/kata-v4/cleanup-report.json`
- Modify: `docs/migrations/kata-v4/cleanup-report.md`
- 保留并提交：`docs/migrations/kata-v4/cleanup-confirmation.json`
- 保留并提交：`docs/migrations/kata-v4/cleanup-journal.json`
- 暂作已跟踪审计输入保留：`docs/migrations/kata-v4/payloads/<action-id>`

**Interfaces:**
- Consumes: Task 7 已关闭的垃圾生成源，以及 Task 10 已确认 delete actions。
- Produces: 无引用、可恢复、可解释的删除提交；不再次运行 apply，也不新增动作。

- [ ] **Step 1: 核对 Task 11 的 preflight 和结果**

- `.bak`：当前文件包含全部有效内容，且 Git 已保存历史；
- `.DS_Store`：非 dirty、无业务内容；
- 解压目录：压缩包为原始材料，目录无额外修改；
- 生成 HTML：正式结果或原始数据可重建且无引用；
- cache/lock/log：非唯一失败现场且无引用。

这些条件必须已经出现在用户复核的 plan 和 Task 11 preflight 中。若报告缺少其中任何一项，标记 failed；不能在文件已删后补写理由。

- [ ] **Step 2: 保留 needs_review**

用户修改的 `.DS_Store`、JMX，以及无法判断 ZIP/解压目录原始性的路径保持不动，写入 `unresolved_blockers`。JMX 内容不得进入 diff 预览、报告或终端。

- [ ] **Step 3: 验证并提交**

Run:

```bash
bun test packages/cli/tests/workspace/no-new-debris.test.ts packages/cli/tests/workspace/clean-references.test.ts
```

Expected: 0 fail；已删路径无引用；needs_review 仍存在且未改变。

使用 plan 生成的精确 path list 暂存。随后把计划、报告、执行记录、action manifests 和所有 rewrite payload 一并纳入审计提交，使 Task 14 的第二份计划只处理已跟踪文件：

```bash
git add --pathspec-from-file=docs/migrations/kata-v4/action-paths/debris.paths.txt
git commit -m "chore: 🔥 remove reviewed historical debris"
git add --pathspec-from-file=docs/migrations/kata-v4/action-paths/audit.paths.txt
git commit -m "docs: 📝 record the reviewed cleanup"
```

没有 debris action 时不创建第一个提交。审计提交前核对 `cleanup-report.json.journal.path` 与 `cleanup-journal.json` 相同，且 `journal.sha256` 等于执行记录最终摘要。Task 14 只有在第二份精确计划再次获用户确认后，才删除临时 payload。

---

### Task 13: 收紧 `.gitignore` 与长期 CI

**Files:**
- Modify: `.gitignore`
- Modify: `workspace/dataAssets/.gitignore`
- Modify: feature-local tracked `.gitignore` files
- Modify: `.github/workflows/gitignore-no-bloat.yml`
- Modify: `.github/workflows/ci.yml`
- Create: `packages/cli/tests/workspace/gitignore-policy.test.ts`
- Create: `packages/cli/tests/workspace/legacy-paths.test.ts`
- Create: `scripts/modernization/verify-cleanup-confirmations.ts`
- Create: `tests/modernization/verify-cleanup-confirmations.test.ts`
- Create: `docs/migrations/kata-v4/action-paths/gitignore-policy.paths.txt`

**Interfaces:**
- Produces: 语义化 ignore policy 和防回归检查。
- Constraint: 正式 metadata、知识、用例、run JSON、Handoff 与交付资料不能被宽泛规则隐藏。

- [ ] **Step 1: 写失败测试**

测试 `git check-ignore -v`：

- 应忽略 `.DS_Store`、cache、临时 lock、普通 log、可再生 `allure-report/`、trace/work；
- 不应忽略 `metadata.yaml`、同名 Markdown/XMind、`run.json`、`result.json`、`handoff.json/md`、知识和正式交付；
- 不允许旧 `.runs/` 或整个 `runs/`、整个 `_shared/` 的宽泛规则。

`verify-cleanup-confirmations.test.ts` 使用两组临时 plan/confirmation/report fixture，覆盖正确三方绑定、plan bytes 改动、confirmation/report ID 或 SHA 漂移、字段漂移、同一 plan_id 被两阶段复用、复用同一 confirmation_ref、确认早于对应 plan、finalize 确认不晚于 migration，以及缺文件。持久脚本复用 Cleanup contracts 的 parser/validator 与同一个 SHA-256 实现，只读、不依赖将被 Task 14 删除的一次性 migration 代码；UTC 时间必须可解析并按时间值比较，不能按字符串猜顺序。

Run:

```bash
bun test packages/cli/tests/workspace/gitignore-policy.test.ts packages/cli/tests/workspace/legacy-paths.test.ts tests/modernization/verify-cleanup-confirmations.test.ts
```

Expected: FAIL；现有规则过宽且旧路径仍可出现。

- [ ] **Step 2: 修改 ignore 规则**

先列出当前 tracked 文件，再精确收紧规则。修改 `workspace/dataAssets/.gitignore` 时检查以前被 `_shared/` 隐藏的 untracked 内容；它们只进入摘要，不自动暂存。

- [ ] **Step 3: 替换行数检查**

`gitignore-no-bloat.yml` 不再限制有效行数；改为运行 `gitignore-policy.test.ts` 和 `legacy-paths.test.ts`。实现持久 `verify-cleanup-confirmations.ts`，固定接受 `--migration-plan/--migration-confirmation/--migration-report` 与 `--finalize-plan/--finalize-confirmation/--finalize-report` 六个必填路径，重算 plan SHA，核对三方字段、不同的 plan_id/confirmation_ref 与两次确认的时间边界；同时导出只读 verifier 供最终 gate 复用。Task 14 在两组文件都完成后把它接入迁移长期 gate。CI 同时阻止：

- 新 `.DS_Store`/`.bak`/cache/lock；
- 正式 run 目录外的运行产物；
- 旧 Skill/CLI tree；
- 失效 symlink/import/link；
- 多平台业务 Skill 正文副本。

- [ ] **Step 4: 验证并提交**

Run:

```bash
bun test packages/cli/tests/workspace/gitignore-policy.test.ts packages/cli/tests/workspace/legacy-paths.test.ts tests/modernization/verify-cleanup-confirmations.test.ts
set +e
bun ./packages/cli/bin/kata workspace check --format json > /tmp/kata-gitignore-workspace-check.json
WORKSPACE_EXIT=$?
set -e
test "$WORKSPACE_EXIT" -eq 0 -o "$WORKSPACE_EXIT" -eq 4
```

Expected: 测试 0 fail；正式资料可见，垃圾路径被忽略。workspace check 只有因受保护路径时才可返回 4，并保留 `needs_input` 状态。

生成 `gitignore-policy.paths.txt`，逐行列出本任务实际修改的根级、workspace 级和 feature-local `.gitignore`，两份 workflow、四份测试/持久脚本，以及该 manifest 自身。核对清单与 `git diff --name-only` 的本任务路径完全一致后提交：

```bash
git add --pathspec-from-file=docs/migrations/kata-v4/action-paths/gitignore-policy.paths.txt
git commit -m "chore: 🙈 narrow repository ignore rules"
```

---

### Task 14: 复核并执行一次性迁移工具清理

**Files:**
- Create: `docs/migrations/kata-v4/cleanup-finalize-plan.json`
- Create: `docs/migrations/kata-v4/cleanup-finalize-plan.md`
- 仅在用户明确复核后创建：`docs/migrations/kata-v4/cleanup-finalize-confirmation.json`
- Create: `docs/migrations/kata-v4/cleanup-finalize-journal.json`
- Create: `docs/migrations/kata-v4/cleanup-finalize-report.json`
- Create: `docs/migrations/kata-v4/cleanup-finalize-report.md`
- Create: `docs/migrations/kata-v4/action-paths/finalize.paths.txt`
- 只通过已复核的逐文件动作删除：`scripts/migrations/kata-v4/` 下已跟踪文件
- 只通过已复核的逐文件动作删除：`tests/migrations/kata-v4/` 下已跟踪文件
- 只通过已复核的逐文件动作删除：`docs/migrations/kata-v4/payloads/` 下已跟踪文件
- Keep: `docs/migrations/kata-v4/preexisting-dirty.json`
- Keep: `docs/migrations/kata-v4/feature-metadata-map.json`
- Keep: `docs/migrations/kata-v4/case-artifact-map.json`
- Keep: `docs/migrations/kata-v4/run-history-map.json`
- Keep: `docs/migrations/kata-v4/cleanup-plan.json`
- Keep: `docs/migrations/kata-v4/cleanup-confirmation.json`
- Keep: `docs/migrations/kata-v4/cleanup-journal.json`
- Keep: `docs/migrations/kata-v4/cleanup-report.json`
- Keep: `docs/migrations/kata-v4/cleanup-report.md`
- Modify: `.github/workflows/migrate-script-removed.yml`

**Interfaces:**
- Consumes: Task 12 已提交的 payload 与执行记录、Task 13 提交后的干净 HEAD、已清空的迁移类 blocker。
- Produces: 第二份不可变 CleanupPlan、第二份 CleanupReport，以及逐文件删除的一次性迁移工具清单。
- Constraint: 需求名、metadata 字段或旧 run 仍有迁移类 `unresolved_blockers` 时，本 Task 立即标为 `needs_input`，不生成删除动作。两份计划各自最多执行一次，首次计划的确认不能代替本 Task 的再次确认。

- [ ] **Step 1: 验证迁移结果仍可复现**

Run:

```bash
bun test tests/migrations/kata-v4 --timeout 30000
set +e
bun ./packages/cli/bin/kata workspace check --format json > /tmp/kata-cleanup-before-finalize.json
WORKSPACE_EXIT=$?
set -e
test "$WORKSPACE_EXIT" -eq 0 -o "$WORKSPACE_EXIT" -eq 4
WORKSPACE_EXIT="$WORKSPACE_EXIT" bun -e '
const code = Number(process.env.WORKSPACE_EXIT);
const cli = await Bun.file("/tmp/kata-cleanup-before-finalize.json").json();
if (code === 0 && cli.status === "passed") process.exit(0);
if (code === 4 && cli.status === "needs_input" && cli.data?.issues?.length === 0
  && cli.data?.needs_review?.every((item) => item.dirty_at_baseline === true)) process.exit(0);
process.exit(1);
'
git status --short
```

Expected: migration tests 0 fail；首次 plan、journal、report 和实际 tree 可逐项核对；执行 worktree 干净。`workspace check` 因受保护路径可返回 `needs_input`/exit 4，但迁移类 blocker 必须为空。否则保留全部迁移文件并停止。

- [ ] **Step 2: 从干净 HEAD 生成第二份逐文件计划**

Task 10 的一次性生成器必须提供 `finalize` 模式。该模式只枚举三个精确根下已跟踪的普通文件或 symlink，每个 source 单独写入 `CleanupDeleteAction`；禁止目录动作、glob 和未跟踪 source。首次计划、执行记录、报告、映射和其他审计文件必须逐项写入 `keep`，带当前摘要与保留原因，不能悄悄排除在预览之外。

Run:

```bash
bun scripts/migrations/kata-v4/index.ts finalize \
  --plan docs/migrations/kata-v4/cleanup-finalize-plan.json \
  --preview docs/migrations/kata-v4/cleanup-finalize-plan.md \
  --paths docs/migrations/kata-v4/action-paths/finalize.paths.txt
bun test tests/migrations/kata-v4/cleanup-plan.test.ts --timeout 30000
```

Expected: 第二份 plan 的 `baseline_commit` 等于当前 HEAD；actions 与三个根下实时 tracked file/symlink 集合逐项相同；应保留的审计文件都出现在 `keep`。`finalize.paths.txt` 稳定排序，并预先列出所有 source 删除、第二份 plan/preview/confirmation/journal/report、workflow 和自身。当前 diff 只含 `control_paths.pre_apply` 中已生成的 plan、preview、manifest，confirmation 尚不存在，`execution_output` 全部不存在；任何迁移 source 都尚未删除。

- [ ] **Step 3: 再次暂停，请用户确认具体计划**

报告第二份 plan_id、baseline commit、SHA-256、逐根文件数、每个 source 摘要和保留的审计文件。没有用户对这份具体 finalize plan 的明确确认，不得继续；总体设计确认和 Task 10 的首次确认都不算本门通过。

收到确认后立即写入第二份结构化确认；没有本次回复引用时停止：

```bash
test -n "$KATA_USER_CONFIRMATION_REF"
bun scripts/migrations/kata-v4/index.ts confirm \
  --plan docs/migrations/kata-v4/cleanup-finalize-plan.json \
  --output docs/migrations/kata-v4/cleanup-finalize-confirmation.json \
  --confirmation-ref "$KATA_USER_CONFIRMATION_REF" \
  --previous-confirmation docs/migrations/kata-v4/cleanup-confirmation.json
bun scripts/migrations/kata-v4/index.ts verify-controls \
  --plan docs/migrations/kata-v4/cleanup-finalize-plan.json \
  --phase pre-apply
```

Expected: confirmation 的 plan_id/SHA 与 finalize plan 一致；confirm 命令原子拒绝与首次相同的 confirmation_ref、早于 finalize plan 的时间或不晚于首次确认的时间。工作树 diff 逐项等于全部 `control_paths.pre_apply`，`execution_output` 仍全部不存在。

- [ ] **Step 4: 独占执行第二份计划**

停止其他写入代理，确认 HEAD 与主工作树保护快照未漂移，再运行：

```bash
set +e
bun ./packages/cli/bin/kata workspace clean \
  --apply docs/migrations/kata-v4/cleanup-finalize-plan.json \
  --format json > /tmp/kata-cleanup-finalize-apply.json
APPLY_EXIT=$?
set -e
APPLY_EXIT="$APPLY_EXIT" bun -e '
const code = Number(process.env.APPLY_EXIT);
const cli = await Bun.file("/tmp/kata-cleanup-finalize-apply.json").json();
const reportFile = Bun.file("docs/migrations/kata-v4/cleanup-finalize-report.json");
if (!(await reportFile.exists())) process.exit(1);
const report = await reportFile.json();
const applied = report.apply_status === "passed" && cli.data?.apply_status === "passed" && (
  (code === 0 && cli.status === "passed" && cli.data?.overall_status === "passed" && report.overall_status === "passed")
  || (code === 4 && cli.status === "needs_input" && cli.data?.overall_status === "needs_input" && report.overall_status === "needs_input")
);
if (applied) process.exit(0);
if (report.apply_status === "failed") process.exit(5);
process.exit(1);
'
```

Expected: 全量预检在第一次写入前完成；只删除 plan 中逐项列出的 tracked file/symlink；生成 `cleanup-finalize-journal.json` 与两份 report。`0 + passed/passed` 或 `4 + passed/needs_input` 都表示 plan 已执行，不能重跑。没有 report 表示预检拒绝，应回到 Step 2；断言退出 5 表示部分写入失败，应保留记录并从新 plan 恢复。

- [ ] **Step 5: 建立长期门并运行本地验收**

修改 `migrate-script-removed.yml`，检查两个迁移代码根与 payload 根不能重新出现，同时运行持久 confirmation verifier，验证保留的两份 plan、两份 confirmation、两份 report 和两份 journal。先核对 `finalize.paths.txt` 与实际本任务 diff 完全一致，并把删除写入索引；否则 `git ls-files` 仍会把已删文件当作应存在路径：

```bash
git add --pathspec-from-file=docs/migrations/kata-v4/action-paths/finalize.paths.txt
LC_ALL=C sort docs/migrations/kata-v4/action-paths/finalize.paths.txt > /tmp/kata-finalize-expected.paths.txt
git -c core.quotePath=false diff --cached --name-only | LC_ALL=C sort > /tmp/kata-finalize-staged.paths.txt
cmp /tmp/kata-finalize-expected.paths.txt /tmp/kata-finalize-staged.paths.txt
set +e
bun run ci -- --format json --output /tmp/kata-cleanup-final-ci.json
CI_EXIT=$?
set -e
test "$CI_EXIT" -eq 0 -o "$CI_EXIT" -eq 4
bun scripts/ci/run.ts --check-report /tmp/kata-cleanup-final-ci.json --exit-code "$CI_EXIT"
bun scripts/modernization/verify-cleanup-confirmations.ts \
  --migration-plan docs/migrations/kata-v4/cleanup-plan.json \
  --migration-confirmation docs/migrations/kata-v4/cleanup-confirmation.json \
  --migration-report docs/migrations/kata-v4/cleanup-report.json \
  --finalize-plan docs/migrations/kata-v4/cleanup-finalize-plan.json \
  --finalize-confirmation docs/migrations/kata-v4/cleanup-finalize-confirmation.json \
  --finalize-report docs/migrations/kata-v4/cleanup-finalize-report.json
bun ./packages/cli/bin/kata workspace clean --verify-boundary docs/migrations/kata-v4/cleanup-finalize-plan.json --format json
```

Expected: CI 报告中的 contracts 生成检查、type-check、workspace check、单元测试与两次 diff check 六项都通过，并记录实际 pass/fail/skip；持久 confirmation verifier 重算两份 plan SHA、核对两组三方字段并确认 plan_id 不同；随后独立执行的 `workspace clean --verify-boundary` 退出 0，迁移 gate 不允许 skip。CI 只有因受保护路径仍待处理时才可返回 4，状态必须保留为 `needs_input`。本 Task 不构建发布包；唯一最终构建留给路线图 Task 6，从所有清理提交完成后的干净 HEAD 产生。

- [ ] **Step 6: 请求最终审阅**

调用 `superpowers:requesting-code-review`，随后用 `superpowers:verification-before-completion` 重新执行审阅要求的命令。审阅必须核对：

- 两份 plan、journal、report 与实际 diff 分别一一对应；
- 两次用户确认都指向准确的 plan_id 与摘要；
- 用例文件名只含 Han/ASCII 字母/数字且同 stem；
- 旧 run 没有凭日期误删；
- dirty/untracked/JMX 边界没有被触碰；
- 旧 Skill/CLI 路径不再是入口；
- Codex 真实测试仍明确留给路线图最终验收。

- [ ] **Step 7: 用精确清单提交已确认的收尾动作**

先运行 action-manifest 检查，确认暂存区与 `finalize.paths.txt` 完全一致，再提交已经通过验收的 staged diff：

```bash
git diff --cached --name-status
git commit -m "chore: 🔥 remove completed migration scripts"
```

审阅若发现问题，回到拥有该文件的 Task 补 RED/GREEN 与精确提交。不得增补计划外删除，也不得再次运行已经成功应用的 plan。

## Completion Gate

只有以下条件全部满足，才能把清理子项目标记为完成：

- 用户已明确确认 Task 10 生成的具体 plan_id，`cleanup-confirmation.json` 的 ID/SHA 与 plan 一致；
- 只有迁移类 blocker 清空后才生成 Task 14 的 finalize plan，且用户已再次明确确认它的具体 plan_id；`cleanup-finalize-confirmation.json` 也与 plan 一致；
- apply 前全量预检通过，且没有执行计划外动作；
- 两份 CleanupPlan、CleanupReport、执行记录和 Git diff 可分别互相核对；
- 保护的 dirty/untracked 路径及子树未被修改；
- 所有 ready 用例迁为同名 Markdown/XMind，metadata 与 tracked 引用已更新；
- 名称来源冲突项未被擅自命名；只要仍有该类 needs_review，清理状态保持 `needs_input`，不能标记完成；
- 旧 run 只在价值和可重建性得到验证后迁移或删除；
- 旧 Skill/source/symlink 与旧 CLI 入口已移除；
- 垃圾生成源已关闭，历史 `.bak`/`.DS_Store`/重复产物只按已确认动作处理；
- `.gitignore` 不再隐藏正式资料；
- 迁移类 blocker 清空后，一次性 migration scripts 与 tracked payload 已按第二份逐文件计划删除，审计 docs 保留；
- `kata workspace check` 与本地测试按声明范围通过；Codex 真实验收由路线图单独负责；
- `unresolved_blockers` 为空才能称清理完成；非空时交付状态必须是 `needs_input`。
