---
title: 数据源类型 select 选项大小写敏感（Hive2.x ≠ hive2.x）
type: pitfall
tags: [数据源, Playwright, 大小写]
status: observed
source: 历史知识条目；2026-08-09 kata-pytest-playwright 迁移仅复核运行方式，页面事实尚未重新实测
updated: 2026-08-09
---

# 数据源类型 select 选项大小写敏感（Hive2.x ≠ hive2.x）

## 历史症状

页面回写的选中值为 `Hive2.x`，而测试数据使用 `hive2.x` 时，大小写敏感的文本断言失败。

## 已观察边界

- PRD 或历史材料可能用小写 `sparkthrift2.x`、`hive2.x`。
- UI i18n 词条曾按品牌写法展示 `SparkThrift2.x`、`Hive2.x`。
- Python capability 应按页面真实 option 文本选择并回读，不应对品牌名静默 lower-case。
- 该页面事实尚未在本次迁移的真实环境重新验证，因此保持 `observed`。

## Python 用例写法

```python
data_source_type = "Hive2.x"
select_data_source_type(page, data_source_type)
expect(selected_data_source_type(page)).to_have_text(data_source_type)
```

## 验证方式

对应 canonical case 具备 `playwright-web-ui: active` 实现后，只能通过 `kata automation collect|run` 执行，并使用 `kata runs verify` 核验同一 manifest 的证据。不得直接调用 pytest 或 Playwright runner 作为交付证据。
