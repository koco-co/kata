# kata 内容治理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立覆盖全部 Git 已跟踪文件的格式、编码、二进制完整性与中文表达治理，并保证未跟踪文件和用户已有改动不被自动改写。

**Architecture:** `kata workspace format` 只执行可重复的机械调整，`kata workspace check` 负责确认清单数量完整对应，并检查格式、二进制、链接、Skill 结构和中文规则。两条命令共享基于 `git ls-files -z` 的文件清单与同一份文件策略；JMX、XMind、PDF、图片和 ZIP 只验证，不由文本格式器改写。中文修订使用独立报告和提交，自动程序只定位问题，不替人判断含义。

**Tech Stack:** Bun 1.3.8、TypeScript 6、Biome 2.4.15、Prettier 3.9.5、markdownlint-cli2 0.23.0、uv 0.10.0、Ruff 0.15.0、shfmt 3.13.1、ShellCheck 0.11.0、fast-xml-parser 5.9.3、@prettier/plugin-xml 3.4.2、JSZip 3.10.1、ExcelJS 4.4.0、pdfjs-dist 6.1.200、Sharp 0.34.5、YAML、Git。

**Depends on:** [CLI 与 contracts 实施计划](2026-07-10-kata-cli-contracts-implementation.md) Task 1–11，以及 [Skill 与插件实施计划](2026-07-10-kata-skills-plugins-implementation.md) Task 0–13。

## Fixed Contracts

### 文件清单

`FileInventoryEntry` 只接受仓库相对路径：

```ts
export type FileDisposition =
  | "format"
  | "validate_binary"
  | "exclude_with_reason"
  | "needs_review";

export interface FileInventoryEntry {
  path: string;
  tracked: true;
  kind:
    | "text"
    | "csv"
    | "xml"
    | "jmx"
    | "xmind"
    | "xlsx"
    | "pdf"
    | "image"
    | "zip"
    | "symlink"
    | "other_binary"
    | "missing";
  disposition: FileDisposition;
  validation_kind:
    | "text"
    | "csv"
    | "xml"
    | "jmx"
    | "xmind"
    | "xlsx"
    | "pdf"
    | "image"
    | "zip"
    | "symlink"
    | "none";
  validation_root: "execution_worktree" | "source_worktree";
  format_kind?: "biome" | "prettier" | "ruff" | "shfmt" | "xml" | "csv-eol";
  policy_rule: string;
  reason?: string;
  dirty_at_baseline: boolean;
}

export interface UntrackedSummary {
  roots: string[];
  file_count: number;
}
```

候选集合来自 `git ls-files -z`。dirty 集合来自主工作树开始实施时保存的 `git status --porcelain=v1 -z --untracked-files=all`；重命名同时保护旧路径与新路径，未跟踪目录保护整个子树。

### 工作区报告

CLI 计划 Task 11 中的 `WorkspaceFileCheck`、`WorkspaceCheckReport` 与 `ServiceIssue` 是唯一 service DTO。本计划在 `packages/cli` 内导入并实现它们，不再声明第二套同名接口。对应关系固定为：`FileInventoryEntry` 的清单字段逐项投影到 `WorkspaceFileCheck`，验证状态写入 `status/checks/issues`，未跟踪摘要写入 `WorkspaceCheckReport.untracked`。

```ts
import type {
  ServiceIssue,
  WorkspaceCheckReport,
  WorkspaceFileCheck,
} from "../services/types";

type FileCheck = WorkspaceFileCheck;
type WorkspaceIssue = ServiceIssue;
```

必须满足：

```text
formatted.length
+ validated_binary.length
+ excluded_with_reason.length
+ needs_review.length
= tracked_total
```

路径不得同时出现在两个集合中。`disposition` 决定能否改写，`validation_kind` 独立决定只读检查；因此 dirty JMX 是 `needs_review + jmx + source_worktree`，从主工作树只读解析当前内容，但绝不格式化。预先存在的 tracked deletion 是 `needs_review + none`。未跟踪根不读取内容，只统计路径。`excluded_with_reason` 每项必须命中 `config/file-policy.yaml` 中的精确路径规则；禁止按整个 `tests/**` 或 `workspace/**` 排除。

### 命令职责

- `kata workspace format [paths...] [--paths-from <file>] [--dry-run] [--format text|json]`：只处理 `disposition=format` 且不在 dirty 保护集中的文件；无路径时使用完整 tracked 清单，显式路径与 `--paths-from` 互斥。路径清单使用 UTF-8、LF、每行一个仓库相对路径，拒绝空项、重复、绝对路径、目录穿越、未跟踪、未找到与受保护路径。
- `kata workspace check [--format text|json]`：检查全部已跟踪文件，写出结构化报告，不修改文件。
- `kata workspace check --language [--format text|json]`：在同一检查命令中扫描可编辑中文，输出位置与规则，不自动替换。
- 三个 handler 通过 CLI 计划定义的 `CommandServices.workspace` 注入服务；不得在命令层调用 `process.exit()` 或直接写 stdout。

---

### Task 1: 固定初始状态与保护边界

**Files:**
- Read: `docs/migrations/kata-v4/modernization-baseline.md`
- 只验证，不重写：`docs/migrations/kata-v4/preexisting-dirty.json`
- 改为薄封装：`scripts/modernization/capture-dirty-snapshot.ts`
- Create: `packages/cli/tests/workspace/file-inventory.test.ts`
- Create: `packages/cli/tests/fixtures/workspace-check/git-ls-files.z`
- Create: `packages/cli/tests/fixtures/workspace-check/git-status.z`
- Create: `packages/cli/src/workspace/git-files.ts`
- Create: `packages/cli/src/workspace/inventory.ts`

**Interfaces:**
- Produces: `readTrackedFiles(executionWorktreeRoot)`、`parsePorcelainV1Z(rawStatus)`、`readDirtySnapshot(sourceWorktreeRoot)`、`buildFileInventory(input)`。
- Protects: 实施开始前主工作树的全部 modified/deleted/renamed/untracked 路径。

- [ ] **Step 1: 写失败测试**

测试必须覆盖 NUL 分隔路径、中文路径、空格路径、symlink、重命名双路径、已删除文件、未跟踪目录子树，以及同一路径只能获得一种 disposition。受保护的 tracked deletion 必须成为 `needs_review + missing + none`。

