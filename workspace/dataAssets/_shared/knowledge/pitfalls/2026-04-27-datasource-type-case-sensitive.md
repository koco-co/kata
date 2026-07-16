---
title: 数据源类型 select 选项大小写敏感（Hive2.x ≠ hive2.x）
type: pitfall
tags: []
confidence: high
source: ""
updated: 2026-04-27
---

# 数据源类型 select 选项大小写敏感（Hive2.x ≠ hive2.x）

## 症状
```
Error: expect(locator).toContainText(expected) failed
Locator: locator('.ant-modal:visible').last().locator('.ant-form-item').filter({ hasText: '数据源类型' }).locator('.ant-select').first().locator('.ant-select-selection-item').first()
Expected substring: "hive2.x"
Received string:    "Hive2.x"
```
`selectDataSourceType` 内部 `toContainText(typeName, { timeout: 5000 })` 5 秒超时。

## 复现条件
- 测试代码用 `selectDataSourceType(modal, "hive2.x")`（小写）
- UI 实际选项渲染为 `Hive2.x`（首字母大写）
- selectAntOption 选中后回写选中文本到 `.ant-select-selection-item`，断言失败

## 根因
PRD 与 archive MD 习惯用引擎/产品名小写写法（`sparkthrift2.x`、`hive2.x`），但前端 i18n 词条按品牌规范首字母大写。`selectAntOption` 用大小写敏感 substring 匹配，差一字母即失败。

试点（2026-04-27）的 t3.ts 在 `beforeEach` 写了 `dataSourceType: "hive2.x"`，跑到第 3 条 P0 时失败；t1/t2 的同字段已是首字母大写没问题，仅 t3 漏改。

## 修复 diff
```diff
- await addKey(page, exportKey2, {
-   chineseName: "导出测试2",
-   dataSourceType: "hive2.x",
- });
+ await addKey(page, exportKey2, {
+   chineseName: "导出测试2",
+   dataSourceType: "Hive2.x",
+ });
```

## 验证
```bash
KATA_DATAASSETS_ENV=ltqc-local KATA_ACTIVE_PROJECT=dataAssets \
  npx playwright test "workspace/dataAssets/tests/202604/【通用配置】json格式配置/smoke.spec.ts" \
  --reporter=list --workers=1
```
预期：3/3 P0 pass（10s + 17s + 16s ≈ 1.0 min）

## 关联硬规则
ui-autotest-pitfalls.md#G1
