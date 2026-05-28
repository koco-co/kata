# repo-readonly

`workspace/{project}/.kata/repos/**` 下的源仓库为只读证据源：

- 不得 push、不得 commit、不得写入。
- 不得 mv、不得 rm、不得改 file mode。
- 仅可 read 与 grep。

该规则由 runtime skill hard rules、`.agents/contracts/workflows/**`、项目入口文档和相关 engine 写入策略共同强制。
