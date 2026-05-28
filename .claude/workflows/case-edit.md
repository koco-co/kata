# case-edit Workflow

> 唯一规范源：docs/skills/contracts/workflows/case-edit.yaml
>
> 本文档由人工维护以辅助 review；步骤集合必须与 yaml 严格一致，由 `engine/src/skills/workflow-check.ts` 校验。

## 摘要

case-edit 把既有 Archive、XMind 或 CSV 用例产物转化为语义不变的编辑、同步、转换或 corrections 应用结果。流程围绕 artifact intake、编辑规划、差异预览、批准 corrections 应用和最终输出自检展开。

## Steps

- artifact-intake
- plan_edit
- preview_diff
- apply-corrections
- output

## 人工确认节点

- `artifact-intake` — `ASK_FOR_TARGET_ARTIFACT`：未提供可读 artifact 路径时要求用户补充目标产物。
- `plan_edit` — `ASK_FOR_EDIT_SCOPE`：编辑范围不明确时要求用户确认修改边界。
- `preview_diff` — `CONFIRM_SEMANTIC_CHANGE`：差异可能改变业务语义时必须确认。
- `apply-corrections` — `CONFIRM_APPLY_APPROVED_CORRECTIONS`：只应用 status=approved 的 corrections。

## 关键失败模式

- `artifact-intake` — `ARTIFACT_MISSING`：目标 Archive、XMind 或 CSV 不存在或不可读。
- `plan_edit` — `AMBIGUOUS_EDIT_SCOPE`：编辑意图无法定位到具体用例、字段或转换目标。
- `preview_diff` — `PREVIEW_DIFF_UNREADABLE`：无法生成可审查的差异摘要。
- `apply-corrections` — `CORRECTION_SOURCE_CHANGED`、`XMIND_SYNC_FAILED`：correction 的 doc_claim 已失效，或 Archive/XMind 同步失败。
- `output` — `OUTPUT_QA_FAILED`：最终 artifact 数量、标题、优先级、前置条件、步骤或预期不一致。
