<p align="center">
  <img src="./assets/diagrams/kata-project-overview.svg" alt="Kata 项目结构" width="860" />
</p>

# Kata

## 面向 Claude Code 与 OpenAI Codex 的 QA 工作流

Kata 把需求分析、用例设计、缺陷排查和 UI 自动化整理成可复用的 Skill。输入可以是 PRD、设计稿、缺陷记录、源码差异、已有用例或测试结果；输出写入明确的项目目录，并保留可复核的运行记录。

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Bun](https://img.shields.io/badge/Bun-required-000000?style=flat-square&logo=bun&logoColor=white)](https://bun.sh/)
[![Version](https://img.shields.io/badge/version-4.0.0--alpha.1-blue.svg?style=flat-square)](./package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

**中文** | **[English](./README-EN.md)**

## 30 秒概览

```text
PRD / 设计稿 / 功能说明 ─── test-case ───────────> cases.yaml + XMind
已有用例 ────────────────── test-case ───────────> 编辑、同步与标准化
项目业务知识 ────────────── domain-knowledge ────> 查询与维护
缺陷 / 冲突 / 代码差异 ──── defect-analyze ──────> 缺陷分析与修复建议
UI 用例 / 脚本 / 失败结果 ─ ui-automation ───────> 脚本、运行记录与报告
服务器连通性故障 ────────── infra-diagnose ──────> 根因结论与排查知识
```

项目遵循四条边界：

- `.claude/skills/` 保存 Claude Code 的 Skill；集成实现位于 `cli/integrations/`。
- `.agents/skills/` 是指向 `.claude/skills/` 的 symlink，两端共用同一份 Skill 正文。
- 通用 CLI 位于 `cli/**`，两套运行环境共用同一份命令行实现。
- 项目产物写入 `workspace/{project}/`。源码仓库配置只保存在本机忽略文件 `config/repos/sources.yaml`（模板见 `config/repos/sources.example.yaml`），克隆于 `.repos/`（gitignored），用 `kata repos` 查询。

## 快速开始

### 前置条件

| 工具 | 要求 | 用途 |
| --- | --- | --- |
| Node.js | `>= 22.0.0` | 运行 TypeScript 与 Bun 工具链 |
| Bun | 已安装 | 安装依赖、运行 CLI 与测试 |
| Git | 已安装 | 管理仓库和外部源码目录 |
| Claude Code 或 Codex | 至少一种 | 执行对应运行环境的 Skill |

### 安装

```bash
bun install --frozen-lockfile
[ -f .env ] || cp .env.example .env
bun run ci
```

仅在运行真实浏览器测试时安装浏览器：

```bash
bunx playwright install
```

完整步骤见 [INSTALL.md](./INSTALL.md)。

## 当前能力

| 命令 | 领域 | 说明 |
| --- | --- | --- |
| `/test-case` | 用例 | 依需求源起草、编辑既有用例、同步与标准化；Hotfix 回归转 `/defect-analyze`。 |
| `/ui-automation` | UI 自动化 | 生成、修复或验证 Playwright UI 自动化，交付前真实运行。 |
| `/defect-analyze` | 缺陷与变更 | 分析缺陷材料、合并冲突或源码差异。 |
| `/infra-diagnose` | 故障排查 | SSH 排查数据源与服务器连通性问题。 |
| `/domain-knowledge` | 知识管理 | 查询或维护项目业务规则、术语和约束。 |
| `/workspace-management` | 工作区 | 创建、检查、修复项目工作区骨架。 |

路由按用户要完成的动作判断，而不是只看输入文件扩展名：修改既有用例与把用例实现为 UI 自动化是不同的入口。

## Claude Code 与 Codex

| 运行环境 | Skill 目录 | 维护方式 |
| --- | --- | --- |
| Claude Code | `.claude/skills/` | Skill 正文唯一来源。 |
| OpenAI Codex | `.agents/skills/` | 指向 Claude Skill 目录的 symlink。 |

两端运行环境共享同一份 Skill 正文；通用能力收在 `cli/` 供两端调用。

## 配置与安全

根目录 `.env` 是唯一 dotenv 文件。DataAssets 平台配置保存在本机私密的 `config/env/<env>.yaml`：

```bash
chmod 700 config/env
chmod 600 config/env/*.yaml
chmod 600 .env
```

常用命令：

```bash
kata env list
kata env show <env>
kata env doctor <env>
kata env cookie set <env> --stdin
kata env run <env> -- <command...>

# Playwright 结果必须写入 feature/runs/<run-id>
kata runs exec <feature-id> --project dataAssets -- kata env run <env> -- bunx playwright test <spec>
```

直接运行 Playwright 或使用未绑定 run 的命令会失败；仓库内禁止 `.runs/` 临时结果目录。

`env run` 默认只继承启动程序所需的基础环境变量。子命令确实需要额外变量时，使用 `--inherit-env NAME1,NAME2` 明确加入。命令输出不得回显 Cookie、令牌或密码。

基础设施配置分为本机私密的 `config/infra/hosts.yaml`、`data_sources.yaml` 和 `credentials.yaml`，仓库只提交三个 `*.example.yaml`。用 CLI 检查和录入：

```bash
kata config doctor
kata infra credentials set <name> --username <username>
kata infra trust-host <host> --fingerprint <SHA256-fingerprint>
kata infra inspect <host> --check connectivity --project <project>
```

当前 inspect 只验证 SSH2 connectivity 并生成 `analyses/infra-report/<yyyymm>/<slug>.md`，不执行任意远程命令或服务器变更。

缺陷、冲突、扫描和 hotfix 报告统一用 `kata defects lint --report <report.md> --exit-code` 校验；hotfix 回归由 `kata defects hotfix` 生成 Markdown，不再经过 `test-case`。

源码仓库配置只保存在本机忽略文件 `config/repos/sources.yaml`（模板见 `config/repos/sources.example.yaml`），实体克隆在 `.repos/`（gitignored）。通过 `kata repos list|sync-env|show|grep` 查询，`kata repos pull|checkout` 更新或切换本地克隆；`writable: false` 的仓库不可 push、commit、add。

## 项目目录

```text
kata/
├── .claude/                       # Claude Code Skill 与插件
│   └── skills/
├── .agents/                       # Codex Skill symlink
│   └── skills/
├── cli/                           # kata CLI(两端共用)
├── config/                        # repos/sources.yaml 等;私密配置(env/, infra/)不提交
└── workspace/                     # 项目输入、用例、自动化和运行产物
```

Skill 的产物写入对应 feature 目录。运行目录 `runs/<run-id>/` 由 CLI 写入 `status.json` 与 `allure-results/`，流程产生的截图、日志和 `handoff.md` 落在同一目录；未运行的范围不得写成通过。

## 开发与验证

```bash
bun install --frozen-lockfile
bun run check
bun run type-check
bun run test
bun run ci
```

公开命令、目录或产物发生变化时，应同时更新中英文 README 与安装说明。

## License

MIT
