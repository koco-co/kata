## Output Style

output_style: terse

## Rules

- .claude/rules/tests.md
- .claude/rules/archive.md

## 模型

沿用全局 `~/.claude/rules/performance.md` 模型选择策略（主开发用 Sonnet，架构决策用 Opus）。

## 本地环境

### 必需环境变量

`.env.local` 需配置以下变量（变量名不含敏感信息）：

- `KATA_ZENTAO_PASSWORD` — ZenTao API 密码
- `KATA_LANHU_COOKIE` / `KATA_LANHU_PASSWORD` — Lanhu 设计稿访问
- `KATA_DINGTALK_WEBHOOK_URL` / `KATA_DINGTALK_SIGN_SECRET` — 钉钉通知
- `KATA_FEISHU_WEBHOOK_URL` — 飞书通知
- `KATA_WECOM_WEBHOOK_URL` — 企业微信通知
- `KATA_TARGET_ENV` — 目标环境标识（如 staging）

### 路径

- Worktree 根目录：`.worktrees/`（仓库根目录下）
- Bun 运行时：≥ 1.3
- Shell：zsh

### 调试

- 详细日志：`KATA_DEBUG=true bun engine/bin/kata <command>`
- 单测子集：`bun test engine/tests/<area>`
- AI Core 局部测试：`bun run test:ai-core`
