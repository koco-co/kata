# Worktree-First 工作流

新功能、修复、重构默认走 worktree，不新建长期 feature 分支。

## 流程

1. 接到任务即创建隔离 worktree（`.worktrees/<slug>`，分支名 `chore/...`、`fix/...`、`feat/...`）。
2. 实现、lint、测试全部在 worktree 内完成。
3. 验证通过后自动 `git merge --no-ff` 回 main 并 `git push origin main`，无需再向用户确认。
4. 合并完成后清理 worktree：`git worktree remove .worktrees/<slug>` + `git branch -d <branch>`。

## 例外（需用户确认）

- Destructive 操作：`git reset --hard`、`branch -D`、`push --force`
- 跨仓库 PR
- Shared infra 改动
- 生产部署
