# Project Workflow Rules

本文件承接 runtime 入口中的项目级工作规则。`AGENTS.md` 与 `CLAUDE.md` 只保留摘要；需要细节时按本文件执行。

## Git 工作流

- 用户请求涉及代码、配置、runtime 或文档契约变更时，先提交主工作树现有改动：如存在 tracked 或 untracked 改动，必须完整提交当前主工作树状态（`git add -A` + `git commit -m "chore: 🧹 save pre-worktree local changes"`）。这是 pre-worktree 执行前快照，不做范围过滤。
- 默认在 detached worktree 中工作，不在主工作树直接改代码，也不得为任务新建分支。
- 创建命令固定为 `git worktree add --detach .worktrees/<slug> main`；创建后按任务需要 symlink 必要 ignored runtime 目录。
- 实现、验证和按任务分批 commit 全部在 worktree 内完成。
- 合并回 `main` 前必须记录 worktree HEAD SHA，回主工作树执行 `git merge --no-ff <sha>`。
- 合并后必须完成相关验证并说明已验证范围；无问题后 `git push origin main`。
- 推送完成后清理 worktree：`git worktree remove .worktrees/<slug>`；detached worktree 无分支删除步骤。
- pre-worktree 快照后，worktree 内后续任务提交必须按任务分批并检查状态，避免把实现阶段产生的无关文件带入任务 commit；远端不可用时记录阻塞，不得静默跳过。

## 多任务执行与任务列表

- 多任务或可拆分任务默认使用 `superpowers:subagent-driven-development`：每个任务 fresh implementer，先做 spec review，再做 code quality review，通过后提交并更新任务列表。
- Codex 使用 `update_plan` 维护可视化任务列表。
- Claude Code 使用 TaskCreate/TaskUpdate；若当前客户端暴露为 TodoWrite，则按 TodoWrite 名称执行同等语义。
- Reviewer 发现问题时必须回到 implementer 修复并重审；不得跳过 spec review 或 quality review。

## Commit 规范

- Commit message 固定为 `type: emoji description`；type 小写，description 不超过 72 个字符。
- type 与 emoji 必须使用下表唯一映射，不得按历史习惯或个人偏好替换。

| Type | Emoji |
| --- | --- |
| `feat` | `🧩` |
| `fix` | `🩹` |
| `refactor` | `✨` |
| `docs` | `📝` |
| `test` | `🧪` |
| `chore` | `🧹` |
| `style` | `🎨` |
| `build` | `🏗️` |
| `ci` | `👷` |
| `perf` | `⚡` |
| `revert` | `⏪` |
| `merge` | `🔀` |

## 临时通知页面

需要输出临时通知页面时，必须只输出下列固定格式，不得夹带无关内容：

```text
【KATA 工作通知】
任务: <task>
阶段: <preflight|worktree|implement|verify|commit|merge|cleanup|blocked>
状态: <running|done|blocked|failed>
Worktree: <absolute path | none>
Commit: <sha | none>
验证: <command>; exit=<code>; pass=<n>; fail=<n>; skip=<n>
产物: <paths | none>
阻塞: <reason | none>
下一步: <next action | none>
更新时间: <YYYY-MM-DD HH:mm:ss TZ>
```

## 测试规范

- 代码、配置、runtime skill、入口文件或合同文档变更后必须运行相关测试。
- 测试失败必须先修复；不能把失败、跳过或未运行说成通过。
- 汇报验证结果时写清 exact command、exit code、passed/failed/skipped counts，以及未验证范围。

## 命名约定

- Feature 目录命名格式：`【v{version}】[【{lanhu-prd-id}】][【{customer}】]【{module}】{description}`。
- 版本号由 `kata features resolve` 引擎填入；模型不得自行拼接版本号。
- 详细规则见 `.agents/skills/case-draft/rules/naming-convention.md`。
- 已有 feature 目录优先复用，不为同一需求创建平行目录。

## QA 产物自检

- Archive、XMind、CSV 等产物交付前必须检查字段一致性和可读性。
- 只声明本次实际生成或修改的产物；未生成的产物写入未验证范围。
- SourceRef 放置遵守对应 skill 的产物规范，不能把结构化证据泄漏进人类可读用例正文。

## 工作区边界

- `workspace/{project}/.kata/repos/**` 视为只读源仓库。
- 需要修改源仓库时，必须先获得用户明确确认，并在对应源仓库工作区内操作。
- 不把临时文件、调试输出或本地凭据写入项目入口文档或 runtime skill。
