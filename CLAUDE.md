# CLAUDE.md

输入 `/workspace-manage` 查看功能菜单；首次安装见仓库根目录 `INSTALL.md`。

`.claude/` 是 Claude Code runtime 实现目录；`.agents/` 是 Codex runtime 实现目录。两套目录完全手写、完全分开维护，不得把 `.ai` 作为当前规范来源。

## Runtime 同步硬规则

- Claude 与 Codex 同等优先；任一 runtime 下 skill 不可用，视为该 skill 整体不可用。
- 修改 `.claude/**` 的 skill、reference、script、workflow、blackboard、router、产物规则或验证口径时，必须同步评估另一套 `.agents/**`。
- 修改 `.agents/**` 的同类内容时，也必须同步评估另一套 `.claude/**`。
- 如果只改单边，必须在提交说明中写明另一侧无需变更的具体理由；结构性例外写入 `docs/skills/contracts/runtime-sync-exceptions.yaml`。
- 不要求两边文件逐字一致，但用户入口语义、交付产物清单、验证口径和证据底线必须一致。

## Claude Code Runtime 规则

- Claude Code skill 的稳定触发信息来自 `.claude/skills/<name>/SKILL.md` frontmatter 的 `name` 与 `description`。
- slash-command 专属 frontmatter 只能在后续 `.claude/commands/**` 设计中单独使用，不写进 `SKILL.md` 白名单。
- `/skill` 名继续可用；显式 `/case-draft`、`/case-edit` 等命令按下方路由表处理。
- 本项目不再使用 `CLAUDE.local.md` 作为入口；本地设置放用户级配置或 `.claude/settings.local.json`。

## 路由规则

- 使用下方命令索引作为公开 slash-command 路由表。
- 仅输入 Lanhu/Axure URL → 静默转发到 `case-draft`，由 case-draft 产生首个用户可见结果。
- 仅输入 ZenTao bug URL/bug-view URL/bug ID → 转发到 `case-hotfix`；若记录未修复或缺少修复范围，由该 skill 生成待办项而非回退到 `bug-file`。
- 用户提供 XMind/CSV/Archive MD 用例产物路径或要求编辑/同步/标准化已有用例 → 转发到 `case-edit`。
- 用户要求记录、查询、维护项目业务知识/规则/术语，或询问 "XX 是什么"（涉及项目特定业务概念）→ 静默触发 `knowledge-curate`。
- `/playwright-automation` 缺少环境参数时，按 skill 内置环境确认协议处理后再开始发现、预检或浏览器操作。

### 多技能匹配优先级

- 精确格式/URL/路径匹配 > 意图关键词匹配 > 通用请求。
- 各 skill 的 `must_not_trigger_when` 优先级高于 `must_trigger_when`；must_not_trigger_when 明确排除的场景不路由到该 skill。
- 同一输入命中多个 skill 且无法判定时，按上述顺序选择优先 skill；仍不确定时向用户确认意图。

### 无匹配回退

- 无 skill 匹配的请求由 AI 自行处理，不强制套用 skill 路由。
- 共同同步契约见 `docs/skills/contracts/runtime-skill-sync.md`。

## 命令索引

| Command | Skill | Summary |
| --- | --- | --- |
| /workspace-manage | workspace-manage | 显示 kata 功能菜单和管理项目工作区。 |
| /case-draft | case-draft | 根据需求文档、PRD 或设计源生成 QA 测试用例。 |
| /case-edit | case-edit | 编辑、同步、转换或标准化已有 QA 用例产物。 |
| /knowledge-curate | knowledge-curate | 查询或更新项目业务知识和规则。 |
| /bug-file | bug-file | 根据观察到的失败现象生成有证据支持的 bug 报告。 |
| /conflict-analyze | conflict-analyze | 分析合并冲突并生成解决方案说明。 |
| /case-hotfix | case-hotfix | 根据 bug 或修复记录生成 hotfix 回归用例。 |
| /playwright-automation | playwright-automation | 生成、修复或验证 Playwright UI 自动化，并在交付前真实运行。 |
| /diff-scan | diff-scan | 扫描代码 diff 发现可复现的缺陷。 |
| /infra-diagnose | infra-diagnose | SSH 登录服务器排查并修复数据源与服务器连通性故障，沉淀凭据与排查知识。 |

## 构建与测试

- Runtime：Bun >= 1.3；装依赖：`bun install`。
- 全量测试：`bun test`；局部测试：`bun test engine/tests/<area>`。
- Lint 检查：`bun run check`；自动修复：`bun run check:fix`。
- Skill 同步检查：`bun run check:skills`。

## 本地配置

- 敏感环境变量放 `.env.local` 或用户级配置，不写入项目入口文档。
- 常用变量名：`KATA_ZENTAO_PASSWORD`、`KATA_LANHU_COOKIE`、`KATA_LANHU_PASSWORD`、`KATA_TARGET_ENV`。
- 详细日志：`KATA_DEBUG=true bun engine/bin/kata <command>`。

## 关键约束

- Worktree 优先：所有改动走 `.worktrees/<slug>`，验证通过后合并回 main。
- 改后即测：代码、配置、runtime skill 或入口文件变更后必须跑相关测试；失败必须修复。
- Commit 规范：Conventional Commits（`type: emoji description`），type 小写，description 不超过 72 个字符。
- QA 产物交付前必须声明已验证范围和未验证范围，不得把局部通过说成全量通过。
