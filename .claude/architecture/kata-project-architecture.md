# Kata 4.0 整体项目架构设计说明

本文件描述 kata 当前 4.0 架构。当前架构是 `SKILL + Router + Graph + Workflow + Blackboard`：`.claude/**` 与 `.agents/**` 分别维护 Claude Code 和 Codex runtime，`docs/skills/contracts/**` 保存共享编排契约，`engine/src/skills/**` 提供校验器。

## 1. 架构总览

Kata 是面向 QA 生产链路的 coding-agent runtime 项目。它把需求、设计源、bug、源码 diff、UI 用例和测试结果转成可审计的工作流输入，再由 product skills 生成或维护：

- Archive MD、XMind 和测试用例矩阵。
- bug 报告、hotfix 回归用例和冲突分析报告。
- UI 自动化测试计划、Playwright 脚本、失败归因报告。
- 项目业务知识、规则、术语和证据索引。

项目分为八个主要层次：

| 层次 | 目录 / 入口 | 职责 |
| --- | --- | --- |
| 用户入口层 | `README.md`, `INSTALL.md`, `AGENTS.md`, `CLAUDE.md` | 告诉用户如何安装、调用能力、进入 runtime。 |
| Runtime 实现层 | `.agents/**`, `.claude/**` | Codex 与 Claude Code 可加载的 skills、references、索引和入口文档。 |
| 共享契约层 | `docs/skills/contracts/**` | 共享 schema、route、skill graph、workflow、插件 metadata、同步例外和项目规则契约。 |
| Blackboard 文档层 | `docs/skills/blackboard/**` | 跨 workflow step 共享状态槽的人工 review 文档。 |
| Engine 执行层 | `engine/**` | 提供 `kata`、配置解析、runtime skill 检查、schema 校验、报告生成、XMind/Archive/知识/源码分析等能力。 |
| 插件层 | `plugins/**` | 通过 hook 接入 Lanhu、Zentao、通知等外部系统，不能绕过合约和写入边界。 |
| 工具与模板层 | `tools/**`, `templates/**`, `lib/**` | 提供外部前置工具、输出模板、项目骨架和共享工具库。 |
| Workspace 产物层 | `workspace/{project}/**` | 存放用户项目产物；其中 `.kata/repos/**` 只作为源码证据读取。 |

## 2. 用户能力面

当前 active surface 以 `AGENTS.md`、`CLAUDE.md`、`.agents/**` 和 `.claude/**` 为准。

| 能力组 | 命令 |
| --- | --- |
| 工作区 | `/workspace-manage` |
| 用例生成与维护 | `/case-draft`, `/case-edit` |
| 知识管理 | `/knowledge-curate` |
| 缺陷与变更 | `/bug-file`, `/conflict-analyze`, `/case-hotfix` |
| UI 自动化 | `/playwright-automation` |
| 代码扫描 | `/diff-scan` |
| 故障排查 | `/infra-diagnose` |

`playwright-cli` 是 vendor skill，保留上游规范名称。它负责真实浏览器自动化，不属于 kata-owned product skill 命名体系。

## 3. 核心运行链路

一次典型调用从用户命令开始，经过 Router 选择、Graph 关系定位、Workflow 编排、Blackboard 状态传递、插件或 SourceRef 取证、写入策略检查，最后落到 workspace 产物。

标准链路如下：

1. 用户在 Codex、Claude Code 或 CLI 中调用 `/case-draft` 等命令。
2. Runtime 根据 `.agents/**` 或 `.claude/**` 找到 skill 和 references。
3. Engine 加载 `docs/skills/contracts/**`，校验 runtime 同步、route、skill graph、workflow、schema 和写入边界。
4. Workflow 按步骤调用 skill、plugin 和 SourceRef resolver，并通过 Blackboard 共享 `sources`、`decisions`、`artifacts` 等状态槽。
5. 中间结果先进入 staging 或受控写入接口。
6. WritePolicy 检查 workspace scope、`.kata/repos/**` 只读边界、path traversal、absolute path 和受保护共享契约写入。
7. 成功后写入 `workspace/{project}/`，并输出报告、用例、脚本或知识更新。

关键原则是：agent 可以参与生成内容，但不能临时发明运行规则、写入范围、插件权限或输出格式。这些必须由 runtime skill、`docs/skills/contracts/**` 和 engine 检查共同约束。

## 4. 目录职责与边界

### 4.1 `.agents/**` 与 `.claude/**`

这两个目录是一等 runtime 实现。

- `.agents/**` 面向 kata Codex runtime。
- `.claude/**` 面向 Claude Code runtime。
- `INDEX.md` 是 runtime 冷启动索引，把 command、skill、workflow、agent、prompt、plugin 和 outputs 串成调用图。
- 修改任一 runtime 时必须同步评估另一套 runtime，并运行 `bun run check:skills`。

共享 schema、route、skill graph、workflow、插件 metadata 和项目规则应落在 `docs/skills/contracts/**`。

### 4.2 `docs/skills/contracts/**`

共享契约层包含：

- `schemas/**`：结构化产物和 registry 的 JSON schema。
- `routes/**`：每个 runtime skill 的 should-trigger / should-not-trigger / clarify 样例。
- `skill-graph.yaml`：skill 之间的输入、输出和关联关系。
- `workflows/**`：复杂 skill 的 step 编排、Blackboard 输入输出、失败模式、人工确认节点和 verification。
- `plugins/**`：插件 runtime metadata。
- `rules/**` 和 `project-workflow-rules.md`：项目规则和按需加载入口。

### 4.3 `docs/skills/blackboard/**`

