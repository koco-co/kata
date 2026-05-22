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
bun test --cwd engine

# 5. （可选）UI 自动化需要时安装 Playwright
bunx playwright install
```

## 配置变量

编辑 `.env` 和可选的 `.env.envs`，配置以下场景所需变量：

| 场景 | 配置变量 |
| --- | --- |
| 默认项目与工作区 | `KATA_ACTIVE_PROJECT` / `KATA_WORKSPACE_ROOT` |
| DataAssets UI 自动化 / 数据准备 | `KATA_DATAASSETS_ENV` / `KATA_DATAASSETS_PROJECT_ID` / `KATA_DATAASSETS_DATASOURCE_ID` |
| 源码证据与分支映射 | `KATA_SOURCE_REPOS` / `KATA_SERVER_WORKSPACE_PATH` / `KATA_REPO_BRANCH_MAPPING_PATH` |
| 蓝湖 PRD 导入 | `KATA_LANHU_COOKIE` |
| 禅道 Bug | `KATA_ZENTAO_BASE_URL` / `KATA_ZENTAO_ACCOUNT` / `KATA_ZENTAO_PASSWORD` |
| 消息通知 | `KATA_DINGTALK_WEBHOOK_URL` / `KATA_DINGTALK_KEYWORD` / `KATA_FEISHU_WEBHOOK_URL` / `KATA_WECOM_WEBHOOK_URL` |
| SMTP 邮件 | `KATA_SMTP_HOST` / `KATA_SMTP_USER` / `KATA_SMTP_PASS` / `KATA_SMTP_FROM` / `KATA_SMTP_TO` |

## 安装完成

回到 Claude Code 或 Codex 输入 `/workspace-manage` 查看功能菜单。
