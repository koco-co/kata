# Kata 安装指南

## 前置依赖

| 工具    | 最低版本 | 检查命令         | 安装方式             |
| ------- | -------- | ---------------- | -------------------- |
| Node.js | >= 22.0  | `node --version` | `nvm install 22`     |
| Bun     | 任意     | `bun --version`  | `npm install -g bun` |
| Git     | 任意     | `git --version`  | `brew install git`   |

## 安装步骤

```bash
# 1. 安装依赖
bun install

# 2. 创建环境配置（如不存在）
[ -f .env ] || cp .env.example .env
[ -f config.json ] || cp config.example.json config.json

# 3. 创建并校验 DataAssets 环境（先按 config/env.example.yaml 补全平台字段）
kata env add ci63 --url http://platform.example
kata env doctor ci63 --offline

# 4. 运行测试（必须全绿）
bun test

# 5. （可选）UI 自动化需要时安装 Playwright
bunx playwright install
```

## 配置变量

根 `.env` 是唯一 dotenv，只保留当前实际使用的非空集成项。DataAssets 的平台根 URL、稳定项目/数据源名称、租户保护、写入开关与 UI Cookie 统一存放在忽略的 `config/env/<env>.yaml`；ID/typeId 每次运行时在线解析。

| 场景 | 配置变量 |
| --- | --- |
| 默认项目与工作区 | `KATA_ACTIVE_PROJECT` / `KATA_WORKSPACE_ROOT` |
| DataAssets UI 自动化 / 数据准备 | `kata env run <env> -- <command...>` + `config/env/<env>.yaml` |
| 源码证据 | `KATA_SOURCE_REPOS` / `KATA_SOURCE_REPO_ROOT` |
| 蓝湖 PRD 导入 | `KATA_LANHU_COOKIE` |
| 禅道 Bug | `KATA_ZENTAO_BASE_URL` + `KATA_ZENTAO_COOKIE`，或账号密码 |
| 消息通知 | `KATA_DINGTALK_WEBHOOK_URL` / `KATA_DINGTALK_KEYWORD` / `KATA_FEISHU_WEBHOOK_URL` / `KATA_WECOM_WEBHOOK_URL` |
| SMTP 邮件 | `KATA_SMTP_HOST` / `KATA_SMTP_USER` / `KATA_SMTP_PASS` / `KATA_SMTP_FROM` / `KATA_SMTP_TO` |
| 独立 DTStack CLI/SDK | `KATA_DTSTACK_BASE_URL` / `KATA_DTSTACK_SESSION_PATH` |

## 安全守卫（仓库自带）

仓库自带 `.claude/settings.json`，将 `pre-edit-guard` 和 `pre-bash-guard` 挂入 Claude Code 的 `PreToolUse`：

- `pre-edit-guard`：拦截对源仓库证据 `workspace/{project}/.kata/repos/**` 的 Edit/Write。
- `pre-bash-guard`：拦截 `rm -rf workspace/`、`rm -rf /`，以及对 `.kata/repos/` 的 git push。

首次在 Claude Code 中打开本项目时，会提示批准这些项目级 hook（安全机制），批准后即生效。紧急时可用 `KATA_BYPASS_HOOK=1` 临时绕过。直接在命令行操作不经 Claude Code，不受 hook 约束，但仍以 `.claude/rules/repo-readonly.md` 为准。

## 安装完成

回到 Claude Code，输入 `/workspace-manage` 查看功能菜单。
