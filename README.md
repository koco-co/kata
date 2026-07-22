<p align="center">
  <img src="./assets/diagrams/kata-project-overview.svg" alt="Kata 项目结构" width="860" />
</p>

# Kata

### 面向 Claude Code 与 OpenAI Codex 的 QA 工作流

Kata 把需求分析、用例设计、缺陷排查和 UI 自动化整理成可复用的 Skill。输入可以是 PRD、设计稿、缺陷记录、源码差异、已有用例或测试结果；输出写入明确的项目目录，并保留可复核的运行记录。

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Bun](https://img.shields.io/badge/Bun-required-000000?style=flat-square&logo=bun&logoColor=white)](https://bun.sh/)
[![Version](https://img.shields.io/badge/version-4.0.0--alpha.1-blue.svg?style=flat-square)](./package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

**中文** | **[English](./README-EN.md)**

## 30 秒概览

```text
PRD / 设计稿 / 功能说明 ───── case-draft ───────────> Archive MD + XMind
已有用例 ─────────────────── case-edit ────────────> 编辑、同步、转换
项目业务知识 ─────────────── knowledge-curate ─────> 查询与维护
缺陷 / 冲突 / 代码差异 ───── defect-analyze ───────> 缺陷分析与修复建议
UI 用例 / 脚本 / 失败结果 ─── playwright-automation > 脚本、运行记录与报告
SQL 合并任务 ─────────────── sql-merge-validate ───> 合并结果与校验说明
```

项目遵循四条边界：

- `.claude/**` 保存 Claude Code 的 Skill、规则和运行入口。
- `.agents/**` 保存 Codex 的 Skill。`case-draft` 与 `playwright-automation` 已采用 Codex 原生说明；其余 Skill 在迁移完成前继续使用兼容入口。
- 通用 CLI、Schema、校验器和运行代码暂时位于 `.claude/scripts/_shared/**`，两套运行环境共用代码，不共用提示词正文。
- 项目产物写入 `workspace/{project}/`。源码从 `.env` 声明的外部仓库只读查询，不在项目目录建立源码缓存。

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
kata workspace verify
bun run ci
```

仅在运行真实浏览器测试时安装浏览器：

```bash
bunx playwright install
```

完整步骤见 [INSTALL.md](./INSTALL.md)。

## 当前能力

| 命令 | 领域 | Skill | 说明 |
| --- | --- | --- | --- |
| `/workspace-manage` | 工作区 | `workspace-manage@1` | 查看功能入口并管理项目工作区。 |
| `/case-draft` | 用例生成 | `case-draft@1` | 根据需求、PRD、设计稿或功能说明起草测试用例。 |
| `/case-edit` | 用例维护 | `case-edit@1` | 编辑、同步、转换或规范化已有用例。 |
| `/knowledge-curate` | 知识管理 | `knowledge-curate@1` | 查询或维护项目业务规则、术语和约束。 |
| `/defect-analyze` | 缺陷与变更 | `defect-analyze@1` | 分析缺陷材料、合并冲突或源码差异。 |
| `/case-hotfix` | 回归用例 | `case-hotfix@1` | 根据缺陷或修复记录生成 Hotfix 回归用例。 |
| `/playwright-automation` | UI 自动化 | `playwright-automation@1` | 审查、生成、运行或修复 Playwright 自动化。 |
| `/infra-diagnose` | 故障排查 | `infra-diagnose@1` | 排查数据源与服务器连通性问题。 |
| `/sql-merge-validate` | SQL 校验 | `sql-merge-validate@1` | 合并 SQL 变更并校验结构、依赖和结果。 |

路由按用户要完成的动作判断，而不是只看输入文件扩展名。只修改用例时使用 `case-edit`；把已有用例实现为 UI 自动化时使用 `playwright-automation`。

## Claude Code 与 Codex

| 运行环境 | Skill 目录 | 当前方式 |
| --- | --- | --- |
| Claude Code | `.claude/skills/` | Claude 原生 Skill，保持独立维护。 |
| OpenAI Codex | `.agents/skills/` | 核心工作流使用 Codex 原生 Skill；未迁移部分暂用兼容入口。 |

Codex 会话先读取 `.agents/skills/using-kata-codex/SKILL.md`。原生 Skill 不写固定模型名、固定代理数量或机械阶段；它只规定触发条件、输入输出、安全边界和完成状态。

迁移说明见 [docs/CODEX-SKILLS.md](./docs/CODEX-SKILLS.md)。

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
```

`env run` 默认只继承启动程序所需的基础环境变量。子命令确实需要额外变量时，使用 `--inherit-env NAME1,NAME2` 明确加入。命令输出不得回显 Cookie、令牌或密码。

源码目录由下列变量声明：

```dotenv
KATA_SOURCE_REPO_ROOT=/absolute/path/to/repos
KATA_SOURCE_REPOS=https://example/repo-a.git,https://example/repo-b.git
```

通过 `kata repos show|grep|list` 查询源码；这些命令不修改外部仓库。

## 项目目录

```text
kata/
├── .claude/                       # Claude Code Skill 与运行规则
│   ├── skills/
│   ├── scripts/_shared/           # CLI、Schema、校验器、测试
│   └── plugins/
├── .agents/                       # Codex Skill
│   └── skills/
├── .codex-plugin/                 # Codex 插件说明
├── config/                        # 本地环境模板；私密配置不提交
├── docs/                          # 使用说明、合同和设计记录
└── workspace/                     # 项目输入、用例、自动化和运行产物
```

Skill 的产物应写入对应 feature 目录。自动化运行建议保存 `manifest.yaml`、`run.json`、简短摘要以及 trace、截图等附件；状态使用 `draft`、`ready`、`generated-not-run`、`passed`、`failed` 或 `blocked`，不得把未运行内容写成通过。

## 开发与验证

```bash
bun install --frozen-lockfile
bun run check
bun run lint:agents
bun run lint:skills:codex
bun run type-check
bun run test
bun run ci
```

CLI 约定见 [docs/contracts/CLI-CONTRACT.md](./docs/contracts/CLI-CONTRACT.md)，中文与 Markdown 写法见 [docs/DOCS-STYLE-GUIDE.md](./docs/DOCS-STYLE-GUIDE.md)。公开命令、目录或产物发生变化时，应同时更新中英文 README、安装说明和变更记录。

## License

MIT
