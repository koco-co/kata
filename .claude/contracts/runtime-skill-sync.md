# Runtime Skill 同步规则

## 基本规则

- `.claude/skills/<name>/SKILL.md` 和 `.agents/skills/<name>/SKILL.md` 必须成对存在。
- 两边的 `name` 必须一致。
- 两边的用户入口语义必须一致，例如 `/case-draft` 在 Claude 与 Codex 下都表示 `根据需求源生成 QA 用例`。
- 修改任一 runtime 的 skill、reference、script、workflow、blackboard、产物规则时，必须同步检查另一 runtime。
- 如果只改单边，必须在 `runtime-sync-exceptions.yaml` 写明原因。

## 不要求一致的内容

- 不要求两边文件逐字相同。
- Claude 可以使用 Claude Code 支持的 frontmatter。
- Codex 只能在 `SKILL.md` frontmatter 使用 Codex 支持字段，扩展配置放在 `agents/openai.yaml`。

## Runtime SKILL.md 边界

- Claude 侧应使用原生 frontmatter 表达 `when_to_use`、`model`、`effort`、`paths`、`context`、`agent` 等 runtime 能力。
- Codex 侧不得在 `SKILL.md` frontmatter 写入 Claude 专属字段；Codex 扩展能力写入 `agents/openai.yaml`。
- Runtime `SKILL.md` 不得保留旧装饰契约段落：`输出`、`输入`、`允许的工具`、`上下文预算`、`调用图`、`证据策略`、`失败策略`。
- Runtime `SKILL.md` 不得引用旧 `*-worker@1`、`*-prompt@1` 调用图；跨 skill 关系以 `.claude/contracts/skill-graph.yaml` 为准，复杂流程以 `.claude/contracts/workflows/*.yaml` 为准。

## 不允许例外的内容

- skill 名集合。
- 用户入口含义。
- 交付产物清单。
- 验证口径。
- 证据最低要求。
