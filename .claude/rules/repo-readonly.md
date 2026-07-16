# repo-readonly

源码仓库由 `.env` 的 `KATA_SOURCE_REPOS` + `KATA_SOURCE_REPO_ROOT` 映射到外部 Git 工作区。kata 内部只通过 `kata repos show|grep|list` 查询 Git ref：

- 不得 push、commit、写入。
- 不得 mv、rm、改文件权限。
- 只能 read 与 grep。
- 不创建或依赖根级 `.kata/{project}/repos`、`workspace/{project}/.kata/repos`。

CLI 封装 `git show`、`git grep`、`git ls-tree`，不得以直接文件读取绕过该入口。

## 读源码前先取最新（强制）

读源仓库代码做分析、判断、写用例或查 bug 前，必须先确保代码是最新的，不得拿本地过时快照下结论：

1. 先用 `kata repos sync-env --project <name>` 发现并报告外部仓库的 ref/commit；该命令不 fetch。若需要更新外部工作区，由其所有者在源码仓库中同步后再查询。
2. 汇报基于代码的结论时，标注所依据的 commit 与日期。
3. 若 fetch 受限（网络不可达等），必须显式声明「依据的是 X 时间的快照，可能不是最新」，由用户决定是否继续；不得静默拿旧快照当最新。
