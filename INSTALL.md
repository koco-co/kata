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

# 3. 校验配置
kata config

# 4. 运行测试（必须全绿）
bun test --cwd engine

# 5. （可选）UI 自动化需要时安装 Playwright
bunx playwright install
```

## 凭据配置

编辑 `.env`，配置以下场景所需变量：

| 场景          | 必需变量                                                            |
| ------------- | ------------------------------------------------------------------- |
| 蓝湖 PRD 导入 | `KATA_LANHU_COOKIE`                                                                    |
| 禅道 Bug      | `KATA_ZENTAO_BASE_URL` / `KATA_ZENTAO_ACCOUNT` / `KATA_ZENTAO_PASSWORD`                |
| 消息通知      | `KATA_DINGTALK_WEBHOOK_URL` / `KATA_FEISHU_WEBHOOK_URL` / `KATA_WECOM_WEBHOOK_URL`     |
| SMTP 邮件     | `KATA_SMTP_HOST` / `KATA_SMTP_USER` / `KATA_SMTP_PASS` / `KATA_SMTP_FROM` / `KATA_SMTP_TO` |

## 安装完成

回到 Claude Code 或 Codex 输入 `/workspace-manage` 查看功能菜单。
