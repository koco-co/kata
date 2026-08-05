# dataAssets Knowledge Index

> 由 kata knowledge index 自动维护，请勿手动编辑。

## Core

- [overview.md](overview.md) — 产品定位 + 主流程（updated: 2026-07-31）

## Terms

- [consistency-一致性校验.md](terms/consistency-一致性校验.md) — CONSISTENCY（一致性校验） [tags: 数据质量, 规则类型, 一致性校验, RULE_TYPE.CONSISTENCY] (updated: 2026-07-27, status: observed)

（共 1 条）

## Modules

- [data-quality.md](modules/data-quality.md) — 数据质量模块业务规则（产品级） [tags: 数据质量, 规则类型, 统计函数, 校验语义, 规则集, 多表比对, 自定义SQL, 字段类型约束, 自定义调度日期, 调度周期] (updated: 2026-08-04, status: verified)
- [zszq-data-quality-forms.md](modules/zszq-data-quality-forms.md) — 浙商证券（标品）数据质量表单事实（向导字段/必填项/自定义调度日期组件） [tags: 数据质量, 浙商证券, zszq, 标品, 单表校验, 多表比对, 规则集, 调度属性, 自定义调度日期, 表单字段, 起调周期] (updated: 2026-08-05, status: verified)
- [落标检查与元数据同步菜单位置.md](modules/落标检查与元数据同步菜单位置.md) — 落标检查与元数据同步菜单位置 [tags: 数据标准, 落标检查, 元数据同步, 菜单路径] (updated: 2026-07-26, status: verified)
- [调度引擎-environment_param_template-表结构与取值.md](modules/调度引擎-environment_param_template-表结构与取值.md) — 调度引擎 environment_param_template 表结构与取值 [tags: 调度引擎, 环境参数, Spark, SQL, 落标检查] (updated: 2026-07-26, status: verified)

## Pitfalls

- [2026-04-27-datasource-type-case-sensitive.md](pitfalls/2026-04-27-datasource-type-case-sensitive.md) — 数据源类型 select 选项大小写敏感（Hive2.x ≠ hive2.x） (updated: 2026-07-31, status: observed)
- [2026-04-27-field-regex-precision.md](pitfalls/2026-04-27-field-regex-precision.md) — /字段/ 误命中"字段级" (updated: 2026-07-31, status: observed)
- [2026-04-27-legacy-rule-function-list.md](pitfalls/2026-04-27-legacy-rule-function-list.md) — .rule__function-list__item legacy DOM (updated: 2026-07-31, status: observed)
- [2026-04-27-preconditions-adapter.md](pitfalls/2026-04-27-preconditions-adapter.md) — preconditions adapter — 旧调用形态映射 (updated: 2026-07-31, status: observed)
- [2026-04-27-quality-project-id-90-vs-92.md](pitfalls/2026-04-27-quality-project-id-90-vs-92.md) — QUALITY_PROJECT_ID 硬编码 90 但实际 92 (updated: 2026-07-31, status: observed)
- [2026-04-27-rule-name-50-char-limit.md](pitfalls/2026-04-27-rule-name-50-char-limit.md) — 规则名称/任务名称 50 字符限制 (updated: 2026-07-31, status: observed)
- [2026-04-27-rule-type-prerequisite.md](pitfalls/2026-04-27-rule-type-prerequisite.md) — 必须先选「规则类型 = 字段级」才显示统计函数 (updated: 2026-07-31, status: observed)
- [2026-04-27-sparkthrift-keyword-hadoop.md](pitfalls/2026-04-27-sparkthrift-keyword-hadoop.md) — SparkThrift datasource keyword 漏 hadoop (updated: 2026-07-31, status: observed)
- [2026-04-27-sparkthrift-no-json-field.md](pitfalls/2026-04-27-sparkthrift-no-json-field.md) — SparkThrift2.x 不支持 JSON 字段类型 (updated: 2026-07-31, status: observed)
- [2026-04-27-step-fixture-no-return.md](pitfalls/2026-04-27-step-fixture-no-return.md) — step fixture 不返回 callback 值 (updated: 2026-07-31, status: observed)
- [2026-04-27-treeselect-search-not-scroll.md](pitfalls/2026-04-27-treeselect-search-not-scroll.md) — TreeSelect / Select 用搜索框过滤，不要逐层展开滚动 (updated: 2026-07-31, status: observed)
- [test-data-uniqueness.md](pitfalls/test-data-uniqueness.md) — 测试数据名称必须唯一化 [tags: 测试数据, 唯一化, uniqueName] (updated: 2026-07-25, status: observed)

## Sites

- [sites/172.16.122.52/dom-dataAssets.md](sites/172.16.122.52/dom-dataAssets.md) — 172.16.122.52 DataAssets DOM [tags: selector, dataAssets, 数据地图, 热门标签, 字段标签, 自动分级, 识别模式, 数据脱敏] (updated: 2026-05-13, status: verified)
- [sites/shuzhan60-test-zszq/dom-dataAssets.md](sites/shuzhan60-test-zszq/dom-dataAssets.md) — shuzhan60-test-zszq DataAssets 数据质量 DOM（浙商证券标品） [tags: dataAssets, 数据质量, 浙商证券, zszq, StarRocks, 规则配置, 多表比对, 规则集, 任务查询, 实时校验, 脏数据, 平台管理, 菜单基线] (updated: 2026-06-24, status: verified)
- [sites/shuzhan63-test-ltqc.k8s.dtstack.cn/dom-dataAssets.md](sites/shuzhan63-test-ltqc.k8s.dtstack.cn/dom-dataAssets.md) — DataAssets · 数据资产 [tags: dataAssets, 岚图汽车, 数据质量, 数据资产, DOM, 页面校准] (updated: 2026-05-22, status: observed)

## Standards

- [standards/ltqc/data-quality.md](standards/ltqc/data-quality.md) — 岚图汽车(ltqc) 数据质量 用例编写规范 [tags: customer:ltqc, 数据质量, 规则集管理, 规则任务管理, 调度属性, 表单配置] (updated: 2026-08-05, status: observed)

## Customers

- [ltqc.md](customers/ltqc.md) — 岚图汽车 [tags: customer:ltqc] (updated: 2026-08-05, status: verified)
- [zszq.md](customers/zszq.md) — 浙商证券 [tags: customer:zszq] (updated: 2026-08-05, status: verified)

<!-- last-indexed: 2026-08-05T08:57:00.910Z -->
