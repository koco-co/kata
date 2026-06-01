# repo-readonly

`workspace/{project}/.kata/repos/**` 下的源仓库为只读证据源：

- 不得 push、不得 commit、不得写入。
- 不得 mv、不得 rm、不得改 file mode。
- 仅可 read 与 grep。

Claude Code 内的 Edit/Write/Bash 由 `pre-edit-guard`/`pre-bash-guard` 自动拦截（见 INSTALL.md）；命令行直接操作不经 hook，仍须遵守本规则。
