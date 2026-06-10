# repo-readonly

`workspace/{project}/.kata/repos/**` 下的源仓库一律只读，只作读代码、查事实用：

- 不得 push、commit、写入。
- 不得 mv、rm、改文件权限。
- 只能 read 与 grep。
- 例外：允许 `git fetch`（只读同步 remote-tracking refs）。fetch 不写业务文件、不改工作树、不 commit、不 push，不属于上面禁止的「写入」。

在 Claude Code 里，对它的 Edit/Write/Bash 会被 `pre-edit-guard` 和 `pre-bash-guard` 自动拦截（见 INSTALL.md）。直接在命令行操作不经 hook，但同样要遵守本规则。

## 读源码前先取最新（强制）

读源仓库代码做任何分析、判断、写用例、查 bug 前，必须先确保用的是最新代码，不得拿本地过时快照下结论：

1. 先对目标分支做只读同步：`git fetch origin <branch>`；随后以 `origin/<branch>`（或同步后的最新 commit）为准读代码，而非可能落后的本地分支 ref。
2. 汇报基于代码的结论时，标注所依据的 commit 与日期。
3. 若 fetch 受限（网络不可达等），必须显式声明「依据的是 X 时间的快照，可能不是最新」，由用户决定是否继续；不得静默拿旧快照当最新。