Run:

```bash
bun test packages/cli/tests/workspace/file-inventory.test.ts
```

Expected: FAIL；`git-files.ts` 与 `inventory.ts` 尚不存在。

- [ ] **Step 2: 实现 Git 文件读取与 dirty 保护**

`readTrackedFiles` 在执行 worktree 执行 `git ls-files -z`。把路线图已测试的 parser 移到 `packages/cli/src/workspace/git-files.ts`，原 script 改成调用公共函数的薄 wrapper。`preexisting-dirty.json` 只校验、不覆盖，不能在 CLI/Skill 已改动后重新采集并冒充初始状态。`readDirtySnapshot(sourceWorktreeRoot)` 只用于 apply 前和最终保护边界复核。解析器不得按换行切割，也不得打印文件内容。

`preexisting-dirty.json` 逐字段沿用路线图 Task 1 的 `PreexistingDirtySnapshot` 与 `DirtySnapshotEntry`，包含原始条目、派生的 tracked/untracked/protected 清单和 status SHA。迁入 `git-files.ts` 后从该文件导出同一类型；不得删字段、改名或另写一份较窄接口。

执行时核对已保存 JSON 的 schema、baseline commit 和 status SHA；不得把计划写作时观察到的路径硬编码进程序。

- [ ] **Step 3: 验证清单数量完整对应**

Run:

```bash
bun test packages/cli/tests/workspace/file-inventory.test.ts
```

Expected: 0 fail；fixture 中每个 tracked path 恰好出现一次，untracked 只出现在摘要。

- [ ] **Step 4: 提交**

```bash
git add scripts/modernization/capture-dirty-snapshot.ts packages/cli/src/workspace/git-files.ts packages/cli/src/workspace/inventory.ts packages/cli/tests/workspace
git commit -m "test: ✅ protect workspace file inventory"
```

---

### Task 2: 固定工具链与基础文件规则

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `biome.json`
- Modify: `.gitattributes`
- Create: `.editorconfig`
- Create: `prettier.config.mjs`
- Create: `.markdownlint-cli2.mjs`
- Create: `pyproject.toml`
- Create: `uv.lock`
- Create: `tools/toolchain.lock.json`
- Create: `scripts/toolchain/install.ts`
- Create: `packages/cli/tests/workspace/toolchain.test.ts`

**Interfaces:**
- Produces: 可离线复现的项目工具版本；`installPinnedToolchain(input)`。
- Constraint: 生产脚本和 CI 不得使用 `bunx`、`npx`、`uvx` 或未校验摘要的二进制。

- [ ] **Step 1: 写工具版本失败测试**

测试读取 package/uv/toolchain 三份锁定来源，只对本计划列出的治理工具断言版本精确相等并禁止 `^`、`~`、`latest`；同时检查 shfmt、ShellCheck 条目具有版本、平台、下载地址和 SHA-256。其他业务依赖不在这条断言中。

Run:

```bash
bun test packages/cli/tests/workspace/toolchain.test.ts
```

Expected: FAIL；配置与锁文件尚未齐全。

- [ ] **Step 2: 固定 JavaScript 工具**

在根 `devDependencies` 使用精确版本：

```json
{
  "@biomejs/biome": "2.4.15",
  "@prettier/plugin-xml": "3.4.2",
  "fast-xml-parser": "5.9.3",
  "markdownlint-cli2": "0.23.0",
  "pdfjs-dist": "6.1.200",
  "prettier": "3.9.5"
}
```

根 package 同时写 `"packageManager": "bun@1.3.8"`。本治理流水线直接使用的 dependencies 固定：`exceljs: 4.4.0`、`jszip: 3.10.1`、`sharp: 0.34.5`。本 Task 只承诺固定治理工具，不把其余业务依赖纳入范围。

- [ ] **Step 3: 固定 Python 与原生工具**

`pyproject.toml` 声明 `ruff==0.15.0`，`uv.lock` 由固定解释器生成。`tools/toolchain.lock.json` 固定 uv `0.10.0`、shfmt `3.13.1` 与 ShellCheck `0.11.0` 的 macOS/Linux x64/arm64 工件摘要。

`scripts/toolchain/install.ts` 只能下载锁文件中的 URL，下载后先核对 SHA-256，再原子移动到 `.tools/bin/`；`--check` 只验证，不联网。

- [ ] **Step 4: 建立基础格式约定**

`.editorconfig` 固定 UTF-8、LF、末尾换行、删除行尾空格；Markdown 保留有意义的两个行尾空格。`.gitattributes` 明确文本与二进制类型。`biome.json` 不再排除整个 `workspace/**` 或所有 fixture，只保留 `config/file-policy.yaml` 生成的精确排除。

- [ ] **Step 5: 安装并验证**

Run:

```bash
bun install
bun scripts/toolchain/install.ts
./.tools/bin/uv sync --frozen
bun scripts/toolchain/install.ts --check
bun test packages/cli/tests/workspace/toolchain.test.ts
```

Expected: install 只使用锁内 URL 且摘要一致；随后 `--check` 和测试 0 fail；报告版本与锁文件逐项相同，无临时下载命令。

- [ ] **Step 6: 提交**

```bash
git add package.json bun.lock biome.json .gitattributes .editorconfig prettier.config.mjs .markdownlint-cli2.mjs pyproject.toml uv.lock tools/toolchain.lock.json scripts/toolchain/install.ts packages/cli/tests/workspace/toolchain.test.ts
git commit -m "build: 📦 pin workspace governance tools"
```

---

### Task 3: 建立文件策略与文本安全检查

**Files:**
- Create: `config/file-policy.yaml`
- Create: `packages/cli/src/workspace/file-policy.ts`
- Create: `packages/cli/src/workspace/validators/text.ts`
- Create: `packages/cli/tests/workspace/file-policy.test.ts`
- Create: `packages/cli/tests/workspace/text-validator.test.ts`
- Create: `packages/cli/tests/fixtures/workspace-check/text/**`

**Interfaces:**
- Produces: `loadFilePolicy(path)`、`classifyTrackedPath(path, policy)`、`validateTextFile(path)`。
- Constraint: fixture、外部原文与生成文件按精确路径或受限 glob 分类，每条规则包含 owner、reason、mode。

- [ ] **Step 1: 写失败测试**

