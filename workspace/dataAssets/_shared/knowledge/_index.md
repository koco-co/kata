# dataAssets Knowledge Index

> 由 knowledge-curate 自动维护，请勿手动编辑。

## Core

- [overview.md](overview.md) — 产品定位 + 主流程（updated: 2026-04-18）
- [terms.md](terms.md) — 术语表（1 条，updated: 2026-05-10）

## Modules

- [data-quality.md](modules/data-quality.md) — 数据质量模块产品级规则语义：规则类型/统计函数清单/多字段AND逻辑/字段类型约束(数值-枚举需数值字段)/自定义SQL返回违规明细/规则集文件导入+独立执行；菜单文案见 sites [tags: 数据质量, 规则类型, 统计函数, 校验语义, 规则集, 多表比对, 自定义SQL, 字段类型约束] (updated: 2026-06-24, confidence: high)

## Pitfalls

- [2026-04-27-datasource-type-case-sensitive.md](pitfalls/2026-04-27-datasource-type-case-sensitive.md) — 数据源类型 select 选项大小写敏感（Hive2.x ≠ hive2.x） (updated: 2026-04-27, confidence: high)
- [2026-04-27-field-regex-precision.md](pitfalls/2026-04-27-field-regex-precision.md) — /字段/ 误命中"字段级" (updated: 2026-04-27, confidence: high)
- [2026-04-27-legacy-rule-function-list.md](pitfalls/2026-04-27-legacy-rule-function-list.md) — .rule__function-list__item legacy DOM (updated: 2026-04-27, confidence: high)
- [2026-04-27-preconditions-adapter.md](pitfalls/2026-04-27-preconditions-adapter.md) — preconditions adapter — 旧调用形态映射 (updated: 2026-04-27, confidence: high)
- [2026-04-27-quality-project-id-90-vs-92.md](pitfalls/2026-04-27-quality-project-id-90-vs-92.md) — QUALITY_PROJECT_ID 硬编码 90 但实际 92 (updated: 2026-04-27, confidence: high)
- [2026-04-27-rule-name-50-char-limit.md](pitfalls/2026-04-27-rule-name-50-char-limit.md) — 规则名称/任务名称 50 字符限制 (updated: 2026-04-27, confidence: high)
- [2026-04-27-rule-type-prerequisite.md](pitfalls/2026-04-27-rule-type-prerequisite.md) — 必须先选「规则类型 = 字段级」才显示统计函数 (updated: 2026-04-27, confidence: high)
- [2026-04-27-sparkthrift-keyword-hadoop.md](pitfalls/2026-04-27-sparkthrift-keyword-hadoop.md) — SparkThrift datasource keyword 漏 hadoop (updated: 2026-04-27, confidence: high)
- [2026-04-27-sparkthrift-no-json-field.md](pitfalls/2026-04-27-sparkthrift-no-json-field.md) — SparkThrift2.x 不支持 JSON 字段类型 (updated: 2026-04-27, confidence: high)
- [2026-04-27-step-fixture-no-return.md](pitfalls/2026-04-27-step-fixture-no-return.md) — step fixture 不返回 callback 值 (updated: 2026-04-27, confidence: high)
- [2026-04-27-treeselect-search-not-scroll.md](pitfalls/2026-04-27-treeselect-search-not-scroll.md) — TreeSelect / Select 用搜索框过滤，不要逐层展开滚动 (updated: 2026-04-27, confidence: high)

## Sites

- [sites/shuzhan60-test-zszq/dom-dataAssets.md](sites/shuzhan60-test-zszq/dom-dataAssets.md) — 浙商证券 zszq 标品数据质量 DOM：左导航/单表·多表·规则集向导/任务查询/脏数据/平台数据源引入，菜单基线 [tags: dataAssets, 数据质量, 浙商证券, zszq, StarRocks, 菜单基线] (updated: 2026-06-23, confidence: high)
- [sites/shuzhan63-test-ltqc.k8s.dtstack.cn/dom-dataAssets.md](sites/shuzhan63-test-ltqc.k8s.dtstack.cn/dom-dataAssets.md) — 岚图 ltqc 环境 DataAssets DOM（左导航/数据质量）[tags: selector, dataAssets, 数据质量, 岚图, ltqc] (updated: 2026-05-13, confidence: high)
- [sites/172.16.122.52/dom-dataAssets.md](sites/172.16.122.52/dom-dataAssets.md) — 172.16.122.52 DataAssets DOM [tags: selector, dataAssets, 数据地图, 热门标签, 字段标签, 自动分级, 识别模式] (updated: 2026-05-13, confidence: high)

<!-- last-indexed: 2026-06-24T00:00:00.000Z -->
