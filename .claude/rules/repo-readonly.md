# repo-readonly

`workspace/{project}/.kata/repos/**` 下的源仓库是只读证据源：

- 不得 push、commit、写入。
- 不得 mv、rm、改文件权限。
- 只能 read 与 grep。

在 Claude Code 里，对它的 Edit/Write/Bash 会被 `pre-edit-guard` 和 `pre-bash-guard` 自动拦截（见 INSTALL.md）。直接在命令行操作不经 hook，但同样要遵守本规则。