覆盖 UTF-8/非 UTF-8、BOM、CRLF、缺末尾换行、行尾空格、NFC 差异，以及代码字符串与原始引用只报告、不通用替换。

Run:

```bash
bun test packages/cli/tests/workspace/file-policy.test.ts packages/cli/tests/workspace/text-validator.test.ts
```

Expected: FAIL；策略加载与验证器不存在。

- [ ] **Step 2: 定义策略 schema**

`config/file-policy.yaml` 顶层固定：

```yaml
schema_version: 1
rules:
  - id: intentional-invalid-fixture
    paths:
      - tests/fixtures/example.invalid.json
    disposition: exclude_with_reason
    owner: tests
    reason: 验证解析失败路径，必须保留原始字节
```

真实清单只能写存在的路径。生成产物规则可以同时增加 `generated_by` 与 `generate_command`：前者是生成器、模板或 schema 的已跟踪精确路径数组，后者是无需 shell 展开的 argv 数组。生成产物本身与这些来源必须一起进入生成器修正批次，不能长期手改产物。实现拒绝只写其中一项、不存在或未跟踪的 `generated_by`、空 argv、shell 拼接、自引用、循环引用、不存在的精确路径、无 reason 的排除、覆盖仓库根的 `**`、整个 `tests/**` 或整个 `workspace/**`。

- [ ] **Step 3: 实现只读文本检查**

`validateTextFile` 返回问题位置与字节信息，不自动解码失败文件，不输出文件正文。NFC 差异只对新建路径与项目自然语言提示；代码、fixture、日志和引用块不自动重写。

- [ ] **Step 4: 验证**

Run:

```bash
bun test packages/cli/tests/workspace/file-policy.test.ts packages/cli/tests/workspace/text-validator.test.ts
```

Expected: 0 fail；每条排除都可追溯，文本错误精确定位。

- [ ] **Step 5: 提交**

```bash
git add config/file-policy.yaml packages/cli/src/workspace/file-policy.ts packages/cli/src/workspace/validators/text.ts packages/cli/tests/workspace
git commit -m "feat: ✨ classify tracked workspace files"
```

---

### Task 4: 实现可重复的文本格式流水线

**Files:**
- Create: `packages/cli/src/workspace/format.ts`
- Create: `packages/cli/src/workspace/formatters/biome.ts`
- Create: `packages/cli/src/workspace/formatters/prettier.ts`
- Create: `packages/cli/src/workspace/formatters/ruff.ts`
- Create: `packages/cli/src/workspace/formatters/shell.ts`
- Create: `packages/cli/src/workspace/formatters/xml.ts`
- Create: `packages/cli/src/workspace/formatters/csv.ts`
- Create: `packages/cli/tests/workspace/format.test.ts`
- Create: `packages/cli/tests/fixtures/workspace-check/format/**`

**Interfaces:**

```ts
export interface FormatRequest {
  repoRoot: string;
  paths: readonly string[];
  dryRun: boolean;
  protectedPaths: ReadonlySet<string>;
}

export interface FormatResult {
  changed: string[];
  unchanged: string[];
  skippedProtected: string[];
  failed: Array<{ path: string; tool: string; message: string }>;
}

export async function formatWorkspace(request: FormatRequest): Promise<FormatResult>;
```

- [ ] **Step 1: 写失败测试**

覆盖工具分发、dry-run 零写入、dirty 路径保护、批次失败归因、XML 往返、CSV 只规范编码/换行而不重排字段、JMX 与 symlink 永不进入 formatter，以及连续执行两次第二次无变化。

Run:

```bash
bun test packages/cli/tests/workspace/format.test.ts
```

Expected: FAIL；formatter dispatcher 不存在。

- [ ] **Step 2: 实现按文件类型分发**

- Biome：TypeScript、JavaScript、JSON、JSONC；
- Prettier：Markdown、MDX、YAML、CSS、SCSS、HTML、Handlebars；
- Ruff：Python；
- shfmt：Shell；
- Prettier XML 插件：普通 XML；
- CSV：只规范 UTF-8、BOM、LF 与末尾换行，使用 CSV parser 证明单元格值和行列结构不变；
- JMX、XLSX、symlink 与全部二进制：拒绝进入格式分支。

工具调用使用 argv 数组，不通过 shell 拼接路径。单个工具失败时记录该批文件，命令整体返回 failed。

- [ ] **Step 3: 验证 dry-run 与幂等**

Run:

```bash
bun test packages/cli/tests/workspace/format.test.ts
```

Expected: 0 fail；dry-run fixture 哈希不变；apply 后第二次 changed 为空。

- [ ] **Step 4: 提交**

```bash
git add packages/cli/src/workspace/format.ts packages/cli/src/workspace/formatters packages/cli/tests/workspace/format.test.ts packages/cli/tests/fixtures/workspace-check/format
git commit -m "feat: ✨ add idempotent workspace formatter"
```

---

### Task 5: 实现结构与二进制验证器

**Files:**
- Create: `packages/cli/src/workspace/validators/xml.ts`
- Create: `packages/cli/src/workspace/validators/jmx.ts`
- Create: `packages/cli/src/workspace/validators/csv.ts`
- Create: `packages/cli/src/workspace/validators/xmind.ts`
- Create: `packages/cli/src/workspace/validators/xlsx.ts`
- Create: `packages/cli/src/workspace/validators/pdf.ts`
- Create: `packages/cli/src/workspace/validators/image.ts`
- Create: `packages/cli/src/workspace/validators/zip.ts`
- Create: `packages/cli/src/workspace/validators/symlink.ts`
- Create: `packages/cli/src/workspace/validators/index.ts`
- Create: `packages/cli/tests/workspace/binary-validators.test.ts`
- Create: `packages/cli/tests/fixtures/workspace-check/binary/**`

**Interfaces:**
- Produces: `validateArtifact(path, validationKind)`。
- Security: ZIP/XMind 拒绝绝对路径、`..`、NUL、重复规范化路径和解压尺寸上限违规。

- [ ] **Step 1: 先创建最小合法与损坏 fixture**

fixture 同时包含合法/损坏的 CSV、XML、JMX、XMind、XLSX、PDF、PNG、ZIP 和 symlink。测试 fixture 不包含真实环境地址、账号、token 或密码。

- [ ] **Step 2: 写失败测试**

Run:

