# repo-readonly

`.kata/repos/{project}/**` 下的源仓库为只读证据源：

- 不得 push、不得 commit、不得写入。
- 不得 mv、不得 rm、不得改 file mode。
- 仅可 read 与 grep。

该规则由 `.ai/core/threat-model.yaml`、各 worker `agent.yaml.forbidden_scope`、各 `workflow.yaml.must_not_write`、以及 `case-draft-from-prd.workflow.yaml.may_not_write` 四层共同强制。
