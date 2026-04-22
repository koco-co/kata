# Kata 4.0 AI Core 子系统架构设计说明

> 本文只描述 AI Core 子系统。整体项目架构、engine、plugins、workspace、tools 和 runtime 边界见 [`kata-project-architecture.md`](./kata-project-architecture.md)。

![Kata runtime flow](../../assets/diagrams/kata-runtime-flow.svg)

## 1. 定位

Kata 4.0 是一个面向 QA 工作流的 AI Core runtime 项目。它不把能力散落在手写 prompt、脚本和 agent 目录中，而是把可调用能力统一声明在 `.ai/core/**`，再投影到 Claude Code 与 kata Codex 两套 runtime。

项目的核心目标是：

- 将 QA 工作流拆成可审计、可测试、可投影的 product skills。
- 让技能、命令、workflow、agent、prompt、schema、guard、eval 和 runtime 文档来自同一个 AI Core 源。
- 让项目产物写入 `workspace/{project}/**`，把 `workspace/{project}/.repos/**` 固定为只读源码证据。
- 让插件只通过声明过的 hook 接入，不越过 workflow 和写入边界。
- 让 README、runtime skills、root agent docs 等公开入口能由合约生成或校验，避免文档漂移。

## 2. 架构总览

```text
.ai/core
  ├─ skills       product skill 合约
  ├─ commands     用户可调用命令表
  ├─ workflows    工作流编排与预算
  ├─ agents       worker / reviewer / runner 合约
  ├─ prompts      prompt 版本、上下文预算、失败策略
  ├─ schemas      数据契约与兼容注册表
  ├─ guards       写入、内容、schema、插件、runner、失败策略守卫
  ├─ plugins      AI Core 插件 manifest
  ├─ runtimes     Claude / Codex 投影声明、inventory、lock、secret refs
  ├─ evals        deterministic golden evals 与 baseline 决策
  └─ docs         README / CHANGELOG 生成块声明

        │ render / check
        ├── .agents/**   kata Codex runtime projection
        ├── .claude/**   Claude Code runtime projection
        ├── AGENTS.md    public coding-agent entrypoint
        └── CLAUDE.md    Claude runtime entrypoint
```

### 2.1 Source of Truth

`.ai/core/**` 是项目的唯一 AI runtime 源。任何涉及 product skill、命令、workflow、agent、prompt、schema、guard、runtime 目录和 docs generated block 的规范，都应先落在 `.ai/core`，再由 CLI 渲染到目标 runtime。

### 2.2 Runtime Projection

`.agents/**` 和 `.claude/**` 是生成投影：

- `.agents/**` 服务 kata Codex runtime。
- `.claude/**` 服务 Claude Code runtime。
- 两套 runtime 的 skill 内容应从同一份 product skill 合约生成。
- 生成文件由 projection inventory 和 projection lock 校验。
- 手工编辑生成文件会被 `ai-core:projection check` 或 `lint:ai-core` 识别为 drift。

### 2.3 Public Runtime Docs

根目录的 `AGENTS.md` 和 `CLAUDE.md` 是 coding-agent 入口文件，不承载私有偏好或临时规则。公共 runtime 内容由 `.ai/core/commands` 生成命令索引，并通过 generated marker/hash 防漂移。

## 3. 能力模型

Kata 4.0 的用户能力以 `.ai/core/commands/*.command.yaml` 为准。当前 user-invocable command 共 11 个：

| 领域 | 命令 | Skill |
| --- | --- | --- |
| 工作区 | `/workspace-manage` | `workspace-manage@1` |
| 用例生成 | `/case-draft` | `case-draft@1` |
| 用例维护 | `/case-edit` | `case-edit@1` |
| 知识管理 | `/knowledge-curate` | `knowledge-curate@1` |
| 缺陷与变更 | `/bug-file` | `bug-file@1` |
| 缺陷与变更 | `/conflict-analyze` | `conflict-analyze@1` |
| 缺陷与变更 | `/case-hotfix` | `case-hotfix@1` |
| UI 自动化 | `/ui-plan` | `ui-plan@1` |
| UI 自动化 | `/playwright-gen` | `playwright-gen@1` |
| UI 自动化 | `/run-triage` | `run-triage@1` |
| 代码扫描 | `/diff-scan` | `diff-scan@1` |

`playwright-cli` 是 vendor skill，保留原名。它用于真实浏览器自动化，不参与 kata-owned product skill 命名体系。

## 4. 合约层设计

### 4.1 Skill Contract

Product skill 描述“什么时候触发、需要什么输入、允许什么工具、输出什么、失败时怎么处理”。核心字段包括：