```bash
bun test packages/cli/tests/workspace/binary-validators.test.ts
```

Expected: FAIL；六类验证器尚不存在。

- [ ] **Step 3: 实现验证器**

- CSV：UTF-8、列结构可解析，各行列数符合文件声明或首行结构；
- XML/JMX：解析良好；JMX 根元素为 `jmeterTestPlan`，只读检查，不序列化；
- XMind：CRC 校验、`manifest.json`，以及 `content.json` 或 `content.xml`；
- XLSX：ZIP 结构完整，ExcelJS 能读取 workbook、worksheet 和 cell records；
- PDF：可读页树、页数大于 0、文件尾结构可解析；
- 图片：Sharp 能解码，宽高大于 0；动画读取帧数；
- ZIP：启用 CRC32，检查条目路径和解压总尺寸。
- symlink：用 `lstat/readlink` 检查目标存在、位于仓库内且没有形成环；永不跟随 symlink 格式化目标。

错误报告只包含路径、验证器、错误码和安全摘要；JMX 内容、XML 属性值和二进制片段不得进入日志。

- [ ] **Step 4: 验证**

Run:

```bash
bun test packages/cli/tests/workspace/binary-validators.test.ts
```

Expected: 0 fail；每个损坏 fixture 被对应验证器拒绝，合法 fixture 全部通过；symlink 目标字节没有被读取或改写。

- [ ] **Step 5: 提交**

```bash
git add packages/cli/src/workspace/validators packages/cli/tests/workspace/binary-validators.test.ts packages/cli/tests/fixtures/workspace-check/binary
git commit -m "feat: ✨ validate workspace binary artifacts"
```

---

### Task 6: 建立自然中文检查与修订记录

**Files:**
- Create: `config/language-rules.yaml`
- Create: `packages/cli/src/workspace/language-check.ts`
- Create: `packages/cli/src/workspace/markdown-regions.ts`
- Create: `packages/cli/tests/workspace/language-check.test.ts`
- Create: `packages/cli/tests/fixtures/workspace-check/language/**`
- Create: `docs/migrations/kata-v4/content-review.json`
- Create: `docs/migrations/kata-v4/content-review.md`

**Interfaces:**

```ts
export interface LanguageFinding {
  path: string;
  line: number;
  column: number;
  rule: string;
  severity: "error" | "review";
  excerpt_sha256: string;
  message: string;
}
```

- [ ] **Step 1: 写失败测试**

覆盖禁用表达、同段重复“必须/严禁/不得”、中英文标点混用、重复段落、超过 120 个汉字的复核提醒，以及代码块、表格、URL、frontmatter 字段和明确原始引用的排除。

Run:

```bash
bun test packages/cli/tests/workspace/language-check.test.ts
```

Expected: FAIL；规则与 Markdown 区域解析器不存在。

- [ ] **Step 2: 写入项目语言规则**

`config/language-rules.yaml` 记录已确认的写作准则。禁用词只对项目叙述生效；字段名、引用原文与用户提供材料不判错。长句只标记 `review`，不自动拆句。

- [ ] **Step 3: 实现只报告扫描器**

报告不得自动替换文字。excerpt 使用 SHA-256 标识，默认不把可能含业务数据的整句写到 JSON；Markdown 可在人工报告中记录用户已审阅的短片段。

- [ ] **Step 4: 定义内容修订记录**

`content-review.json` 每项固定：

```json
{
  "path": "relative/path.md",
  "location": "heading or line",
  "before": "原文",
  "after": "修改后的文字",
  "reason": "修改原因",
  "sources": ["PRD、页面或源码相对位置"],
  "unresolved": []
}
```

无来源、会改变范围或存在分歧的项目只进入 unresolved，不直接修改。

- [ ] **Step 5: 验证并提交**

Run:

```bash
bun test packages/cli/tests/workspace/language-check.test.ts
```

Expected: 0 fail；自动扫描不产生写入。

```bash
git add config/language-rules.yaml packages/cli/src/workspace/language-check.ts packages/cli/src/workspace/markdown-regions.ts packages/cli/tests/workspace/language-check.test.ts packages/cli/tests/fixtures/workspace-check/language docs/migrations/kata-v4/content-review.json docs/migrations/kata-v4/content-review.md
git commit -m "feat: ✨ add natural Chinese review rules"
```

---

### Task 7: 接入公共 CLI、帮助和 CI

**Files:**
- Create: `packages/cli/src/workspace/check.ts`
- Create: `packages/cli/src/workspace/check-command.ts`
- Create: `packages/cli/src/workspace/report.ts`
- Create: `packages/cli/src/workspace/linters/biome.ts`
- Create: `packages/cli/src/workspace/linters/markdown.ts`
- Create: `packages/cli/src/workspace/linters/links.ts`
- Create: `packages/cli/src/workspace/linters/python.ts`
- Create: `packages/cli/src/workspace/linters/shell.ts`
- Create: `packages/cli/src/workspace/linters/xml.ts`
- Modify: `packages/cli/src/commands/workspace/index.ts`
- Modify: `packages/cli/src/services/types.ts`
- Modify: `packages/cli/src/services/default-services.ts`
- Create: `packages/cli/tests/workspace/check.test.ts`
- Create: `packages/cli/tests/workspace/check-command.test.ts`
- Create: `packages/cli/tests/workspace/ci-coverage.test.ts`
- Create: `packages/cli/tests/workspace/ci-runner.test.ts`
- Create: `packages/cli/tests/commands/workspace-governance.test.ts`
- Create: `scripts/ci/run.ts`
- Modify: `packages/cli/tests/contract/help.test.ts`
- Modify: `packages/cli/tests/contract/help-examples.test.ts`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: workspace service 的 `format`、`check({ language })`、`checkCommand`。
- CLI paths: `workspace format`、`workspace check`；中文扫描通过 `workspace check --language` 启用，不新增第 40 个公开叶子命令。

```ts
export interface CiCommandResult {
  name: "contracts" | "type_check" | "workspace_check" | "unit_tests" | "diff" | "cached_diff";
  argv: string[];
  exit_code: number;
  status: "passed" | "needs_input" | "failed";
  passed: number | null;
  failed: number | null;
  skipped: number | null;
  log_path: string;
}

export interface CiRunReport {
  schema_version: 1;
  overall_status: "passed" | "needs_input" | "failed";
  commands: CiCommandResult[];
  unresolved_blockers: Array<{ code: string; path?: string; message: string }>;
}

export function validateCiRunReport(report: CiRunReport, processExitCode: number): void;
```

