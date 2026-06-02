# Worktree 优先工作流

新功能、修复、重构都默认走 detached worktree；不得为任务新建分支，也不要建长期 feature 分支。

## 流程

1. 如果主工作树有任何 tracked 或 untracked 改动，先提交主工作树现有改动：`git add -A`，再 `git commit -m "chore: 🧹 save pre-worktree local changes"`。这是 pre-worktree 的执行前快照，不做范围过滤。
2. 创建隔离的 detached worktree：`git worktree add --detach .worktrees/<slug> main`。
3. 创建后 symlink 必要 ignored runtime 目录；只同步本任务真正依赖的本地 runtime 证据、登录态或环境配置。
4. 实现、lint、测试，以及按任务分批 commit，全部在 worktree 内完成。
5. 验证通过后记下 worktree HEAD SHA，回主工作树执行 `git merge --no-ff <sha>` 合入 `main`。
6. 合并后重新验证；没问题就 `git push origin main`。
7. 合并完成后清理 worktree：`git worktree remove .worktrees/<slug>`。detached worktree 没有分支，无需删分支这一步。

## 同步 ignored 的 runtime 目录

`git worktree add` 只检出 git tracked 文件，不会带上 `.gitignore` 忽略的目录。所以创建 worktree 后，要按任务需要显式同步这些本地 runtime 目录，免得登录态、源码证据或本地环境配置在 worktree 里缺失。

默认策略：

- 默认只在任务需要读本地证据、登录态或环境配置时，才同步 ignored 的 runtime 目录。
- `workspace/{project}/.kata/`：如果任务只读用 `.kata`（源码证据、session、配置）、不会写 runtime 状态，可以在 worktree 里建一个 symlink 指向主工作树的对应目录。
- 如果任务需要隔离、或会写入 runtime 状态，就不要 symlink 整个 `.kata/`；只复制或 symlink 本任务必需的只读子路径或文件，例如 `workspace/{project}/.kata/auth/{project}/session-{env}.json`，而写入型状态必须落在 worktree 自己的目录里。
- `workspace/{project}/.kata/repos/**`：即便用 symlink 共享，也仍是只读源码证据；不得提交、推送或写业务文件。
- 其他 ignored 目录（如 `workspace/{project}/_shared/`、feature `results/`）：只有任务明确依赖时才同步，并在最终交付里说明 worktree 的绝对路径。

推荐命令模板（在主工作树执行，`<project>` 与 `<slug>` 按任务替换）：

```shell
ROOT=$(pwd)
W="$ROOT/.worktrees/<slug>"
git worktree add --detach "$W" main
mkdir -p "$W/workspace/<project>"
ln -s "$ROOT/workspace/<project>/.kata" "$W/workspace/<project>/.kata"
```

worktree 目录必须固定放在 `.worktrees/<slug>`；不得换到别的目录层级来绕过项目规则。

## 例外（需用户确认）

- Destructive 操作：`git reset --hard`、`branch -D`、`push --force`
- 跨仓库 PR
- Shared infra 改动
- 生产部署
