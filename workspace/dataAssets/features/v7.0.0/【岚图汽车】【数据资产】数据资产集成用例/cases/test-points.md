---
prd_digest: "stale:legacy"
---

# 测试点清单

- 需求: 数据资产集成用例
- 用例来源: cases/archive.md / cases/exports/数据资产集成用例.xmind
- 覆盖数量: 4 条模块级集成用例，P0 2 条，P1 2 条
- 自动化基线: 先调试「数据质量」四场景，再调试「数据模型」全量场景；「元数据」「数据标准」本轮不变
- 环境: ltqc-lindorm-dev.yaml；数据质量指标项目使用「集成测试」（项目 ID 由环境运行时按名称解析）
- 数据源: SparkThrift `dtstack_smoke_LINDORM_SPARK`、Doris `dtstack_smoke_DORIS_doris3`
- 数据库: 两个数据源均为 `dtstack_smoke`
- 调试表映射: TABLE1=`test_schema3`、TABLE2=`test_schema4`、${TABLE}=`test_return2`（三张表已准备，脚本不改表）

## P0 核心范围

1. 「元数据」模块集成测试用例
2. 「数据质量」模块集成测试用例

## P1 回归范围

1. 「数据标准」模块集成测试用例
2. 「数据模型」模块集成测试用例

## 本轮自动化目标

- 「数据质量」模块集成测试用例: 按 XMind 规则配置覆盖 SparkThrift/Doris 的全通过与全不通过场景，包含计算逻辑设置页和 STRING 字段 cast 展示。
- 「数据模型」模块集成测试用例: 覆盖规范设计、模型元素、Doris 三类表、SparkThrift 内外部表、编辑删除及数据开发访客/管理员审批链路。

## 本轮不处理

- 「元数据」与「数据标准」模块的用例内容及自动化实现保持现状。

## 自动化注意事项

- Archive 文字只作为测试意图，真实菜单、字段、按钮、Tab、表格列和跳转路径以 live UI probe 证据为准。
- 落标检查链路依赖 SparkThrift2.x 数据源 DS_A、数据库 DB_A、test_info_1/test_info_2 分区表，以及已完成的数据标准映射和字段绑定。
- 用例中的第二天周期检查、邮件/钉钉告警、导入导出文件内容和审批角色差异若当前环境缺数据或权限，应在自动化 handoff 中标记为排除或阻塞，不能用页面存在性断言替代。
