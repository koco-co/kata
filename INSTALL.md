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
[ -f .env.envs ] || cp .env.envs.example .env.envs
[ -f config.json ] || cp config.example.json config.json
[ -f config/repo-branch-mapping.yaml ] || cp config/repo-branch-mapping.example.yaml config/repo-branch-mapping.yaml

# 3. 校验配置
kata config

# 4. 运行测试（必须全绿）
bun test

# 5. （可选）UI 自动化需要时安装 Playwright
bunx playwright install
```

## 配置变量

编辑 `.env` 和可选的 `.env.envs`，按需配置以下场景用到的变量：

| 场景 | 配置变量 |
| --- | --- |
| 默认项目与工作区 | `KATA_ACTIVE_PROJECT` / `KATA_WORKSPACE_ROOT` |
| DataAssets UI 自动化 / 数据准备 | `KATA_DATAASSETS_ENV` / `KATA_DATAASSETS_PROJECT_ID` / `KATA_DATAASSETS_DATASOURCE_ID` |
| 源码证据与分支映射 | `KATA_SOURCE_REPOS` / `KATA_SERVER_WORKSPACE_PATH` / `KATA_REPO_BRANCH_MAPPING_PATH` |
| 蓝湖 PRD 导入 | `KATA_LANHU_COOKIE` |
| 禅道 Bug | `KATA_ZENTAO_BASE_URL` / `KATA_ZENTAO_ACCOUNT` / `KATA_ZENTAO_PASSWORD` |
| 消息通知 | `KATA_DINGTALK_WEBHOOK_URL` / `KATA_DINGTALK_KEYWORD` / `KATA_FEISHU_WEBHOOK_URL` / `KATA_WECOM_WEBHOOK_URL` |
| SMTP 邮件 | `KATA_SMTP_HOST` / `KATA_SMTP_USER` / `KATA_SMTP_PASS` / `KATA_SMTP_FROM` / `KATA_SMTP_TO` |

## 安全守卫（仓库自带）

仓库自带 `.claude/settings.json`，将 `pre-edit-guard` 和 `pre-bash-guard` 挂入 Claude Code 的 `PreToolUse`：

- `pre-edit-guard`：拦截对源仓库证据 `workspace/{project}/.kata/repos/**` 的 Edit/Write。
- `pre-bash-guard`：拦截 `rm -rf workspace/`、`rm -rf /`，以及对 `.kata/repos/` 的 git push。

首次在 Claude Code 中打开本项目时，会提示批准这些项目级 hook（安全机制），批准后即生效。紧急时可用 `KATA_BYPASS_HOOK=1` 临时绕过。直接在命令行操作不经 Claude Code，不受 hook 约束，但仍以 `.claude/rules/repo-readonly.md` 为准。

## 安装完成

回到 Claude Code，输入 `/workspace-manage` 查看功能菜单。