- [ ] **Step 1: 写命令与帮助失败测试**

断言 `workspace format --help`、`workspace check --help` 与 `workspace check-command --help` 包含用途、参数、选项、影响范围、退出码、JSON 输出、示例与相关命令；`workspace format --help` 完整解释默认全仓、位置参数和 `--paths-from` 的互斥关系与清单格式，`workspace check --help` 明确解释 `--language`。示例经真实 parser 与 fake service 执行。

Run:

```bash
bun test packages/cli/tests/workspace/check.test.ts packages/cli/tests/workspace/check-command.test.ts packages/cli/tests/workspace/ci-coverage.test.ts packages/cli/tests/workspace/ci-runner.test.ts packages/cli/tests/commands/workspace-governance.test.ts packages/cli/tests/contract/help.test.ts packages/cli/tests/contract/help-examples.test.ts
```

Expected: FAIL；workspace service 尚未接入。

- [ ] **Step 2: 实现 check 聚合器**

聚合器先完成 inventory，再按 `validation_kind` 调用只读验证器，并按 `format_kind` 运行格式检查。format handler 把位置参数或 `--paths-from` 解析为同一个 `WorkspaceFormatInput.paths`，在调用 formatter 前完成编码、相对路径、tracked、存在性、重复项与保护边界校验。受保护的 tracked deletion 或 dirty 路径进入 `needs_review`，命令返回 `needs_input`/exit 4；非保护路径意外缺失、重复分类、工具版本漂移或验证失败返回 `failed`/exit 1。dirty JMX 仍做只读解析，但绝不进入 formatter。

检查器必须真正运行锁定版本的工具，不能只核对版本号：Biome check、Prettier check、markdownlint-cli2、全部 Markdown 相对链接与页内锚点、`ruff format --check` 与 `ruff check`、`shfmt -d` 与 ShellCheck，以及普通 XML 的解析和格式检查。`check-command` 把旧的命令安全检查迁入新服务，并返回准确的命令策略问题。

- [ ] **Step 3: 接入始终跑完的 CI 聚合脚本**

根脚本固定：

```json
{
  "format": "bun ./packages/cli/bin/kata workspace format",
  "format:check": "bun ./packages/cli/bin/kata workspace format --dry-run",
  "check": "bun ./packages/cli/bin/kata workspace check",
  "ci": "bun scripts/ci/run.ts"
}
```

`scripts/ci/run.ts` 用 `Bun.spawn` 依次运行 contracts 生成检查、type-check、`workspace check --format json`、默认单元测试、`git diff --check` 与 `git diff --cached --check`；无论前一项退出多少，后续项都要继续。它把每项 argv、退出码、状态、pass/fail/skip 数和日志路径写入 `CiRunReport`，支持 `--format json --output <path>`。同一文件还支持 `--check-report <path> --exit-code <code>`，只调用 `validateCiRunReport()` 核对六项齐全、状态组合与退出码，不重新运行检查；路线图和清理计划必须复用这个入口。

退出规则固定为：任一普通检查非 0，或 workspace check 返回 1/2/3，整体退出 1；只有 workspace check 返回 4、JSON 为 `needs_input`、`issues=[]` 且所有 needs_review 都来自初始 dirty 时，其他检查全部为 0 后整体才返回 4；全部为 0 时整体返回 0。不得用最后一条命令覆盖先前状态，也不得因 workspace exit 4 跳过测试。

CI 先运行 `bun install --frozen-lockfile`，再安装并核对受摘要保护的工具链，最后调用这个聚合脚本。`ci-coverage.test.ts` 要证明旧有的垃圾文件、路径、Skill 结构、平台包、schema、类型和测试检查，或已纳入 `workspace check`，或仍有明确的测试入口；缩短根脚本时不得漏掉任何检查。hook 只能调用公共命令，不能成为唯一入口。

- [ ] **Step 4: 验证**

Run:

```bash
bun test packages/cli/tests/workspace/check.test.ts packages/cli/tests/workspace/check-command.test.ts packages/cli/tests/workspace/ci-coverage.test.ts packages/cli/tests/workspace/ci-runner.test.ts packages/cli/tests/commands/workspace-governance.test.ts packages/cli/tests/contract/help.test.ts packages/cli/tests/contract/help-examples.test.ts
bun ./packages/cli/bin/kata workspace format --help
bun ./packages/cli/bin/kata workspace check --help
bun ./packages/cli/bin/kata workspace check-command --help
```

Expected: 0 fail；三份 leaf help 完整；JSON stdout 为单一对象；旧 CI 能力逐项有新 owner。

- [ ] **Step 5: 提交**

```bash
git add packages/cli/src/workspace packages/cli/src/commands/workspace packages/cli/src/services packages/cli/tests/workspace packages/cli/tests/commands/workspace-governance.test.ts packages/cli/tests/contract scripts/ci/run.ts package.json .github/workflows/ci.yml
git commit -m "feat: ✨ expose workspace governance commands"
```

---

### Task 8: 修正生成器后执行纯格式批次

**Files:**
- Create: `scripts/content/format-batches.ts`
- Create: `tests/content/format-batches.test.ts`
- Create: `docs/migrations/kata-v4/format-manifests/generators.paths.txt`
- Create: `docs/migrations/kata-v4/format-manifests/typescript-json.paths.txt`
- Create: `docs/migrations/kata-v4/format-manifests/documentation.paths.txt`
- Create: `docs/migrations/kata-v4/format-manifests/python.paths.txt`
- Create: `docs/migrations/kata-v4/format-manifests/shell.paths.txt`
- Create: `docs/migrations/kata-v4/format-manifests/xml.paths.txt`
- Create: `docs/migrations/kata-v4/format-manifests/workspace-text.paths.txt`
- Create: `docs/migrations/kata-v4/format-manifests/audit.paths.txt`
- Create: `docs/migrations/kata-v4/format-reports/generators.json`
- Create: `docs/migrations/kata-v4/format-reports/typescript-json.json`
- Create: `docs/migrations/kata-v4/format-reports/documentation.json`
- Create: `docs/migrations/kata-v4/format-reports/python.json`
- Create: `docs/migrations/kata-v4/format-reports/shell.json`
- Create: `docs/migrations/kata-v4/format-reports/xml.json`
- Create: `docs/migrations/kata-v4/format-reports/workspace-text.json`
- 修改：仅限复核后 manifest 中列出的已跟踪路径
- 禁止修改：`preexisting-dirty.json` 中保护的路径与所有未跟踪文件