Blackboard 第一版以文档和 schema 明确状态槽，不把任意临时字段塞进 skill 文本。新增状态槽必须同步更新状态模型、JSON schema 和引用它的 workflow YAML。

### 4.4 `engine/**`

`engine` 是项目的执行和验证层：

- `engine/bin/kata`：用户和 CI 使用的 CLI 入口。
- `engine/src/skills/**`：runtime sync、detach、route、graph、workflow 等检查器。
- `engine/src/**`：项目创建、PRD/XMind/Archive、知识维护、报告生成、源码分析、测试通知等业务支撑。
- `engine/lib/**`：共享库和工具函数。
- `engine/tests/**`：CLI、策略、插件、schema、runtime check 和业务能力测试。

Engine 的职责是让 runtime skill 和共享契约可执行、可验证、可重复，而不是重新成为单一规范源。

### 4.5 `plugins/**`

插件用于连接外部系统：

| 插件 | 作用 | 常见配置 |
| --- | --- | --- |
| `lanhu` | 拉取设计源，用于生成测试用例。 | `KATA_LANHU_COOKIE` |
| `zentao` | 拉取 bug 或需求记录，用于 hotfix 用例和报告。 | `KATA_ZENTAO_BASE_URL`, `KATA_ZENTAO_ACCOUNT`, `KATA_ZENTAO_PASSWORD` |
| `notify` | 在输出阶段发送飞书、钉钉、企业微信或 SMTP 通知。 | `KATA_*_WEBHOOK_URL`, `KATA_SMTP_*` |

插件必须通过 manifest/hook 接入 product skill，不应直接改写 workspace、runtime 或共享契约。

### 4.6 `workspace/{project}/**`

Workspace 是业务产物区。它可以包含：

- `project.json`、项目配置和本地知识。
- 需求派生物、Archive MD、XMind、报告。
- UI 自动化计划、Playwright 脚本和运行结果。
- `.kata/repos/**` 源码副本。

其中 `.kata/repos/**` 是只读证据目录。Kata workflow 可以读取源码、diff、配置和测试结果，但不能在这里 commit、push 或写业务文件。

## 5. 写入模型

Kata 的写入模型遵循“先声明、再执行、失败关闭”：

| 目标 | 策略 |
| --- | --- |
| `workspace/{project}/**` | 允许声明范围内的业务产物写入。 |
| `workspace/{project}/.kata/repos/**` | 只读，作为源码证据和 diff 来源。 |
| `docs/skills/contracts/**` | 共享契约，普通 workflow 运行路径不得改写。 |
| `.agents/**`, `.claude/**` | 一等 runtime 实现；修改一侧必须同步评估另一侧。 |
| 绝对路径 / path traversal / symlink escape | 默认阻断。 |

这使 kata 能在一个仓库里同时管理 runtime、用户 workspace 和外部源码证据，而不让 agent 在边界上自由发挥。

## 6. 配置与密钥

配置入口分三层：

1. `.env.example` 声明支持的 `KATA_*` 变量。
2. `docs/skills/contracts/**` 与 engine schema 约束运行时共享配置和产物格式。
3. 插件配置由对应 plugin runtime 和 engine 校验。

原则：

- secret 不进入合约、docs、runtime 或测试 fixture。
- raw secret-like env 必须 fail-closed。
- 插件只能读取自己声明的配置。
- README 只列出用户需要知道的配置，不替代 schema。

## 7. 文档策略

README 是上手入口，不是完整规格书。详细架构、设计历史和实施计划放入 `docs/**`。

当前文档分工：

| 文档 | 职责 |
| --- | --- |
| `README.md` / `README-EN.md` | 快速理解、安装、能力入口、验证命令。 |
| `INSTALL.md` | 安装与本机环境准备。 |
| `AGENTS.md` / `CLAUDE.md` | coding-agent runtime 公开入口，手工维护命令索引和项目规则摘要。 |
| `docs/architecture/kata-project-architecture.md` | 整体项目架构。 |
| `docs/superpowers/specs/**` | 历史设计与阶段计划，不作为 runtime source-of-truth。 |

## 8. 质量门禁

发布前至少应通过：

```bash
bun run check:skills
bun test --cwd engine
bun run check
git diff --check
```

`check:skills` 覆盖 runtime sync、detach、route、skill graph 和 workflow checks。全量 engine 测试用于确认业务能力和 CLI 行为没有被架构升级破坏。

## 9. 扩展新能力的标准路径

新增 product skill 推荐顺序：

1. 在 `.agents/skills/<skill>/SKILL.md` 与 `.claude/skills/<skill>/SKILL.md` 定义能力边界、输入输出、references、few-shot、证据和失败策略。
2. 在 `AGENTS.md` 与 `CLAUDE.md` 增加用户入口。
3. 在 `docs/skills/contracts/**` 增加共享 route、skill graph、workflow、schema、插件 metadata 和必要规则。
4. 如需外部系统，增加 plugin manifest 与 hook。
5. 增加聚焦测试，覆盖正例、别名、边界和负例。
6. 运行 `bun run check:skills` 和相关 engine 测试。
7. 更新 README / docs。

这个流程的好处是：能力先被契约描述，再被 runtime 消费；不会出现某个 agent 文件能跑，但 README、CLI、schema 或检查器不知道它存在的状态。

## 10. 当前边界

- `playwright-cli` 作为 vendor skill 保留上游名称和语义。
- `workspace/**` 是用户产物区，不应被当作 runtime 合约源扫描。
- 环境依赖的真实浏览器 PDF 检查默认不运行；需要本机 Playwright browser 可执行文件时再 opt-in。
- `docs/superpowers/**` 是设计和执行历史，不参与 runtime 合约加载。
