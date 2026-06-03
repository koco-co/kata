# CLAUDE.md

输入 `/workspace-manage` 查看功能菜单；首次安装见仓库根目录的 `INSTALL.md`。

`.claude/` 是 Claude Code 的 runtime 实现目录。

## Claude Code Runtime 规则

- Claude Code skill 的稳定触发信息，来自 `.claude/skills/<name>/SKILL.md` frontmatter 里的 `name` 与 `description`。
- slash-command 专属的 frontmatter 只在后续 `.claude/commands/**` 设计里单独用，不写进 `SKILL.md` 白名单。
- `/skill` 名继续可用；显式的 `/case-draft`、`/case-edit` 等命令，按下方路由表处理。
- 本项目不再拿 `CLAUDE.local.md` 当入口；本地设置放用户级配置或 `.claude/settings.local.json`。

## 路由规则

- 以下方命令索引作为公开 slash-command 的路由表。
- 只发 Lanhu/Axure URL → 不声张地转发给 `case-draft`，由 case-draft 产出第一个用户可见结果。
- 只发 ZenTao bug URL/bug-view URL/bug ID → 转发给 `case-hotfix`；若记录尚未修复或缺修复范围，由该 skill 生成待办项，不回退到 `defect-analyze`。
- 只发需求功能**目录**路径或目录名（如 `features/【v...】...`，不带文件扩展名）→ 转发给 `playwright-automation`，做用例转自动化。
- 用户给出 XMind/CSV/Archive MD 用例产物**文件**路径（`.xmind`/`.csv`/`archive.md`），或要求编辑、同步、标准化已有用例 → 转发给 `case-edit`。
- 用户要求记录、查询、维护项目业务知识、规则、术语，或问「XX 是什么」（项目特定业务概念）→ 自动触发 `knowledge-curate`。
- `/playwright-automation` 缺环境参数时，先按 skill 内置的环境确认协议处理，再开始发现、预检或浏览器操作。

### 多技能匹配优先级

- 优先级从高到低：精确格式/URL/路径匹配 > 意图关键词匹配 > 通用请求。
- 触发信号来自每个 skill 的 SKILL.md frontmatter `description`（关键词加改走目标），不存在 `must_trigger_when`/`must_not_trigger_when` 这类字段。
- description 里的「改走/不在此」声明优先于触发关键词：命中某 skill 的改走条件时，就按改走目标路由，不停在该 skill。
- 同一输入命中多个 skill 又无法判定时，按上面的顺序选优先 skill；仍不确定就向用户确认意图。

### 无匹配回退

- 没有 skill 匹配的请求，由 AI 自行处理，不强行套用 skill 路由。

## 命令索引

| Command                | Skill                 | Summary                                                                |
| ---------------------- | --------------------- | ---------------------------------------------------------------------- |
| /workspace-manage      | workspace-manage      | 显示 kata 功能菜单和管理项目工作区。                                   |
| /case-draft            | case-draft            | 根据需求文档、PRD 或设计源生成 QA 测试用例。                           |
| /case-edit             | case-edit             | 编辑、同步、转换或标准化已有 QA 用例产物。                             |
| /knowledge-curate      | knowledge-curate      | 查询或更新项目业务知识和规则。                                         |
| /case-hotfix           | case-hotfix           | 根据 bug 或修复记录生成 hotfix 回归用例。                              |
| /playwright-automation | playwright-automation | 生成、修复或验证 Playwright UI 自动化，并在交付前真实运行。            |
| /defect-analyze        | defect-analyze        | bug 证据、合并冲突、代码 diff 三模式缺陷分诊与解决方案。               |
| /infra-diagnose        | infra-diagnose        | SSH 登录服务器排查并修复数据源与服务器连通性故障，记录凭据与排查知识。 |

## 构建与测试

- Runtime：Bun >= 1.3；装依赖：`bun install`。
- 全量测试：`bun test`；局部测试：`bun test .claude/scripts/_shared/tests/<area>`。
- Lint 检查：`bun run check`；自动修复：`bun run check:fix`。
- Skill 同步检查：`bun run check:skills`。

## 本地配置

- 敏感环境变量放 `.env.local` 或用户级配置，别写进项目入口文档。
- 常用变量名：`KATA_ZENTAO_PASSWORD`、`KATA_LANHU_COOKIE`、`KATA_LANHU_PASSWORD`、`KATA_TARGET_ENV`。
- 详细日志：`KATA_DEBUG=true kata <command>`。

## 代码变动请求标准流程

- 涉及代码、配置、runtime 或文档契约变更时，先提交主工作树现有改动，再用 `git worktree add --detach .worktrees/<slug> main` 创建 detached worktree；不得为任务新建分支。
- worktree 创建后按任务需要 symlink 必要 ignored runtime 目录；`workspace/{project}/.kata/repos/**` 即便用 symlink 共享，也保持只读。
- 验证通过后用 `git merge --no-ff <sha>` 合入 main，没问题再执行 `git push origin main`，最后用 `git worktree remove .worktrees/<slug>` 清理。
- 多任务默认用 `superpowers:subagent-driven-development`；Claude Code 用 TaskCreate/TaskUpdate，或当前客户端暴露的 TodoWrite。
- 提交必须用固定的 type/emoji 映射，例如 `refactor: ✨ ...`；临时通知页面的固定标题是 `【KATA 工作通知】`；完整枚举、通知格式和合并清理步骤见 `.claude/rules/project-workflow-rules.md`。

## 关键约束

- Worktree 优先：所有改动都走 detached worktree，验证通过后再合并回 main。
- 改后即测：代码、配置、runtime skill 或入口文件改动后，必须跑相关测试；失败必须修复。
- Commit 规范：遵循 Conventional Commits（`type: emoji description`），type 小写，description 不超过 72 个字符；标题行（含 description）必须用英文，只有可选的 body 才允许中文。
- QA 产物交付前必须说清已验证范围和未验证范围，不得把局部通过说成全量通过。
- 详细的 Git、测试、命名、QA 产物和工作区边界规则，见 `.claude/rules/project-workflow-rules.md`。
