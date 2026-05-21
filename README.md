<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/Kata-4.0_AI_Core-2563EB?style=for-the-badge">
  <img alt="Kata 4.0 AI Core" src="https://img.shields.io/badge/Kata-4.0_AI_Core-2563EB?style=for-the-badge">
</picture>

# Kata

### AI Core 驱动的 QA 工作流与 Coding-Agent Runtime

Kata 把 QA 过程拆成可审计的 product skills：从 PRD、设计源、bug、源码 diff、UI 用例和测试结果中生成测试用例、报告、Playwright 脚本和项目知识。

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Bun](https://img.shields.io/badge/Bun-required-000000?style=flat-square&logo=bun&logoColor=white)](https://bun.sh/)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Skills-7C3AED?style=flat-square)](https://claude.com/claude-code)
[![Codex](https://img.shields.io/badge/Codex-runtime-111827?style=flat-square)](./AGENTS.md)
[![Version](https://img.shields.io/badge/version-4.0.0--alpha.1-blue.svg?style=flat-square)](./package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

**中文** | **[English](./README-EN.md)**

</div>

---

## 30 秒概览

Kata 不是单个脚本，而是一套 AI Core 合约化工作流：

```text
PRD / Lanhu / 设计源 ─── /case-draft ───────> Archive MD + XMind
已有用例产物 ─────────── /case-edit ──> 规范化、同步、转换
项目业务知识 ─────────── /knowledge-curate ──> 查询、更新、维护
失败证据 / Bug / 冲突 ── /bug-file 等命令 ───────> 报告、Hotfix 回归用例、冲突分析
UI 用例 / 测试结果 ───── /playwright-automation ────> UI 计划、Playwright 脚本、失败归因
源码 diff ───────────── /diff-scan ───────> 可复现缺陷报告
```

核心原则：

- `.ai/core/**` 是 skills、commands、workflows、agents、prompts、schemas 和 runtime guard 的唯一声明源。
- `.agents/**` 与 `.claude/**` 是生成投影，分别服务 kata Codex runtime 和 Claude Code runtime。
- 所有项目产物写入 `workspace/{project}/`；源码证据位于 `.kata/repos/{project}/**` 且只读。
- `playwright-cli` 保持 vendor skill 原名，用于真实浏览器自动化；kata-owned product skill 不复用旧聚合命名。

## 快速开始

### 前置条件

| 工具 | 要求 | 用途 |
| --- | --- | --- |
| Node.js | `>= 22.0.0` | 运行 TypeScript/Bun 工具链 |
| Bun | 已安装 | 安装依赖、运行测试和 CLI |
| Git | 已安装 | 管理仓库与项目源码证据 |
| Claude Code 或 Codex | 推荐 | 使用 `.claude/**` / `.agents/**` runtime skills |

### 安装

推荐先阅读 [INSTALL.md](./INSTALL.md)。手工安装流程如下：

```bash
bun install
[ -f .env ] || cp .env.example .env
kata config
bun test --cwd engine
```

仅在需要真实浏览器或 Playwright 用例执行时安装浏览器：

```bash
bunx playwright install
```

完成后，在 Claude Code 或 Codex 中输入：

```text
/workspace-manage
```

## 当前能力

以下命令来自 `.ai/core/commands/*.command.yaml`，是 README 的当前能力口径。

<!-- ai-core:start command-index -->
| 命令 | 领域 | Skill | 说明 |
| --- | --- | --- | --- |
| `/workspace-manage` | 工作区 | `workspace-manage@1` | 显示 kata 功能菜单和管理项目工作区。 |
| `/case-draft` | 用例生成 | `case-draft@1` | 根据需求文档、PRD 或设计源生成 QA 测试用例。 |
| `/case-edit` | 用例维护 | `case-edit@1` | 编辑、同步、转换或标准化已有 QA 用例产物。 |
| `/knowledge-curate` | 知识管理 | `knowledge-curate@1` | 查询或更新项目业务知识和规则。 |
| `/bug-file` | 缺陷与变更 | `bug-file@1` | 根据观察到的失败现象生成有证据支持的 bug 报告。 |
| `/conflict-analyze` | 缺陷与变更 | `conflict-analyze@1` | 分析合并冲突并生成解决方案说明。 |
| `/case-hotfix` | 缺陷与变更 | `case-hotfix@1` | 根据 bug 或修复记录生成 hotfix 回归用例。 |
| `/playwright-automation` | UI 自动化 | `playwright-automation@1` | 生成、修复或验证 Playwright UI 自动化，并在交付前真实运行。 |
| `/diff-scan` | 代码扫描 | `diff-scan@1` | 扫描代码 diff 发现可复现的缺陷。 |
| `/infra-diagnose` | 故障排查 | `infra-diagnose@1` | SSH 登录服务器排查并修复数据源与服务器连通性故障，沉淀凭据与排查知识。 |
<!-- ai-core:hash a672d754e4fd8c1b3c150be3c47210120211826a307c4a0ac0c39d2ceaca3da5 -->
<!-- ai-core:end command-index -->

常见入口：

- 新项目、菜单、工作区检查：`/workspace-manage`
- 从 PRD 或设计源生成用例：`/case-draft`
- 同步或转换已有用例产物：`/case-edit`
- 维护业务知识：`/knowledge-curate`
- UI 自动化：使用 `/playwright-automation` 统一处理规划、生成、运行和归因

## 架构

详细设计见 [Kata 4.0 整体项目架构设计说明](./docs/architecture/kata-project-architecture.md)；AI Core 子系统细节见 [AI Core 架构设计说明](./docs/architecture/ai-core-architecture.md)。

![Kata project architecture](./assets/diagrams/kata-project-overview.svg)

Kata 的 4.0 架构以 `.ai/core` 合约源为控制面，以 `engine` 为执行与校验层，以 `.agents` / `.claude` 为 runtime 投影，以 `workspace/{project}` 为业务产物区：

```text
.ai/core contracts
  ├─ skills / commands / workflows
  ├─ agents / prompts / schemas / guards
  ├─ runtime manifests / projection inventory
  └─ evals / docs generated blocks
        │
        ├──> .agents/**  kata Codex runtime projection
        └──> .claude/**  Claude Code runtime projection
```

<!-- ai-core:start runtime-support -->
| Runtime / 边界 | 当前职责 |
| --- | --- |
| `.ai/core/**` | AI Core 合约源：skills、commands、workflows、agents、prompts、schemas、guards、runtime manifests。 |
| `.agents/**` | kata Codex runtime 投影目录，由 `.ai/core` 生成；不要手工改生成内容。 |
| `.claude/**` | Claude Code runtime 投影目录，由 `.ai/core` 生成；不要手工改生成内容。 |
| `workspace/{project}/**` | 项目产物目录，存放 PRD 派生物、Archive MD、XMind、报告、Playwright 产物和项目知识。 |
| `.kata/repos/{project}/**` | 源码证据目录，只读；kata workflow 不在这里 push、commit 或写业务文件。 |
<!-- ai-core:hash 1b70f8ca6a3f68e6bf379d665db71eaf582bb318d2f52768d4e1093954268a63 -->
<!-- ai-core:end runtime-support -->

工作流执行时，agent 先读取 `.ai/core` 合约和 runtime 投影，再通过 `workspace/{project}/` 读写项目产物。写入边界、SourceRef、secret ref、projection lock、parser boundary audit 和 golden evals 都由 AI Core gate 统一校验。

## 插件

内置插件位于 `plugins/`，按 hook 接入 product skills。

| 插件 | 触发点 | 必需配置 |
| --- | --- | --- |
| `lanhu` | `case-draft:init` | `KATA_LANHU_COOKIE` |
| `zentao` | `case-hotfix:init` | `KATA_ZENTAO_BASE_URL`, `KATA_ZENTAO_ACCOUNT`, `KATA_ZENTAO_PASSWORD` |
| `notify` | `*:output` | 至少一个通知通道：`KATA_DINGTALK_WEBHOOK_URL`, `KATA_FEISHU_WEBHOOK_URL`, `KATA_WECOM_WEBHOOK_URL`, `KATA_SMTP_HOST` |

配置写入 `.env`。`.env.example` 中列出了所有当前支持的 `KATA_*` 变量。

## 项目目录

```text
kata/
├── .ai/core/        # AI Core 合约源
├── .agents/         # kata Codex runtime 投影
├── .claude/         # Claude Code runtime 投影
├── engine/          # CLI、AI Core 校验、工作流支撑代码和测试
├── plugins/         # lanhu / zentao / notify
├── tools/           # 独立工具包
├── templates/       # 项目骨架与输出模板
└── workspace/       # 用户项目产物；源码副本位于 .kata/repos/{project}/
```

## 开发与验证

常用命令：

```bash
# AI Core 聚焦测试
bun run test:ai-core

# AI Core lint/gates/docs/parser/projection 全链路
bun run lint:ai-core

# 全量 engine 测试
bun --no-env-file test --cwd engine

# 重新生成 README/CHANGELOG 中的 AI Core 托管块
bun --no-env-file kata ai-core:docs render

# 检查托管块是否漂移
bun --no-env-file kata ai-core:docs check
```

变更 runtime 内容时，优先修改 `.ai/core/**`，再运行 projection/docs/gate 命令生成并校验投影；不要直接手工编辑 `.agents/**` 或 `.claude/**` 里的生成内容。

## License

MIT
