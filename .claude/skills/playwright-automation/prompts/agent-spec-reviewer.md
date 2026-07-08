# Spec 评审 Prompt — playwright-automation

在主会话执行，不派子代理。对当前阶段产物做机械的契约检查。

## 必须遵守的规则优先

你的检查项不得违反 `SKILL.md` 中必须遵守的规则。检查项与这些规则冲突时，记为 `out_of_scope`，而不是 `issue`。

## 检查清单（机械）

按阶段勾选必跑的检查项：

### ui-probe 产物

- [ ] 至少一个 `runs/<run-id>/playwright/ui-probe/` 证据目录存在
- [ ] 至少含 `probe.json` 或同等结构化 probe 摘要，且至少含一个 `page.png` 或同等页面截图/页面证据
- [ ] ui-plan / plan-reconcile 中列出的 UI 断言点或 UI targets 在 probe 输出中有对应 DOM、API 或截图证据

### playwright-generate 产物

- [ ] `automation/tests/runners/smoke.spec.ts` 存在
- [ ] `automation/tests/runners/full.spec.ts` 存在
- [ ] runners/ 不含白名单外 .spec.ts（只允许 smoke/full/retry-failed 三个文件）；详见 references/directory-structure.md#runners-白名单
- [ ] case 文件位于 `automation/tests/cases/`
- [ ] automation/ 顶层无散落 .md .json .yaml 文件；详见 references/directory-structure.md#automation-顶层
- [ ] 共享 page object 位于 `_shared/pages/`
- [ ] 没有 feature-local helper 目录

### self-run 产物

- [ ] `runs/<run-id>/playwright/full/` 含 stdout、stderr、exit-code、report.html
- [ ] exit-code 是数字
- [ ] 失败 spec 列表与 exit-code 一致

### repair-loop 产物

- [ ] 每次修复有独立证据目录 `runs/<run-id>/playwright/repair-<n>/`
- [ ] repair 次数 ≤ 3

## 输出格式（必须遵守）

返回 JSON：

```json
{
  "spec_review_status": "pass | fail",
  "issues": [
    { "kind": "missing | extra | wrong | structural", "where": "...", "fix_hint": "..." }
  ],
  "out_of_scope": [
    { "where": "...", "reason": "与必须遵守的规则 X 冲突" }
  ]
}
```

`spec_review_status=fail` 时 `issues` 必须非空。
`spec_review_status=pass` 时 `issues` 必须为空数组。
