# Blackboard 状态模型

Blackboard 是 skill workflow 跨步骤共享的状态容器。第一版只把状态槽显式化为文档,**不在 engine 做运行时强制校验**。后续如需运行时校验,再把 schema 迁入 `engine/src/skills/schemas`。

机器可读 schema 见 `docs/skills/contracts/schemas/blackboard-state.json`,本文档是 schema 的人工 review 镜像;两者必须一致,由 `engine/tests/skills/blackboard-schema.test.ts` 校验。

## 状态槽

| 槽位 | 类型 | 含义 | 读写时机 |
| --- | --- | --- | --- |
| `sources` | `Source[]` | PRD、Lanhu、Axure、ZenTao、Git diff、用户输入等原始素材清单 | source-intake 写入,后续步骤只读 |
| `source_refs` | `SourceRef[]` | 可追溯的 SourceRef ID,含类型、位置、采集时间、有效性 | source-intake 写入;任何对外结论必须引用其中一个 ID |
| `decisions` | `Decision[]` | AI 在执行过程中做出的关键判断,必须区分事实 / 推断 / 假设 | normalize、plan、execute 阶段持续追加 |
| `open_questions` | `OpenQuestion[]` | 阻塞项、澄清项、用户待确认事项 | 任何步骤可追加;清空前不可进入 deliver |
| `artifacts` | `Artifact[]` | 已生成或修改的产物路径,含 Archive / XMind / CSV / metadata 等 | execute 阶段写入;deliver 时校验 |
| `coverage` | `CoverageMatrix` | 用例覆盖矩阵、风险覆盖、未覆盖原因 | coverage-matrix 阶段写入 |
| `verification` | `VerificationLog[]` | 已执行的命令、退出码、通过 / 失败 / 跳过数量、证据路径 | verify 阶段写入 |
| `handoff` | `Handoff` | 给下游 skill 或人工的交接信息 | deliver 前写入 |

## 槽位写入规则

- 任意步骤可以读全部槽位,但只能写入自己声明的槽位(在 workflow YAML 的 `blackboard_outputs` 字段声明)。
- 写入是追加语义(数组类槽位)或全量覆盖(`coverage`、`handoff` 这类单对象槽位)。
- 任一槽位为空时,下游需要它的步骤必须报 `BLACKBOARD_SLOT_MISSING` 而不是默默继续。

## 跨 runtime 一致性

- 两个 runtime 的 workflow YAML 必须引用同一份 blackboard schema;不允许在某个 runtime 侧悄悄扩展槽位。
- 新增槽位需要同时改本文档、JSON schema、以及任何引用它的 workflow YAML,并在 `runtime-sync-exceptions.yaml` 之外的协调说明里写明用途。
