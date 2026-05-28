# case-hotfix Workflow

> 唯一规范源：docs/skills/contracts/workflows/case-hotfix.yaml
>
> 本文档由人工维护以辅助 review；步骤集合必须与 yaml 严格一致，由 `engine/src/skills/workflow-check.ts` 校验。

## 摘要

case-hotfix 以已登记 bug、issue、ZenTao 记录或修复说明为输入，生成聚焦修复路径的一条 hotfix 回归用例，并把证据与 SourceRefs 放入 sidecar，避免泄漏到最终 archive.md。

## Steps

- bug-intake
- fix-scope
- draft_cases
- review_cases
- output

## 人工确认节点

- `bug-intake` — `ASK_FOR_BUG_RECORD`：缺少 bug ID、issue URL、ZenTao 记录或修复说明时要求补充。
- `fix-scope` — `ASK_FOR_FIX_SCOPE`：修复范围未定时生成 pending_items 或请求用户确认。

## 关键失败模式

- `bug-intake` — `BUG_RECORD_MISSING`：无法定位本次 hotfix 的原始缺陷记录。
- `fix-scope` — `FIX_SCOPE_MISSING`、`BUG_NOT_FIXED`：缺少修复范围或缺陷尚未修复。
- `draft_cases` — `HOTFIX_ARCHIVE_FORMAT_INVALID`：产物不符合 hotfix archive 格式或超过单条用例范围。
- `review_cases` — `HOTFIX_SCOPE_OVEREXPANDED`、`SOURCE_REF_LEAKED_TO_ARCHIVE`：范围扩成完整套件，或 SourceRef 泄漏到人类可读 archive.md。
- `output` — `OUTPUT_QA_FAILED`：archive 与必要 sidecar 未通过交付自检。
