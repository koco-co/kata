# Worktree 优先工作流

新功能、修复、重构和契约文档改动都使用短期任务分支 worktree，保留主工作树现有改动。

## 流程

1. 先记录 `git status` 和 `git worktree list`。不得自动提交、暂存、覆盖或删除主工作树中的用户改动。
2. 创建隔离的任务分支 worktree：`git worktree add -b codex/<slug> .worktrees/<slug> main`。
3. 只共享任务真正依赖且只读的 ignored runtime。DataAssets 的 `config/env/<env>.yaml` 由 Git common-dir 自动定位，不复制 Cookie。
4. 实现、lint、测试，以及按任务分批 commit，全部在 worktree 内完成。
5. 用户要求合并时，先确认主工作树没有新增冲突，再执行 `git merge --no-ff codex/<slug>`。
6. 合并后重新验证。不得自动 push；只有用户明确要求时才执行远端推送。
7. 清理前盘点 ignored runtime、认证会话、本地配置和符号链接。确认无需迁移后执行 `git worktree remove .worktrees/<slug>`，再删除任务分支并验证 Git 注册和路径都已消失。

## 同步 ignored 的 runtime 目录

`git worktree add` 只检出 git tracked 文件，不会带上 `.gitignore` 忽略的目录。所以创建 worktree 后，要按任务需要显式同步这些本地 runtime 目录，免得登录态、源码证据或本地环境配置在 worktree 里缺失。

- 不创建或共享根 `.kata/{project}/`、`workspace/{project}/.kata/`、`.kata/auth/**` 或旧 session 缓存。
- 源码只通过 `kata repos show|grep|list` 查询外部工作区，不 symlink 仓库缓存。
- feature `runs/` 是忽略的本地证据；任务确实需要时只共享明确目录，并在清理前保留或迁移。
- `node_modules` 可作为只读依赖 symlink；提交前确认它仍被 Git 忽略。

worktree 目录必须固定放在 `.worktrees/<slug>`；不得换到别的目录层级来绕过项目规则。

## Commit 规范

- 使用 Conventional Commits：`type: description`；标题用英文且不超过 72 个字符。
- 不强制 emoji。提交只包含当前任务文件，不得顺带提交用户改动或 ignored runtime。

## 需用户确认的操作

- Destructive 操作：`git reset --hard`、`branch -D`、`push --force`
- 跨仓库 PR
- Shared infra 改动
- 生产部署