- `id` / `name` / `status`：技能身份和生命周期。
- `description.summary`：一句话能力说明。
- `description.must_trigger_when` / `must_not_trigger_when`：触发边界，避免技能路由歧义。
- `inputs` / `outputs`：输入输出能力面。
- `allowed_tools`：runtime 可使用工具集合。
- `context_budget`：上下文预算和溢出策略。
- `references` / `few_shots`：规范参考和格式示例。
- `evidence`：SourceRef 和证据要求。
- `failure_policy`：缺证据、歧义、越界时的 fail-closed 行为。

Skill 合约不直接描述 agent 编排或插件调用。编排属于 workflow，插件属于 plugin manifest 和 hook。

### 4.2 Command Contract

Command contract 是 README、root runtime docs 和用户入口的统一来源。每个 command 至少声明：

- `id`：命令名，不含 `/`。
- `skill`：绑定的 product skill。
- `user_invocable`：是否作为用户可直接调用命令。
- `summary`：中文命令说明。

README 的 “当前能力” 表格从 command contract 生成，不从 runtime skill 文件反推。

### 4.3 Workflow Contract

Workflow 描述从入口 skill 到 agent/prompt/plugin 的执行链路。它负责：

- 声明 `entry_skill`。
- 声明输入。
- 声明 token / cost / aggregation budget。
- 声明 step-level `uses`、`prompt`、依赖关系。
- 声明 failure mode 和 failure policy。

当前 workflow 默认采用 `staged_until_final_success`，表示中间产物先进入 staging，只有通过最终 gate 后才写入正式 workspace 位置。

### 4.4 Agent 和 Prompt Contract

Agent 合约描述执行角色、runner、读写范围、handoff schema 和 review gates。Prompt 合约描述 prompt version、schema version、上下文预算、prefill、fallback、幻觉处理和输出 schema。

二者分离的原因是：

- agent 是执行主体和权限边界。
- prompt 是模型输入规范和输出约束。
- workflow 可以复用 agent 或 prompt，也可以按能力拆分更细粒度 worker。

### 4.5 Schema / Guard / Eval

Schema、guard 和 eval 是 AI Core 的质量闭环：

- `schemas/registry.yaml` 管理所有 schema。
- `guards/registry.yaml` 管理写入、内容、插件、runner、failure policy 等守卫。
- `evals/**/golden.yaml` 记录 deterministic routing / policy / runtime 阻断用例。
- `baseline-known-failures.json` 只记录 deterministic baseline。
- `environment-dependent-checks.json` 记录默认不运行的环境依赖检查。

## 5. Runtime 投影流程

```text
.ai/core contract change
        │
        ├─ ai-core:projection render --runtime all
        │     ├─ render product skills
        │     ├─ copy vendor skill files
        │     ├─ render root runtime docs
        │     └─ render runtime INDEX.md
        │
        ├─ ai-core:projection:inventory:rewrite
        │     └─ rebuild projection-inventory.yaml from ledgers
        │
        ├─ ai-core:projection:lock render
        │     └─ record deterministic hashes for generated/copied files
        │
        └─ ai-core:projection check --runtime all
              └─ detect drift, missing files, stale vendor, unsafe paths
```

### 5.1 Projection Inventory

Projection inventory 记录 runtime 文件的来源和处置方式：

- `generated`：从 `.ai/core` 渲染。
- `copied_vendor`：从 frozen vendor skill byte-for-byte 复制。
- `local_exception`：用户本地例外，必须有 owner、reason、expires。
- `deleted`：显式声明已删除的历史 runtime 文件。

当前目标是 active runtime surface 不依赖历史兼容文件；历史旧名只应出现在历史 changelog、审计记录或负例测试中。

### 5.2 Projection Lock

Projection lock 记录生成文件和 copied vendor 文件的 hash，用于防止 silent drift。它必须 deterministic，不能使用真实生成时间造成跨机器漂移。

### 5.3 Runtime INDEX

`.agents/INDEX.md` 和 `.claude/INDEX.md` 是 runtime 冷启动索引。它们把 command、skill、workflow、agent、prompt、plugin 和 outputs 串成调用图，减少 agent 冷启动时遍历目录的成本。

## 6. 数据流与写入边界

### 6.1 标准数据流

```text
用户请求
  └─ command contract
      └─ product skill
          └─ workflow
              ├─ plugin input adapter
              ├─ agent runner
              ├─ prompt contract
              ├─ SourceRef / evidence
              └─ staged artifacts
                  └─ workspace/{project}/...
```

### 6.2 Workspace Boundary

`workspace/{project}/` 是业务产物目录。典型内容包括：

- PRD 派生物。
- Archive MD。
- XMind。
- HTML / JSON / PDF 报告。
- Playwright 脚本与运行产物。
- 项目业务知识。

`workspace/{project}/.repos/**` 是只读证据目录。Kata workflow 可以读取源码、diff、配置和上下文，但不能在这里 push、commit 或写业务文件。

