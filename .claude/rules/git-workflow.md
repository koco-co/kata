# Worktree-First 工作流

新功能、修复、重构默认走 detached worktree；不得为任务新建分支或长期 feature 分支。

## 流程

1. 如主工作树存在任何 tracked 或 untracked 改动，先提交主工作树现有改动：`git add -A`，再 `git commit -m "chore: 🧹 save pre-worktree local changes"`。这是 pre-worktree 执行前快照，不做范围过滤。
2. 创建隔离 detached worktree：`git worktree add --detach .worktrees/<slug> main`。
3. 创建后 symlink 必要 ignored runtime 目录；只同步任务实际依赖的本地 runtime 证据、登录态或环境配置。
4. 实现、lint、测试和按任务分批 commit 全部在 worktree 内完成。
5. 验证通过后记录 worktree HEAD SHA，回主工作树执行 `git merge --no-ff <sha>` 合入 `main`。
6. 合并后重新验证；无问题则 `git push origin main`。
7. 合并完成后清理 worktree：`git worktree remove .worktrees/<slug>`。detached worktree 无分支删除步骤。

## Ignored runtime 同步

`git worktree add` 只检出 git tracked 文件，不会带上 `.gitignore` 忽略的目录。创建 worktree 后，必须按任务需要显式同步这些本地 runtime 目录，避免登录态、源码证据或本地环境配置在 worktree 内缺失。

默认策略：

- 默认只在任务需要读取本地证据、登录态或环境配置时同步 ignored runtime 目录。
- `workspace/{project}/.kata/`：当任务只读使用 `.kata`（源码证据、session、配置）且不会写 runtime 状态时，可以在 worktree 内创建 symlink 指向主工作树对应目录。
- 需要隔离或会写入 runtime 状态时，不得 symlink 整个 `.kata/`；只复制或 symlink 本任务必需的只读子路径/文件，例如 `workspace/{project}/.kata/auth/{project}/session-{env}.json`，写入型状态必须落在 worktree 自己的目录。
- `workspace/{project}/.kata/repos/**`：即使通过 symlink 共享，也仍是只读源码证据；不得提交、推送或写业务文件。
- 其他 ignored 目录（如 `workspace/{project}/_shared/`、feature `results/`）：只有任务明确依赖时才同步，并在最终交付中说明 worktree 绝对路径。

推荐命令模板（在主工作树执行，`<project>` 与 `<slug>` 按任务替换）：

```shell
ROOT=$(pwd)
W="$ROOT/.worktrees/<slug>"
git worktree add --detach "$W" main
mkdir -p "$W/workspace/<project>"
ln -s "$ROOT/workspace/<project>/.kata" "$W/workspace/<project>/.kata"
```

worktree 目录必须固定为 `.worktrees/<slug>`；不得改用其他目录层级规避项目规则。

## 例外（需用户确认）

- Destructive 操作：`git reset --hard`、`branch -D`、`push --force`
- 跨仓库 PR
- Shared infra 改动
- 生产部署
