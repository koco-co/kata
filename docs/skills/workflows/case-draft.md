# case-draft workflow

> 唯一规范源：docs/skills/contracts/workflows/case-draft.yaml
>
> 本文档由人工维护以辅助 review；步骤集合必须与 yaml 严格一致，由 `engine/src/skills/workflow-check.ts` 校验。

## 摘要

case-draft 把 PRD、Lanhu、Axure 等需求源转化为 Archive、XMind 等 QA 用例产物。流程线性串行 13 步，跨步骤数据通过 blackboard 共享，关键节点要求人工确认。

## Steps

- source-intake
- module-identify
- source-confirm
- historical-context
- requirement-atomize
- ambiguity-scan
- confirmation-package
- product-feedback-merge
- coverage-matrix
- case-draft
- case-review
- output
- automation-handoff

## 人工确认节点

- `source-confirm`：来源含歧义时阻塞，要求用户确认主输入。
- `confirmation-package`：把澄清问题集中打包给用户决策，未结清不进入 coverage-matrix。

## 关键失败模式

- `source-intake` — `SOURCE_FETCH_BLOCKED`、`LANHU_AUTH_REQUIRED`：触发降级路径，写入 `open_questions` 并暂停。
- `module-identify` — `MODULE_AMBIGUOUS`：要求 source-confirm 步骤介入。