### 6.3 Write Policy

写入策略遵循 fail-closed：

- 阻止 unsafe absolute path。
- 阻止 path traversal。
- 阻止 `.repos/**` 写入。
- 阻止受保护的 `.ai/core/**` runtime contract 被 workflow 执行路径直接改写。
- 允许已声明 workspace feature write scope。

## 7. 插件系统

插件位于 `plugins/`，通过 `plugin.json` 声明 hook、命令和所需环境变量。

| 插件 | Hook | 职责 | 必需配置 |
| --- | --- | --- | --- |
| `lanhu` | `case-draft:init` | 将蓝湖 URL 转成 PRD / 设计源输入 | `KATA_LANHU_COOKIE` |
| `zentao` | `case-hotfix:init` | 从禅道 bug 提取缺陷和修复上下文 | `KATA_ZENTAO_BASE_URL`, `KATA_ZENTAO_ACCOUNT`, `KATA_ZENTAO_PASSWORD` |
| `notify` | `*:output` | 在 workflow 输出后发送 IM / 邮件通知 | 任一通知通道环境变量 |

插件约束：

- 插件不能绕过 workflow 直接写 runtime surface。
- 插件凭据必须走 `KATA_*` 环境变量或 secret ref。
- 插件输出应被 schema 或 SourceRef 约束。
- 插件失败应返回结构化错误，由 workflow failure policy 决定继续、询问或阻断。

## 8. 本地上下文与规则优先级

Local context 只能承载本地偏好或环境说明，不能定义 runtime policy。

允许：

- 输出语气偏好。
- 本机路径说明。
- 本地开发习惯。

禁止：

- 路由规则。
- 写入范围。
- 插件权限。
- evidence requirement。
- output schema。
- policy override / bypass。

这些禁止项必须进入 `.ai/core/**` 合约，不能放在 `AGENTS.local.md`、`CLAUDE.local.md` 或 `.claude/settings.local.json` 中。

## 9. 文档生成策略

README 和 root runtime docs 采用 generated block：

```text
<!-- ai-core:start command-index -->
...
<!-- ai-core:hash ... -->
<!-- ai-core:end command-index -->
```

规则：

- generated block 的来源由 `.ai/core/docs/generated-blocks.yaml` 声明。
- `ai-core:docs render` 负责更新内容和 hash。
- `ai-core:docs check` 负责检查 drift、重复 block、未知 block 和顺序不一致。
- README 中英文必须保持 managed block 顺序一致。

这保证 README 的命令表不会和 `.ai/core/commands` 分叉。

## 10. 扩展新能力的标准路径

新增 product skill 时按以下顺序推进：

1. 在 `.ai/core/skills/{name}/skill.yaml` 声明 skill。
2. 在 `.ai/core/commands/{name}.command.yaml` 声明用户入口。
3. 在 `.ai/core/workflows/{name}.workflow.yaml` 声明执行链路。
4. 在 `.ai/core/agents` 和 `.ai/core/prompts` 增加必要 worker / prompt。
5. 如需插件，在 `plugins/{plugin}/plugin.json` 和 `.ai/core/plugins` 中声明。
6. 补 golden eval，覆盖正例、alias、边界和冲突负例。
7. 运行 projection render、inventory rewrite、lock render。
8. 运行 `bun run test:ai-core` 和 `bun run lint:ai-core`。

命名要求：

- kata-owned product skill 使用动名词短语，如 `case-draft`。
- vendor skill 保留上游 canonical name，如 `playwright-cli`。
- 不复活旧聚合 skill 作为 active runtime surface。

## 11. 发布与质量门禁

常用验证命令：

```bash
bun run test:ai-core
bun run lint:ai-core
bun --no-env-file test --cwd engine
bun --no-env-file engine/bin/kata ai-core docs check
bun --no-env-file engine/bin/kata ai-core projection check --runtime all
```

门禁覆盖：

- contract schema validation。
- projection drift。
- projection inventory classification。
- projection lock hash。
- parser boundary audit。
- context audit。
- secret env / secret ref。
- deterministic golden evals。
- baseline readiness。

只有 deterministic baseline 为 0、AI Core gates 通过、README generated blocks 不漂移时，才可以认为默认路径具备 release-ready 条件。环境依赖检查需要单独标注，不应让默认测试套件依赖本机浏览器或私有服务状态。

## 12. 当前架构边界

当前版本仍保持以下边界：

- 不声明 final GA，版本以 `package.json` 为准。
- 不把 `playwright-cli` 改名为 kata-owned skill。
- 不保留旧聚合 skill 作为 active runtime surface。
- 不让 local context 覆盖 runtime policy。
- 不让插件凭据以裸值写入合约或文档。
- 不让 `.repos/**` 成为写入目标。

这些边界是架构约束，不是临时实现细节。
