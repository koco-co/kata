<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/Kata-4.0_Runtime-2563EB?style=for-the-badge">
  <img alt="Kata 4.0 Runtime" src="https://img.shields.io/badge/Kata-4.0_Runtime-2563EB?style=for-the-badge">
</picture>

# Kata

### 基于 Claude Code Skills 的可审计 QA 工作流

Kata 把 QA 过程拆成可审计的 product skills：从 PRD、设计源、bug、源码 diff、UI 用例和测试结果中生成测试用例、报告、Playwright 脚本和项目知识。

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Bun](https://img.shields.io/badge/Bun-required-000000?style=flat-square&logo=bun&logoColor=white)](https://bun.sh/)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Skills-7C3AED?style=flat-square)](https://claude.com/claude-code)
[![Version](https://img.shields.io/badge/version-4.0.0--alpha.1-blue.svg?style=flat-square)](./package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

**中文** | **[English](./README-EN.md)**

</div>

---

## 30 秒概览

Kata 不是单个脚本，而是一套可审计的 QA 工作流编排系统：

```text
PRD / Lanhu / 设计源 ─── /case-draft ───────> Archive MD + XMind
已有用例产物 ─────────── /case-edit ──> 规范化、同步、转换
项目业务知识 ─────────── /knowledge-curate ──> 查询、更新、维护
失败证据 / Bug / 冲突 / diff ── /defect-analyze ──> 缺陷报告、冲突解决方案
UI 用例 / 测试结果 ───── /playwright-automation ────> UI 计划、Playwright 脚本、失败原因分析
```

核心原则：

- `.claude/**` 是一等 runtime 目录，服务 kata Claude Code runtime。
- runtime 代码底盘位于 `.claude/scripts/_shared/**`（lib / schemas / plugin-runtime / cli / lint），共享提示词位于 `.claude/prompt/_shared/**`。
- 所有项目产物写入 `workspace/{project}/`；源码通过 `kata repos show|grep|list` 从外部仓库只读查询，不创建项目级 `.kata` 数据。
- 浏览器自动化通过 `playwright-automation` skill 完成；原生 Playwright API 速查见 `.claude/skills/playwright-automation/references/cli-essentials.md`。

## 快速开始

### 前置条件

| 工具 | 要求 | 用途 |
| --- | --- | --- |
| Node.js | `>= 22.0.0` | 运行 TypeScript/Bun 工具链 |
| Bun | 已安装 | 安装依赖、运行测试和 CLI |
| Git | 已安装 | 管理仓库与项目源码证据 |
| Claude Code | 推荐 | 使用 `.claude/**` runtime skills |

### 安装

推荐先阅读 [INSTALL.md](./INSTALL.md)。手工安装流程如下：

```bash
bun install
[ -f .env ] || cp .env.example .env
kata config
bun test
```

仅在需要真实浏览器或 Playwright 用例执行时安装浏览器：

```bash
bunx playwright install
```

完成后，在 Claude Code 中输入：

```text
/workspace-manage
```

## 当前能力

以下命令是当前公开能力口径；runtime 入口以 `CLAUDE.md` 与 `.claude/**` 为准。

| 命令 | 领域 | Skill | 说明 |
| --- | --- | --- | --- |
| `/workspace-manage` | 工作区 | `workspace-manage@1` | 显示 kata 功能菜单和管理项目工作区。 |
| `/case-draft` | 用例生成 | `case-draft@1` | 根据需求文档、PRD 或设计源生成 QA 测试用例。 |
| `/case-edit` | 用例维护 | `case-edit@1` | 编辑、同步、转换或标准化已有 QA 用例产物。 |
| `/knowledge-curate` | 知识管理 | `knowledge-curate@1` | 查询或更新项目业务知识和规则。 |
| `/defect-analyze` | 缺陷与变更 | `defect-analyze@1` | bug 证据、合并冲突、代码 diff 三模式缺陷分诊与解决方案。 |
| `/case-hotfix` | 缺陷与变更 | `case-hotfix@1` | 根据 bug 或修复记录生成 hotfix 回归用例。 |
| `/playwright-automation` | UI 自动化 | `playwright-automation@1` | 生成、修复或验证 Playwright UI 自动化，并在交付前真实运行。 |
| `/infra-diagnose` | 故障排查 | `infra-diagnose@1` | SSH 登录服务器排查并修复数据源与服务器连通性故障，沉淀凭据与排查知识。 |

### 功能使用示例

以下命令在 Claude Code runtime 中直接输入：

```bash
# 1. 工作区管理 — 首次使用查看功能菜单或管理项目工作区
/workspace-manage

# 2. 用例生成 — 提供 PRD、Lanhu URL 或 Axure 链接生成测试用例
/case-draft

# 3. 用例编辑 — 同步、转换或标准化已有 MD / XLSX / CSV / XMind / JSON 用例
/case-edit

# 4. 知识管理 — 查询或更新项目业务规则和术语
/knowledge-curate

# 5. UI 自动化 — 生成、运行、分析原因和修复 Playwright 自动化测试
/playwright-automation

# 6. 缺陷分析 — bug 证据 / 合并冲突 / 代码 diff 三模式缺陷分诊
/defect-analyze

# 7. Hotfix 回归用例 — 根据 bug 或修复记录生成回归用例
/case-hotfix

# 8. 故障排查 — SSH 登录服务器排查连通性故障
/infra-diagnose
```

## 架构

![Kata project architecture](./assets/diagrams/kata-project-overview.svg)

Kata 的 runtime 以 `.claude/**` 为一等实现：8 个业务 skill 为单一来源，prompt 级路由表（见 `CLAUDE.md`）把输入分发到对应 skill，`.claude/scripts/_shared/**`（lib / schemas / lint / cli）为执行与校验层，`.claude/plugins/` 提供 lanhu/zentao/notify 集成，`workspace/{project}` 存业务产物：

```text
.claude/    Claude Code runtime skills and contracts
.claude/scripts/_shared/**    CLI, validators, tests, and workflow support
```

| Runtime / 边界 | 当前职责 |
| --- | --- |
| `.claude/**` | Claude Code runtime skill 与 reference 目录，一等维护。 |
| `.claude/scripts/_shared/**` | runtime 代码底盘（lib / schemas / plugin-runtime / cli / lint）与 `.claude/prompt/_shared/**` 共享提示词。 |
| `workspace/{project}/**` | 项目产物目录，存放 PRD 派生物、Archive MD、XMind、报告、Playwright 产物和项目知识。 |
| `.env` 的 `KATA_SOURCE_REPO_ROOT` + `KATA_SOURCE_REPOS` | 外部源码映射；通过 `kata repos show|grep|list` 只读查询，不创建 `.kata/repos` 缓存。 |

工作流执行时，agent 读取对应 runtime skill 和共享底盘 `.claude/scripts/_shared/**`，再通过 `workspace/{project}/` 读写项目产物。写入边界、SourceRef、schema 和同步检查由 `.claude/scripts/_shared/**` 校验器与 runtime 检查器共同校验。

## Agent runtime 支持

kata 的 8 个业务 skill 单一存放于 `.claude/skills/`，通过适配目录暴露给其它 agent runtime，正文零复制、靠工具映射在运行时翻译：

| Runtime | 适配目录 | 发现机制 | 状态 |
| --- | --- | --- | --- |
| Claude Code | `.claude/skills/` | 原生 | ✅ 一等实现 |
| OpenAI Codex | `.agents/skills/` + `.codex-plugin/plugin.json` | 官方 `.agents/skills` 扫描，整目录 symlink | ✅ 官方支持 |

Codex 的工具名映射与会话起始引导见 `using-kata-codex` bootstrap。

## 插件

内置插件位于 `.claude/plugins/`，按 hook 接入 product skills。

| 插件 | 触发点 | 必需配置 |
| --- | --- | --- |
| `lanhu` | `case-draft:init` | `KATA_LANHU_COOKIE` |
| `zentao` | `case-hotfix:init` | `KATA_ZENTAO_BASE_URL` + `KATA_ZENTAO_COOKIE`，或完整账号密码 |
| `notify` | `*:output` | 至少一个通知通道：`KATA_DINGTALK_WEBHOOK_URL`, `KATA_FEISHU_WEBHOOK_URL`, `KATA_WECOM_WEBHOOK_URL`, `KATA_SMTP_HOST` |

根目录 `.env` 是唯一 dotenv：显式进程环境优先，其次才是 `.env`；不加载 `.env.envs`、根 `.env.local` 或项目 `.env.local`。DataAssets 平台环境改为本机私密的 `config/env/<env>.yaml`，一个平台一个文件并包含 `auth.cookie`；目录权限必须为 `0700`、文件为 `0600`，整目录被 Git 忽略。项目与数据源只保存稳定名称，ID/typeId 由 `kata env run <env> -- <command...>` 在每次运行前精确解析。所有 Git worktree 自动通过 common-dir 复用主工作树的这一份配置，不复制 Cookie。用 `kata env list`、`kata env show <env>`、`kata env doctor <env>` 管理环境，用 `kata env cookie set <env> --stdin` 安全轮换 Cookie；所有输出均脱敏。旧 DataAssets profile 通过 `kata env migrate-dataassets --apply` 一次性迁移。

## 项目目录

```text
kata/
├── .claude/                       # Claude Code runtime
│   ├── skills/                    # 8 个业务 skill（单一来源）
│   ├── scripts/_shared/           # CLI、lib、schemas、lint、测试
│   ├── plugins/                   # lanhu / zentao / notify
│   ├── rules/                     # 项目工作流规则
│   └── hooks/                     # 写入/命令守卫
├── .agents/                       # Codex skill 适配目录
├── .codex-plugin/                 # Codex 插件 manifest（plugin.json）
├── docs/                          # 架构、审计、技能与排查文档
└── workspace/                     # 用户项目产物；不存放源码缓存或 auth session
```

## 开发与验证

常用命令：

```bash
# 全量测试
bun --no-env-file test

# 检查 runtime skill 同步、detach 与结构契约（.claude ↔ .agents）
bun run check:skills
```

schema 与同步例外落在 `.claude/scripts/_shared/schemas/**` 与 Codex 适配目录；Codex 通过 symlink 复用 `.claude/skills/` 中的 skill 正文，零复制。

## License

MIT