**Interfaces:**
- Consumes: Task 1–7 的 inventory、policy、初始 dirty 快照与 formatter dry-run。
- Produces: `buildFormatBatches()`、`verifyFormatBatch()`、七份互斥 manifest、七份严格 report，以及独立的生成器修正提交和机械格式提交。

- [ ] **Step 1: 先写批次边界失败测试**

测试使用临时 Git 仓库和 fake `workspace check/format` JSON，固定七个批次：

```ts
export const FORMAT_BATCHES = [
  "generators", "typescript-json", "documentation", "python",
  "shell", "xml", "workspace-text",
] as const;

test("builds mutually exclusive manifests and an exact audit owner", async () => {
  const output = await buildFormatBatches(fixtureInput());
  expect(Object.keys(output.manifests).sort()).toEqual([...FORMAT_BATCHES].sort());
  expect(flatten(output.manifests).some((path) => output.protectedPaths.includes(path))).toBe(false);
  expect(output.auditPaths).toEqual(expectedControlPaths());
});
```

覆盖：空批次、稳定排序、重复或跨批路径、未跟踪/不存在/dirty 路径、格式预览之外的路径、`generated_by + generate_command` 映射、生成器输出与来源共同归入 `generators`、审计文件被正文批次拥有、report 命令/退出码/数量/manifest SHA 漂移。`audit.paths.txt` 必须精确拥有自身、其余七份 manifest 和七份 report；它不能拥有正文路径。

- [ ] **Step 2: 运行 RED**

```bash
bun test tests/content/format-batches.test.ts
```

Expected: 失败，因为批次 builder 与 verifier 尚不存在。

- [ ] **Step 3: 实现、验证并提交批次工具**

`scripts/content/format-batches.ts` 提供以下封闭模式：

- `preview`：以 argv 数组运行公共 `kata workspace check --format json` 与 `kata workspace format --dry-run --format json`，把原始 JSON 写到仓库外 preview 目录，再原子写七份 manifest、七份 report 与 audit manifest；
- `verify`：只读重算 tracked 清单、保护边界、批次归属、manifest/report 摘要和 audit 精确集合；
- `run-generators`：只运行 policy 中审核过的 argv，不经 shell；
- `apply --batch <name>`：只调用公共 `kata workspace format --paths-from <manifest> --format json`，并确认非控制文件 diff 精确等于该 manifest；
- `verify-staged --batch <name>`：确认暂存区精确等于该 manifest；
- `record --batch <name> --commit <sha>`：确认该 commit 的路径精确等于 manifest 后，把 report 从 `planned` 改为 `applied`；空 manifest 用 `--not-applicable`，不得伪造 commit。

report 固定记录 schema version、批次名、源命令 argv/退出码、计划路径数、manifest SHA-256、保护路径排除数、状态和可选 commit；`preview` 只在两个公共命令为 `0/passed` 或只因初始 dirty 为 `4/needs_input` 时产出控制文件，真实失败时零写入。
除 `preview/verify` 的显式目录参数外，四个 batch 子命令只读取 `docs/migrations/kata-v4/format-manifests` 与 `format-reports`，不接受调用方覆盖控制目录或 manifest 路径。

```bash
bun test tests/content/format-batches.test.ts
git add scripts/content/format-batches.ts tests/content/format-batches.test.ts
git commit -m "feat: ✨ guard workspace format batches"
```

Expected: 测试 0 fail；工具提交后工作树没有实现代码 diff，后续批次只会留下 audit 拥有的控制文件与当前批次正文。

- [ ] **Step 4: 生成并核对实时预览**

Run:

```bash
PREVIEW_DIR="$(mktemp -d /tmp/kata-format-preview.XXXXXX)"
printf '%s\n' "$PREVIEW_DIR" > /tmp/kata-format-preview-dir.txt
set +e
bun scripts/content/format-batches.ts preview \
  --repo . \
  --policy config/file-policy.yaml \
  --dirty docs/migrations/kata-v4/preexisting-dirty.json \
  --manifest-dir docs/migrations/kata-v4/format-manifests \
  --report-dir docs/migrations/kata-v4/format-reports \
  --preview-dir "$PREVIEW_DIR"
PREVIEW_EXIT=$?
set -e
test "$PREVIEW_EXIT" -eq 0 -o "$PREVIEW_EXIT" -eq 4
bun scripts/content/format-batches.ts verify \
  --repo . \
  --policy config/file-policy.yaml \
  --dirty docs/migrations/kata-v4/preexisting-dirty.json \
  --manifest-dir docs/migrations/kata-v4/format-manifests \
  --report-dir docs/migrations/kata-v4/format-reports \
  --preview-dir "$PREVIEW_DIR" \
  --expected-preview-exit "$PREVIEW_EXIT"
```

Expected: 原始预览位于仓库外；两份公共命令结果覆盖完整 tracked 分母。七份正文 manifest 只列实际需改路径且彼此互斥，没有改动时允许为空；生成产物与 `generated_by` 来源共同进入 generators。七份 report 的命令、退出码、数量和摘要可重算；audit manifest 精确列出 15 个控制文件，每条一次。保护路径与未跟踪路径不在任何正文 manifest。

- [ ] **Step 5: 先修正并提交生成器**

若 `generators.paths.txt` 非空，逐项把稳定格式写回 manifest 中 `generated_by` 指向的生成器、模板或 schema；随后运行受控生成命令、限定格式和两次生成检查。若为空，只记录 `not_applicable`，不创建空内容提交。

```bash
if test -s docs/migrations/kata-v4/format-manifests/generators.paths.txt; then
  bun scripts/content/format-batches.ts run-generators --batch generators
  bun scripts/content/format-batches.ts apply --batch generators --cli-report /tmp/kata-format-generators.json
  bun scripts/content/format-batches.ts run-generators --batch generators --check-no-new-diff
  git add --pathspec-from-file=docs/migrations/kata-v4/format-manifests/generators.paths.txt
  bun scripts/content/format-batches.ts verify-staged --batch generators
  git commit -m "fix: 🐛 stabilize generated file formatting"
  bun scripts/content/format-batches.ts record --batch generators --commit "$(git rev-parse HEAD)"
else
  bun scripts/content/format-batches.ts record --batch generators --not-applicable
fi
```

