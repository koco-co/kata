# Worktree-First 工作流

新功能、修复、重构默认走 worktree，不新建长期 feature 分支。

## 流程

1. 接到任务即创建隔离 worktree（`.worktrees/<slug>`，分支名 `chore/...`、`fix/...`、`feat/...`）。
2. 创建后同步任务所需的 ignored runtime 目录，尤其是 `workspace/{project}/.kata/`。
3. 实现、lint、测试全部在 worktree 内完成。
4. 验证通过后自动 `git merge --no-ff` 回 main 并 `git push origin main`，无需再向用户确认。
5. 合并完成后清理 worktree：`git worktree remove .worktrees/<slug>` + `git branch -d <branch>`。

## Ignored runtime 同步

`git worktree add` 只检出 git tracked 文件，不会带上 `.gitignore` 忽略的目录。创建 worktree 后，必须按任务需要显式同步这些本地 runtime 目录，避免登录态、源码证据或本地环境配置在 worktree 内缺失。

默认策略：

- `workspace/{project}/.kata/`：若主工作树存在且 worktree 内不存在，优先在 worktree 内创建 symlink 指向主工作树对应目录。
- `workspace/{project}/.kata/repos/**`：即使通过 symlink 共享，也仍是只读源码证据；不得提交、推送或写业务文件。
- 需要隔离的 runtime 状态：不要 symlink 整个 `.kata/`，只复制本任务必需的子目录或文件，例如 `workspace/{project}/.kata/auth/{project}/session-{env}.json`。
- 其他 ignored 目录（如 `workspace/{project}/_shared/`、feature `results/`）：只有任务明确依赖时才同步，并在最终交付中说明 worktree 绝对路径。

推荐命令模板（在主工作树执行，`<project>` 与 `<slug>` 按任务替换）：

```shell
ROOT=$(pwd)
W="$ROOT/.worktrees/<slug>"
mkdir -p "$W/workspace/<project>"
ln -s "$ROOT/workspace/<project>/.kata" "$W/workspace/<project>/.kata"
```

若 worktree 目录层级不是 `.worktrees/<slug>`，只需调整 `W`，仍使用绝对路径创建 symlink。

## 例外（需用户确认）

- Destructive 操作：`git reset --hard`、`branch -D`、`push --force`
- 跨仓库 PR
- Shared infra 改动
- 生产部署
