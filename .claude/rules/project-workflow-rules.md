# Project Workflow Rules

本文件承接 runtime 入口里的项目级工作规则。`CLAUDE.md` 只留摘要；需要细节时按本文件执行。

## Git 工作流

- 用户请求涉及代码、配置、runtime 或文档契约变更时，先提交主工作树现有改动：只要有 tracked 或 untracked 改动，就完整提交当前主工作树状态（`git add -A` 加 `git commit -m "chore: 🧹 save pre-worktree local changes"`）。这是 pre-worktree 的执行前快照，不做范围过滤。
- 默认在 detached worktree 里工作，不在主工作树直接改代码，也不得为任务新建分支。
- 创建命令固定为 `git worktree add --detach .worktrees/<slug> main`；创建后按任务需要 symlink 必要 ignored runtime 目录。
- 实现、验证，以及按任务分批 commit，全部在 worktree 内完成。
- 合并回 `main` 前必须先记下 worktree HEAD SHA，再回主工作树执行 `git merge --no-ff <sha>`。
- 合并后必须完成相关验证、说清已验证范围；没问题再 `git push origin main`。
- 推送完成后清理 worktree：`git worktree remove .worktrees/<slug>`；detached worktree 没有分支，无需删分支这一步。
- 打完 pre-worktree 快照后，worktree 内后续的任务提交要按任务分批，并随手检查状态，别把实现阶段冒出来的无关文件混进任务 commit；远端不可用时记下阻塞，不得静默略过。

## 多任务执行与任务列表

- 多任务或可拆分的任务，默认用 `superpowers:subagent-driven-development`：每个任务都新开一个 implementer，先做 spec review，再做 code quality review，通过后才提交并更新任务列表。
- Claude Code 用 TaskCreate/TaskUpdate；若当前客户端暴露的是 TodoWrite，就按 TodoWrite 这个名字执行同等语义；支持 update_plan 的客户端可以用 update_plan 维护可视化任务列表。
- Reviewer 发现问题时，必须打回 implementer 修复并重审；不得跳过 spec review 或 quality review。

## Commit 规范

- Commit message 固定为 `type: emoji description`；type 小写，description 不超过 72 个字符。
- 标题行（`type: emoji description` 这一整行）必须用英文：type、emoji 照映射写，description 也必须是英文，不得用中文。
- 只有可选的 commit body 才允许写中文；body 与标题行之间留一个空行，需要展开背景或理由时写进 body。
- type 与 emoji 必须照下表的唯一映射来写，不得按历史习惯或个人偏好替换。

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

输出临时通知页面时，必须使用下面的固定格式，不得夹带无关内容：

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

- 代码、配置、runtime skill、入口文件或契约文档改动后，必须跑一遍相关测试。
- 测试失败必须先修复；不能把失败、跳过或没跑过说成通过。
- 汇报验证结果时，写清确切命令、退出码、通过/失败/跳过的数量，以及未验证范围。

## 命名约定

- Feature 目录命名格式：`【v{version}】[【{lanhu-prd-id}】][【{customer}】]【{module}】{description}`。
- 版本号由 `kata features resolve` 引擎填入；模型不得自己拼版本号。
- 目录位于 `features/{version}/` 版本层之下；feature 内只允许 `cases/`、`automation/`、`runs/` 三区与 `metadata.yaml`、`prd.md`、`inputs/`。
- 详细规则见 `.claude/skills/case-draft/rules/naming-convention.md`。
- 已有的 feature 目录优先复用，不为同一需求另建平行目录。

## QA 产物自检

- Archive、XMind、CSV 等产物存放于 `features/{version}/{feature}/cases/` 子目录，交付前必须检查字段一致性和可读性。
- 只声明本次实际生成或修改的产物；没生成的产物，写进未验证范围。
- SourceRef 的放置遵守对应 skill 的产物规范，不得把结构化证据泄露到人类可读的用例正文中。

## 工作区边界

- `workspace/{project}/.kata/repos/**` 一律当只读源仓库看待。
- 需要改源仓库时，必须先获得用户明确确认，并在对应源仓库的工作区中操作。
- 不得把临时文件、调试输出或本地凭据写进项目入口文档或 runtime skill。