Expected: 生成器 commit 的路径与 manifest 完全相同；重新生成不再产生新 diff。控制 manifest/report 仍等待最终 audit commit，不混入生成器提交。

- [ ] **Step 6: 分批执行机械格式**

按以下顺序串行执行并各自提交：

1. TypeScript、JavaScript、JSON、JSONC；
2. Markdown、MDX、YAML、CSS、SCSS、HTML、Handlebars；
3. Python；
4. Shell；
5. 普通 XML；
6. `workspace/**` 中此前未覆盖的可编辑文本。

每个非空批次先由工具调用公共 format 命令并核对 diff，再按同一 manifest 暂存、复核、提交和记录；空批次只记为 `not_applicable`。使用同一模板串行执行，函数调用后的六个批次名与提交消息是封闭清单：

```bash
apply_format_batch() {
  local batch="$1"
  local message="$2"
  local manifest="docs/migrations/kata-v4/format-manifests/${batch}.paths.txt"
  if test -s "$manifest"; then
    bun scripts/content/format-batches.ts apply --batch "$batch" --cli-report "/tmp/kata-format-${batch}.json"
    git add --pathspec-from-file="$manifest"
    bun scripts/content/format-batches.ts verify-staged --batch "$batch"
    git commit -m "$message"
    bun scripts/content/format-batches.ts record --batch "$batch" --commit "$(git rev-parse HEAD)"
  else
    bun scripts/content/format-batches.ts record --batch "$batch" --not-applicable
  fi
}

apply_format_batch typescript-json "style: 🎨 format TypeScript and JSON files"
apply_format_batch documentation "style: 🎨 format documentation files"
apply_format_batch python "style: 🎨 format Python files"
apply_format_batch shell "style: 🎨 format shell files"
apply_format_batch xml "style: 🎨 format XML files"
apply_format_batch workspace-text "style: 🎨 format workspace text files"
```

每次 `apply` 都要断言 CLI changed 路径、非控制文件 diff 和 manifest 三者一致；`verify-staged` 再保证暂存区没有控制文件或其他批次路径。

- [ ] **Step 7: 封存批次审计**

全部正文批次结束后，无论是否有正文改动，都验证七份 report 已是 `applied/not_applicable`、所有 applied commit 可回读且路径匹配、当前只剩 audit 精确拥有的控制文件，然后提交唯一审计清单：

```bash
bun scripts/content/format-batches.ts verify \
  --phase final \
  --repo . \
  --policy config/file-policy.yaml \
  --dirty docs/migrations/kata-v4/preexisting-dirty.json \
  --manifest-dir docs/migrations/kata-v4/format-manifests \
  --report-dir docs/migrations/kata-v4/format-reports
git add --pathspec-from-file=docs/migrations/kata-v4/format-manifests/audit.paths.txt
git diff --cached --check
git commit -m "docs: 📝 record workspace format batches"
```

- [ ] **Step 8: 验证幂等**

Run:

```bash
set +e
bun ./packages/cli/bin/kata workspace format --format json > /tmp/kata-format-idempotency.json
FORMAT_EXIT=$?
set -e
test "$FORMAT_EXIT" -eq 0 -o "$FORMAT_EXIT" -eq 4
FORMAT_EXIT="$FORMAT_EXIT" bun -e '
const code = Number(process.env.FORMAT_EXIT);
const cli = await Bun.file("/tmp/kata-format-idempotency.json").json();
if (cli.data?.changed !== 0) process.exit(1);
if (code === 0 && cli.status === "passed") process.exit(0);
if (code === 4 && cli.status === "needs_input") process.exit(0);
process.exit(1);
'
git diff --exit-code
```

Expected: formatter 报告 changed=0；执行 worktree 已提交本 Task 的全部计划内改动后，Git 无新 diff。主工作树保护文件不应出现在隔离 worktree。

---

### Task 9: 人工复核 Skill、提示词与历史中文

**Files:**
- 复核并修改：`skills/*/SKILL.md`
- 复核并修改：`skills/*/phases/*.md`
- 复核并修改：`skills/*/prompts/*.md`
- 复核并修改：`skills/*/references/*.md`
- 复核并修改：`skills/using-kata/**`
- 复核并修改：`AGENTS.md`
- 复核并修改：`CLAUDE.md`
- 复核并修改：平台入口文档与公共 prompt
- 命中规则时复核：`workspace/**/*.md`、`workspace/**/*.yaml`
- Modify: `docs/migrations/kata-v4/content-review.json`
- Modify: `docs/migrations/kata-v4/content-review.md`
- Create: `docs/migrations/kata-v4/content-review-skill.paths.txt`
- Create: `docs/migrations/kata-v4/content-review-workspace.paths.txt`
- Create: `docs/migrations/kata-v4/content-review-unresolved.paths.txt`
- Create: `docs/migrations/kata-v4/content-review-audit.paths.txt`

**Interfaces:**
- Produces: 已审阅文件清单、逐项修订记录、unresolved 分歧。
- Constraint: 不在本 Task 改代码行为、schema、用例范围、优先级或预期结果。

- [ ] **Step 1: 生成审阅清单**

Run:

```bash
set +e
bun ./packages/cli/bin/kata workspace check --language --format json > /tmp/kata-language-review.json
LANGUAGE_EXIT=$?
set -e
test "$LANGUAGE_EXIT" -eq 0 -o "$LANGUAGE_EXIT" -eq 4
```

Expected: 自动列出全部 9 个业务 Skill、`using-kata`、公共 prompt、`AGENTS.md`、`CLAUDE.md`、平台入口，以及所有被规则标记或本轮修改的历史文档。

- [ ] **Step 2: 逐份人工复核固定范围**

在修改正文前先生成三份稳定排序的内容 manifest：Skill/入口改动进入 `content-review-skill.paths.txt`，历史 workspace 改动进入 `content-review-workspace.paths.txt`，若确有单独的未解决说明文件则进入 `content-review-unresolved.paths.txt`。三份只列实际内容路径，可以为空，彼此不得重复。`content-review-audit.paths.txt` 始终列出自身、三份内容 manifest、`content-review.json` 和 `content-review.md`，每条恰好一次。

每份检查：

- 目的、输入、动作、返回、停止条件是否连贯；
- 是否有重复规则、相互矛盾或执行者永远读不到的说明；
- 中文是否准确、简洁、自然；
- 技术字段、命令、路径与产品名称是否逐字保留；
- 是否出现无来源的业务判断。

核心 `case-draft` 与 `playwright-automation` 由不同于实现者的审阅代理复核；其他 Skill 按目录串行复核。

- [ ] **Step 3: 处理历史文档**

只修改自动标记或本轮已经改动的历史文件。PRD、页面、源码一致时可修正；不一致时写入 unresolved，保留原文。

- [ ] **Step 4: 分主题提交**

```bash
git add --pathspec-from-file=docs/migrations/kata-v4/content-review-skill.paths.txt
git commit -m "docs: 📝 refine skill and prompt language"
git add --pathspec-from-file=docs/migrations/kata-v4/content-review-workspace.paths.txt
git commit -m "docs: 📝 correct verified workspace content"
git add --pathspec-from-file=docs/migrations/kata-v4/content-review-unresolved.paths.txt
git commit -m "docs: 📝 record unresolved content reviews"
git add --pathspec-from-file=docs/migrations/kata-v4/content-review-audit.paths.txt
git commit -m "docs: 📝 record the complete content review"
```

每次只暂存对应文件；任一内容 manifest 为空时不创建对应提交。最后一个审计提交始终存在，统一保存两份总报告、四份 manifest 和所有未解决分歧。提交前验证四份 manifest 的并集与本 Task 的 `git diff --name-only` 完全一致。

- [ ] **Step 5: 复核报告完整性**

Expected: 固定范围每份文件都有 reviewer/status；所有 before/after 都有原因与来源；unresolved 未被改写。

---

### Task 10: 内容治理子项目验收

**Files:**
- Verify: 本计划创建或修改的全部文件

**Interfaces:**
- Consumes: Tasks 1–9 的实现、报告和内容复核记录。
- Produces: 精确命令结果，以及 `passed` 或 `needs_input` 的子项目状态；不在验收 Task 临时扩大文件范围。

- [ ] **Step 1: 运行始终跑完的 CI 聚合检查**

Run:

```bash
set +e
bun run ci -- --format json --output /tmp/kata-content-ci.json
CI_EXIT=$?
set -e
test "$CI_EXIT" -eq 0 -o "$CI_EXIT" -eq 4
bun scripts/ci/run.ts --check-report /tmp/kata-content-ci.json --exit-code "$CI_EXIT"
```

Expected:

- CI 报告中 contracts、type-check、单元测试和两种 diff check 都退出 0；
- 若 `preexisting-dirty.json` 仍有受保护路径，只有 workspace check 为 `needs_input`，聚合器返回 4 并逐项列入 `needs_review`；这些路径经用户处理并重新确认保护快照后才可退出 0；
- 对所有非保护路径，format changed=0；
- 四类 tracked 数量之和等于实时 `git ls-files -z` 数量；
- 分类无重复；
- dirty 路径都在 `needs_review` 或带原因排除；
- untracked 未进入分母；
- JMX 只验证，报告不含属性值或正文；
- CI JSON 的六项命令一项不少，不能由后一个退出码覆盖前一个失败。
- unit_tests 记录必须证明内容治理测试已被收集，0 fail、0 skip；不再在相邻步骤重复执行同一批测试。

- [ ] **Step 2: 验证生成与格式幂等**

Run:

```bash
bun run contracts:generate --check
set +e
bun ./packages/cli/bin/kata workspace format --format json > /tmp/kata-content-format.json
FORMAT_EXIT=$?
set -e
test "$FORMAT_EXIT" -eq 0 -o "$FORMAT_EXIT" -eq 4
FORMAT_EXIT="$FORMAT_EXIT" bun -e '
const code = Number(process.env.FORMAT_EXIT);
const cli = await Bun.file("/tmp/kata-content-format.json").json();
if (code === 0 && cli.status === "passed" && cli.data?.changed === 0) process.exit(0);
if (code === 4 && cli.status === "needs_input" && cli.data?.changed === 0
  && cli.data?.files?.filter((item) => item.status === "needs_review")
    .every((item) => item.dirty_at_baseline === true)) process.exit(0);
process.exit(1);
'
git diff --exit-code
```

Expected: 生成检查不产生 diff；format 为 0 时 changed=0，为 4 时只能包含初始保护路径且仍无 diff。若执行 worktree 有计划内未提交验证修正，先提交这些修正后重新运行。

- [ ] **Step 3: 请求审阅**

调用 `superpowers:requesting-code-review`。审阅重点：tracked 数量完整对应、dirty/untracked 边界、工具版本可复现、JMX 保密、中文扫描不越权改写、格式与内容提交分离。

- [ ] **Step 4: 处理审阅结果**

若审阅发现问题，回到拥有该文件的 Task，补失败测试、实现、GREEN 和该 Task 的精确提交；然后从 Step 1 重跑。不得用一个没有文件清单的“验收修正”提交掩盖所有权。

## Completion Gate

只有以下条件全部满足，才能把本子项目标记为完成：

- `bun ./packages/cli/bin/kata workspace format --dry-run` 与 `bun ./packages/cli/bin/kata workspace check` 退出 0；若受保护路径仍需用户处理，本子项目状态只能是 `needs_input`；
- 实时已跟踪文件全部且只落入一种 disposition；
- 未跟踪文件和预先存在的 dirty 路径未被改写；
- JMX 未被格式化，敏感属性值未进入日志或报告；
- CSV、XLSX 与 symlink 均由对应验证器覆盖；
- 全部固定工具版本可由锁文件验证；
- 格式化与生成连续执行两次均无 diff；
- 九个业务 Skill、`using-kata`、公共 prompt、`AGENTS.md`、`CLAUDE.md` 和平台入口已逐份人工复核；
- 历史中文只修改已标记或本轮修改的文件，且每项修改有来源；
- unresolved 分歧仍保留原文并清楚列出；
- 格式改动与内容改动位于不同提交；
- 测试 0 fail、0 skip，`git diff --check` 退出 0。
